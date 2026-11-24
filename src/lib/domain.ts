// Pure rules of the domain. No React, no store. Everything here is computed
// from the data, so a new SDS version or a changed quantity updates every
// flag and count that depends on it.

import type {
  Facility,
  FacilityScope,
  GhsCode,
  InventoryRecord,
  InventoryRow,
  Product,
  ReportStatus,
  ReportType,
  SdsDocument,
  SdsStatus,
  SdsStatusKey,
} from "@/lib/types";

/* ───────────────────────────── SDS age rule ───────────────────────────── */

/** An SDS is flagged once its latest revision is older than this. */
export const SDS_MAX_AGE_YEARS = 5;
/** "Review due" starts this many days before the five-year mark. */
export const SDS_REVIEW_WINDOW_DAYS = 180;

const DAY_MS = 86_400_000;

export function parseDate(iso: string): Date {
  // dates in the data are calendar dates; read them as UTC so no timezone can
  // move them by a day
  return new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

export function addYears(iso: string, years: number): string {
  const d = parseDate(iso);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export const SDS_STATUS_LABEL: Record<SdsStatusKey, string> = {
  current: "Current",
  review: "Review due",
  expired: "Over 5 years",
  missing: "No SDS on file",
};

/** The status of a product's SDS on a given day. `doc` undefined = missing. */
export function getSdsStatus(doc: SdsDocument | undefined, now: Date = new Date()): SdsStatus {
  const latest = doc?.versions[0];
  if (!doc || !latest) return { key: "missing", label: SDS_STATUS_LABEL.missing };
  const revised = parseDate(latest.revisionDate);
  const expiresOn = addYears(latest.revisionDate, SDS_MAX_AGE_YEARS);
  const ageDays = daysBetween(revised, now);
  const daysLeft = daysBetween(now, parseDate(expiresOn));
  const key: SdsStatusKey =
    daysLeft < 0 ? "expired" : daysLeft <= SDS_REVIEW_WINDOW_DAYS ? "review" : "current";
  return {
    key,
    label: SDS_STATUS_LABEL[key],
    ageDays,
    ageYears: Math.round((ageDays / 365.25) * 10) / 10,
    expiresOn,
    daysLeft,
  };
}

/** Sort order for "worst first" lists. */
export const SDS_SEVERITY: Record<SdsStatusKey, number> = {
  missing: 0,
  expired: 1,
  review: 2,
  current: 3,
};

/* ─────────────────────────── Tier II thresholds ────────────────────────── */

/** Reporting threshold for a hazardous chemical that is not an EHS, lb. */
export const TIER2_THRESHOLD_LB = 10_000;
/** Reporting threshold for an EHS: 500 lb or its TPQ, whichever is lower. */
export const EHS_THRESHOLD_LB = 500;

/** Tier II reporting ranges for the maximum and average daily amount. */
export const TIER2_RANGES: { code: string; min: number; max: number; label: string }[] = [
  { code: "01", min: 0, max: 99, label: "0 to 99 lb" },
  { code: "02", min: 100, max: 499, label: "100 to 499 lb" },
  { code: "03", min: 500, max: 999, label: "500 to 999 lb" },
  { code: "04", min: 1_000, max: 4_999, label: "1,000 to 4,999 lb" },
  { code: "05", min: 5_000, max: 9_999, label: "5,000 to 9,999 lb" },
  { code: "06", min: 10_000, max: 24_999, label: "10,000 to 24,999 lb" },
  { code: "07", min: 25_000, max: 49_999, label: "25,000 to 49,999 lb" },
  { code: "08", min: 50_000, max: 74_999, label: "50,000 to 74,999 lb" },
  { code: "09", min: 75_000, max: 99_999, label: "75,000 to 99,999 lb" },
  { code: "10", min: 100_000, max: 499_999, label: "100,000 to 499,999 lb" },
  { code: "11", min: 500_000, max: 999_999, label: "500,000 to 999,999 lb" },
  { code: "12", min: 1_000_000, max: 9_999_999, label: "1,000,000 to 9,999,999 lb" },
  { code: "13", min: 10_000_000, max: Infinity, label: "10,000,000 lb or more" },
];

export function tier2Range(lb: number) {
  return TIER2_RANGES.find((r) => lb >= r.min && lb <= r.max) ?? TIER2_RANGES[0];
}

export function isHazardous(product: Product): boolean {
  return product.physicalHazards.length > 0 || product.healthHazards.length > 0;
}

export function hasEhs(product: Product): boolean {
  return product.ingredients.some((i) => i.ehs);
}

/** lb of each EHS ingredient when `totalLb` of the product is on site. */
export function ehsAmounts(product: Product, totalLb: number) {
  return product.ingredients
    .filter((i) => i.ehs)
    .map((i) => {
      const lb = Math.round((totalLb * i.percent) / 100);
      const threshold = Math.min(EHS_THRESHOLD_LB, i.tpqLb ?? EHS_THRESHOLD_LB);
      return { ingredient: i, lb, threshold, over: lb >= threshold };
    });
}

/**
 * Whether a product at a facility has to go on the Tier II report:
 * an EHS ingredient at or above its threshold, or any hazardous chemical at or
 * above 10,000 lb.
 */
export function isReportable(product: Product, maxDailyLb: number): boolean {
  if (ehsAmounts(product, maxDailyLb).some((e) => e.over)) return true;
  return isHazardous(product) && maxDailyLb >= TIER2_THRESHOLD_LB;
}

/* ────────────────────────────── joined rows ────────────────────────────── */

export function buildInventoryRows(args: {
  inventory: InventoryRecord[];
  products: Product[];
  facilities: Facility[];
  sds: SdsDocument[];
  facilityId: FacilityScope;
  year: number;
  now?: Date;
}): InventoryRow[] {
  const { inventory, products, facilities, sds, facilityId, year } = args;
  const now = args.now ?? new Date();
  const productById = new Map(products.map((p) => [p.id, p]));
  const facilityById = new Map(facilities.map((f) => [f.id, f]));
  const sdsByProduct = new Map(sds.map((d) => [d.productId, d]));
  const rows: InventoryRow[] = [];
  for (const rec of inventory) {
    if (rec.year !== year) continue;
    if (facilityId !== "all" && rec.facilityId !== facilityId) continue;
    const product = productById.get(rec.productId);
    const facility = facilityById.get(rec.facilityId);
    if (!product || !facility) continue;
    const ehs = ehsAmounts(product, rec.maxDailyLb);
    rows.push({
      ...rec,
      product,
      facility,
      reportable: isReportable(product, rec.maxDailyLb),
      ehs: ehs.length > 0,
      ehsLb: ehs.reduce((sum, e) => sum + e.lb, 0),
      sds: getSdsStatus(sdsByProduct.get(product.id), now),
      rangeCode: tier2Range(rec.maxDailyLb).code,
    });
  }
  return rows;
}

export interface FacilityStats {
  facility: Facility;
  chemicals: number;
  reportable: number;
  ehs: number;
  totalMaxLb: number;
  sdsCurrent: number;
  sdsReview: number;
  sdsExpired: number;
  sdsMissing: number;
  /** share of chemicals with a current SDS, 0 to 100 */
  sdsCoverage: number;
}

export function facilityStats(rows: InventoryRow[], facilities: Facility[]): FacilityStats[] {
  return facilities.map((facility) => {
    const mine = rows.filter((r) => r.facilityId === facility.id);
    const count = (key: SdsStatusKey) => mine.filter((r) => r.sds.key === key).length;
    const sdsCurrent = count("current");
    const sdsReview = count("review");
    return {
      facility,
      chemicals: mine.length,
      reportable: mine.filter((r) => r.reportable).length,
      ehs: mine.filter((r) => r.ehs).length,
      totalMaxLb: mine.reduce((sum, r) => sum + r.maxDailyLb, 0),
      sdsCurrent,
      sdsReview,
      sdsExpired: count("expired"),
      sdsMissing: count("missing"),
      sdsCoverage: mine.length ? Math.round(((sdsCurrent + sdsReview) / mine.length) * 100) : 100,
    };
  });
}

/* ─────────────────────────── hazard vocabulary ─────────────────────────── */

export const GHS_META: Record<GhsCode, { name: string; short: string; meaning: string }> = {
  GHS01: { name: "Exploding bomb", short: "Explosive", meaning: "Explosives, self-reactives, organic peroxides" },
  GHS02: { name: "Flame", short: "Flammable", meaning: "Flammable gases, liquids and solids" },
  GHS03: { name: "Flame over circle", short: "Oxidizer", meaning: "Oxidizing gases, liquids and solids" },
  GHS04: { name: "Gas cylinder", short: "Gas under pressure", meaning: "Compressed, liquefied or dissolved gases" },
  GHS05: { name: "Corrosion", short: "Corrosive", meaning: "Skin corrosion, eye damage, corrosive to metals" },
  GHS06: { name: "Skull and crossbones", short: "Acute toxicity", meaning: "Fatal or toxic if swallowed, inhaled or on skin" },
  GHS07: { name: "Exclamation mark", short: "Irritant", meaning: "Irritant, harmful, narcotic effects" },
  GHS08: { name: "Health hazard", short: "Health hazard", meaning: "Carcinogen, reproductive toxicity, organ toxicity" },
  GHS09: { name: "Environment", short: "Aquatic toxicity", meaning: "Hazardous to the aquatic environment" },
};

export const GHS_ORDER: GhsCode[] = [
  "GHS01",
  "GHS02",
  "GHS03",
  "GHS04",
  "GHS05",
  "GHS06",
  "GHS07",
  "GHS08",
  "GHS09",
];

/** Hazard statements a label would carry, derived from the classification. */
export function hazardStatements(product: Product): { code: string; text: string }[] {
  const out: { code: string; text: string }[] = [];
  const has = (c: GhsCode) => product.pictograms.includes(c);
  const gas = product.physicalState === "Gas";
  if (has("GHS02")) {
    out.push(
      gas
        ? { code: "H220", text: "Extremely flammable gas" }
        : product.nfpa.flammability >= 3
          ? { code: "H225", text: "Highly flammable liquid and vapor" }
          : { code: "H226", text: "Flammable liquid and vapor" },
    );
  }
  if (has("GHS03")) {
    out.push(
      gas
        ? { code: "H270", text: "May cause or intensify fire; oxidizer" }
        : { code: "H272", text: "May intensify fire; oxidizer" },
    );
  }
  if (has("GHS04")) out.push({ code: "H280", text: "Contains gas under pressure; may explode if heated" });
  if (has("GHS05")) {
    if (product.physicalHazards.some((h) => h.startsWith("Corrosive"))) {
      out.push({ code: "H290", text: "May be corrosive to metals" });
    }
    out.push({ code: "H314", text: "Causes severe skin burns and eye damage" });
  }
  if (has("GHS06")) {
    out.push(
      gas
        ? { code: "H331", text: "Toxic if inhaled" }
        : { code: "H301 + H311", text: "Toxic if swallowed or in contact with skin" },
    );
  }
  if (has("GHS07") && !has("GHS05")) out.push({ code: "H319", text: "Causes serious eye irritation" });
  if (has("GHS07") && product.category === "Solvent") {
    out.push({ code: "H336", text: "May cause drowsiness or dizziness" });
  }
  if (has("GHS08")) {
    if (product.healthHazards.includes("Carcinogenicity")) {
      out.push({ code: "H350", text: "May cause cancer" });
    }
    if (product.healthHazards.includes("Reproductive toxicity")) {
      out.push({ code: "H361", text: "Suspected of damaging fertility or the unborn child" });
    }
    if (product.healthHazards.includes("Aspiration hazard")) {
      out.push({ code: "H304", text: "May be fatal if swallowed and enters airways" });
    }
    if (out.every((s) => !["H350", "H361", "H304"].includes(s.code))) {
      out.push({ code: "H373", text: "May cause damage to organs through prolonged or repeated exposure" });
    }
  }
  if (has("GHS09")) out.push({ code: "H410", text: "Very toxic to aquatic life with long lasting effects" });
  if (product.healthHazards.includes("Simple asphyxiant")) {
    out.push({ code: "OSHA", text: "May displace oxygen and cause rapid suffocation" });
  }
  return out;
}

/* ──────────────────────────────── reports ──────────────────────────────── */

export const REPORT_TYPE_META: Record<ReportType, { name: string; short: string; cite: string; description: string }> = {
  tier2: {
    name: "Tier II Emergency and Hazardous Chemical Inventory",
    short: "Tier II",
    cite: "EPCRA Section 312",
    description: "Annual inventory of hazardous chemicals at or above threshold, due March 1.",
  },
  list311: {
    name: "Hazardous Chemical List",
    short: "Section 311 list",
    cite: "EPCRA Section 311",
    description: "List of chemicals that require an SDS, grouped by hazard category.",
  },
  "sds-audit": {
    name: "SDS Compliance Summary",
    short: "SDS summary",
    cite: "Internal",
    description: "Every chemical on site with the age and status of its safety data sheet.",
  },
};

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  "not-started": "Not started",
  draft: "Draft",
  "in-review": "In review",
  ready: "Ready to submit",
  submitted: "Submitted",
  accepted: "Accepted",
};

/** Tier II for reporting year Y is due March 1 of Y + 1. */
export function tier2DueDate(year: number): string {
  return `${year + 1}-03-01`;
}
