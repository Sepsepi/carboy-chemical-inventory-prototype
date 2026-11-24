// Pure helpers for the inventory screen: option lists, text for search and
// CSV, and the plain-words explanation of why a record is or is not on the
// Tier II report. No React here.

import {
  EHS_THRESHOLD_LB,
  GHS_META,
  SDS_STATUS_LABEL,
  TIER2_THRESHOLD_LB,
  ehsAmounts,
  isHazardous,
  tier2Range,
} from "@/lib/domain";
import { formatDate, formatLb, formatNumber } from "@/lib/format";
import type {
  ContainerType,
  GhsCode,
  InventoryRow,
  PhysicalState,
  Product,
  ProductCategory,
  SdsStatusKey,
  StoragePressure,
  StorageTemperature,
} from "@/lib/types";

export const PHYSICAL_STATES: PhysicalState[] = ["Solid", "Liquid", "Gas"];

export const CATEGORIES: ProductCategory[] = [
  "Acid",
  "Base",
  "Solvent",
  "Fuel",
  "Compressed gas",
  "Oxidizer",
  "Water treatment",
  "Coating",
  "Lubricant",
  "Cleaning",
  "Raw material",
  "Battery",
];

export const CONTAINER_TYPES: ContainerType[] = [
  "Above ground tank",
  "Tank inside building",
  "Steel drum",
  "Plastic drum",
  "Tote bin",
  "Cylinder",
  "Carboy",
  "Can",
  "Bag",
  "Box",
  "Silo",
  "Plastic bottles or jugs",
  "Battery",
];

export const PRESSURES: StoragePressure[] = ["Ambient", "Greater than ambient", "Less than ambient"];
export const TEMPERATURES: StorageTemperature[] = [
  "Ambient",
  "Greater than ambient",
  "Less than ambient",
  "Cryogenic",
];

export const SDS_KEYS: SdsStatusKey[] = ["current", "review", "expired", "missing"];

/** Facet values for the Reporting filter. A row can carry both kinds. */
export const REPORTING_OPTIONS = [
  { value: "reportable", label: "Tier II reportable" },
  { value: "below", label: "Below threshold" },
  { value: "ehs", label: "Contains an EHS" },
] as const;

export function reportingFacets(row: InventoryRow): string[] {
  const out = [row.reportable ? "reportable" : "below"];
  if (row.ehs) out.push("ehs");
  return out;
}

/** The CAS shown for a product: the one substance, or null for a mixture. Water is ignored. */
export function primaryCas(product: Product): string | null {
  const real = product.ingredients.filter((i) => i.cas !== "7732-18-5");
  return real.length === 1 ? real[0].cas : null;
}

/** Everything a search should find a row by, in one lowercase string. */
export function searchText(row: InventoryRow): string {
  const p = row.product;
  return [
    p.name,
    p.manufacturer,
    p.productCode,
    p.unNumber,
    row.facility.code,
    row.facility.name,
    ...p.ingredients.flatMap((i) => [i.name, i.cas]),
    ...row.locations.flatMap((l) => [l.area, l.detail, l.containerType]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function signalTone(signal: Product["signalWord"]) {
  return signal === "Danger" ? "critical" : signal === "Warning" ? "warn" : "neutral";
}

/* ─────────────────────────── reporting in words ────────────────────────── */

export interface ReportingExplanation {
  reportable: boolean;
  /** "Reportable" / "Below threshold" / "Not reportable" */
  verdict: string;
  /** the reason with the numbers */
  reason: string;
}

export function explainReporting(product: Product, maxDailyLb: number): ReportingExplanation {
  const ehs = ehsAmounts(product, maxDailyLb);
  const over = ehs.filter((e) => e.over);
  if (over.length > 0) {
    const e = over[0];
    const which =
      e.threshold < EHS_THRESHOLD_LB
        ? `its ${formatLb(e.threshold)} threshold planning quantity`
        : `the ${formatLb(EHS_THRESHOLD_LB)} EHS threshold`;
    return {
      reportable: true,
      verdict: "Reportable",
      reason: `${formatLb(e.lb)} of ${e.ingredient.name.toLowerCase()} is ${e.lb === e.threshold ? "at" : "over"} ${which}.`,
    };
  }
  if (!isHazardous(product)) {
    return {
      reportable: false,
      verdict: "Not reportable",
      reason: "No OSHA physical or health hazard is listed for this product, so no Tier II threshold applies.",
    };
  }
  if (maxDailyLb >= TIER2_THRESHOLD_LB) {
    return {
      reportable: true,
      verdict: "Reportable",
      reason: `${formatLb(maxDailyLb)} is ${maxDailyLb === TIER2_THRESHOLD_LB ? "at" : "over"} the ${formatLb(TIER2_THRESHOLD_LB)} threshold.`,
    };
  }
  const parts = [`${formatLb(maxDailyLb)} is under the ${formatLb(TIER2_THRESHOLD_LB)} threshold`];
  for (const e of ehs) {
    parts.push(
      `${formatLb(e.lb)} of ${e.ingredient.name.toLowerCase()} is under its ${formatLb(e.threshold)} ${
        e.threshold < EHS_THRESHOLD_LB ? "threshold planning quantity" : "EHS threshold"
      }`,
    );
  }
  return {
    reportable: false,
    verdict: "Below threshold",
    reason: `${parts.join(", and ")}.`,
  };
}

/* ────────────────────────────────── CSV ────────────────────────────────── */

export const CSV_HEADERS = [
  "Product",
  "Manufacturer",
  "Product code",
  "CAS",
  "Ingredients",
  "Facility code",
  "Facility",
  "Reporting year",
  "Category",
  "Physical state",
  "Hazard classes",
  "Max daily (lb)",
  "Avg daily (lb)",
  "Days on site",
  "Tier II range",
  "Tier II reportable",
  "Contains EHS",
  "SDS status",
  "Storage locations",
  "Updated",
  "Updated by",
];

export function csvRow(r: InventoryRow): (string | number)[] {
  const p = r.product;
  return [
    p.name,
    p.manufacturer,
    p.productCode,
    primaryCas(p) ?? "Mixture",
    p.ingredients.map((i) => `${i.name} (${i.cas}) ${i.percent}%`).join("; "),
    r.facility.code,
    r.facility.name,
    r.year,
    p.category,
    p.physicalState,
    p.pictograms.map((c: GhsCode) => GHS_META[c].short).join("; "),
    r.maxDailyLb,
    r.avgDailyLb,
    r.daysOnSite,
    `${r.rangeCode} (${tier2Range(r.maxDailyLb).label})`,
    r.reportable ? "Yes" : "No",
    r.ehs ? "Yes" : "No",
    SDS_STATUS_LABEL[r.sds.key],
    r.locations.map((l) => `${l.area}, ${l.detail} (${l.containerType}, ${formatNumber(l.maxLb)} lb)`).join("; "),
    formatDate(r.updatedAt),
    r.updatedBy,
  ];
}

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? formatNumber(n);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/%/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export const CAS_RE = /^\d{2,7}-\d{2}-\d$/;
