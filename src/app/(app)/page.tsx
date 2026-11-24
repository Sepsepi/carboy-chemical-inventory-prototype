"use client";

import { useMemo } from "react";
import { Download } from "lucide-react";
import { ehsAmounts, facilityStats, REPORT_STATUS_LABEL } from "@/lib/domain";
import { downloadCsv } from "@/lib/export";
import { formatNumber, todayIso } from "@/lib/format";
import { CURRENT_REPORTING_YEAR, REPORTING_YEARS } from "@/lib/seed/facilities";
import {
  useAppStore,
  useInventoryRows,
  useReports,
  useScope,
  useSdsRows,
} from "@/lib/store";
import type { InventoryRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PageBody, PageHeader } from "@/components/layout/page";
import { StatStrip, type Stat } from "@/components/stat-strip";
import { FilingPanel } from "@/components/dashboard/filing-panel";
import { HazardChart } from "@/components/dashboard/hazard-chart";
import { QuantityChart } from "@/components/dashboard/quantity-chart";
import { SdsAgeChart } from "@/components/dashboard/sds-age-chart";
import { FacilitiesTable } from "@/components/dashboard/facilities-table";
import { FacilityProfile } from "@/components/dashboard/facility-profile";
import { SdsAlerts } from "@/components/dashboard/sds-alerts";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

const NUMBER_WORD = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

/** The figures the stat strip shows, for one set of rows. */
function figures(rows: InventoryRow[]) {
  const products = new Map(rows.map((r) => [r.product.id, r]));
  const distinct = [...products.values()];
  return {
    chemicals: distinct.length,
    entries: rows.length,
    reportable: rows.filter((r) => r.reportable).length,
    ehs: new Set(rows.filter((r) => r.ehs).map((r) => r.product.id)).size,
    ehsEntries: rows.filter((r) => r.ehs).length,
    ehsOverTpq: rows.filter((r) =>
      ehsAmounts(r.product, r.maxDailyLb).some((e) => e.over),
    ).length,
    totalLb: rows.reduce((s, r) => s + r.maxDailyLb, 0),
    sdsCurrentPct: distinct.length
      ? Math.round(
          (distinct.filter((r) => r.sds.key === "current").length /
            distinct.length) *
            100,
        )
      : 100,
    sdsFlagged: distinct.filter((r) => r.sds.key !== "current").length,
  };
}

function pct(now: number, before: number | undefined) {
  if (before === undefined || before === 0) return null;
  return ((now - before) / before) * 100;
}

export default function OverviewPage() {
  const { facilityId, year, facility, facilities, setFacility } = useScope();
  const rows = useInventoryRows();
  const hasPrevious = (REPORTING_YEARS as readonly number[]).includes(year - 1);
  const prevRows = useInventoryRows({ year: year - 1 });
  const reports = useReports();
  const sdsRows = useSdsRows();
  const inventory = useAppStore((s) => s.inventory);
  const activity = useAppStore((s) => s.activity);

  const closed = year < CURRENT_REPORTING_YEAR;
  const now = useMemo(() => figures(rows), [rows]);
  const before = useMemo(
    () => (hasPrevious ? figures(prevRows) : undefined),
    [hasPrevious, prevRows],
  );
  const stats = useMemo(
    () => facilityStats(rows, facility ? [facility] : facilities),
    [rows, facility, facilities],
  );

  // SDS rows for products on site in scope
  const sdsInScope = useMemo(
    () =>
      sdsRows.filter((r) =>
        facilityId === "all"
          ? r.facilities.length > 0
          : r.facilities.some((f) => f.id === facilityId),
      ),
    [sdsRows, facilityId],
  );
  const flagged = useMemo(
    () => sdsInScope.filter((r) => r.status.key !== "current"),
    [sdsInScope],
  );

  const productsInScope = useMemo(
    () => new Set(rows.map((r) => r.productId)),
    [rows],
  );
  const events = useMemo(
    () =>
      [...activity]
        .filter((e) => {
          if (facilityId === "all") return true;
          if (e.facilityId) return e.facilityId === facilityId;
          return e.productId ? productsInScope.has(e.productId) : false;
        })
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 8),
    [activity, facilityId, productsInScope],
  );

  const scopeReports = facility
    ? reports.filter((r) => r.facilityId === facility.id)
    : reports;
  const vs = before ? `vs ${year - 1}` : undefined;
  const d = (key: keyof ReturnType<typeof figures>) =>
    pct(now[key], before?.[key]);

  const strip: Stat[] = [
    {
      label: "Chemicals on site",
      value: now.entries,
      deltaPct: d("entries"),
      deltaLabel: vs,
      riseIsBad: true,
      hint: facility ? undefined : `${formatNumber(now.chemicals)} distinct products`,
    },
    {
      label: "Tier II reportable",
      value: now.reportable,
      deltaPct: d("reportable"),
      deltaLabel: vs,
      riseIsBad: true,
      hint: facility
        ? "over a threshold"
        : `lines on ${scopeReports.length} reports`,
    },
    {
      label: "Contains an EHS",
      value: now.ehsEntries,
      deltaPct: d("ehsEntries"),
      deltaLabel: vs,
      riseIsBad: true,
      hint: `${now.ehsOverTpq} over the EHS threshold`,
    },
    {
      label: "Total max daily amount",
      value: now.totalLb,
      format: { notation: "compact", maximumFractionDigits: 1 },
      suffix: "lb",
      deltaPct: d("totalLb"),
      deltaLabel: vs,
      riseIsBad: true,
      hint: year === CURRENT_REPORTING_YEAR ? "year to date" : undefined,
    },
    {
      label: "SDS current",
      value: now.sdsCurrentPct,
      suffix: "%",
      deltaPct: d("sdsCurrentPct"),
      deltaLabel: vs,
      tone:
        now.sdsCurrentPct >= 90
          ? "good"
          : now.sdsCurrentPct >= 75
            ? "warn"
            : "critical",
      hint: now.sdsFlagged ? `${now.sdsFlagged} need attention` : "all current",
    },
  ];

  const scopeText = facility
    ? `${facility.name}, reporting year ${year}${year === CURRENT_REPORTING_YEAR ? " (in progress)" : ""}`
    : `All ${NUMBER_WORD[facilities.length] ?? facilities.length} facilities, reporting year ${year}${
        year === CURRENT_REPORTING_YEAR ? " (in progress)" : ""
      }`;

  function exportSummary() {
    const byFacility = new Map(scopeReports.map((r) => [r.facilityId, r]));
    downloadCsv(
      `carboy-overview-${facility ? facility.code.toLowerCase() : "all"}-${year}-${todayIso()}`,
      [
        "Site code",
        "Facility",
        "Type",
        "City",
        "State",
        "Reporting year",
        "Chemicals",
        "Tier II reportable",
        "Contains an EHS",
        "Total max daily amount (lb)",
        "SDS current",
        "SDS review due",
        "SDS over 5 years",
        "SDS missing",
        "SDS coverage (%)",
        "Tier II status",
        "Tier II due",
      ],
      stats.map((s) => {
        const r = byFacility.get(s.facility.id);
        return [
          s.facility.code,
          s.facility.name,
          s.facility.type,
          s.facility.city,
          s.facility.state,
          year,
          s.chemicals,
          s.reportable,
          s.ehs,
          s.totalMaxLb,
          s.sdsCurrent,
          s.sdsReview,
          s.sdsExpired,
          s.sdsMissing,
          s.sdsCoverage,
          r ? REPORT_STATUS_LABEL[r.status] : "",
          r?.dueDate ?? "",
        ];
      }),
    );
  }

  return (
    <PageBody>
      <PageHeader
        title="Overview"
        description={scopeText}
        actions={
          <Button variant="outline" className="bg-card" onClick={exportSummary}>
            <Download data-icon="inline-start" />
            Export summary
          </Button>
        }
      />

      <FilingPanel
        year={year}
        closed={closed}
        reports={reports}
        facilities={facilities}
        facility={facility}
      />

      <StatStrip stats={strip} />

      {/*
        Laid out by the width of the content area, not the viewport, since the
        sidebar takes a varying share. Narrow: the two column wrappers dissolve
        (display: contents) so panels order on their own, alerts right after
        the figures and activity last. Medium: two columns. Wide: 8/4 split.
      */}
      <div className="@container">
        <div className="flex flex-col gap-5 @3xl:grid @3xl:grid-cols-2 @4xl:grid-cols-12 @4xl:items-start">
          <div className="contents @4xl:col-span-8 @4xl:flex @4xl:min-w-0 @4xl:flex-col @4xl:gap-5">
            <div className="order-2 grid min-w-0 gap-5 @3xl:order-3 @3xl:col-span-2 @3xl:grid-cols-2 @4xl:order-none">
              <div className="min-w-0 @3xl:col-span-2">
                <QuantityChart
                  inventory={inventory}
                  facilities={facilities}
                  facility={facility}
                  year={year}
                />
              </div>
              <HazardChart rows={rows} />
              <SdsAgeChart rows={sdsInScope} />
            </div>
            <div className="order-3 min-w-0 @3xl:order-4 @3xl:col-span-2 @4xl:order-none">
              {facility ? (
                <FacilityProfile
                  facility={facility}
                  rows={rows}
                  onShowAll={() => setFacility("all")}
                />
              ) : (
                <FacilitiesTable
                  stats={stats}
                  reports={reports}
                  onSelect={setFacility}
                />
              )}
            </div>
          </div>
          <div className="contents @4xl:col-span-4 @4xl:flex @4xl:min-w-0 @4xl:flex-col @4xl:gap-5">
            <div className="order-1 min-w-0 @3xl:order-1 @4xl:order-none">
              <SdsAlerts rows={flagged} allSites={facilities.length} />
            </div>
            <div className="order-4 min-w-0 @3xl:order-2 @4xl:order-none">
              <ActivityFeed events={events} />
            </div>
          </div>
        </div>
      </div>
    </PageBody>
  );
}
