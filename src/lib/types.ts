// Domain model for the Carboy prototype. All data is mock; see src/lib/seed.

export type GhsCode =
  | "GHS01"
  | "GHS02"
  | "GHS03"
  | "GHS04"
  | "GHS05"
  | "GHS06"
  | "GHS07"
  | "GHS08"
  | "GHS09";

export type PhysicalState = "Solid" | "Liquid" | "Gas";
export type SignalWord = "Danger" | "Warning" | null;

export type ProductCategory =
  | "Acid"
  | "Base"
  | "Solvent"
  | "Fuel"
  | "Compressed gas"
  | "Oxidizer"
  | "Water treatment"
  | "Coating"
  | "Lubricant"
  | "Cleaning"
  | "Raw material"
  | "Battery";

export interface Ingredient {
  name: string;
  cas: string;
  /** typical weight percent in the product */
  percent: number;
  /** on the EPCRA Extremely Hazardous Substances list */
  ehs: boolean;
  /** threshold planning quantity in lb, EHS only */
  tpqLb?: number;
}

export interface Nfpa {
  health: 0 | 1 | 2 | 3 | 4;
  flammability: 0 | 1 | 2 | 3 | 4;
  instability: 0 | 1 | 2 | 3 | 4;
  special?: "OX" | "W" | "SA";
}

export interface Product {
  id: string;
  name: string;
  manufacturer: string;
  productCode: string;
  category: ProductCategory;
  physicalState: PhysicalState;
  signalWord: SignalWord;
  pictograms: GhsCode[];
  /** Tier II physical hazard categories */
  physicalHazards: string[];
  /** Tier II health hazard categories */
  healthHazards: string[];
  nfpa: Nfpa;
  unNumber?: string;
  /** lb per US gallon, liquids only */
  densityLbGal?: number;
  ingredients: Ingredient[];
  /** true when added during this session through the UI */
  isNew?: boolean;
}

export type FacilityType =
  | "Chemical blending"
  | "Bulk liquid terminal"
  | "Marine terminal"
  | "Packaging and distribution"
  | "Warehouse"
  | "Metal fabrication";

export interface Facility {
  id: string;
  /** three-letter site code, e.g. PAS */
  code: string;
  name: string;
  type: FacilityType;
  street: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  naics: string;
  maxOccupants: number;
  manned: boolean;
  lepc: string;
  fireDepartment: string;
  emergencyContact: { name: string; title: string; phone: string };
  siteLead: string;
}

export type ContainerType =
  | "Above ground tank"
  | "Tank inside building"
  | "Steel drum"
  | "Plastic drum"
  | "Tote bin"
  | "Cylinder"
  | "Carboy"
  | "Can"
  | "Bag"
  | "Box"
  | "Silo"
  | "Plastic bottles or jugs"
  | "Battery";

export type StoragePressure = "Ambient" | "Greater than ambient" | "Less than ambient";
export type StorageTemperature =
  | "Ambient"
  | "Greater than ambient"
  | "Less than ambient"
  | "Cryogenic";

export interface StorageLocation {
  id: string;
  /** area of the site, e.g. "Tank Farm A" */
  area: string;
  /** more exact position, e.g. "Tank T-104" */
  detail: string;
  containerType: ContainerType;
  pressure: StoragePressure;
  temperature: StorageTemperature;
  /** largest amount held here during the year, lb */
  maxLb: number;
}

/** One product at one facility for one reporting year. */
export interface InventoryRecord {
  id: string;
  productId: string;
  facilityId: string;
  year: number;
  maxDailyLb: number;
  avgDailyLb: number;
  daysOnSite: number;
  locations: StorageLocation[];
  /** ISO date */
  updatedAt: string;
  updatedBy: string;
}

export interface SdsVersion {
  /** e.g. "4.1" */
  version: string;
  /** the date printed on the SDS (section 16), ISO date */
  revisionDate: string;
  /** when it was added to the library, ISO date */
  uploadedAt: string;
  uploadedBy: string;
  fileName: string;
  fileSizeKb: number;
  pages: number;
  changeNote: string;
}

export interface SdsDocument {
  id: string;
  productId: string;
  language: "English" | "English, Spanish";
  /** newest first */
  versions: SdsVersion[];
  /** set when an update has been requested from the manufacturer, ISO date */
  updateRequestedAt?: string;
}

export type SdsStatusKey = "current" | "review" | "expired" | "missing";

export interface SdsStatus {
  key: SdsStatusKey;
  label: string;
  /** age of the latest revision in days; undefined when missing */
  ageDays?: number;
  ageYears?: number;
  /** the day the latest revision turns five years old, ISO date */
  expiresOn?: string;
  /** days until expiresOn; negative once it has passed */
  daysLeft?: number;
}

export type ReportType = "tier2" | "list311" | "sds-audit";

export type ReportStatus =
  | "not-started"
  | "draft"
  | "in-review"
  | "ready"
  | "submitted"
  | "accepted";

export interface Report {
  id: string;
  type: ReportType;
  facilityId: string;
  year: number;
  status: ReportStatus;
  /** ISO date */
  dueDate: string;
  preparedBy?: string;
  reviewedBy?: string;
  /** ISO date */
  submittedAt?: string;
  confirmation?: string;
  /** ISO date */
  updatedAt: string;
}

export type ActivityKind =
  | "inventory-updated"
  | "product-added"
  | "sds-uploaded"
  | "sds-requested"
  | "sds-flagged"
  | "report-status"
  | "report-generated";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  /** ISO datetime */
  at: string;
  actor: string;
  /** plain sentence, e.g. "updated quantities for Toluene" */
  summary: string;
  facilityId?: string;
  productId?: string;
  /** in-app link for the item */
  href?: string;
}

export interface Person {
  name: string;
  title: string;
  initials: string;
  email: string;
}

/** "all" means every facility. */
export type FacilityScope = "all" | string;

/** An inventory record joined with everything a table row needs. */
export interface InventoryRow extends InventoryRecord {
  product: Product;
  facility: Facility;
  /** meets a Tier II reporting threshold for this facility and year */
  reportable: boolean;
  /** contains an Extremely Hazardous Substance */
  ehs: boolean;
  /** lb of EHS ingredients at the max daily amount */
  ehsLb: number;
  sds: SdsStatus;
  /** Tier II range code for the max daily amount, "01" to "13" */
  rangeCode: string;
}
