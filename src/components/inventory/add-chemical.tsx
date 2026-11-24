"use client";

import * as React from "react";
import { Check, ChevronsUpDown, CircleAlert, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GHS_META, GHS_ORDER, tier2Range } from "@/lib/domain";
import { CURRENT_USER, REPORTING_YEARS } from "@/lib/seed/facilities";
import { useAppStore, useScope } from "@/lib/store";
import type {
  ContainerType,
  GhsCode,
  InventoryRecord,
  PhysicalState,
  Product,
  ProductCategory,
  SignalWord,
  StoragePressure,
  StorageTemperature,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { GhsList, GhsPictogram } from "@/components/hazard/ghs-pictogram";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ReportingLine } from "./detail-edit";
import { FormField, parseAmount, validateQuantities } from "./form-field";
import {
  CAS_RE,
  CATEGORIES,
  CONTAINER_TYPES,
  PHYSICAL_STATES,
  PRESSURES,
  TEMPERATURES,
  primaryCas,
  slugify,
} from "./model";

// Tier II hazard categories implied by each pictogram, for a product typed in by hand.
// The strings match the categories used across the catalog.
const PHYS: Partial<Record<GhsCode, string>> = {
  GHS01: "Explosive",
  GHS02: "Flammable (gases, aerosols, liquids, or solids)",
  GHS03: "Oxidizer (liquid, solid or gas)",
  GHS04: "Gas under pressure (compressed gas)",
};
const HEALTH: Partial<Record<GhsCode, string[]>> = {
  GHS05: ["Skin corrosion or irritation", "Serious eye damage or eye irritation"],
  GHS06: ["Acute toxicity (any route of exposure)"],
  GHS07: ["Serious eye damage or eye irritation"],
  GHS08: ["Specific target organ toxicity (single or repeated exposure)"],
};

interface IngredientDraft {
  key: number;
  name: string;
  cas: string;
  percent: string;
  ehs: boolean;
  tpq: string;
}

let ingKey = 1;
const blankIngredient = (): IngredientDraft => ({ key: ingKey++, name: "", cas: "", percent: "", ehs: false, tpq: "" });

type Errors = Record<string, string>;

export function AddChemicalSheet({
  open,
  onOpenChange,
  onAdded,
  onOpenExisting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** called after save with the new record's product and facility */
  onAdded: (productId: string, facilityId: string) => void;
  onOpenExisting: (productId: string, facilityId: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[760px]"
      >
        {open && <AddChemicalForm onClose={() => onOpenChange(false)} onAdded={onAdded} onOpenExisting={onOpenExisting} />}
      </SheetContent>
    </Sheet>
  );
}

function AddChemicalForm({
  onClose,
  onAdded,
  onOpenExisting,
}: {
  onClose: () => void;
  onAdded: (productId: string, facilityId: string) => void;
  onOpenExisting: (productId: string, facilityId: string) => void;
}) {
  const scope = useScope();
  const products = useAppStore((s) => s.products);
  const inventory = useAppStore((s) => s.inventory);
  const addProduct = useAppStore((s) => s.addProduct);
  const upsert = useAppStore((s) => s.upsertInventoryRecord);
  const logActivity = useAppStore((s) => s.logActivity);

  const [mode, setMode] = React.useState<"existing" | "new">("existing");
  const [productId, setProductId] = React.useState<string>("");
  const [np, setNp] = React.useState({
    name: "",
    manufacturer: "",
    productCode: "",
    physicalState: "Liquid" as PhysicalState,
    category: "Solvent" as ProductCategory,
    signalWord: "Warning" as "Danger" | "Warning" | "none",
    pictograms: [] as GhsCode[],
  });
  const [ings, setIngs] = React.useState<IngredientDraft[]>([blankIngredient()]);
  const [where, setWhere] = React.useState({
    facilityId: scope.facilityId === "all" ? "" : scope.facilityId,
    year: String(scope.year),
    max: "",
    avg: "",
    days: "365",
  });
  const [store, setStore] = React.useState({
    area: "",
    detail: "",
    containerType: "Steel drum" as ContainerType,
    pressure: "Ambient" as StoragePressure,
    temperature: "Ambient" as StorageTemperature,
  });
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const touch = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));

  const selected = products.find((p) => p.id === productId);
  const year = Number(where.year);
  const facility = scope.facilities.find((f) => f.id === where.facilityId);

  /* ─── validation ─── */
  const q = validateQuantities(where);
  const errors: Errors = {};
  if (mode === "existing" && !selected) errors.product = "Choose a product from the catalog, or add a new one.";
  if (mode === "new") {
    if (!np.name.trim()) errors.name = "Enter the product name as it appears on the SDS.";
    if (!np.manufacturer.trim()) errors.manufacturer = "Enter the manufacturer or supplier.";
    ings.forEach((i) => {
      if (!i.name.trim()) errors[`ing-${i.key}-name`] = "Enter a name.";
      if (!CAS_RE.test(i.cas.trim())) errors[`ing-${i.key}-cas`] = "Use the format 67-64-1.";
      const pct = parseAmount(i.percent);
      if (!Number.isFinite(pct) || pct <= 0 || pct > 100) errors[`ing-${i.key}-percent`] = "0 to 100.";
      if (i.ehs) {
        const tpq = parseAmount(i.tpq);
        if (!Number.isFinite(tpq) || tpq <= 0) errors[`ing-${i.key}-tpq`] = "Enter the TPQ in lb.";
      }
    });
  }
  const pctTotal = ings.reduce((s, i) => s + (parseAmount(i.percent) || 0), 0);
  if (mode === "new" && pctTotal > 100.0001) errors.ingTotal = `Percents add up to ${round1(pctTotal)}%. They must total 100% or less.`;
  if (!facility) errors.facilityId = "Choose the facility that holds it.";
  Object.assign(errors, q.errors);
  if (!store.area.trim()) errors.area = "Enter the area of the site.";
  if (!store.detail.trim()) errors.detail = "Enter the tank, room or row.";
  const show = (k: string) => (touched[k] || submitted || k === "ingTotal" ? errors[k] : undefined);

  /* ─── the product as it will be saved, for the live summary ─── */
  const newId = React.useMemo(() => {
    const base = slugify(np.name) || "product";
    let id = base;
    let n = 2;
    while (products.some((p) => p.id === id)) id = `${base}-${n++}`;
    return id;
  }, [np.name, products]);

  const draftProduct: Product | null = React.useMemo(() => {
    if (mode === "existing") return selected ?? null;
    return {
      id: newId,
      name: np.name.trim(),
      manufacturer: np.manufacturer.trim(),
      productCode: np.productCode.trim(),
      category: np.category,
      physicalState: np.physicalState,
      signalWord: (np.signalWord === "none" ? null : np.signalWord) as SignalWord,
      pictograms: GHS_ORDER.filter((c) => np.pictograms.includes(c)),
      physicalHazards: [
        ...np.pictograms.flatMap((c) => (PHYS[c] ? [PHYS[c]!] : [])),
        ...(np.pictograms.includes("GHS05") && np.category !== "Cleaning" ? ["Corrosive to metal"] : []),
      ],
      healthHazards: [...new Set(np.pictograms.flatMap((c) => HEALTH[c] ?? []))],
      nfpa: { health: 0, flammability: 0, instability: 0 },
      ingredients: ings
        .filter((i) => i.name.trim())
        .map((i) => ({
          name: i.name.trim(),
          cas: i.cas.trim(),
          percent: parseAmount(i.percent) || 0,
          ehs: i.ehs,
          tpqLb: i.ehs ? parseAmount(i.tpq) || undefined : undefined,
        })),
    };
  }, [mode, selected, newId, np, ings]);

  const pid = mode === "existing" ? selected?.id : newId;
  const existing =
    pid && facility ? inventory.find((r) => r.productId === pid && r.facilityId === facility.id && r.year === year) : undefined;
  const nameClash =
    mode === "new" && np.name.trim()
      ? products.find((p) => p.name.toLowerCase() === np.name.trim().toLowerCase())
      : undefined;

  const valid = Object.keys(errors).length === 0 && !existing;

  function save(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!valid || !draftProduct || !facility) {
      // bring the first problem into view
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>("[data-add-chemical] [aria-invalid=true]")?.focus();
      });
      return;
    }
    const product = mode === "new" ? addProduct(draftProduct) : draftProduct;
    const recordId = `${facility.id}-${product.id}-${year}`;
    const record: InventoryRecord = {
      id: recordId,
      productId: product.id,
      facilityId: facility.id,
      year,
      maxDailyLb: q.max,
      avgDailyLb: q.avg,
      daysOnSite: q.days,
      locations: [
        {
          id: `${recordId}-a`,
          area: store.area.trim(),
          detail: store.detail.trim(),
          containerType: store.containerType,
          pressure: store.pressure,
          temperature: store.temperature,
          maxLb: q.max,
        },
      ],
      updatedAt: new Date().toISOString().slice(0, 10),
      updatedBy: CURRENT_USER.name,
    };
    upsert(record);
    toast.success("Chemical added", {
      description: `${product.name} at ${facility.name}, reporting year ${year}.`,
    });
    logActivity({
      kind: "product-added",
      summary: `added ${product.name} to the ${facility.name} inventory (${year})`,
      facilityId: facility.id,
      productId: product.id,
      href: `/inventory?product=${product.id}&facility=${facility.id}`,
    });
    onAdded(product.id, facility.id);
  }

  const liveMax = Number.isFinite(q.max) && q.max > 0 ? q.max : null;
  const liveRange = liveMax !== null ? tier2Range(liveMax) : null;

  return (
    <form onSubmit={save} noValidate data-add-chemical className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="border-b border-border px-5 pt-5 pb-4">
        <SheetTitle className="text-lg">Add chemical</SheetTitle>
        <SheetDescription>
          Record a product held at a facility for a reporting year. Fields marked required must be filled in.
        </SheetDescription>
      </SheetHeader>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-8">
          {/* ─── product ─── */}
          <Group title="Product" step={1}>
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(v) => v && setMode(v as "existing" | "new")}
              variant="outline"
              className="w-full sm:w-fit"
              aria-label="Product source"
            >
              <ToggleGroupItem value="existing" className="flex-1 px-3 sm:flex-none">
                From the catalog
              </ToggleGroupItem>
              <ToggleGroupItem value="new" className="flex-1 px-3 sm:flex-none">
                New product
              </ToggleGroupItem>
            </ToggleGroup>

            {mode === "existing" ? (
              <FormField
                id="add-product"
                label="Product"
                required
                error={show("product")}
                hint={`${products.length} products in the catalog. Search by name, manufacturer, product code or CAS.`}
              >
                <ProductCombobox
                  products={products}
                  value={productId}
                  invalid={Boolean(show("product"))}
                  onChange={(id) => {
                    setProductId(id);
                    setTouched((t) => ({ ...t, product: true }));
                  }}
                />
              </FormField>
            ) : (
              <NewProductFields
                np={np}
                setNp={setNp}
                ings={ings}
                setIngs={setIngs}
                show={show}
                touch={touch}
                pctTotal={pctTotal}
                nameClash={nameClash}
                onUseExisting={(id) => {
                  setMode("existing");
                  setProductId(id);
                }}
              />
            )}

            {mode === "existing" && selected && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-border bg-subtle px-3 py-2.5 text-[13px]">
                <GhsList codes={selected.pictograms} size="sm" />
                <span className="text-muted-foreground">
                  {selected.category}, {selected.physicalState.toLowerCase()}
                </span>
                <span className="text-muted-foreground">
                  {primaryCas(selected) ? (
                    <>
                      CAS <span className="ident text-foreground">{primaryCas(selected)}</span>
                    </>
                  ) : (
                    `${selected.ingredients.length} ingredients`
                  )}
                </span>
              </div>
            )}
          </Group>

          {/* ─── where and how much ─── */}
          <Group title="Where and how much" step={2}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="add-facility" label="Facility" required error={show("facilityId")}>
                <Select
                  value={where.facilityId}
                  onValueChange={(v) => {
                    setWhere((w) => ({ ...w, facilityId: v }));
                    setTouched((t) => ({ ...t, facilityId: true }));
                  }}
                >
                  <SelectTrigger id="add-facility" className="w-full bg-card" aria-invalid={Boolean(show("facilityId"))}>
                    <SelectValue placeholder="Choose a facility" />
                  </SelectTrigger>
                  <SelectContent>
                    {scope.facilities.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        <span className="truncate">{f.name}</span>
                        <span className="ident text-muted-foreground">{f.code}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField id="add-year" label="Reporting year" required>
                <Select value={where.year} onValueChange={(v) => setWhere((w) => ({ ...w, year: v }))}>
                  <SelectTrigger id="add-year" className="w-full bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORTING_YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        <span className="tabular">{y}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            {existing && facility && pid && (
              <div
                role="alert"
                className="flex flex-col gap-2 rounded-md border border-warn-border bg-warn-bg px-3 py-2.5 text-[13px] sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="flex items-start gap-2 text-foreground">
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
                  {draftProduct?.name} is already in the {facility.code} inventory for {year}. Edit that record instead.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 bg-card"
                  onClick={() => onOpenExisting(pid, facility.id)}
                >
                  Open record
                </Button>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["max", "Max daily amount", "lb"],
                  ["avg", "Average daily amount", "lb"],
                  ["days", "Days on site", "days"],
                ] as const
              ).map(([k, label, unit]) => (
                <FormField key={k} id={`add-${k}`} label={label} required error={show(k)}>
                  <div className="relative">
                    <Input
                      id={`add-${k}`}
                      inputMode="numeric"
                      value={where[k]}
                      aria-invalid={Boolean(show(k))}
                      onChange={(e) => setWhere((w) => ({ ...w, [k]: e.target.value }))}
                      onBlur={touch(k)}
                      className="pr-11 tabular"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs text-muted-foreground">
                      {unit}
                    </span>
                  </div>
                </FormField>
              ))}
            </div>
          </Group>

          {/* ─── storage ─── */}
          <Group title="Storage" step={3}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="add-area" label="Area" required error={show("area")}>
                <Input
                  id="add-area"
                  value={store.area}
                  aria-invalid={Boolean(show("area"))}
                  onChange={(e) => setStore((s) => ({ ...s, area: e.target.value }))}
                  onBlur={touch("area")}
                />
              </FormField>
              <FormField id="add-detail" label="Detail" required error={show("detail")}>
                <Input
                  id="add-detail"
                  value={store.detail}
                  aria-invalid={Boolean(show("detail"))}
                  onChange={(e) => setStore((s) => ({ ...s, detail: e.target.value }))}
                  onBlur={touch("detail")}
                />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <SimpleSelect
                id="add-container"
                label="Container type"
                value={store.containerType}
                options={CONTAINER_TYPES}
                onChange={(v) => setStore((s) => ({ ...s, containerType: v }))}
              />
              <SimpleSelect
                id="add-pressure"
                label="Pressure"
                value={store.pressure}
                options={PRESSURES}
                onChange={(v) => setStore((s) => ({ ...s, pressure: v }))}
              />
              <SimpleSelect
                id="add-temperature"
                label="Temperature"
                value={store.temperature}
                options={TEMPERATURES}
                onChange={(v) => setStore((s) => ({ ...s, temperature: v }))}
              />
            </div>
          </Group>
        </div>
      </div>

      {/* ─── live summary and actions ─── */}
      <div className="flex flex-col gap-3 border-t border-border bg-subtle px-5 py-3.5">
        <div aria-live="polite" className="text-[13px]">
          {liveRange && draftProduct ? (
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground">
                Tier II range <span className="ident font-medium text-foreground">{liveRange.code}</span> (
                {liveRange.label})
                {facility && <> at {facility.code}</>}
              </p>
              <ReportingLine product={draftProduct} maxDailyLb={liveMax!} />
            </div>
          ) : (
            <p className="text-muted-foreground">
              {draftProduct ? "Enter the max daily amount" : "Choose a product and enter the max daily amount"} to see its
              Tier II range and whether it will be reportable.
            </p>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          {submitted && !valid && (
            <p className="mr-auto flex items-center gap-1 text-xs text-critical">
              <CircleAlert className="size-3.5" aria-hidden />
              {existing ? "This record already exists." : `Fix ${Object.keys(errors).length} ${Object.keys(errors).length === 1 ? "field" : "fields"} to add the chemical.`}
            </p>
          )}
          <Button type="button" variant="outline" className="bg-card" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            <Plus data-icon="inline-start" />
            Add chemical
          </Button>
        </div>
      </div>
    </form>
  );
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function Group({ title, step, children }: { title: string; step: number; children: React.ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4">
      <legend className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="grid size-5 place-items-center rounded-full border border-border-strong text-[11px] font-semibold text-muted-foreground tabular">
          {step}
        </span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function SimpleSelect<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <FormField id={id} label={label}>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger id={id} className="w-full bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

/* ──────────────────────────── product combobox ─────────────────────────── */

function ProductCombobox({
  products,
  value,
  invalid,
  onChange,
}: {
  products: Product[];
  value: string;
  invalid: boolean;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = products.find((p) => p.id === value);
  const sorted = React.useMemo(() => [...products].sort((a, b) => a.name.localeCompare(b.name)), [products]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="add-product"
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className="h-10 w-full justify-between bg-card px-3 font-normal"
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium text-foreground">{selected.name}</span>
              <span className="truncate text-xs text-muted-foreground">{selected.manufacturer}</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Search className="size-4" aria-hidden />
              Search the catalog
            </span>
          )}
          <ChevronsUpDown className="text-muted-foreground" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Product, manufacturer, code or CAS" />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>No product matches. Switch to New product to add it.</CommandEmpty>
            <CommandGroup>
              {sorted.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.manufacturer} ${p.productCode} ${p.ingredients.map((i) => `${i.name} ${i.cas}`).join(" ")}`}
                  onSelect={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                  className="items-start gap-2 py-2"
                >
                  <Check className={cn("mt-0.5 size-4", p.id === value ? "opacity-100" : "opacity-0")} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {p.manufacturer}, <span className="ident">{primaryCas(p) ?? p.productCode}</span>
                    </span>
                  </span>
                  <GhsList codes={p.pictograms} size="xs" max={3} emptyLabel={null} className="pointer-events-none mt-0.5" />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ───────────────────────────── new product ─────────────────────────────── */

type NewProduct = {
  name: string;
  manufacturer: string;
  productCode: string;
  physicalState: PhysicalState;
  category: ProductCategory;
  signalWord: "Danger" | "Warning" | "none";
  pictograms: GhsCode[];
};

function NewProductFields({
  np,
  setNp,
  ings,
  setIngs,
  show,
  touch,
  pctTotal,
  nameClash,
  onUseExisting,
}: {
  np: NewProduct;
  setNp: React.Dispatch<React.SetStateAction<NewProduct>>;
  ings: IngredientDraft[];
  setIngs: React.Dispatch<React.SetStateAction<IngredientDraft[]>>;
  show: (k: string) => string | undefined;
  touch: (k: string) => () => void;
  pctTotal: number;
  nameClash?: Product;
  onUseExisting: (id: string) => void;
}) {
  const setIng = (key: number, patch: Partial<IngredientDraft>) =>
    setIngs((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id="np-name" label="Product name" required error={show("name")}>
          <Input
            id="np-name"
            value={np.name}
            aria-invalid={Boolean(show("name"))}
            onChange={(e) => setNp((s) => ({ ...s, name: e.target.value }))}
            onBlur={touch("name")}
          />
        </FormField>
        <FormField id="np-mfr" label="Manufacturer" required error={show("manufacturer")}>
          <Input
            id="np-mfr"
            value={np.manufacturer}
            aria-invalid={Boolean(show("manufacturer"))}
            onChange={(e) => setNp((s) => ({ ...s, manufacturer: e.target.value }))}
            onBlur={touch("manufacturer")}
          />
        </FormField>
      </div>
      {nameClash && (
        <div className="flex flex-col gap-2 rounded-md border border-warn-border bg-warn-bg px-3 py-2.5 text-[13px] sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-foreground">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
            {nameClash.name} from {nameClash.manufacturer} is already in the catalog.
          </p>
          <Button type="button" size="sm" variant="outline" className="shrink-0 bg-card" onClick={() => onUseExisting(nameClash.id)}>
            Use catalog product
          </Button>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-4">
        <FormField id="np-code" label="Product code">
          <Input
            id="np-code"
            value={np.productCode}
            className="ident"
            onChange={(e) => setNp((s) => ({ ...s, productCode: e.target.value }))}
          />
        </FormField>
        <SimpleSelect
          id="np-state"
          label="Physical state"
          value={np.physicalState}
          options={PHYSICAL_STATES}
          onChange={(v) => setNp((s) => ({ ...s, physicalState: v }))}
        />
        <SimpleSelect
          id="np-cat"
          label="Category"
          value={np.category}
          options={CATEGORIES}
          onChange={(v) => setNp((s) => ({ ...s, category: v }))}
        />
        <FormField id="np-signal" label="Signal word">
          <Select value={np.signalWord} onValueChange={(v) => setNp((s) => ({ ...s, signalWord: v as NewProduct["signalWord"] }))}>
            <SelectTrigger id="np-signal" className="w-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Danger">
                <span className="font-semibold text-critical">Danger</span>
              </SelectItem>
              <SelectItem value="Warning">
                <span className="font-semibold text-warn">Warning</span>
              </SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-medium text-foreground">
          GHS pictograms <span className="font-normal text-muted-foreground">from section 2 of the SDS</span>
        </p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {GHS_ORDER.map((c) => {
            const on = np.pictograms.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setNp((s) => ({
                    ...s,
                    pictograms: on ? s.pictograms.filter((x) => x !== c) : [...s.pictograms, c],
                  }))
                }
                className={cn(
                  "flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[13px] outline-none transition-colors duration-150",
                  "focus-visible:ring-2 focus-visible:ring-ring/60 active:translate-y-px",
                  on
                    ? "border-brand bg-brand-bg text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-subtle hover:text-foreground",
                )}
              >
                <GhsPictogram code={c} size="sm" tooltip={false} className={cn(!on && "opacity-60")} />
                <span className="min-w-0 flex-1 truncate">{GHS_META[c].short}</span>
                {on && <Check className="size-3.5 shrink-0 text-brand" aria-hidden />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between gap-3">
          <p className="text-[13px] font-medium text-foreground">
            Ingredients <span className="font-normal text-muted-foreground">from section 3 of the SDS</span>
          </p>
          <span className={cn("text-xs tabular", show("ingTotal") ? "text-critical" : "text-muted-foreground")}>
            Total {round1(pctTotal)}%
          </span>
        </div>
        <ul className="flex flex-col gap-2">
          {ings.map((i, idx) => {
            const k = (f: string) => `ing-${i.key}-${f}`;
            return (
              <li key={i.key} className="rounded-md border border-border p-2.5">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_136px_124px_auto]">
                  <FormField id={k("name")} label={`Ingredient ${idx + 1}`} required error={show(k("name"))} className="col-span-2 sm:col-span-1">
                    <Input
                      id={k("name")}
                      value={i.name}
                      aria-invalid={Boolean(show(k("name")))}
                      onChange={(e) => setIng(i.key, { name: e.target.value })}
                      onBlur={touch(k("name"))}
                    />
                  </FormField>
                  <FormField id={k("cas")} label="CAS" required error={show(k("cas"))}>
                    <Input
                      id={k("cas")}
                      value={i.cas}
                      className="ident"
                      aria-invalid={Boolean(show(k("cas")))}
                      onChange={(e) => setIng(i.key, { cas: e.target.value })}
                      onBlur={touch(k("cas"))}
                    />
                  </FormField>
                  <FormField id={k("percent")} label="Weight %" required error={show(k("percent"))}>
                    <Input
                      id={k("percent")}
                      value={i.percent}
                      inputMode="decimal"
                      className="tabular"
                      aria-invalid={Boolean(show(k("percent")))}
                      onChange={(e) => setIng(i.key, { percent: e.target.value })}
                      onBlur={touch(k("percent"))}
                    />
                  </FormField>
                  <div className="col-span-2 flex items-end justify-between gap-2 sm:col-span-1">
                    <label className="flex h-8 cursor-pointer items-center gap-2 text-[13px] text-foreground">
                      <Checkbox checked={i.ehs} onCheckedChange={(v) => setIng(i.key, { ehs: Boolean(v) })} />
                      EHS
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ingredient ${idx + 1}`}
                      disabled={ings.length === 1}
                      onClick={() => setIngs((list) => list.filter((x) => x.key !== i.key))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                {i.ehs && (
                  <FormField
                    id={k("tpq")}
                    label="Threshold planning quantity (lb)"
                    required
                    error={show(k("tpq"))}
                    hint="From the EPCRA Section 302 list of Extremely Hazardous Substances."
                    className="mt-2 sm:max-w-xs"
                  >
                    <Input
                      id={k("tpq")}
                      value={i.tpq}
                      inputMode="numeric"
                      className="tabular"
                      aria-invalid={Boolean(show(k("tpq")))}
                      onChange={(e) => setIng(i.key, { tpq: e.target.value })}
                      onBlur={touch(k("tpq"))}
                    />
                  </FormField>
                )}
              </li>
            );
          })}
        </ul>
        {show("ingTotal") && (
          <p className="flex items-center gap-1 text-xs text-critical">
            <CircleAlert className="size-3.5" aria-hidden />
            {show("ingTotal")}
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit bg-card"
          onClick={() => setIngs((list) => [...list, blankIngredient()])}
        >
          <Plus data-icon="inline-start" />
          Add ingredient
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        The Tier II hazard categories are filled in from the pictograms. Upload the SDS from the SDS library after
        saving.
      </p>
    </div>
  );
}

