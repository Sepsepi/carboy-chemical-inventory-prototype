// Builds the mock dataset. Deterministic: the same numbers on every load.
// Only the activity feed is relative to "now" so it always reads as recent.

import { addYears, tier2DueDate } from "@/lib/domain";
import type {
  ActivityEvent,
  ContainerType,
  InventoryRecord,
  Report,
  ReportStatus,
  SdsDocument,
  SdsVersion,
  StorageLocation,
  StoragePressure,
  StorageTemperature,
} from "@/lib/types";
import { CURRENT_REPORTING_YEAR, FACILITIES, PEOPLE, REPORTING_YEARS } from "./facilities";
import { PRODUCTS, SDS_SEED } from "./products";

/* ───────────────────────────── seeded random ───────────────────────────── */

function hash(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundQty(lb: number): number {
  if (lb >= 100_000) return Math.round(lb / 1000) * 1000;
  if (lb >= 10_000) return Math.round(lb / 100) * 100;
  if (lb >= 1_000) return Math.round(lb / 50) * 50;
  return Math.round(lb / 10) * 10;
}

/* ──────────────────────────── what is stored where ─────────────────────── */

const C: Record<string, ContainerType> = {
  AGT: "Above ground tank",
  TIB: "Tank inside building",
  SD: "Steel drum",
  PD: "Plastic drum",
  TOTE: "Tote bin",
  CYL: "Cylinder",
  CARBOY: "Carboy",
  CAN: "Can",
  BAG: "Bag",
  BATT: "Battery",
};

type Stock = [
  productId: string,
  baseMaxLb: number,
  container: keyof typeof C,
  area: string,
  detail: string,
  opts?: { from?: number; to?: number },
];

const STOCK: Record<string, Stock[]> = {
  pas: [
    ["sulfuric-93", 310_000, "AGT", "Tank Farm A", "Tank T-101"],
    ["hydrochloric-36", 142_000, "AGT", "Tank Farm A", "Tank T-102"],
    ["phosphoric-75", 96_000, "AGT", "Tank Farm A", "Tank T-104"],
    ["nitric-67", 38_000, "TIB", "Acid Bay", "Tank T-110"],
    ["hydrofluoric-49", 1_250, "CARBOY", "Acid Bay", "Cabinet A-3"],
    ["caustic-50", 420_000, "AGT", "Tank Farm B", "Tank T-201"],
    ["koh-45", 64_000, "AGT", "Tank Farm B", "Tank T-203"],
    ["aqua-ammonia-19", 52_000, "AGT", "Tank Farm B", "Tank T-206"],
    ["hypochlorite-125", 46_000, "AGT", "Tank Farm B", "Tank T-208"],
    ["anhydrous-ammonia", 26_000, "AGT", "Tank Farm B", "Bullet tank NH-1"],
    ["methanol", 118_000, "AGT", "Tank Farm C", "Tank T-301"],
    ["ipa-99", 76_000, "AGT", "Tank Farm C", "Tank T-303"],
    ["acetone", 54_000, "AGT", "Tank Farm C", "Tank T-304"],
    ["toluene", 88_000, "AGT", "Tank Farm C", "Tank T-306"],
    ["xylene", 61_000, "AGT", "Tank Farm C", "Tank T-307"],
    ["ethylene-glycol", 134_000, "AGT", "Tank Farm D", "Tank T-401"],
    ["peroxide-35", 28_000, "TOTE", "Oxidizer Cage", "Row 2"],
    ["formalin-37", 21_000, "TOTE", "Building 3", "Bay C"],
    ["citric-50", 24_000, "TOTE", "Building 3", "Bay A"],
    ["ethanol-190", 33_000, "TOTE", "Flammables Warehouse", "Aisle F2"],
    ["glycol-ether-eb", 18_500, "SD", "Drum Storage North", "Rows 4 to 6"],
    ["soda-ash", 82_000, "BAG", "Dry Storage", "Racks 1 to 8"],
    ["diesel", 14_200, "AGT", "Utilities Yard", "Generator tank G-1"],
    ["nitrogen", 9_800, "AGT", "Utilities Yard", "Bulk tank N-1"],
    ["propane", 4_200, "CYL", "Forklift Cage", "East dock"],
    ["lead-acid-battery", 11_800, "BATT", "Battery Room", "Charging stations 1 to 12"],
    ["hydraulic-aw46", 3_900, "SD", "Maintenance Shop", "Lube rack"],
    ["antifreeze-5050", 1_900, "PD", "Maintenance Shop", "Lube rack"],
    ["hd-degreaser", 2_600, "PD", "Maintenance Shop", "Wash bay", { from: 2026 }],
  ],
  bay: [
    ["toluene", 1_850_000, "AGT", "North Tank Field", "Tank 12"],
    ["xylene", 2_400_000, "AGT", "North Tank Field", "Tank 14"],
    ["hexane", 640_000, "AGT", "North Tank Field", "Tank 16", { from: 2024 }],
    ["methanol", 3_100_000, "AGT", "South Tank Field", "Tank 21"],
    ["acetone", 920_000, "AGT", "South Tank Field", "Tank 23"],
    ["styrene", 1_650_000, "AGT", "South Tank Field", "Tank 26"],
    ["caustic-50", 2_750_000, "AGT", "East Tank Field", "Tank 31"],
    ["sulfuric-93", 1_400_000, "AGT", "East Tank Field", "Tank 33"],
    ["ethylene-glycol", 1_980_000, "AGT", "East Tank Field", "Tank 35"],
    ["diesel", 86_000, "AGT", "Truck Rack", "Tank D-2"],
    ["gasoline", 21_000, "AGT", "Truck Rack", "Tank D-3", { to: 2024 }],
    ["nitrogen", 31_000, "AGT", "Utilities", "Bulk tank N-2"],
    ["propane", 2_800, "CYL", "Maintenance Yard", "Cylinder cage"],
    ["lead-acid-battery", 4_200, "BATT", "Control Building", "UPS room"],
    ["hydraulic-aw46", 2_200, "SD", "Pump House 1", "Lube station"],
  ],
  crp: [
    ["methanol", 2_200_000, "AGT", "Dock 1 Tankage", "Tank 102"],
    ["ethylene-glycol", 1_500_000, "AGT", "Dock 1 Tankage", "Tank 105"],
    ["phosphoric-75", 420_000, "AGT", "Dock 1 Tankage", "Tank 108", { from: 2023 }],
    ["caustic-50", 3_600_000, "AGT", "Dock 2 Tankage", "Tank 201"],
    ["sulfuric-93", 980_000, "AGT", "Dock 2 Tankage", "Tank 204"],
    ["aqua-ammonia-19", 310_000, "AGT", "Dock 2 Tankage", "Tank 207"],
    ["bisulfite-38", 38_000, "TOTE", "Wastewater Pad", "Dosing skid"],
    ["diesel", 124_000, "AGT", "Fuel Island", "Tank F-1"],
    ["nitrogen", 18_000, "AGT", "Utilities", "Bulk tank N-1"],
    ["propane", 6_100, "CYL", "Maintenance Yard", "Cylinder cage"],
    ["lead-acid-battery", 5_600, "BATT", "Dock Office", "UPS and forklift charging"],
    ["hydraulic-aw46", 3_100, "SD", "Loading Arm Shed", "Lube station"],
    ["antifreeze-5050", 1_400, "PD", "Maintenance Yard", "Parts room"],
  ],
  bmt: [
    ["ipa-99", 46_000, "TIB", "Fill Room 1", "Tank P-1"],
    ["acetone", 31_000, "TIB", "Fill Room 1", "Tank P-2"],
    ["ethanol-190", 18_900, "TOTE", "Flammables Warehouse", "Aisle 2"],
    ["mek", 12_400, "SD", "Flammables Warehouse", "Aisle 3"],
    ["ethyl-acetate", 9_800, "SD", "Flammables Warehouse", "Aisle 4"],
    ["methanol", 11_200, "SD", "Flammables Warehouse", "Aisle 5"],
    ["mineral-spirits", 27_500, "TOTE", "Flammables Warehouse", "Aisle 6"],
    ["toluene", 10_400, "SD", "Flammables Warehouse", "Aisle 7"],
    ["xylene", 8_900, "SD", "Flammables Warehouse", "Aisle 7"],
    ["glycol-ether-eb", 7_300, "SD", "Flammables Warehouse", "Aisle 8"],
    ["perc", 3_100, "SD", "Flammables Warehouse", "Aisle 9", { to: 2025 }],
    ["hydrochloric-36", 14_500, "TOTE", "Corrosives Bay", "Row A"],
    ["hypochlorite-125", 22_000, "TOTE", "Corrosives Bay", "Row B"],
    ["caustic-50", 19_800, "TOTE", "Corrosives Bay", "Row C"],
    ["citric-50", 6_800, "TOTE", "Corrosives Bay", "Row D"],
    ["peroxide-35", 8_400, "PD", "Oxidizer Room", "Bay 1"],
    ["hd-degreaser", 5_200, "PD", "Finished Goods", "Zone 4", { from: 2026 }],
    ["co2", 6_200, "CYL", "Fill Room 2", "Manifold"],
    ["nitrogen", 3_600, "CYL", "Fill Room 2", "Manifold"],
    ["propane", 5_400, "CYL", "Forklift Cage", "South dock"],
    ["lead-acid-battery", 9_400, "BATT", "Battery Room", "Charging stations 1 to 9"],
  ],
  lch: [
    ["portland-cement", 480_000, "BAG", "Dry Warehouse", "Zone C"],
    ["soda-ash", 210_000, "BAG", "Dry Warehouse", "Zone A"],
    ["cal-hypo-68", 64_000, "PD", "Oxidizer Building", "Bays 1 to 4"],
    ["hypochlorite-125", 58_000, "TOTE", "Liquid Warehouse", "Row 1"],
    ["alum-48", 86_000, "TOTE", "Liquid Warehouse", "Row 2"],
    ["ferric-chloride-40", 72_000, "TOTE", "Liquid Warehouse", "Row 3"],
    ["caustic-50", 36_000, "TOTE", "Liquid Warehouse", "Row 4"],
    ["bisulfite-38", 41_000, "TOTE", "Liquid Warehouse", "Row 5"],
    ["citric-50", 12_500, "TOTE", "Liquid Warehouse", "Row 6"],
    ["chlorine", 12_000, "CYL", "Chlorine Shed", "Ton container cradles 1 to 6"],
    ["propane", 3_800, "CYL", "Forklift Cage", "North dock"],
    ["lead-acid-battery", 7_100, "BATT", "Battery Room", "Charging stations 1 to 6"],
  ],
  tul: [
    ["epoxy-primer-a", 14_800, "SD", "Paint Kitchen", "Mix room"],
    ["pu-hardener", 6_200, "CAN", "Paint Kitchen", "Cabinet 2"],
    ["xylene", 9_600, "SD", "Flammables Shed", "Bay 1"],
    ["mek", 5_400, "SD", "Flammables Shed", "Bay 1"],
    ["acetone", 4_100, "SD", "Flammables Shed", "Bay 2"],
    ["mineral-spirits", 3_800, "SD", "Flammables Shed", "Bay 2"],
    ["perc", 4_400, "SD", "Parts Washing", "Degreaser 1"],
    ["phosphoric-75", 16_500, "TOTE", "Pretreatment Line", "Stage 2"],
    ["nitric-67", 2_900, "CARBOY", "Pretreatment Line", "Acid cabinet"],
    ["hydrofluoric-49", 380, "CARBOY", "Pretreatment Line", "Acid cabinet"],
    ["argon", 22_000, "AGT", "Gas Yard", "Bulk tank AR-1"],
    ["oxygen", 26_000, "AGT", "Gas Yard", "Bulk tank OX-1"],
    ["co2", 11_000, "AGT", "Gas Yard", "Bulk tank C-1"],
    ["propane", 8_800, "AGT", "Gas Yard", "Tank LP-1"],
    ["acetylene", 1_900, "CYL", "Gas Yard", "Cage 3"],
    ["nitrogen", 7_400, "CYL", "Gas Yard", "Cage 1"],
    ["diesel", 11_500, "AGT", "Yard", "Tank D-1"],
    ["hydraulic-aw46", 6_200, "SD", "Press Bay", "Lube rack"],
    ["antifreeze-5050", 2_100, "PD", "Maintenance", "Parts room"],
    ["hd-degreaser", 3_100, "PD", "Parts Washing", "Wash bay", { from: 2026 }],
    ["lead-acid-battery", 6_800, "BATT", "Battery Room", "Charging stations 1 to 5"],
  ],
};

const CRYO = new Set(["nitrogen", "argon", "oxygen", "co2"]);
const PRESSURIZED = new Set(["anhydrous-ammonia", "propane", "chlorine", "acetylene"]);

function conditions(
  productId: string,
  container: ContainerType,
): { pressure: StoragePressure; temperature: StorageTemperature } {
  if (CRYO.has(productId)) {
    return container === "Cylinder"
      ? { pressure: "Greater than ambient", temperature: "Ambient" }
      : { pressure: "Greater than ambient", temperature: "Cryogenic" };
  }
  if (PRESSURIZED.has(productId)) return { pressure: "Greater than ambient", temperature: "Ambient" };
  if (productId === "styrene") return { pressure: "Ambient", temperature: "Less than ambient" };
  if (productId === "caustic-50" && container === "Above ground tank") {
    return { pressure: "Ambient", temperature: "Greater than ambient" };
  }
  return { pressure: "Ambient", temperature: "Ambient" };
}

const YEARS_ASC = [...REPORTING_YEARS].sort((a, b) => a - b);

function buildInventory(): InventoryRecord[] {
  const out: InventoryRecord[] = [];
  for (const facility of FACILITIES) {
    const stock = STOCK[facility.id] ?? [];
    for (const [productId, base, containerKey, area, detail, opts] of stock) {
      const r = rng(`${facility.id}:${productId}`);
      const trend = -0.04 + r() * 0.11; // per year
      const avgRatio = 0.5 + r() * 0.32;
      const partYear = r() < 0.15;
      const container = C[containerKey];
      const cond = conditions(productId, container);
      const tank = container === "Above ground tank" || container === "Tank inside building";
      const secondShare = tank && base > 8_000 && r() < 0.42 ? 0.03 + r() * 0.05 : 0;
      for (const year of YEARS_ASC) {
        if (opts?.from && year < opts.from) continue;
        if (opts?.to && year > opts.to) continue;
        const noise = 0.92 + r() * 0.16;
        const max = roundQty(base * (1 + trend * (year - 2024)) * noise);
        const avg = roundQty(max * Math.min(0.9, avgRatio * (0.95 + r() * 0.1)));
        const locations: StorageLocation[] = [];
        const secondLb = secondShare ? roundQty(max * secondShare) : 0;
        locations.push({
          id: `${facility.id}-${productId}-${year}-a`,
          area,
          detail,
          containerType: container,
          ...cond,
          maxLb: max - secondLb,
        });
        if (secondLb > 0) {
          locations.push({
            id: `${facility.id}-${productId}-${year}-b`,
            area: facility.id === "pas" ? "Blend Hall" : "Transfer Area",
            detail: facility.id === "pas" ? "Day tank" : "Sample and transfer drums",
            containerType: facility.id === "pas" ? "Tank inside building" : "Steel drum",
            pressure: "Ambient",
            temperature: "Ambient",
            maxLb: secondLb,
          });
        }
        const current = year === CURRENT_REPORTING_YEAR;
        const month = current ? 9 + Math.floor(r() * 3) : 1 + Math.floor(r() * 2);
        const day = 1 + Math.floor(r() * (current && month === 11 ? 20 : 27));
        const stampYear = current ? year : year + 1;
        out.push({
          id: `${facility.id}-${productId}-${year}`,
          productId,
          facilityId: facility.id,
          year,
          maxDailyLb: max,
          avgDailyLb: avg,
          daysOnSite: partYear ? 150 + Math.floor(r() * 190) : 365,
          locations,
          updatedAt: `${stampYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          updatedBy: r() < 0.6 ? facility.siteLead : "Dana Whitaker",
        });
      }
    }
  }
  return out;
}

/* ─────────────────────────────── SDS library ───────────────────────────── */

const CHANGE_NOTES = [
  "Section 2 hazard classification updated",
  "Section 8 exposure limits revised",
  "Composition range adjusted in Section 3",
  "Transport information updated in Section 14",
  "Emergency phone number and supplier address updated",
  "Section 11 toxicological data expanded",
  "Reformatted to the 16-section layout",
  "Section 15 regulatory information updated",
];

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildSds(): SdsDocument[] {
  const docs: SdsDocument[] = [];
  let n = 400;
  for (const product of PRODUCTS) {
    const seed = SDS_SEED[product.id];
    n += 1;
    if (!seed) continue;
    const r = rng(`sds:${product.id}`);
    const versions: SdsVersion[] = [];
    let rev = seed.rev;
    for (let i = 0; i < seed.versions; i++) {
      const major = seed.versions - i;
      const minor = i === 0 && r() < 0.35 ? 1 : 0;
      const version = `${major}.${minor}`;
      const first = i === seed.versions - 1;
      versions.push({
        version,
        revisionDate: rev,
        uploadedAt: shiftDate(rev, 6 + Math.floor(r() * 48)),
        uploadedBy: PEOPLE[Math.floor(r() * 3)].name,
        fileName: `${product.productCode}_SDS_v${version}_EN.pdf`,
        fileSizeKb: 180 + Math.floor(r() * 460),
        pages: 7 + Math.floor(r() * 9),
        changeNote: first ? "First version on file" : CHANGE_NOTES[Math.floor(r() * CHANGE_NOTES.length)],
      });
      // the version before this one: 20 to 42 months earlier
      rev = shiftDate(rev, -(600 + Math.floor(r() * 680)));
    }
    docs.push({
      id: `SDS-${String(n).padStart(5, "0")}`,
      productId: product.id,
      language: seed.bilingual ? "English, Spanish" : "English",
      versions,
      updateRequestedAt:
        product.id === "alum-48" ? "2026-10-28" : product.id === "portland-cement" ? "2026-11-12" : undefined,
    });
  }
  return docs;
}

/* ───────────────────────────────── reports ─────────────────────────────── */

const CURRENT_STATUS: Record<string, ReportStatus> = {
  pas: "in-review",
  bay: "draft",
  crp: "draft",
  bmt: "not-started",
  lch: "ready",
  tul: "draft",
};

function buildReports(): Report[] {
  const out: Report[] = [];
  for (const facility of FACILITIES) {
    for (const year of REPORTING_YEARS) {
      const r = rng(`report:${facility.id}:${year}`);
      const dueDate = tier2DueDate(year);
      if (year === CURRENT_REPORTING_YEAR) {
        const status = CURRENT_STATUS[facility.id] ?? "draft";
        out.push({
          id: `t2-${facility.id}-${year}`,
          type: "tier2",
          facilityId: facility.id,
          year,
          status,
          dueDate,
          preparedBy: status === "not-started" ? undefined : facility.siteLead,
          reviewedBy: status === "in-review" || status === "ready" ? "Dana Whitaker" : undefined,
          updatedAt: `2026-11-${String(3 + Math.floor(r() * 19)).padStart(2, "0")}`,
        });
      } else {
        const submittedAt = `${year + 1}-02-${String(9 + Math.floor(r() * 17)).padStart(2, "0")}`;
        out.push({
          id: `t2-${facility.id}-${year}`,
          type: "tier2",
          facilityId: facility.id,
          year,
          status: "accepted",
          dueDate,
          preparedBy: facility.siteLead,
          reviewedBy: "Dana Whitaker",
          submittedAt,
          confirmation: `T2-${facility.state}-${year}-${String(100000 + Math.floor(r() * 899999))}`,
          updatedAt: submittedAt,
        });
      }
    }
  }
  return out;
}

/* ───────────────────────────────── activity ────────────────────────────── */

function buildActivity(now: Date): ActivityEvent[] {
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
  const H = 60;
  const D = 24 * H;
  const events: Omit<ActivityEvent, "id">[] = [
    { kind: "inventory-updated", at: ago(38), actor: "Marcus Reyes", summary: "updated quantities for Caustic Soda 50%", facilityId: "pas", productId: "caustic-50", href: "/inventory?product=caustic-50" },
    { kind: "report-status", at: ago(2 * H + 10), actor: "Dana Whitaker", summary: "moved the 2026 Tier II report to In review", facilityId: "pas", href: "/reports?facility=pas&year=2026" },
    { kind: "sds-uploaded", at: ago(5 * H), actor: "Priya Natarajan", summary: "uploaded version 4.0 of the Formaldehyde 37% SDS", productId: "formalin-37", href: "/sds?product=formalin-37" },
    { kind: "sds-requested", at: ago(1 * D + 3 * H), actor: "Dana Whitaker", summary: "asked Ridgeline Materials for a current Portland Cement SDS", productId: "portland-cement", href: "/sds?product=portland-cement" },
    { kind: "product-added", at: ago(2 * D), actor: "Caleb Mendoza", summary: "added Ardent HD Degreaser to the inventory", facilityId: "tul", productId: "hd-degreaser", href: "/inventory?product=hd-degreaser" },
    { kind: "inventory-updated", at: ago(2 * D + 5 * H), actor: "Lena Brandt", summary: "recorded a delivery of Sodium Hypochlorite 12.5%", facilityId: "lch", productId: "hypochlorite-125", href: "/inventory?product=hypochlorite-125" },
    { kind: "report-status", at: ago(3 * D), actor: "Lena Brandt", summary: "marked the 2026 Tier II report Ready to submit", facilityId: "lch", href: "/reports?facility=lch&year=2026" },
    { kind: "sds-flagged", at: ago(4 * D), actor: "Carboy", summary: "flagged the Perchloroethylene SDS: revision is over five years old", productId: "perc", href: "/sds?product=perc" },
    { kind: "inventory-updated", at: ago(5 * D + 2 * H), actor: "Tom Okafor", summary: "updated the tank gauge reading for Styrene Monomer", facilityId: "bay", productId: "styrene", href: "/inventory?product=styrene" },
    { kind: "sds-uploaded", at: ago(6 * D), actor: "Marcus Reyes", summary: "uploaded version 4.0 of the Styrene Monomer SDS", productId: "styrene", href: "/sds?product=styrene" },
    { kind: "report-generated", at: ago(8 * D), actor: "Priya Natarajan", summary: "generated a draft Tier II report for 2026", facilityId: "crp", href: "/reports?facility=crp&year=2026" },
    { kind: "inventory-updated", at: ago(9 * D), actor: "Caleb Mendoza", summary: "moved Hydrofluoric Acid 49% to the Pretreatment Line acid cabinet", facilityId: "tul", productId: "hydrofluoric-49", href: "/inventory?product=hydrofluoric-49" },
    { kind: "sds-requested", at: ago(12 * D), actor: "Dana Whitaker", summary: "asked Bluewater Treatment for a current Aluminum Sulfate SDS", productId: "alum-48", href: "/sds?product=alum-48" },
    { kind: "inventory-updated", at: ago(14 * D), actor: "Priya Natarajan", summary: "updated quantities for Methanol", facilityId: "crp", productId: "methanol", href: "/inventory?product=methanol" },
  ];
  return events.map((e, i) => ({ ...e, id: `act-${i + 1}` }));
}

/* ───────────────────────────────── export ──────────────────────────────── */

export function buildSeed(now: Date = new Date()) {
  return {
    facilities: FACILITIES,
    products: PRODUCTS,
    inventory: buildInventory(),
    sds: buildSds(),
    reports: buildReports(),
    activity: buildActivity(now),
  };
}

export type SeedData = ReturnType<typeof buildSeed>;

// re-exported so callers do not need two imports
export { addYears };
