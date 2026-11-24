"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Table as TanstackTable } from "@tanstack/react-table";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import { SDS_MAX_AGE_YEARS, SDS_REVIEW_WINDOW_DAYS } from "@/lib/domain";
import { downloadCsv } from "@/lib/export";
import { formatAge, todayIso } from "@/lib/format";
import { useAppStore, useScope, useSdsRows, type SdsRow } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { PageBody, PageHeader, Panel } from "@/components/layout/page";
import { StatStrip, type Stat } from "@/components/stat-strip";
import { AgeTimeline } from "@/components/sds/age-timeline";
import { RulePopover } from "@/components/sds/rule-popover";
import { SdsDetailSheet } from "@/components/sds/sds-detail-sheet";
import { SdsRegister, type RegisterRow } from "@/components/sds/sds-register";
import { isStatFilter, sitesLabel, type StatFilter } from "@/components/sds/sds-utils";
import { UploadDialog } from "@/components/sds/upload-dialog";

export default function Page() {
  return (
    <React.Suspense fallback={null}>
      <SdsScreen />
    </React.Suspense>
  );
}

/** Which stat filter the table's column filters amount to, if any. */
function filterKeyOf(table: TanstackTable<RegisterRow>): StatFilter | null {
  const status = table.getColumn("status")?.getFilterValue() as string[] | undefined;
  const requested = table.getColumn("requested")?.getFilterValue() as string[] | undefined;
  if (requested?.length && !status?.length) return "requested";
  if (status?.length === 1 && !requested?.length && isStatFilter(status[0])) return status[0];
  return null;
}

function SdsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const productParam = params.get("product");
  const statusParam = params.get("status");
  const urlFilter = isStatFilter(statusParam) ? statusParam : null;

  const { facilityId, facility, facilities, year } = useScope();
  const requestSdsUpdate = useAppStore((s) => s.requestSdsUpdate);
  const logActivity = useAppStore((s) => s.logActivity);
  const allRows = useSdsRows();

  // The store records a request only on an existing document; a request for a
  // product with no SDS is kept here so the screen can still show it.
  const [missingRequests, setMissingRequests] = React.useState<Record<string, string>>({});

  const rows = React.useMemo<RegisterRow[]>(() => {
    const scoped =
      facilityId === "all" ? allRows : allRows.filter((r) => r.facilities.some((f) => f.id === facilityId));
    return scoped.map((r) => ({ ...r, requestedAt: r.doc?.updateRequestedAt ?? missingRequests[r.product.id] }));
  }, [allRows, facilityId, missingRequests]);

  /* ── URL state ── */
  const setParams = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );
  const openProduct = React.useCallback((id: string) => setParams({ product: id }), [setParams]);

  /* ── table <-> ?status= ── */
  const [table, setTable] = React.useState<TanstackTable<RegisterRow> | null>(null);
  // the stat filter the table was last brought in line with; null until the
  // URL has been applied once
  const appliedRef = React.useRef<StatFilter | null | undefined>(undefined);

  React.useEffect(() => {
    if (!table) return;
    if (filterKeyOf(table) !== urlFilter) {
      table.getColumn("status")?.setFilterValue(urlFilter && urlFilter !== "requested" ? [urlFilter] : undefined);
      table.getColumn("requested")?.setFilterValue(urlFilter === "requested" ? ["yes"] : undefined);
    }
    appliedRef.current = urlFilter;
  }, [table, urlFilter]);

  const onTable = React.useCallback(
    (t: TanstackTable<RegisterRow>) => {
      setTable((prev) => prev ?? t);
      // a filter changed in the table itself: keep ?status= truthful
      if (appliedRef.current === undefined) return;
      const key = filterKeyOf(t);
      if (key !== appliedRef.current) {
        appliedRef.current = key;
        setParams({ status: key });
      }
    },
    [setParams],
  );

  const toggleFilter = (key: StatFilter) => setParams({ status: urlFilter === key ? null : key });

  /* ── stats ── */
  const count = (k: string) => rows.filter((r) => r.status.key === k).length;
  const docs = rows.filter((r) => r.doc).length;
  const requested = rows.filter((r) => r.requestedAt).length;
  const hint = (key: StatFilter, text: string) =>
    urlFilter === key ? <span className="font-medium text-foreground">Filtering the register</span> : text;
  const stats: Stat[] = [
    { label: "Current", value: count("current"), tone: "good", hint: hint("current", `of ${docs} documents`), onClick: () => toggleFilter("current") },
    { label: "Review due", value: count("review"), tone: "warn", hint: hint("review", `within ${SDS_REVIEW_WINDOW_DAYS} days of 5 years`), onClick: () => toggleFilter("review") },
    { label: "Over 5 years", value: count("expired"), tone: "critical", hint: hint("expired", "flagged for replacement"), onClick: () => toggleFilter("expired") },
    { label: "No SDS on file", value: count("missing"), tone: "serious", hint: hint("missing", "products without a document"), onClick: () => toggleFilter("missing") },
    { label: "Update requested", value: requested, tone: "info", hint: hint("requested", "waiting on the manufacturer"), onClick: () => toggleFilter("requested") },
  ];

  /* ── actions ── */
  const [upload, setUpload] = React.useState<{ open: boolean; productId: string | null }>({ open: false, productId: null });
  const openRow = rows.find((r) => r.product.id === productParam) ?? allRows.find((r) => r.product.id === productParam);
  const openRequestedAt = openRow ? (openRow.doc?.updateRequestedAt ?? missingRequests[openRow.product.id]) : undefined;

  const request = (row: SdsRow) => {
    if (row.doc) requestSdsUpdate(row.product.id);
    else setMissingRequests((m) => ({ ...m, [row.product.id]: todayIso() }));
    logActivity({
      kind: "sds-requested",
      summary: `asked ${row.product.manufacturer} for a current ${row.product.name} SDS`,
      productId: row.product.id,
      href: `/sds?product=${row.product.id}`,
    });
    toast.success("Update requested", {
      description: `${row.product.manufacturer} was asked for a current ${row.product.name} SDS.`,
    });
  };

  const exportRegister = () => {
    const shown = table ? table.getPrePaginationRowModel().rows.map((r) => r.original) : rows;
    downloadCsv(
      `sds-register-${facility ? facility.code.toLowerCase() : "all-sites"}-${todayIso()}`,
      ["Product", "Manufacturer", "Document ID", "Version", "Revision date", "Age", "Status", "Five-year date", "Sites", "Language", "Update requested"],
      shown.map((r) => {
        const v = r.doc?.versions[0];
        return [
          r.product.name,
          r.product.manufacturer,
          r.doc?.id ?? "",
          v?.version ?? "",
          v?.revisionDate ?? "",
          r.status.ageDays !== undefined ? formatAge(r.status.ageDays) : "",
          r.status.label,
          r.status.expiresOn ?? "",
          sitesLabel(r),
          r.doc?.language ?? "",
          r.requestedAt ?? "",
        ];
      }),
    );
    toast.success("Register exported", { description: `${shown.length} ${shown.length === 1 ? "document" : "documents"} in the CSV.` });
  };

  return (
    <>
      <div data-print={openRow ? "hide" : undefined}>
        <PageBody>
          <PageHeader
            title="Safety data sheets"
            description={
              <>
                A safety data sheet is flagged automatically once its latest revision is more than {SDS_MAX_AGE_YEARS} years{" "}
                <span className="whitespace-nowrap">
                  old.
                  <RulePopover />
                </span>
                {facility && ` Showing products held at ${facility.name} in ${year}.`}
              </>
            }
            actions={
              <>
                <Button variant="outline" className="bg-card" onClick={exportRegister}>
                  <Download data-icon="inline-start" />
                  Export register
                </Button>
                <Button onClick={() => setUpload({ open: true, productId: null })}>
                  <Upload data-icon="inline-start" />
                  Upload SDS
                </Button>
              </>
            }
          />

          <StatStrip stats={stats} className="lg:grid-cols-none max-lg:[&>*:last-child]:col-span-2 max-lg:[&>*:last-child]:border-l-0" />

          <AgeTimeline rows={rows} onOpen={openProduct} activeProductId={productParam} />

          <Panel className="overflow-hidden">
            <SdsRegister
              rows={rows}
              facilities={facilityId === "all" ? facilities : facilities.filter((f) => f.id === facilityId)}
              activeProductId={productParam}
              onOpen={openProduct}
              onTable={onTable}
            />
          </Panel>
        </PageBody>
      </div>

      <SdsDetailSheet
        row={openRow}
        requestedAt={openRequestedAt}
        onClose={() => setParams({ product: null })}
        onUpload={(id) => setUpload({ open: true, productId: id })}
        onRequest={request}
      />

      <UploadDialog
        open={upload.open}
        onOpenChange={(open) => setUpload((u) => ({ ...u, open }))}
        rows={allRows}
        productId={upload.productId}
        onUploaded={(id) => {
          if (id !== productParam) openProduct(id);
        }}
      />
    </>
  );
}
