// Pure helpers for the reports screen: the pre-filing checklist, the state
// commission names, the workflow order and the CSV tables. No React.

import { REPORT_STATUS_LABEL, REPORT_TYPE_META, SDS_SEVERITY, tier2Range } from "@/lib/domain";
import type { Facility, InventoryRow, Product, ReportStatus, ReportType, SdsDocument } from "@/lib/types";

/* ─────────────────────────────── workflow ─────────────────────────────── */

export const WORKFLOW: ReportStatus[] = ["not-started", "draft", "in-review", "ready", "submitted", "accepted"];

/** The forward action from each stage: button label, toast, and the stage it leads to. */
export const NEXT_STEP: Partial<Record<ReportStatus, { label: string; toast: string; to: ReportStatus }>> = {
  "not-started": { label: "Start draft", toast: "Draft started", to: "draft" },
  draft: { label: "Send for review", toast: "Sent for review", to: "in-review" },
  "in-review": { label: "Mark ready to submit", toast: "Marked ready to submit", to: "ready" },
  ready: { label: "Submit to state", toast: "Submitted to state", to: "submitted" },
  submitted: { label: "Record acceptance", toast: "Acceptance recorded", to: "accepted" },
};

/** One stage back. A filing that has left the building cannot be pulled back here. */
export const PREV_STEP: Partial<Record<ReportStatus, { label: string; toast: string; to: ReportStatus }>> = {
  "in-review": { label: "Return to draft", toast: "Returned to draft", to: "draft" },
  ready: { label: "Return to review", toast: "Returned to review", to: "in-review" },
};

export function statusSentence(year: number, status: ReportStatus) {
  return `moved the ${year} Tier II report to ${REPORT_STATUS_LABEL[status]}`;
}

/** State emergency response commission by state. */
export const SERC: Record<string, string> = {
  TX: "Texas State Emergency Response Commission",
  LA: "Louisiana Emergency Response Commission",
  OK: "Oklahoma Hazardous Materials Emergency Response Commission",
};

export function sercFor(state: string) {
  return SERC[state] ?? `${state} State Emergency Response Commission`;
}

/* ─────────────────────────────── chemistry ────────────────────────────── */

const WATER_CAS = "7732-18-5";

/**
 * CAS for a single substance; undefined for a mixture. An aqueous solution of
 * one chemical (sulfuric acid 93%, caustic soda 50%) reports as that chemical.
 */
export function singleCas(product: Product): string | undefined {
  const active = product.ingredients.filter((i) => i.cas !== WATER_CAS);
  return active.length === 1 ? active[0].cas : undefined;
}

export function ehsNames(product: Product): string[] {
  return product.ingredients.filter((i) => i.ehs).map((i) => i.name);
}

export function byMaxDesc(a: InventoryRow, b: InventoryRow) {
  return b.maxDailyLb - a.maxDailyLb;
}

/* ─────────────────────────────── checklist ────────────────────────────── */

export type CheckLevel = "pass" | "warn" | "problem";

export interface CheckLine {
  id: string;
  level: CheckLevel;
  title: string;
  detail: string;
  /** the records this line is about, each with a link to fix it */
  items: { id: string; label: string; note: string; href: string }[];
}

export function buildChecklist(rows: InventoryRow[], facility: Facility, year: number): CheckLine[] {
  const reportable = rows.filter((r) => r.reportable).sort(byMaxDesc);
  const n = reportable.length;
  const plural = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
  const lines: CheckLine[] = [];

  // 1. SDS on file. Missing blocks filing (Section 311 needs an SDS);
  //    an old revision is our own five-year rule, so it warns.
  const missing = reportable.filter((r) => r.sds.key === "missing");
  const old = reportable.filter((r) => r.sds.key === "expired" || r.sds.key === "review");
  const sdsItems = [...missing, ...old].map((r) => ({
    id: r.id,
    label: r.product.name,
    note:
      r.sds.key === "missing"
        ? "No SDS on file"
        : r.sds.key === "expired"
          ? `Revision ${r.sds.ageYears} years old`
          : `Turns five years in ${r.sds.daysLeft} days`,
    href: `/sds?product=${r.product.id}`,
  }));
  lines.push({
    id: "sds",
    level: missing.length ? "problem" : old.length ? "warn" : "pass",
    title: "Current SDS for every reportable chemical",
    detail:
      missing.length || old.length
        ? [
            missing.length ? `${plural(missing.length, "has", "have")} no SDS on file.` : "",
            old.length ? `${plural(old.length, "is", "are")} over or near five years old.` : "",
          ]
            .filter(Boolean)
            .join(" ")
        : `All ${n} reportable chemicals have a current SDS.`,
    items: sdsItems,
  });

  // 2. storage locations
  const noStorage = reportable.filter((r) => r.locations.length === 0);
  lines.push({
    id: "storage",
    level: noStorage.length ? "problem" : "pass",
    title: "Storage location for every reportable chemical",
    detail: noStorage.length
      ? `${plural(noStorage.length, "chemical has", "chemicals have")} no storage location.`
      : `All ${n} have at least one storage location.`,
    items: noStorage.map((r) => ({
      id: r.id,
      label: r.product.name,
      note: "No storage location",
      href: `/inventory?product=${r.product.id}&facility=${facility.id}`,
    })),
  });

  // 3. quantities updated during the reporting year
  const stale = reportable.filter((r) => r.updatedAt < `${year}-01-01`);
  lines.push({
    id: "quantities",
    level: stale.length ? "warn" : "pass",
    title: `Quantities updated in ${year}`,
    detail: stale.length
      ? `${plural(stale.length, "record was", "records were")} last updated before ${year}.`
      : `All ${n} records were updated in or after ${year}.`,
    items: stale.map((r) => ({
      id: r.id,
      label: r.product.name,
      note: `Last updated ${r.updatedAt}`,
      href: `/inventory?product=${r.product.id}&facility=${facility.id}`,
    })),
  });

  // 4. emergency contact
  const c = facility.emergencyContact;
  const hasContact = Boolean(c?.name && c?.phone);
  lines.push({
    id: "contact",
    level: hasContact ? "pass" : "problem",
    title: "Emergency contact on record",
    detail: hasContact ? `${c.name}, ${c.title}, ${c.phone}.` : "Add a 24-hour emergency contact for this facility.",
    items: [],
  });

  // 5. EHS identified
  const ehs = reportable.filter((r) => r.ehs);
  lines.push({
    id: "ehs",
    level: "pass",
    title: "Extremely Hazardous Substances identified",
    detail: ehs.length
      ? `${plural(ehs.length, "chemical contains", "chemicals contain")} an EHS: ${ehs
          .map((r) => `${r.product.name} (${ehsNames(r.product).join(", ").toLowerCase()})`)
          .join("; ")}.`
      : "No reportable chemical contains an EHS.",
    items: [],
  });

  return lines;
}

/* ───────────────────────────────── CSV ────────────────────────────────── */

type Cell = string | number | undefined;

export function reportCsv(
  type: ReportType,
  rows: InventoryRow[],
  sdsDocs: SdsDocument[],
): { headers: string[]; rows: Cell[][] } {
  if (type === "tier2") {
    const list = rows.filter((r) => r.reportable).sort(byMaxDesc);
    return {
      headers: [
        "Chemical",
        "CAS",
        "Components",
        "EHS",
        "EHS name",
        "Physical state",
        "Physical hazards",
        "Health hazards",
        "Max daily amount (lb)",
        "Max daily range code",
        "Average daily amount (lb)",
        "Average daily range code",
        "Days on site",
        "Storage locations",
      ],
      rows: list.map((r) => [
        r.product.name,
        singleCas(r.product) ?? "Mixture",
        singleCas(r.product) ? "" : r.product.ingredients.map((i) => `${i.name} (${i.cas}) ${i.percent}%`).join("; "),
        r.ehs ? "Yes" : "No",
        ehsNames(r.product).join("; "),
        r.product.physicalState,
        r.product.physicalHazards.join("; "),
        r.product.healthHazards.join("; "),
        r.maxDailyLb,
        r.rangeCode,
        r.avgDailyLb,
        tier2Range(r.avgDailyLb).code,
        r.daysOnSite,
        r.locations
          .map((l) => `${l.area}, ${l.detail} (${l.containerType}; ${l.pressure} pressure; ${l.temperature} temperature)`)
          .join("; "),
      ]),
    };
  }
  if (type === "list311") {
    const out: Cell[][] = [];
    for (const group of hazardGroups(rows)) {
      for (const cat of group.categories) {
        for (const r of cat.rows) {
          out.push([group.kind, cat.name, r.product.name, singleCas(r.product) ?? "Mixture"]);
        }
      }
    }
    return { headers: ["Hazard type", "Hazard category", "Chemical", "CAS"], rows: out };
  }
  const docs = new Map(sdsDocs.map((d) => [d.productId, d]));
  return {
    headers: ["Chemical", "Manufacturer", "SDS version", "Revision date", "Age (days)", "Status"],
    rows: sdsAuditRows(rows).map((r) => {
      const v = docs.get(r.product.id)?.versions[0];
      return [r.product.name, r.product.manufacturer, v?.version, v?.revisionDate, r.sds.ageDays, r.sds.label];
    }),
  };
}

export function csvFileName(type: ReportType, facility: Facility, year: number) {
  const slug = { tier2: "tier2", list311: "section311-list", "sds-audit": "sds-summary" }[type];
  return `${slug}-${facility.code}-${year}.csv`;
}

export function reportTitle(type: ReportType) {
  return REPORT_TYPE_META[type].name;
}

/* ─────────────────────────── grouped document data ────────────────────── */

export function hazardGroups(rows: InventoryRow[]) {
  const list = rows.filter((r) => r.reportable).sort((a, b) => a.product.name.localeCompare(b.product.name));
  const group = (kind: "Physical" | "Health", pick: (p: Product) => string[]) => {
    const map = new Map<string, InventoryRow[]>();
    for (const r of list) for (const cat of pick(r.product)) map.set(cat, [...(map.get(cat) ?? []), r]);
    return {
      kind,
      categories: [...map.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, rs]) => ({ name, rows: rs })),
    };
  };
  return [group("Physical", (p) => p.physicalHazards), group("Health", (p) => p.healthHazards)];
}

export function sdsAuditRows(rows: InventoryRow[]) {
  return [...rows].sort(
    (a, b) =>
      SDS_SEVERITY[a.sds.key] - SDS_SEVERITY[b.sds.key] ||
      (a.sds.daysLeft ?? 0) - (b.sds.daysLeft ?? 0) ||
      a.product.name.localeCompare(b.product.name),
  );
}
