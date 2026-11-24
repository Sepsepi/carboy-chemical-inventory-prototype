"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Table } from "@tanstack/react-table";
import { Download, PackageOpen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GHS_META, GHS_ORDER, SDS_STATUS_LABEL, ehsAmounts } from "@/lib/domain";
import { downloadCsv } from "@/lib/export";
import { formatLb } from "@/lib/format";
import { useAppStore, useInventoryRows, useScope } from "@/lib/store";
import type { InventoryRow } from "@/lib/types";
import { PageBody, PageHeader, Panel } from "@/components/layout/page";
import { StatStrip, type Stat } from "@/components/stat-strip";
import {
  DataTable,
  DataTableFacetedFilter,
  DataTableSearch,
  DataTableViewOptions,
  type FacetOption,
} from "@/components/data-table";
import { GhsList, GhsPictogram } from "@/components/hazard/ghs-pictogram";
import { FacilitySelect, YearSelect } from "@/components/scope-controls";
import { EhsTag, SDS_TONE, SdsStatusBadge, StatusBadge, StatusDot } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddChemicalSheet } from "./add-chemical";
import { inventoryColumns } from "./columns";
import { InventoryDetail } from "./inventory-detail";
import { CSV_HEADERS, PHYSICAL_STATES, REPORTING_OPTIONS, SDS_KEYS, csvRow, numberWord } from "./model";

export function InventoryScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const scope = useScope();
  const rows = useInventoryRows();
  const prevRows = useInventoryRows({ year: scope.year - 1 });
  const yearRowsAllSites = useInventoryRows({ facilityId: "all" });
  const products = useAppStore((s) => s.products);
  const removeRecord = useAppStore((s) => s.removeInventoryRecord);
  const logActivity = useAppStore((s) => s.logActivity);

  const tableRef = React.useRef<Table<InventoryRow> | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [toRemove, setToRemove] = React.useState<InventoryRow[] | null>(null);

  /* ─────────────── detail from the URL: ?product=&facility= ─────────────── */
  const productParam = params.get("product");
  const facilityParam = params.get("facility");
  const detailRow = React.useMemo(() => {
    if (!productParam) return null;
    const matches = (list: InventoryRow[]) => list.filter((r) => r.productId === productParam);
    if (facilityParam) {
      return matches(yearRowsAllSites).find((r) => r.facilityId === facilityParam) ?? null;
    }
    const pick = (list: InventoryRow[]) => list.sort((a, b) => b.maxDailyLb - a.maxDailyLb)[0] ?? null;
    return pick(matches(rows)) ?? pick(matches(yearRowsAllSites));
  }, [productParam, facilityParam, rows, yearRowsAllSites]);

  const missing = React.useMemo(() => {
    if (!productParam || detailRow) return undefined;
    const product = products.find((p) => p.id === productParam);
    const site = scope.facilities.find((f) => f.id === facilityParam);
    if (!product) {
      return { title: "Chemical not found", description: "This link points to a product that is not in the catalog." };
    }
    return {
      title: "Not in this year's inventory",
      description: `${product.name} has no record${site ? ` at ${site.name}` : ""} for reporting year ${scope.year}. Change the reporting year or add it with Add chemical.`,
    };
  }, [productParam, detailRow, products, scope.facilities, scope.year, facilityParam]);

  // true when this screen pushed the detail URL, so closing can step back instead of stacking history
  const pushed = React.useRef(false);
  React.useEffect(() => {
    if (!productParam) pushed.current = false;
  }, [productParam]);

  const openDetail = React.useCallback(
    (productId: string, facilityId: string) => {
      const url = `${pathname}?product=${encodeURIComponent(productId)}&facility=${encodeURIComponent(facilityId)}`;
      if (productParam) router.replace(url, { scroll: false });
      else {
        pushed.current = true;
        router.push(url, { scroll: false });
      }
    },
    [pathname, productParam, router],
  );

  const closeDetail = React.useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      router.back();
    } else {
      router.replace(pathname, { scroll: false });
    }
  }, [pathname, router]);

  /* ───────────────────────────────── stats ──────────────────────────────── */
  const sitesInView = new Set(rows.map((r) => r.facilityId)).size;
  const reportable = rows.filter((r) => r.reportable).length;
  const ehs = rows.filter((r) => r.ehs);
  const ehsOver = ehs.filter((r) => ehsAmounts(r.product, r.maxDailyLb).some((e) => e.over)).length;
  const totalMax = rows.reduce((s, r) => s + r.maxDailyLb, 0);
  const prevTotalMax = prevRows.reduce((s, r) => s + r.maxDailyLb, 0);
  const sdsExpired = rows.filter((r) => r.sds.key === "expired").length;
  const sdsMissing = rows.filter((r) => r.sds.key === "missing").length;
  const hasPrev = prevRows.length > 0;

  const applyFilter = (columnId: string, value: string[] | undefined) => {
    const t = tableRef.current;
    if (!t) return;
    t.resetColumnFilters();
    t.setGlobalFilter("");
    if (value) t.getColumn(columnId)?.setFilterValue(value);
  };

  const stats: Stat[] = [
    {
      label: "Chemicals",
      value: rows.length,
      deltaPct: hasPrev ? ((rows.length - prevRows.length) / prevRows.length) * 100 : null,
      deltaLabel: `vs ${scope.year - 1}`,
      hint: hasPrev ? undefined : scope.facility ? scope.facility.code : `${numberWord(sitesInView)} facilities`,
      onClick: () => applyFilter("reporting", undefined),
    },
    {
      label: "Tier II reportable",
      value: reportable,
      tone: "info",
      hint: rows.length ? `${Math.round((reportable / rows.length) * 100)}% of chemicals` : "None in scope",
      onClick: () => applyFilter("reporting", ["reportable"]),
    },
    {
      label: "Contains an EHS",
      value: ehs.length,
      tone: "serious",
      hint: ehs.length ? `${ehsOver} at or over the EHS threshold` : "None in scope",
      onClick: () => applyFilter("reporting", ["ehs"]),
    },
    {
      label: "Total max daily amount",
      value: totalMax,
      format: { notation: "compact", maximumFractionDigits: 1 },
      suffix: "lb",
      deltaPct: hasPrev && prevTotalMax ? ((totalMax - prevTotalMax) / prevTotalMax) * 100 : null,
      deltaLabel: `vs ${scope.year - 1}`,
      riseIsBad: false,
    },
    {
      label: "SDS needing attention",
      value: sdsExpired + sdsMissing,
      tone: sdsExpired + sdsMissing > 0 ? "critical" : "good",
      hint: `${sdsExpired} over 5 years, ${sdsMissing} missing`,
      onClick: () => applyFilter("sds", ["expired", "missing"]),
    },
  ];

  /* ──────────────────────────────── table ───────────────────────────────── */
  const columns = React.useMemo(() => inventoryColumns({ showFacility: scope.facilityId === "all" }), [scope.facilityId]);

  const hazardOptions: FacetOption[] = GHS_ORDER.map((c) => ({
    value: c,
    label: GHS_META[c].short,
    leading: <GhsPictogram code={c} size="xs" tooltip={false} />,
  }));
  const categoryOptions: FacetOption[] = [...new Set(rows.map((r) => r.product.category))]
    .sort()
    .map((c) => ({ value: c, label: c }));
  const containerOptions: FacetOption[] = [...new Set(rows.flatMap((r) => r.locations.map((l) => l.containerType)))]
    .sort()
    .map((c) => ({ value: c, label: c }));
  const sdsOptions: FacetOption[] = SDS_KEYS.map((k) => ({
    value: k,
    label: SDS_STATUS_LABEL[k],
    leading: <StatusDot tone={SDS_TONE[k]} />,
  }));

  const scopeWords = scope.facility
    ? `at ${scope.facility.name}`
    : `across ${numberWord(sitesInView)} ${sitesInView === 1 ? "facility" : "facilities"}`;
  const description = `${rows.length} ${rows.length === 1 ? "chemical" : "chemicals"} ${scopeWords}, reporting year ${scope.year}${
    scope.year === 2026 ? " (in progress)" : ""
  }.`;

  const fileBase = `inventory-${scope.facility?.code.toLowerCase() ?? "all-facilities"}-${scope.year}`;

  function exportRows(list: InventoryRow[], name: string) {
    downloadCsv(name, CSV_HEADERS, list.map(csvRow));
    toast.success("CSV exported", { description: `${list.length} ${list.length === 1 ? "chemical" : "chemicals"} in ${name}.csv` });
  }

  function confirmRemove() {
    if (!toRemove) return;
    for (const r of toRemove) removeRecord(r.id);
    const sites = [...new Set(toRemove.map((r) => r.facilityId))];
    const names = toRemove.map((r) => r.product.name);
    logActivity({
      kind: "inventory-updated",
      summary: `removed ${listNames(names)} from the ${
        sites.length === 1 ? toRemove[0].facility.name : `${sites.length} facility`
      } inventory (${scope.year})`,
      facilityId: sites.length === 1 ? sites[0] : undefined,
    });
    toast.success(`Removed from inventory`, {
      description: `${toRemove.length} ${toRemove.length === 1 ? "chemical" : "chemicals"}: ${listNames(names)}.`,
    });
    if (detailRow && toRemove.some((r) => r.id === detailRow.id)) closeDetail();
    tableRef.current?.resetRowSelection();
    setToRemove(null);
  }

  const emptyScope = rows.length === 0;

  return (
    <PageBody>
      <PageHeader
        title="Chemical inventory"
        description={description}
        actions={
          <>
            <Button
              variant="outline"
              className="bg-card"
              disabled={emptyScope}
              onClick={() => {
                const t = tableRef.current;
                if (t) exportRows(t.getPrePaginationRowModel().rows.map((r) => r.original), fileBase);
              }}
            >
              <Download data-icon="inline-start" />
              Export CSV
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus data-icon="inline-start" />
              Add chemical
            </Button>
          </>
        }
      />

      <StatStrip stats={stats} />

      <Panel>
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          onRowClick={(r) => openDetail(r.productId, r.facilityId)}
          activeRowId={detailRow?.id ?? null}
          initialSorting={[{ id: "maxDailyLb", desc: true }]}
          initialVisibility={{
            search: false,
            category: false,
            container: false,
            // on in the column picker; off by default so Reporting and SDS fit without scrolling
            daysOnSite: false,
            range: false,
            updatedAt: false,
          }}
          mobileRow={(r) => (
            <div className="grid gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <span className="truncate">{r.product.name}</span>
                    {r.ehs && <EhsTag />}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.product.manufacturer}
                    {sitesInView > 1 && (
                      <>
                        <span className="mx-1.5 text-border-strong">|</span>
                        <span className="ident">{r.facility.code}</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium text-foreground tabular">{formatLb(r.maxDailyLb)}</p>
                  <p className="text-xs text-muted-foreground">max daily</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <GhsList codes={r.product.pictograms} max={5} />
                <span className="flex shrink-0 items-center gap-1.5">
                  {r.reportable && <StatusBadge tone="info">Tier II</StatusBadge>}
                  <SdsStatusBadge status={r.sds} />
                </span>
              </div>
            </div>
          )}
          selectable
          noun={["chemical", "chemicals"]}
          minWidth={1060}
          onTable={(t) => {
            tableRef.current = t;
          }}
          emptyTitle={emptyScope ? "No chemicals recorded for this scope" : undefined}
          emptyDescription={
            emptyScope ? (
              <span className="flex flex-col items-center gap-3">
                <span>
                  {scope.facility ? scope.facility.name : "No facility"} has no inventory records for reporting year{" "}
                  {scope.year}. Pick another year or facility, or add the first chemical.
                </span>
                <span className="flex flex-wrap justify-center gap-2">
                  {scope.facility && (
                    <Button size="sm" variant="outline" className="bg-card" onClick={() => scope.setFacility("all")}>
                      Show all facilities
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setAddOpen(true)}>
                    <PackageOpen data-icon="inline-start" />
                    Add chemical
                  </Button>
                </span>
              </span>
            ) : undefined
          }
          toolbar={(table) => (
            <>
              <FacilitySelect className="max-sm:hidden sm:w-[230px]" />
              <YearSelect className="max-sm:hidden" />
              <DataTableSearch table={table} placeholder="Search name, CAS, ingredient, location" className="sm:w-80" />
              <DataTableViewOptions table={table} />
              <div className="basis-full" aria-hidden />
              <DataTableFacetedFilter column={table.getColumn("hazard")} title="Hazard class" options={hazardOptions} />
              <DataTableFacetedFilter
                column={table.getColumn("state")}
                title="Physical state"
                options={PHYSICAL_STATES.map((s) => ({ value: s, label: s }))}
              />
              <DataTableFacetedFilter column={table.getColumn("category")} title="Category" options={categoryOptions} />
              <DataTableFacetedFilter
                column={table.getColumn("reporting")}
                title="Reporting"
                options={REPORTING_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
              <DataTableFacetedFilter column={table.getColumn("sds")} title="SDS status" options={sdsOptions} />
              <DataTableFacetedFilter column={table.getColumn("container")} title="Container" options={containerOptions} />
            </>
          )}
          selectionBar={(table) => {
            const selected = table.getSelectedRowModel().rows.map((r) => r.original);
            return (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-card"
                  onClick={() => exportRows(selected, `${fileBase}-selected`)}
                >
                  <Download data-icon="inline-start" />
                  Export selected
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setToRemove(selected)}>
                  <Trash2 data-icon="inline-start" />
                  Remove from inventory
                </Button>
              </>
            );
          }}
        />
      </Panel>

      <InventoryDetail
        open={Boolean(productParam)}
        row={detailRow}
        missing={missing}
        onOpenChange={(open) => {
          if (!open) closeDetail();
        }}
      />

      <AddChemicalSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        onOpenExisting={(productId, facilityId) => {
          setAddOpen(false);
          openDetail(productId, facilityId);
        }}
        onAdded={(productId, facilityId) => {
          setAddOpen(false);
          // the new record may sit outside the scope in view; move the scope to it so the row shows
          const rec = useAppStore.getState().inventory.find((r) => r.productId === productId && r.facilityId === facilityId);
          if (rec && rec.year !== scope.year) scope.setYear(rec.year);
          if (scope.facilityId !== "all" && scope.facilityId !== facilityId) scope.setFacility(facilityId);
          openDetail(productId, facilityId);
        }}
      />

      <Dialog open={Boolean(toRemove)} onOpenChange={(o) => !o && setToRemove(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Remove {toRemove?.length === 1 ? toRemove[0].product.name : `${toRemove?.length ?? 0} chemicals`} from
              inventory?
            </DialogTitle>
            <DialogDescription>
              {toRemove?.length === 1
                ? `The ${scope.year} record at ${toRemove[0].facility.name} will be deleted, with its quantities and storage locations. The product stays in the catalog.`
                : `These ${scope.year} records will be deleted, with their quantities and storage locations. The products stay in the catalog.`}
            </DialogDescription>
          </DialogHeader>
          {toRemove && toRemove.length > 0 && (
            <ul className="scrollbar-thin max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-border text-[13px]">
              {toRemove.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate font-medium text-foreground">{r.product.name}</span>
                  <span className="shrink-0 text-muted-foreground tabular">
                    <span className="ident">{r.facility.code}</span>, {formatLb(r.maxDailyLb)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" className="bg-card" onClick={() => setToRemove(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemove}>
              <Trash2 data-icon="inline-start" />
              Remove {toRemove?.length === 1 ? "chemical" : `${toRemove?.length ?? 0} chemicals`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageBody>
  );
}

function listNames(names: string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
}
