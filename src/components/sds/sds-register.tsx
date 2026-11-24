"use client";

import * as React from "react";
import type { ColumnDef, Table as TanstackTable } from "@tanstack/react-table";
import { SDS_MAX_AGE_YEARS, SDS_SEVERITY, SDS_STATUS_LABEL } from "@/lib/domain";
import { formatAge, formatDate } from "@/lib/format";
import type { SdsRow } from "@/lib/store";
import type { Facility, SdsStatusKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  DataTable,
  DataTableColumnHeader,
  DataTableFacetedFilter,
  DataTableSearch,
  DataTableViewOptions,
  facetFilter,
} from "@/components/data-table";
import { SDS_TONE, SdsStatusBadge, StatusDot } from "@/components/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { daysPhrase } from "@/components/sds/sds-utils";

// The register: one row per product. Rows arrive worst first from useSdsRows,
// and that order is kept until a header is clicked.

export type RegisterRow = SdsRow & { requestedAt?: string };

const BAR: Record<string, string> = {
  good: "bg-chart-neutral",
  warn: "bg-warn-solid",
  critical: "bg-critical-solid",
  serious: "bg-serious-solid",
};

const Dash = () => <span className="text-muted-foreground">-</span>;

function AgeCell({ row }: { row: SdsRow }) {
  const days = row.status.ageDays;
  if (days === undefined) return <Dash />;
  const fill = Math.min(1, days / (SDS_MAX_AGE_YEARS * 365.25));
  return (
    <div className="flex flex-col gap-1">
      <span className="tabular">{formatAge(days)}</span>
      <span
        className="block h-1 w-20 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${Math.round(fill * 100)} percent of the five-year limit`}
      >
        <span className={cn("block h-full rounded-full", BAR[SDS_TONE[row.status.key]])} style={{ width: `${fill * 100}%` }} />
      </span>
    </div>
  );
}

function SiteChips({ facilities }: { facilities: Facility[] }) {
  if (!facilities.length) return <span className="text-xs text-muted-foreground">Not on site</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex flex-nowrap gap-1">
          {facilities.map((f) => (
            <span
              key={f.id}
              className="ident inline-flex h-5 items-center rounded-sm border border-border bg-subtle px-1 text-[11px] text-foreground"
            >
              {f.code}
            </span>
          ))}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {facilities.map((f) => (
          <p key={f.id}>
            <span className="ident opacity-70">{f.code}</span> {f.name}
          </p>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}

function buildColumns(): ColumnDef<RegisterRow, any>[] { // eslint-disable-line @typescript-eslint/no-explicit-any
  return [
    {
      id: "product",
      accessorFn: (r) => `${r.product.name} ${r.product.manufacturer}`,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
      sortingFn: (a, b) => a.original.product.name.localeCompare(b.original.product.name),
      enableHiding: false,
      meta: { sticky: true, label: "Product", className: "max-w-[240px]" },
      cell: ({ row }) => (
        <div className="min-w-0 py-0.5">
          <p className="truncate font-medium text-foreground">{row.original.product.name}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.product.manufacturer}</p>
        </div>
      ),
    },
    {
      id: "docId",
      accessorFn: (r) => r.doc?.id ?? "",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Document ID" />,
      meta: { label: "Document ID" },
      cell: ({ row }) =>
        row.original.doc ? <span className="ident text-[12.5px]">{row.original.doc.id}</span> : <Dash />,
    },
    {
      id: "version",
      accessorFn: (r) => (r.doc ? Number.parseFloat(r.doc.versions[0].version) : undefined),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Version" />,
      sortUndefined: "last",
      enableGlobalFilter: false,
      meta: { label: "Version" },
      cell: ({ row }) => (row.original.doc ? <span className="tabular">v{row.original.doc.versions[0].version}</span> : <Dash />),
    },
    {
      id: "revisionDate",
      accessorFn: (r) => r.doc?.versions[0].revisionDate,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Revision date" />,
      sortUndefined: "last",
      enableGlobalFilter: false,
      meta: { label: "Revision date", className: "whitespace-nowrap" },
      cell: ({ row }) => {
        const v = row.original.doc?.versions[0];
        return v ? <span className="tabular">{formatDate(v.revisionDate)}</span> : <Dash />;
      },
    },
    {
      id: "age",
      accessorFn: (r) => r.status.ageDays,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Age" />,
      sortUndefined: "last",
      enableGlobalFilter: false,
      meta: { label: "Age", className: "whitespace-nowrap" },
      cell: ({ row }) => <AgeCell row={row.original} />,
    },
    {
      id: "status",
      accessorFn: (r) => r.status.key,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      filterFn: facetFilter,
      enableGlobalFilter: false,
      sortingFn: (a, b) =>
        SDS_SEVERITY[a.original.status.key] - SDS_SEVERITY[b.original.status.key] ||
        (a.original.status.daysLeft ?? 0) - (b.original.status.daysLeft ?? 0),
      meta: { label: "Status" },
      cell: ({ row }) => <SdsStatusBadge status={row.original.status} />,
    },
    {
      id: "expiresOn",
      accessorFn: (r) => r.status.expiresOn,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Five-year date" />,
      sortUndefined: "last",
      enableGlobalFilter: false,
      meta: { label: "Five-year date", className: "whitespace-nowrap" },
      cell: ({ row }) => {
        const s = row.original.status;
        if (!s.expiresOn || s.daysLeft === undefined) return <Dash />;
        return (
          <div className="flex flex-col">
            <span className="tabular">{formatDate(s.expiresOn)}</span>
            <span
              className={cn(
                "text-xs tabular",
                s.key === "expired" ? "text-critical" : s.key === "review" ? "text-warn" : "text-muted-foreground",
              )}
            >
              {daysPhrase(s.daysLeft)}
            </span>
          </div>
        );
      },
    },
    {
      id: "usedAt",
      accessorFn: (r) => r.facilities.map((f) => f.id),
      header: "Used at",
      enableSorting: false,
      filterFn: facetFilter,
      meta: { label: "Used at" },
      cell: ({ row }) => <SiteChips facilities={row.original.facilities} />,
    },
    {
      id: "language",
      accessorFn: (r) => r.doc?.language,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Language" />,
      filterFn: facetFilter,
      sortUndefined: "last",
      enableGlobalFilter: false,
      meta: { label: "Language", className: "whitespace-nowrap" },
      cell: ({ row }) => (row.original.doc ? row.original.doc.language : <Dash />),
    },
    {
      id: "requested",
      accessorFn: (r) => r.requestedAt,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Update requested" />,
      sortUndefined: "last",
      enableGlobalFilter: false,
      filterFn: (row, id, value: string[] | undefined) => !value?.length || Boolean(row.getValue(id)),
      meta: { label: "Update requested", className: "whitespace-nowrap" },
      cell: ({ row }) =>
        row.original.requestedAt ? <span className="tabular">{formatDate(row.original.requestedAt)}</span> : <Dash />,
    },
    // filter and search only
    {
      id: "manufacturer",
      accessorFn: (r) => r.product.manufacturer,
      enableHiding: false,
      filterFn: facetFilter,
    },
    {
      id: "search",
      accessorFn: (r) =>
        [r.product.name, r.product.manufacturer, r.product.productCode, r.doc?.id, ...r.product.ingredients.flatMap((i) => [i.name, i.cas])]
          .filter(Boolean)
          .join(" "),
      enableHiding: false,
      enableSorting: false,
    },
  ];
}

export function SdsRegister({
  rows,
  facilities,
  activeProductId,
  onOpen,
  onTable,
}: {
  rows: RegisterRow[];
  facilities: Facility[];
  activeProductId?: string | null;
  onOpen: (productId: string) => void;
  onTable: (table: TanstackTable<RegisterRow>) => void;
}) {
  const columns = React.useMemo(() => buildColumns(), []);
  const manufacturers = React.useMemo(
    () => [...new Set(rows.map((r) => r.product.manufacturer))].sort().map((m) => ({ value: m, label: m })),
    [rows],
  );
  const statusOptions = (["missing", "expired", "review", "current"] as SdsStatusKey[]).map((k) => ({
    value: k,
    label: SDS_STATUS_LABEL[k],
    leading: <StatusDot tone={SDS_TONE[k]} />,
  }));
  const facilityOptions = facilities.map((f) => ({
    value: f.id,
    label: f.name,
    leading: <span className="ident w-8 text-[11px] text-muted-foreground">{f.code}</span>,
  }));
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.product.id}
      onRowClick={(r) => onOpen(r.product.id)}
      activeRowId={activeProductId}
      initialVisibility={{ manufacturer: false, search: false }}
      noun={["document", "documents"]}
      minWidth={1180}
      onTable={onTable}
      mobileRow={(r) => (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{r.product.name}</p>
            <p className="truncate text-xs text-muted-foreground">{r.product.manufacturer}</p>
            <p className="mt-1.5 text-xs text-muted-foreground tabular">
              {r.doc
                ? `v${r.doc.versions[0].version}, revised ${formatDate(r.doc.versions[0].revisionDate)}`
                : "No document yet"}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <SdsStatusBadge status={r.status} />
            {r.status.ageDays !== undefined && (
              <span className="text-xs text-muted-foreground tabular">{formatAge(r.status.ageDays)} old</span>
            )}
          </div>
        </div>
      )}
      toolbar={(table) => (
        <>
          <DataTableSearch table={table} placeholder="Search product, CAS or document ID" className="sm:w-80" />
          <DataTableFacetedFilter column={table.getColumn("status")} title="Status" options={statusOptions} />
          <DataTableFacetedFilter column={table.getColumn("manufacturer")} title="Manufacturer" options={manufacturers} />
          <DataTableFacetedFilter column={table.getColumn("usedAt")} title="Used at" options={facilityOptions} />
          <DataTableFacetedFilter
            column={table.getColumn("language")}
            title="Language"
            options={[
              { value: "English", label: "English" },
              { value: "English, Spanish", label: "English, Spanish" },
            ]}
          />
          <DataTableViewOptions table={table} />
        </>
      )}
    />
  );
}
