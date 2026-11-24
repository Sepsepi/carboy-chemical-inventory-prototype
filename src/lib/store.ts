"use client";

// The whole prototype runs on this in-memory store. There is no backend:
// every add, edit and upload changes the state here, and every screen reads
// from it, so a change on one screen shows on the others. A reload resets it.

import { useMemo } from "react";
import { create } from "zustand";
import { buildInventoryRows, getSdsStatus, SDS_SEVERITY } from "@/lib/domain";
import { CURRENT_REPORTING_YEAR, CURRENT_USER } from "@/lib/seed/facilities";
import { buildSeed } from "@/lib/seed/generate";
import type {
  ActivityEvent,
  Facility,
  FacilityScope,
  InventoryRecord,
  InventoryRow,
  Product,
  Report,
  ReportStatus,
  SdsDocument,
  SdsStatus,
  SdsVersion,
} from "@/lib/types";

interface AppState {
  facilities: Facility[];
  products: Product[];
  inventory: InventoryRecord[];
  sds: SdsDocument[];
  reports: Report[];
  activity: ActivityEvent[];

  /** the facility and reporting year every screen is looking at */
  facilityId: FacilityScope;
  year: number;
  setFacility: (id: FacilityScope) => void;
  setYear: (year: number) => void;

  /** Add a product to the catalog. Returns it. */
  addProduct: (product: Product) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;

  /** Create or replace the record for a product at a facility in a year. */
  upsertInventoryRecord: (record: InventoryRecord) => void;
  /** Change fields of an existing record (quantities, locations). */
  updateInventoryRecord: (id: string, patch: Partial<InventoryRecord>) => void;
  removeInventoryRecord: (id: string) => void;

  /** Add a new SDS version; creates the document when the product has none. */
  addSdsVersion: (productId: string, version: SdsVersion, language?: SdsDocument["language"]) => void;
  /** Record that an updated SDS was requested from the manufacturer. */
  requestSdsUpdate: (productId: string) => void;

  setReportStatus: (id: string, status: ReportStatus, patch?: Partial<Report>) => void;
  upsertReport: (report: Report) => void;

  /** Add a line to the activity feed. `actor` defaults to the signed-in user. */
  logActivity: (event: Omit<ActivityEvent, "id" | "at" | "actor"> & { actor?: string }) => void;

  /** Put all mock data back to its starting state. */
  resetDemo: () => void;
}

let activityCounter = 1000;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useAppStore = create<AppState>()((set, get) => ({
  ...buildSeed(),
  facilityId: "all",
  year: CURRENT_REPORTING_YEAR,

  setFacility: (facilityId) => set({ facilityId }),
  setYear: (year) => set({ year }),

  addProduct: (product) => {
    const next = { ...product, isNew: true };
    set((s) => ({ products: [next, ...s.products] }));
    return next;
  },
  updateProduct: (id, patch) =>
    set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

  upsertInventoryRecord: (record) =>
    set((s) => {
      const exists = s.inventory.some((r) => r.id === record.id);
      return {
        inventory: exists
          ? s.inventory.map((r) => (r.id === record.id ? record : r))
          : [record, ...s.inventory],
      };
    }),
  updateInventoryRecord: (id, patch) =>
    set((s) => ({
      inventory: s.inventory.map((r) =>
        r.id === id ? { ...r, ...patch, updatedAt: today(), updatedBy: CURRENT_USER.name } : r,
      ),
    })),
  removeInventoryRecord: (id) => set((s) => ({ inventory: s.inventory.filter((r) => r.id !== id) })),

  addSdsVersion: (productId, version, language) =>
    set((s) => {
      const existing = s.sds.find((d) => d.productId === productId);
      if (existing) {
        return {
          sds: s.sds.map((d) =>
            d.productId === productId
              ? { ...d, language: language ?? d.language, versions: [version, ...d.versions], updateRequestedAt: undefined }
              : d,
          ),
        };
      }
      const nextNumber =
        s.sds.reduce((max, d) => Math.max(max, Number(d.id.replace(/\D/g, "")) || 0), 400) + 1;
      const doc: SdsDocument = {
        id: `SDS-${String(nextNumber).padStart(5, "0")}`,
        productId,
        language: language ?? "English",
        versions: [version],
      };
      return { sds: [doc, ...s.sds] };
    }),
  requestSdsUpdate: (productId) =>
    set((s) => ({
      sds: s.sds.map((d) => (d.productId === productId ? { ...d, updateRequestedAt: today() } : d)),
    })),

  setReportStatus: (id, status, patch) =>
    set((s) => ({
      reports: s.reports.map((r) => (r.id === id ? { ...r, ...patch, status, updatedAt: today() } : r)),
    })),
  upsertReport: (report) =>
    set((s) => {
      const exists = s.reports.some((r) => r.id === report.id);
      return {
        reports: exists ? s.reports.map((r) => (r.id === report.id ? report : r)) : [report, ...s.reports],
      };
    }),

  logActivity: (event) => {
    activityCounter += 1;
    const full: ActivityEvent = {
      ...event,
      id: `act-${activityCounter}`,
      at: new Date().toISOString(),
      actor: event.actor ?? CURRENT_USER.name,
    };
    set((s) => ({ activity: [full, ...s.activity] }));
  },

  resetDemo: () => {
    const { facilityId, year } = get();
    set({ ...buildSeed(), facilityId, year });
  },
}));

/* ───────────────────────────── convenience hooks ───────────────────────── */

/** The facility and reporting year in view, with their setters. */
export function useScope() {
  const facilityId = useAppStore((s) => s.facilityId);
  const year = useAppStore((s) => s.year);
  const setFacility = useAppStore((s) => s.setFacility);
  const setYear = useAppStore((s) => s.setYear);
  const facilities = useAppStore((s) => s.facilities);
  const facility = facilityId === "all" ? undefined : facilities.find((f) => f.id === facilityId);
  return { facilityId, year, setFacility, setYear, facility, facilities };
}

/**
 * Inventory rows joined with product, facility, SDS status and Tier II flags.
 * Defaults to the scope in view; pass a facility or year to override it.
 */
export function useInventoryRows(override?: { facilityId?: FacilityScope; year?: number }): InventoryRow[] {
  const inventory = useAppStore((s) => s.inventory);
  const products = useAppStore((s) => s.products);
  const facilities = useAppStore((s) => s.facilities);
  const sds = useAppStore((s) => s.sds);
  const scopeFacility = useAppStore((s) => s.facilityId);
  const scopeYear = useAppStore((s) => s.year);
  const facilityId = override?.facilityId ?? scopeFacility;
  const year = override?.year ?? scopeYear;
  return useMemo(
    () => buildInventoryRows({ inventory, products, facilities, sds, facilityId, year }),
    [inventory, products, facilities, sds, facilityId, year],
  );
}

export interface SdsRow {
  product: Product;
  /** undefined when no SDS is on file */
  doc?: SdsDocument;
  status: SdsStatus;
  /** facilities that hold this product in the given year */
  facilities: Facility[];
}

/** One row per product with its SDS, status and where it is used. Worst first. */
export function useSdsRows(year?: number): SdsRow[] {
  const products = useAppStore((s) => s.products);
  const sds = useAppStore((s) => s.sds);
  const inventory = useAppStore((s) => s.inventory);
  const facilities = useAppStore((s) => s.facilities);
  const scopeYear = useAppStore((s) => s.year);
  const y = year ?? scopeYear;
  return useMemo(() => {
    const now = new Date();
    const docByProduct = new Map(sds.map((d) => [d.productId, d]));
    const facilityById = new Map(facilities.map((f) => [f.id, f]));
    const usedAt = new Map<string, Set<string>>();
    for (const rec of inventory) {
      if (rec.year !== y) continue;
      if (!usedAt.has(rec.productId)) usedAt.set(rec.productId, new Set());
      usedAt.get(rec.productId)!.add(rec.facilityId);
    }
    return products
      .map((product) => {
        const doc = docByProduct.get(product.id);
        return {
          product,
          doc,
          status: getSdsStatus(doc, now),
          facilities: [...(usedAt.get(product.id) ?? [])]
            .map((id) => facilityById.get(id))
            .filter((f): f is Facility => Boolean(f)),
        };
      })
      .sort(
        (a, b) =>
          SDS_SEVERITY[a.status.key] - SDS_SEVERITY[b.status.key] ||
          (a.status.daysLeft ?? 0) - (b.status.daysLeft ?? 0),
      );
  }, [products, sds, inventory, facilities, y]);
}

/** Tier II reports for a year, one per facility. */
export function useReports(year?: number): Report[] {
  const reports = useAppStore((s) => s.reports);
  const scopeYear = useAppStore((s) => s.year);
  const y = year ?? scopeYear;
  return useMemo(() => reports.filter((r) => r.year === y), [reports, y]);
}
