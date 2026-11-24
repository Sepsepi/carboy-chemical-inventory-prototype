"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { FileCheck2 } from "lucide-react";
import { tier2Range } from "@/lib/domain";
import { formatDate, formatNumber } from "@/lib/format";
import type { InventoryRow } from "@/lib/types";
import { DataTableColumnHeader, facetFilter } from "@/components/data-table";
import { GhsList } from "@/components/hazard/ghs-pictogram";
import { EhsTag, SdsStatusBadge, StatusBadge } from "@/components/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SDS_SEVERITY } from "@/lib/domain";
import { primaryCas, reportingFacets, searchText } from "./model";

const facet = facetFilter as unknown as ColumnDef<InventoryRow>["filterFn"];

/** Columns of the inventory table. The facility column only shows when several sites are in scope. */
export function inventoryColumns({ showFacility }: { showFacility: boolean }): ColumnDef<InventoryRow>[] {
  const cols: ColumnDef<InventoryRow>[] = [
    {
      id: "product",
      accessorFn: (r) => r.product.name,
      meta: { label: "Product", sticky: true, className: "max-w-[260px]" },
      size: 240,
      enableHiding: false,
      enableGlobalFilter: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="min-w-0 py-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-medium text-foreground">{r.product.name}</span>
              {r.ehs && <EhsTag className="shrink-0" />}
            </div>
            <div className="truncate text-xs text-muted-foreground">{r.product.manufacturer}</div>
          </div>
        );
      },
    },
    {
      id: "cas",
      accessorFn: (r) => primaryCas(r.product) ?? "Mixture",
      meta: { label: "CAS" },
      enableGlobalFilter: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="CAS" />,
      cell: ({ row }) => {
        const cas = primaryCas(row.original.product);
        if (cas) return <span className="ident whitespace-nowrap">{cas}</span>;
        return (
          <span className="whitespace-nowrap text-muted-foreground">
            Mixture <span className="tabular">({row.original.product.ingredients.length})</span>
          </span>
        );
      },
    },
    {
      id: "hazard",
      accessorFn: (r) => r.product.pictograms,
      meta: { label: "Hazards" },
      enableSorting: false,
      enableGlobalFilter: false,
      filterFn: facet,
      header: "Hazards",
      cell: ({ row }) => <GhsList codes={row.original.product.pictograms} max={4} className="-ml-0.5" />,
    },
    {
      id: "state",
      accessorFn: (r) => r.product.physicalState,
      meta: { label: "State" },
      enableGlobalFilter: false,
      filterFn: facet,
      header: ({ column }) => <DataTableColumnHeader column={column} title="State" />,
      cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>()}</span>,
    },
    {
      id: "category",
      accessorFn: (r) => r.product.category,
      meta: { label: "Category" },
      enableGlobalFilter: false,
      filterFn: facet,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{getValue<string>()}</span>,
    },
  ];

  if (showFacility) {
    cols.push({
      id: "facility",
      accessorFn: (r) => r.facility.code,
      meta: { label: "Facility" },
      enableGlobalFilter: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Facility" />,
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="ident rounded-sm px-0.5 text-foreground">{row.original.facility.code}</span>
          </TooltipTrigger>
          <TooltipContent>{row.original.facility.name}</TooltipContent>
        </Tooltip>
      ),
    });
  }

  cols.push(
    {
      id: "location",
      accessorFn: (r) => `${r.locations[0]?.area ?? ""} ${r.locations[0]?.detail ?? ""}`,
      meta: { label: "Location" },
      enableGlobalFilter: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
      cell: ({ row }) => {
        const [first, ...rest] = row.original.locations;
        if (!first) return <span className="text-muted-foreground">Not recorded</span>;
        return (
          <div className="min-w-0 max-w-[200px]">
            <div className="truncate text-foreground">{first.area}</div>
            <div className="truncate text-xs text-muted-foreground">
              {first.detail}
              {rest.length > 0 && <span className="font-medium text-foreground"> +{rest.length} more</span>}
            </div>
          </div>
        );
      },
    },
    {
      id: "container",
      accessorFn: (r) => [...new Set(r.locations.map((l) => l.containerType))],
      meta: { label: "Container" },
      enableSorting: false,
      enableGlobalFilter: false,
      filterFn: facet,
      header: "Container",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {row.original.locations[0]?.containerType ?? ""}
        </span>
      ),
    },
    {
      id: "maxDailyLb",
      accessorKey: "maxDailyLb",
      meta: { label: "Max daily", align: "right" },
      enableGlobalFilter: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Max daily (lb)" />,
      cell: ({ row, table }) => {
        const v = row.original.maxDailyLb;
        // the bar is scaled to the largest amount among the rows the filters leave in view
        let maxInView = 0;
        for (const r of table.getFilteredRowModel().rows) maxInView = Math.max(maxInView, r.original.maxDailyLb);
        const pct = maxInView > 0 ? Math.max(2, (v / maxInView) * 100) : 0;
        return (
          <div className="ml-auto flex w-[116px] flex-col items-end gap-1">
            <span className="font-medium text-foreground tabular">{formatNumber(v)}</span>
            <span aria-hidden className="h-[3px] w-full overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-chart-1" style={{ width: `${pct}%` }} />
            </span>
          </div>
        );
      },
    },
    {
      id: "avgDailyLb",
      accessorKey: "avgDailyLb",
      meta: { label: "Avg daily", align: "right" },
      enableGlobalFilter: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Avg daily (lb)" />,
      cell: ({ getValue }) => <span className="text-muted-foreground tabular">{formatNumber(getValue<number>())}</span>,
    },
    {
      id: "daysOnSite",
      accessorKey: "daysOnSite",
      meta: { label: "Days on site", align: "right" },
      enableGlobalFilter: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Days" />,
      cell: ({ getValue }) => <span className="text-muted-foreground tabular">{getValue<number>()}</span>,
    },
    {
      id: "range",
      accessorFn: (r) => r.rangeCode,
      meta: { label: "Tier II range", align: "right" },
      enableGlobalFilter: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Range" />,
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="ident rounded-sm bg-subtle px-1 py-0.5 text-foreground">{row.original.rangeCode}</span>
          </TooltipTrigger>
          <TooltipContent>Tier II range {row.original.rangeCode}: {tier2Range(row.original.maxDailyLb).label}</TooltipContent>
        </Tooltip>
      ),
    },
    {
      id: "reporting",
      accessorFn: (r) => reportingFacets(r),
      meta: { label: "Reporting" },
      enableGlobalFilter: false,
      filterFn: facet,
      sortingFn: (a, b) => Number(a.original.reportable) - Number(b.original.reportable),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Reporting" />,
      cell: ({ row }) =>
        row.original.reportable ? (
          <StatusBadge tone="info" icon={FileCheck2}>
            Tier II
          </StatusBadge>
        ) : (
          <span className="text-muted-foreground" aria-label="Below threshold">
            –
          </span>
        ),
    },
    {
      id: "sds",
      accessorFn: (r) => r.sds.key,
      meta: { label: "SDS" },
      enableGlobalFilter: false,
      filterFn: facet,
      sortingFn: (a, b) => SDS_SEVERITY[a.original.sds.key] - SDS_SEVERITY[b.original.sds.key],
      header: ({ column }) => <DataTableColumnHeader column={column} title="SDS" />,
      cell: ({ row }) => <SdsStatusBadge status={row.original.sds} />,
    },
    {
      id: "updatedAt",
      accessorKey: "updatedAt",
      meta: { label: "Updated" },
      enableGlobalFilter: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="whitespace-nowrap text-muted-foreground tabular">{formatDate(row.original.updatedAt)}</span>
          </TooltipTrigger>
          <TooltipContent>Updated by {row.original.updatedBy}</TooltipContent>
        </Tooltip>
      ),
    },
    {
      // hidden: the text the search box looks through
      id: "search",
      accessorFn: (r) => searchText(r),
      enableHiding: false,
      enableSorting: false,
      enableGlobalFilter: true,
      header: "Search",
      cell: () => null,
    },
  );
  return cols;
}
