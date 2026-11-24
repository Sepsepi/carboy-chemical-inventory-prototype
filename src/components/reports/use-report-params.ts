"use client";

// The report in view lives in the URL (?facility=&year=&type=), per the URL
// contract in DESIGN.md. Missing or unknown params fall back to the app scope;
// this screen never changes the app-wide scope itself.

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { REPORT_TYPE_META } from "@/lib/domain";
import { REPORTING_YEARS } from "@/lib/seed/facilities";
import { useScope } from "@/lib/store";
import type { ReportType } from "@/lib/types";

export function useReportParams() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { facilityId: scopeFacility, year: scopeYear, facilities } = useScope();

  const fParam = params.get("facility");
  const yParam = Number(params.get("year"));
  const tParam = params.get("type");

  const facilityId =
    fParam && facilities.some((f) => f.id === fParam)
      ? fParam
      : scopeFacility !== "all"
        ? scopeFacility
        : facilities[0].id;
  const year = (REPORTING_YEARS as readonly number[]).includes(yParam) ? yParam : scopeYear;
  const type: ReportType = tParam && tParam in REPORT_TYPE_META ? (tParam as ReportType) : "tier2";

  const set = useCallback(
    (patch: { facilityId?: string; year?: number; type?: ReportType }) => {
      const next = new URLSearchParams(params.toString());
      next.set("facility", patch.facilityId ?? facilityId);
      next.set("year", String(patch.year ?? year));
      next.set("type", patch.type ?? type);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, router, pathname, facilityId, year, type],
  );

  const facility = facilities.find((f) => f.id === facilityId)!;
  return { facilityId, facility, year, type, set, facilities };
}
