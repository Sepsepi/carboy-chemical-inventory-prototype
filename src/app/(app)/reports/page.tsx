"use client";

import { Suspense, useMemo } from "react";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { REPORT_TYPE_META } from "@/lib/domain";
import { downloadCsv } from "@/lib/export";
import { useAppStore, useInventoryRows } from "@/lib/store";
import { PageBody, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { FilingsTable } from "@/components/reports/filings-table";
import { SetupPanel } from "@/components/reports/setup-panel";
import { ChecklistPanel, FilingPanel } from "@/components/reports/filing-panel";
import { List311Document, SdsAuditDocument, Tier2Document } from "@/components/reports/report-documents";
import { buildChecklist, csvFileName, reportCsv } from "@/components/reports/report-data";
import { useReportParams } from "@/components/reports/use-report-params";

export default function Page() {
  return (
    <Suspense>
      <ReportsScreen />
    </Suspense>
  );
}

function ReportsScreen() {
  const { facilityId, facility, year, type, set, facilities } = useReportParams();
  const rows = useInventoryRows({ facilityId, year });
  const reports = useAppStore((s) => s.reports);
  const sdsDocs = useAppStore((s) => s.sds);
  const report = reports.find((r) => r.type === "tier2" && r.facilityId === facilityId && r.year === year);
  const checks = useMemo(() => buildChecklist(rows, facility, year), [rows, facility, year]);
  const meta = REPORT_TYPE_META[type];

  function exportCsv() {
    const { headers, rows: body } = reportCsv(type, rows, sdsDocs);
    const name = csvFileName(type, facility, year);
    downloadCsv(name, headers, body);
    toast.success("CSV exported", { description: `${name}, ${body.length} rows` });
  }

  const actions = (size: "sm" | "default") => (
    <>
      <Button variant="outline" size={size} className="bg-card" onClick={exportCsv}>
        <Download data-icon="inline-start" />
        Export CSV
      </Button>
      <Button size={size} onClick={() => window.print()}>
        <Printer data-icon="inline-start" />
        Print or save as PDF
      </Button>
    </>
  );

  return (
    <PageBody>
      <div data-print="hide">
        <PageHeader
          title="Regulatory reports"
          description="Check each facility's chemical inventory report, read it as the agencies will, and move it through filing."
          actions={actions("default")}
        />
      </div>

      <FilingsTable year={year} facilities={facilities} selectedId={facilityId} onSelect={(id) => set({ facilityId: id })} />

      <div className="grid grid-cols-1 items-start gap-5 print:block min-[1025px]:grid-cols-[minmax(340px,380px)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5" data-print="hide">
          <SetupPanel type={type} facilityId={facilityId} year={year} facilities={facilities} onChange={set} />
          <FilingPanel report={report} facility={facility} checks={checks} />
          <ChecklistPanel checks={checks} year={year} closed={report?.status === "accepted"} />
        </div>

        <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-muted/70 p-2 sm:gap-4 sm:p-4 lg:p-6 print:border-0 print:bg-transparent print:p-0">
          <div
            data-print="hide"
            className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/95 py-1.5 pr-1.5 pl-3 backdrop-blur-sm"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-foreground">
                {meta.short} for {year}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {facility.name} <span className="ident">{facility.code}</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">{actions("sm")}</div>
          </div>

          {type === "tier2" && <Tier2Document facility={facility} year={year} rows={rows} report={report} />}
          {type === "list311" && <List311Document facility={facility} year={year} rows={rows} />}
          {type === "sds-audit" && (
            <SdsAuditDocument facility={facility} year={year} rows={rows} sdsDocs={sdsDocs} />
          )}
        </div>
      </div>
    </PageBody>
  );
}
