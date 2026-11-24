"use client";

// Every facility's Tier II filing for the selected year. Clicking a row selects
// that facility for the setup panel and the preview.

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { daysBetween, facilityStats, parseDate } from "@/lib/domain";
import { formatDate, formatDateLong, formatRelative, todayIso } from "@/lib/format";
import { useInventoryRows, useReports } from "@/lib/store";
import type { Facility, Report } from "@/lib/types";
import { DataTable } from "@/components/data-table";
import { Panel, PanelHeader } from "@/components/layout/page";
import { ReportStatusBadge } from "@/components/status-badge";

interface FilingRow {
  id: string;
  facility: Facility;
  report: Report;
  reportable: number;
  ehs: number;
  daysLeft: number;
}

export function FilingsTable({
  year,
  facilities,
  selectedId,
  onSelect,
}: {
  year: number;
  facilities: Facility[];
  selectedId: string;
  onSelect: (facilityId: string) => void;
}) {
  const reports = useReports(year);
  const rows = useInventoryRows({ facilityId: "all", year });

  const data = useMemo<FilingRow[]>(() => {
    const now = new Date();
    const stats = facilityStats(rows, facilities);
    return facilities.flatMap((facility) => {
      const report = reports.find((r) => r.facilityId === facility.id && r.type === "tier2");
      if (!report) return [];
      const s = stats.find((x) => x.facility.id === facility.id);
      return [
        {
          id: facility.id,
          facility,
          report,
          reportable: s?.reportable ?? 0,
          ehs: rows.filter((r) => r.facilityId === facility.id && r.reportable && r.ehs).length,
          daysLeft: daysBetween(now, parseDate(report.dueDate)),
        },
      ];
    });
  }, [rows, reports, facilities]);

  const done = data.filter((d) => ["ready", "submitted", "accepted"].includes(d.report.status)).length;
  const accepted = data.filter((d) => d.report.status === "accepted").length;
  const due = data[0]?.report.dueDate;
  const daysLeft = data[0]?.daysLeft ?? 0;
  const summary =
    due && daysLeft >= 0
      ? `${done} of ${data.length} ready or filed for ${year}. Due ${formatDateLong(due)}, in ${daysLeft} ${
          daysLeft === 1 ? "day" : "days"
        }.`
      : `${accepted} of ${data.length} accepted for ${year}. Due ${due ? formatDateLong(due) : "March 1"}.`;

  const columns = useMemo<ColumnDef<FilingRow>[]>(
    () => [
      {
        id: "facility",
        header: "Facility",
        accessorFn: (r) => r.facility.name,
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2">
            <span className="ident w-9 shrink-0 text-muted-foreground">{row.original.facility.code}</span>
            <span className="truncate font-medium text-foreground">{row.original.facility.name}</span>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (r) => r.report.status,
        cell: ({ row }) => <ReportStatusBadge status={row.original.report.status} />,
      },
      {
        id: "reportable",
        header: "Chemicals to report",
        accessorKey: "reportable",
        meta: { align: "right" },
      },
      {
        id: "ehs",
        header: "Contain an EHS",
        accessorKey: "ehs",
        meta: { align: "right" },
        cell: ({ row }) =>
          row.original.ehs ? row.original.ehs : <span className="text-muted-foreground">0</span>,
      },
      {
        id: "due",
        header: "Due or filed",
        accessorFn: (r) => r.report.dueDate,
        cell: ({ row }) => {
          const { report, daysLeft } = row.original;
          if (report.status === "accepted" || report.status === "submitted") {
            return (
              <div className="flex flex-col leading-tight">
                <span>
                  {report.status === "accepted" ? "Accepted" : "Submitted"}{" "}
                  {formatDate(report.status === "accepted" ? report.updatedAt : (report.submittedAt ?? report.updatedAt))}
                </span>
                {report.confirmation && (
                  <span className="ident text-xs text-muted-foreground">{report.confirmation}</span>
                )}
              </div>
            );
          }
          return (
            <div className="flex flex-col leading-tight">
              <span>{formatDate(report.dueDate)}</span>
              <span className={daysLeft <= 30 ? "text-xs text-critical" : "text-xs text-muted-foreground"}>
                {daysLeft >= 0 ? `${daysLeft} days left` : `${-daysLeft} days overdue`}
              </span>
            </div>
          );
        },
      },
      {
        id: "updated",
        header: "Last updated",
        accessorFn: (r) => r.report.updatedAt,
        cell: ({ row }) => (
          <span className="text-muted-foreground" title={formatDate(row.original.report.updatedAt)}>
            {row.original.report.updatedAt === todayIso() ? "Today" : formatRelative(row.original.report.updatedAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <Panel data-print="hide">
      <PanelHeader title={`Tier II filings for ${year}`} description={summary} divided />
      <DataTable
        columns={columns}
        data={data}
        getRowId={(r) => r.id}
        onRowClick={(r) => onSelect(r.facility.id)}
        activeRowId={selectedId}
        noun={["filing", "filings"]}
        minWidth={760}
        mobileRow={(r) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{r.facility.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular">
                <span className="ident">{r.facility.code}</span>
                <span className="mx-1.5 text-border-strong">|</span>
                {r.reportable} to report, {r.ehs} with an EHS
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <ReportStatusBadge status={r.report.status} />
              <span className="text-xs text-muted-foreground tabular">
                {r.report.status === "accepted" || r.report.status === "submitted"
                  ? `Filed ${r.report.submittedAt ? formatDate(r.report.submittedAt) : ""}`
                  : `${r.daysLeft} days left`}
              </span>
            </div>
          </div>
        )}
      />
    </Panel>
  );
}
