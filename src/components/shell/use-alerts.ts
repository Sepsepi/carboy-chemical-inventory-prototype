"use client";

import { useMemo } from "react";
import { daysBetween, parseDate } from "@/lib/domain";
import { useAppStore, useSdsRows } from "@/lib/store";
import { CURRENT_REPORTING_YEAR } from "@/lib/seed/facilities";
import type { Tone } from "@/components/status-badge";

export interface AppAlert {
  id: string;
  tone: Tone;
  title: string;
  detail: string;
  href: string;
  group: "Safety data sheets" | "Reports";
}

/** Everything that needs attention right now, worst first. Used by the bell and the sidebar counts. */
export function useAlerts() {
  const sdsRows = useSdsRows(CURRENT_REPORTING_YEAR);
  const reports = useAppStore((s) => s.reports);
  const facilities = useAppStore((s) => s.facilities);

  return useMemo(() => {
    const now = new Date();
    const alerts: AppAlert[] = [];
    // only products that are actually on a site this year raise an alert
    for (const row of sdsRows) {
      if (row.facilities.length === 0) continue;
      const sites = row.facilities.map((f) => f.code).join(", ");
      if (row.status.key === "missing") {
        alerts.push({
          id: `sds-missing-${row.product.id}`,
          tone: "serious",
          title: `${row.product.name} has no SDS on file`,
          detail: `On site at ${sites}`,
          href: `/sds?product=${row.product.id}`,
          group: "Safety data sheets",
        });
      } else if (row.status.key === "expired") {
        alerts.push({
          id: `sds-expired-${row.product.id}`,
          tone: "critical",
          title: `${row.product.name} SDS is over five years old`,
          detail: `Revised ${row.status.ageYears} years ago. On site at ${sites}`,
          href: `/sds?product=${row.product.id}`,
          group: "Safety data sheets",
        });
      } else if (row.status.key === "review") {
        alerts.push({
          id: `sds-review-${row.product.id}`,
          tone: "warn",
          title: `${row.product.name} SDS reaches five years in ${row.status.daysLeft} days`,
          detail: `On site at ${sites}`,
          href: `/sds?product=${row.product.id}`,
          group: "Safety data sheets",
        });
      }
    }
    const open = reports.filter(
      (r) => r.type === "tier2" && r.year === CURRENT_REPORTING_YEAR && r.status !== "submitted" && r.status !== "accepted",
    );
    for (const r of open) {
      const facility = facilities.find((f) => f.id === r.facilityId);
      const days = daysBetween(now, parseDate(r.dueDate));
      if (!facility) continue;
      if (r.status === "not-started" || days <= 45) {
        alerts.push({
          id: `report-${r.id}`,
          tone: days <= 30 ? "critical" : r.status === "not-started" ? "warn" : "info",
          title:
            r.status === "not-started"
              ? `${facility.name}: Tier II report not started`
              : `${facility.name}: Tier II report due in ${days} days`,
          detail: `Reporting year ${r.year}, due March 1`,
          href: `/reports?facility=${facility.id}&year=${r.year}`,
          group: "Reports",
        });
      }
    }
    const sdsCount = alerts.filter((a) => a.group === "Safety data sheets" && a.tone !== "warn").length;
    const reportsOpen = open.length;
    return { alerts, sdsCount, reportsOpen };
  }, [sdsRows, reports, facilities]);
}
