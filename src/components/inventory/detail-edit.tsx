"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts";
import { CircleAlert, CircleCheck, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TIER2_THRESHOLD_LB, tier2Range } from "@/lib/domain";
import { formatLb, formatLbCompact } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import type { ContainerType, InventoryRow, StorageLocation, StoragePressure, StorageTemperature } from "@/lib/types";
import { cn } from "@/lib/utils";
import { REPORTING_YEARS } from "@/lib/seed/facilities";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Section } from "./detail-info";
import { FormField, parseAmount, validateQuantities } from "./form-field";
import { CONTAINER_TYPES, PRESSURES, TEMPERATURES, explainReporting } from "./model";

/* ─────────────────────────────── quantities ────────────────────────────── */

const chartConfig = { lb: { label: "Max daily", color: "var(--chart-1)" } } satisfies ChartConfig;

export function ReportingLine({ product, maxDailyLb }: { product: InventoryRow["product"]; maxDailyLb: number }) {
  const e = explainReporting(product, maxDailyLb);
  const Icon = e.reportable ? CircleAlert : CircleCheck;
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-[13px]",
        e.reportable ? "border-info-border bg-info-bg" : "border-border bg-subtle",
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", e.reportable ? "text-info" : "text-muted-foreground")} aria-hidden />
      <p className="text-foreground">
        <span className="font-semibold">{e.verdict}:</span> {e.reason}
      </p>
    </div>
  );
}

export function QuantitiesTab({ row }: { row: InventoryRow }) {
  const range = tier2Range(row.maxDailyLb);
  const inventory = useAppStore((s) => s.inventory);
  const history = React.useMemo(
    () =>
      [...REPORTING_YEARS]
        .sort((a, b) => a - b)
        .map((year) => {
          const rec = inventory.find(
            (r) => r.productId === row.productId && r.facilityId === row.facilityId && r.year === year,
          );
          return { year: String(year), lb: rec?.maxDailyLb ?? 0, current: year === row.year };
        }),
    [inventory, row.productId, row.facilityId, row.year],
  );
  const peak = Math.max(...history.map((h) => h.lb));
  const showThreshold = peak > TIER2_THRESHOLD_LB * 0.3 && peak < TIER2_THRESHOLD_LB * 6;

  return (
    <div className="flex flex-col gap-7">
      <Section title="Amounts on site" description={`Reporting year ${row.year} at ${row.facility.name}.`}>
        <dl className="grid grid-cols-2 overflow-hidden rounded-md border border-border sm:grid-cols-4">
          {[
            ["Max daily", formatLb(row.maxDailyLb)],
            ["Average daily", formatLb(row.avgDailyLb)],
            ["Days on site", `${row.daysOnSite} of 365`],
          ].map(([label, value], i) => (
            <div
              key={label}
              className={cn(
                "flex flex-col gap-0.5 px-3 py-2.5",
                i % 2 === 1 && "border-l border-border",
                i >= 2 && "max-sm:border-t sm:border-l",
              )}
            >
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-[15px] font-semibold text-foreground tabular">{value}</dd>
            </div>
          ))}
          <div className="flex flex-col gap-0.5 border-l border-border px-3 py-2.5 max-sm:border-t">
            <dt className="text-xs text-muted-foreground">Tier II range</dt>
            <dd className="text-[15px] font-semibold text-foreground">
              <span className="ident">{range.code}</span>
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">{range.label}</span>
            </dd>
          </div>
        </dl>
        <ReportingLine product={row.product} maxDailyLb={row.maxDailyLb} />
      </Section>

      <Section title="Max daily amount by year" description="This product at this facility, each reporting year.">
        <ChartContainer config={chartConfig} className="aspect-auto h-[180px] w-full">
          <BarChart data={history} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={6} fontSize={12} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              fontSize={12}
              tickFormatter={(v: number) => formatLbCompact(v).replace(" lb", "")}
            />
            <ChartTooltip
              cursor={{ fill: "var(--muted)", opacity: 0.6 }}
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => `Reporting year ${label}`}
                  formatter={(value) => (
                    <span className="flex w-full items-center justify-between gap-4">
                      <span className="text-muted-foreground">Max daily</span>
                      <span className="font-medium text-foreground tabular">
                        {Number(value) > 0 ? formatLb(Number(value)) : "Not on site"}
                      </span>
                    </span>
                  )}
                />
              }
            />
            {showThreshold && (
              <ReferenceLine
                y={TIER2_THRESHOLD_LB}
                stroke="var(--chart-neutral)"
                strokeDasharray="4 3"
                label={{ value: "10,000 lb threshold", position: "insideTopRight", fontSize: 11, fill: "var(--muted-foreground)" }}
              />
            )}
            <Bar dataKey="lb" radius={[3, 3, 0, 0]} maxBarSize={44}>
              {history.map((h) => (
                <Cell key={h.year} fill="var(--color-lb)" fillOpacity={h.current ? 1 : 0.45} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </Section>

      <EditQuantities key={row.id + row.updatedAt + row.maxDailyLb} row={row} />
    </div>
  );
}

function EditQuantities({ row }: { row: InventoryRow }) {
  const update = useAppStore((s) => s.updateInventoryRecord);
  const logActivity = useAppStore((s) => s.logActivity);
  const initial = { max: String(row.maxDailyLb), avg: String(row.avgDailyLb), days: String(row.daysOnSite) };
  const [values, setValues] = React.useState(initial);
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const { errors, max, avg, days } = validateQuantities(values);
  const dirty = values.max !== initial.max || values.avg !== initial.avg || values.days !== initial.days;
  const show = (k: "max" | "avg" | "days") => (touched[k] ? errors[k] : undefined);
  const liveRange = Number.isFinite(max) && max >= 0 ? tier2Range(max) : null;
  const rangeChanged = liveRange && liveRange.code !== row.rangeCode;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ max: true, avg: true, days: true });
    if (Object.keys(errors).length > 0) return;
    update(row.id, { maxDailyLb: max, avgDailyLb: avg, daysOnSite: days });
    toast.success("Quantities saved", {
      description: `${row.product.name} at ${row.facility.code}: ${formatLb(max)} max daily, range ${tier2Range(max).code}.`,
    });
    logActivity({
      kind: "inventory-updated",
      summary: `updated quantities for ${row.product.name} at ${row.facility.name} (${row.year})`,
      facilityId: row.facilityId,
      productId: row.productId,
      href: `/inventory?product=${row.productId}&facility=${row.facilityId}`,
    });
  }

  const input = (k: "max" | "avg" | "days", label: string, unit: string) => (
    <FormField id={`q-${k}`} label={label} required error={show(k)}>
      <div className="relative">
        <Input
          id={`q-${k}`}
          inputMode="numeric"
          value={values[k]}
          aria-invalid={Boolean(show(k))}
          aria-describedby={show(k) ? `q-${k}-error` : undefined}
          onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
          onBlur={() => setTouched((t) => ({ ...t, [k]: true }))}
          className="pr-10 tabular"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs text-muted-foreground">
          {unit}
        </span>
      </div>
    </FormField>
  );

  return (
    <Section title="Edit quantities" description="Changes apply to this record and update the Tier II range at once.">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-md border border-border p-3.5">
        <div className="grid gap-3 sm:grid-cols-3">
          {input("max", "Max daily amount", "lb")}
          {input("avg", "Average daily amount", "lb")}
          {input("days", "Days on site", "days")}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-muted-foreground" aria-live="polite">
            {liveRange ? (
              <>
                Range{" "}
                <span className={cn("ident font-medium", rangeChanged ? "text-brand" : "text-foreground")}>
                  {liveRange.code}
                </span>{" "}
                ({liveRange.label})
                {rangeChanged && <>, was {row.rangeCode}</>}
              </>
            ) : (
              "Enter an amount to see its Tier II range."
            )}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={!dirty}
              onClick={() => {
                setValues(initial);
                setTouched({});
              }}
            >
              Reset
            </Button>
            <Button type="submit" disabled={!dirty}>
              Save quantities
            </Button>
          </div>
        </div>
        {dirty && Number.isFinite(max) && max > 0 && <ReportingLine product={row.product} maxDailyLb={max} />}
      </form>
    </Section>
  );
}

/* ─────────────────────────────── locations ─────────────────────────────── */

export function LocationsTab({ row }: { row: InventoryRow }) {
  const update = useAppStore((s) => s.updateInventoryRecord);
  const logActivity = useAppStore((s) => s.logActivity);
  const [adding, setAdding] = React.useState(false);
  const total = row.locations.reduce((s, l) => s + l.maxLb, 0);

  function save(locations: StorageLocation[], verb: string, toastTitle: string) {
    update(row.id, { locations });
    toast.success(toastTitle, { description: `${row.product.name} at ${row.facility.name}` });
    logActivity({
      kind: "inventory-updated",
      summary: `${verb} for ${row.product.name} at ${row.facility.name} (${row.year})`,
      facilityId: row.facilityId,
      productId: row.productId,
      href: `/inventory?product=${row.productId}&facility=${row.facilityId}`,
    });
  }

  return (
    <Section
      title="Storage locations"
      description={`${row.locations.length} ${row.locations.length === 1 ? "location" : "locations"} holding up to ${formatLb(total)} in total.`}
      action={
        !adding && (
          <Button variant="outline" size="sm" className="bg-card" onClick={() => setAdding(true)}>
            <Plus data-icon="inline-start" />
            Add location
          </Button>
        )
      }
    >
      {adding && (
        <AddLocationForm
          recordId={row.id}
          onCancel={() => setAdding(false)}
          onAdd={(loc) => {
            save([...row.locations, loc], `added storage location ${loc.area}, ${loc.detail}`, "Location added");
            setAdding(false);
          }}
        />
      )}
      <ul className="flex flex-col gap-2">
        {row.locations.map((l) => {
          const share = total > 0 ? (l.maxLb / total) * 100 : 0;
          const last = row.locations.length === 1;
          return (
            <li key={l.id} className="rounded-md border border-border px-3.5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">{l.area}</p>
                  <p className="text-[13px] text-muted-foreground">{l.detail}</p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={last ? 0 : -1}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove location ${l.area}, ${l.detail}`}
                        disabled={last}
                        onClick={() =>
                          save(
                            row.locations.filter((x) => x.id !== l.id),
                            `removed storage location ${l.area}, ${l.detail}`,
                            "Location removed",
                          )
                        }
                      >
                        <Trash2 />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{last ? "A record needs at least one location" : "Remove location"}</TooltipContent>
                </Tooltip>
              </div>
              <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Container</dt>
                  <dd className="text-foreground">{l.containerType}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Pressure</dt>
                  <dd className="text-foreground">{l.pressure}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Temperature</dt>
                  <dd className="text-foreground">{l.temperature}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Amount held</dt>
                  <dd className="font-medium text-foreground tabular">{formatLb(l.maxLb)}</dd>
                </div>
              </dl>
              <div className="mt-2.5 flex items-center gap-2.5">
                <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-chart-1" style={{ width: `${share}%` }} />
                </span>
                <span className="w-24 text-right text-xs text-muted-foreground tabular">{Math.round(share)}% of total</span>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function AddLocationForm({
  recordId,
  onAdd,
  onCancel,
}: {
  recordId: string;
  onAdd: (loc: StorageLocation) => void;
  onCancel: () => void;
}) {
  const [v, setV] = React.useState({
    area: "",
    detail: "",
    containerType: "Steel drum" as ContainerType,
    pressure: "Ambient" as StoragePressure,
    temperature: "Ambient" as StorageTemperature,
    amount: "",
  });
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const amount = parseAmount(v.amount);
  const errors: Record<string, string> = {};
  if (!v.area.trim()) errors.area = "Enter the area of the site.";
  if (!v.detail.trim()) errors.detail = "Enter the tank, room or row.";
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = "Enter the largest amount held here, in lb.";
  const show = (k: string) => (touched[k] ? errors[k] : undefined);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ area: true, detail: true, amount: true });
    if (Object.keys(errors).length) return;
    onAdd({
      id: `${recordId}-${Date.now().toString(36)}`,
      area: v.area.trim(),
      detail: v.detail.trim(),
      containerType: v.containerType,
      pressure: v.pressure,
      temperature: v.temperature,
      maxLb: amount,
    });
  }

  const text = (k: "area" | "detail" | "amount", label: string, placeholder: string) => (
    <FormField id={`loc-${k}`} label={label} required error={show(k)}>
      <Input
        id={`loc-${k}`}
        value={v[k]}
        placeholder={placeholder || undefined}
        inputMode={k === "amount" ? "numeric" : undefined}
        aria-invalid={Boolean(show(k))}
        onChange={(e) => setV((s) => ({ ...s, [k]: e.target.value }))}
        onBlur={() => setTouched((t) => ({ ...t, [k]: true }))}
        className={k === "amount" ? "tabular" : undefined}
      />
    </FormField>
  );

  const select = <T extends string>(k: "containerType" | "pressure" | "temperature", label: string, options: T[]) => (
    <FormField id={`loc-${k}`} label={label}>
      <Select value={v[k]} onValueChange={(val) => setV((s) => ({ ...s, [k]: val }))}>
        <SelectTrigger id={`loc-${k}`} className="w-full bg-card">
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

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 rounded-md border border-border-strong bg-subtle p-3.5">
      <p className="text-[13px] font-medium text-foreground">New storage location</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {text("area", "Area", "")}
        {text("detail", "Detail", "")}
        {select("containerType", "Container type", CONTAINER_TYPES)}
        {text("amount", "Largest amount held (lb)", "")}
        {select("pressure", "Pressure", PRESSURES)}
        {select("temperature", "Temperature", TEMPERATURES)}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Add location</Button>
      </div>
    </form>
  );
}
