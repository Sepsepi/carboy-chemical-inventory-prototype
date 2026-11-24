"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { FacilityStats } from "@/lib/domain";
import { formatLb, formatLbCompact } from "@/lib/format";
import type { Report } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
import { Panel, PanelHeader } from "@/components/layout/page";
import { ReportStatusBadge, StatusDot } from "@/components/status-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Row = FacilityStats & { report?: Report };

const COVERAGE = [
  { key: "sdsCurrent", label: "Current", bar: "bg-good-solid", tone: "good" },
  { key: "sdsReview", label: "Review due", bar: "bg-warn-solid", tone: "warn" },
  {
    key: "sdsExpired",
    label: "Over 5 years",
    bar: "bg-critical-solid",
    tone: "critical",
  },
  {
    key: "sdsMissing",
    label: "No SDS on file",
    bar: "bg-serious-solid",
    tone: "serious",
  },
] as const;

function CoverageBar({ row }: { row: Row }) {
  const total = row.chemicals || 1;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="flex w-full flex-col gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          tabIndex={0}
          aria-label={`SDS coverage ${row.sdsCoverage}%: ${COVERAGE.map((c) => `${row[c.key]} ${c.label.toLowerCase()}`).join(", ")}`}
        >
          <span className="text-xs tabular">{row.sdsCoverage}% covered</span>
          <span className="flex h-1 w-full gap-px overflow-hidden rounded-full bg-muted">
            {COVERAGE.map((c) =>
              row[c.key] > 0 ? (
                <span
                  key={c.key}
                  className={c.bar}
                  style={{ width: `${(row[c.key] / total) * 100}%` }}
                />
              ) : null,
            )}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="min-w-44">
        <p className="mb-1 font-medium">{row.facility.name}</p>
        <ul className="grid gap-0.5">
          {COVERAGE.map((c) => (
            <li key={c.key} className="flex items-center gap-1.5">
              <StatusDot tone={c.tone} />
              <span className="opacity-80">{c.label}</span>
              <span className="ml-auto pl-3 tabular">{row[c.key]}</span>
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

export function FacilitiesTable({
  stats,
  reports,
  onSelect,
}: {
  stats: FacilityStats[];
  reports: Report[];
  onSelect: (facilityId: string) => void;
}) {
  const data = useMemo<Row[]>(
    () =>
      stats.map((s) => ({
        ...s,
        report: reports.find(
          (r) => r.type === "tier2" && r.facilityId === s.facility.id,
        ),
      })),
    [stats, reports],
  );
  const maxLb = Math.max(1, ...stats.map((s) => s.totalMaxLb));

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      {
        id: "facility",
        accessorFn: (r) => r.facility.name,
        header: "Facility",
        enableSorting: false,
        meta: { label: "Facility", sticky: true },
        size: 174,
        cell: ({ row }) => {
          const f = row.original.facility;
          return (
            <div className="flex w-[150px] min-w-0 flex-col gap-0.5 py-1">
              <span className="leading-[1.3] font-medium">{f.name}</span>
              <span className="text-xs text-muted-foreground">
                <span className="ident">{f.code}</span> {f.city}, {f.state}
              </span>
            </div>
          );
        },
      },
      {
        id: "tier2",
        accessorFn: (r) => r.report?.status ?? "",
        header: "Tier II",
        enableSorting: false,
        meta: { label: "Tier II" },
        size: 142,
        cell: ({ row }) =>
          row.original.report ? (
            <ReportStatusBadge status={row.original.report.status} />
          ) : (
            <span className="text-xs text-muted-foreground">No report</span>
          ),
      },
      {
        accessorKey: "chemicals",
        header: "Chemicals",
        enableSorting: false,
        meta: { align: "right", label: "Chemicals" },
        size: 80,
        cell: ({ getValue }) => (
          <span className="tabular">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: "reportable",
        header: "Reportable",
        enableSorting: false,
        meta: { align: "right", label: "Reportable" },
        size: 86,
        cell: ({ getValue }) => (
          <span className="tabular">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: "ehs",
        header: "EHS",
        enableSorting: false,
        meta: { align: "right", label: "EHS" },
        size: 52,
        cell: ({ getValue }) => (
          <span className="tabular">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: "totalMaxLb",
        header: "Max daily amount",
        enableSorting: false,
        meta: { label: "Max daily amount" },
        size: 96,
        cell: ({ getValue }) => {
          const lb = getValue<number>();
          return (
            <span className="flex flex-col gap-1" title={formatLb(lb)}>
              <span className="whitespace-nowrap tabular">
                {formatLbCompact(lb)}
              </span>
              <span className="h-1 w-full rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-chart-neutral"
                  style={{ width: `${Math.max(2, (lb / maxLb) * 100)}%` }}
                />
              </span>
            </span>
          );
        },
      },
      {
        accessorKey: "sdsCoverage",
        header: "SDS coverage",
        enableSorting: false,
        meta: { label: "SDS coverage" },
        size: 104,
        cell: ({ row }) => <CoverageBar row={row.original} />,
      },
    ],
    [maxLb],
  );

  return (
    <Panel className={cn("overflow-hidden")}>
      <PanelHeader
        title="Facilities"
        description="Select a site to see it on its own."
        divided
      />
      <DataTable
        columns={columns}
        data={data}
        getRowId={(r) => r.facility.id}
        onRowClick={(r) => onSelect(r.facility.id)}
        noun={["facility", "facilities"]}
        pageSize={10}
        minWidth={740}
        mobileRow={(r) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{r.facility.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular">
                <span className="ident">{r.facility.code}</span>
                <span className="mx-1.5 text-border-strong">|</span>
                {r.chemicals} chemicals, {r.reportable} reportable
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular">
                {formatLbCompact(r.totalMaxLb)} on site, SDS {r.sdsCoverage}% covered
              </p>
            </div>
            {r.report && <ReportStatusBadge status={r.report.status} className="shrink-0" />}
          </div>
        )}
      />
    </Panel>
  );
}
