"use client";

import Link from "next/link";
import { CalendarClock, ExternalLink, FileText, Send } from "lucide-react";
import { GHS_META, GHS_ORDER, ehsAmounts, hazardStatements } from "@/lib/domain";
import { formatAge, formatDate, formatLb, formatNumber, formatRelative } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import type { InventoryRow, Nfpa } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Field } from "@/components/layout/page";
import { GhsPictogram } from "@/components/hazard/ghs-pictogram";
import { NfpaDiamond, nfpaSpecialLabel } from "@/components/hazard/nfpa-diamond";
import { EhsTag, SdsStatusBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { primaryCas } from "./model";

export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ──────────────────────────────── overview ─────────────────────────────── */

const NFPA_WORDS: Record<keyof Omit<Nfpa, "special">, string[]> = {
  health: ["No hazard", "Slight", "Moderate", "Serious", "Severe"],
  flammability: ["Will not burn", "Must be preheated", "Ignites when heated", "Ignites at room temperature", "Extremely flammable"],
  instability: ["Stable", "Unstable if heated", "Violent change", "Shock and heat may detonate", "May detonate"],
};

export function OverviewTab({ row }: { row: InventoryRow }) {
  const p = row.product;
  const statements = hazardStatements(p);
  const codes = GHS_ORDER.filter((c) => p.pictograms.includes(c));
  const cas = primaryCas(p);
  const nfpaUnset = p.isNew && p.nfpa.health + p.nfpa.flammability + p.nfpa.instability === 0 && !p.nfpa.special;
  return (
    <div className="flex flex-col gap-7">
      <Section title="Identity">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5 sm:grid-cols-3">
          <Field label="Category">{p.category}</Field>
          <Field label="Physical state">{p.physicalState}</Field>
          <Field label="CAS">{cas ? <span className="ident">{cas}</span> : `Mixture of ${p.ingredients.length}`}</Field>
          <Field label="UN number">
            {p.unNumber ? <span className="ident">{p.unNumber}</span> : <span className="text-muted-foreground">Not regulated</span>}
          </Field>
          <Field label="Density">
            {p.densityLbGal ? (
              <span className="tabular">{p.densityLbGal} lb/gal</span>
            ) : (
              <span className="text-muted-foreground">Not applicable</span>
            )}
          </Field>
          <Field label="Product code">
            {p.productCode ? <span className="ident">{p.productCode}</span> : <span className="text-muted-foreground">Not given</span>}
          </Field>
        </dl>
      </Section>

      <Section title="GHS hazard classes">
        {codes.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Not classified as hazardous under GHS.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {codes.map((c) => (
              <li key={c} className="flex items-center gap-3 rounded-md border border-border px-2.5 py-2">
                <GhsPictogram code={c} size="md" tooltip={false} />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">
                    {GHS_META[c].short} <span className="ident ml-1 text-xs text-muted-foreground">{c}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{GHS_META[c].meaning}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {statements.length > 0 && (
        <Section title="Hazard statements">
          <ul className="divide-y divide-border rounded-md border border-border">
            {statements.map((s) => (
              <li key={s.code} className="flex gap-3 px-3 py-2 text-[13px]">
                <span className="ident w-24 shrink-0 text-muted-foreground">{s.code}</span>
                <span className="text-foreground">{s.text}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="NFPA 704 rating">
        {nfpaUnset ? (
          <p className="text-[13px] text-muted-foreground">No NFPA rating entered for this product yet.</p>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <NfpaDiamond nfpa={p.nfpa} size={96} />
            <dl className="grid flex-1 grid-cols-1 gap-2 text-[13px] sm:grid-cols-2">
              {(
                [
                  ["health", "Health", "bg-nfpa-health"],
                  ["flammability", "Flammability", "bg-nfpa-fire"],
                  ["instability", "Instability", "bg-nfpa-instability"],
                ] as const
              ).map(([key, label, swatch]) => (
                <div key={key} className="flex items-center gap-2">
                  <span aria-hidden className={cn("size-3 shrink-0 rounded-[2px]", swatch)} />
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium text-foreground tabular">
                    {p.nfpa[key]}
                    <span className="ml-1.5 font-normal text-muted-foreground">{NFPA_WORDS[key][p.nfpa[key]]}</span>
                  </dd>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span aria-hidden className="size-3 shrink-0 rounded-[2px] border border-border-strong" />
                <dt className="text-muted-foreground">Special</dt>
                <dd className="font-medium text-foreground">{nfpaSpecialLabel(p.nfpa) ?? <span className="font-normal text-muted-foreground">None</span>}</dd>
              </div>
            </dl>
          </div>
        )}
      </Section>

      <Section title="Tier II hazard categories" description="As they will appear on this facility's Tier II report.">
        <div className="grid gap-4 sm:grid-cols-2">
          <HazardList title="Physical hazards" items={p.physicalHazards} />
          <HazardList title="Health hazards" items={p.healthHazards} />
        </div>
      </Section>
    </div>
  );
}

function HazardList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">None</p>
      ) : (
        <ul className="flex flex-col gap-1 text-[13px] text-foreground">
          {items.map((h) => (
            <li key={h} className="flex gap-2">
              <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-muted-foreground" />
              {h}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─────────────────────────────── ingredients ───────────────────────────── */

export function IngredientsTab({ row }: { row: InventoryRow }) {
  const p = row.product;
  const ehsByCas = new Map(ehsAmounts(p, row.maxDailyLb).map((e) => [e.ingredient.cas + e.ingredient.name, e]));
  const total = p.ingredients.reduce((s, i) => s + i.percent, 0);
  const rest = Math.round((100 - total) * 10) / 10;
  return (
    <Section
      title="Composition"
      description={`From section 3 of the SDS. Amounts are at the max daily amount of ${formatLb(row.maxDailyLb)}.`}
    >
      {/* phones: one card per ingredient, so nothing hides off to the side */}
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border text-[13px] sm:hidden">
        {p.ingredients.map((i) => {
          const e = ehsByCas.get(i.cas + i.name);
          const lb = Math.round((row.maxDailyLb * i.percent) / 100);
          return (
            <li key={i.cas + i.name} className="flex flex-col gap-1.5 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-foreground">{i.name}</span>
                {i.ehs && <EhsTag className="shrink-0" />}
              </div>
              <div className="flex items-center justify-between gap-3 text-muted-foreground">
                <span className="ident">{i.cas}</span>
                <span className="tabular">
                  {i.percent}%, <span className="font-medium text-foreground">{formatNumber(lb)} lb</span>
                </span>
              </div>
              <span aria-hidden className="h-[3px] w-full overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-chart-1" style={{ width: `${Math.min(100, i.percent)}%` }} />
              </span>
              {e && (
                <span className={cn("text-xs tabular", e.over ? "text-critical" : "text-muted-foreground")}>
                  TPQ {formatNumber(i.tpqLb ?? 0)} lb. {e.over ? "At or over" : "Under"} its {formatNumber(e.threshold)} lb
                  threshold.
                </span>
              )}
            </li>
          );
        })}
        <li className="bg-subtle px-3 py-2 text-xs text-muted-foreground">
          {p.ingredients.length} {p.ingredients.length === 1 ? "ingredient" : "ingredients"}, {Math.round(total * 10) / 10}%
          {rest > 0.05 && <> listed, {rest}% not listed on the SDS</>}
        </li>
      </ul>
      <div className="scrollbar-thin overflow-x-auto rounded-md border border-border max-sm:hidden">
        <table className="w-full min-w-[560px] text-[13px]">
          <thead>
            <tr className="border-b border-border bg-subtle text-xs text-muted-foreground">
              <th scope="col" className="h-8 px-3 text-left font-medium">Ingredient</th>
              <th scope="col" className="h-8 px-3 text-left font-medium">CAS</th>
              <th scope="col" className="h-8 px-3 text-right font-medium">Weight %</th>
              <th scope="col" className="h-8 px-3 text-left font-medium">EHS</th>
              <th scope="col" className="h-8 px-3 text-right font-medium">On site (lb)</th>
            </tr>
          </thead>
          <tbody>
            {p.ingredients.map((i) => {
              const e = ehsByCas.get(i.cas + i.name);
              const lb = Math.round((row.maxDailyLb * i.percent) / 100);
              return (
                <tr key={i.cas + i.name} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2 font-medium text-foreground">{i.name}</td>
                  <td className="px-3 py-2"><span className="ident whitespace-nowrap">{i.cas}</span></td>
                  <td className="px-3 py-2">
                    <div className="ml-auto flex w-24 flex-col items-end gap-1">
                      <span className="tabular">{i.percent}%</span>
                      <span aria-hidden className="h-[3px] w-full overflow-hidden rounded-full bg-muted">
                        <span className="block h-full rounded-full bg-chart-1" style={{ width: `${Math.min(100, i.percent)}%` }} />
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {i.ehs ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1.5">
                          <EhsTag />
                          <span className="whitespace-nowrap text-xs text-muted-foreground tabular">TPQ {formatNumber(i.tpqLb ?? 0)} lb</span>
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-medium text-foreground tabular">{formatNumber(lb)}</span>
                    {e && (
                      <span className={cn("block text-xs tabular", e.over ? "text-critical" : "text-muted-foreground")}>
                        {e.over ? "At or over" : "Under"} {formatNumber(e.threshold)} lb
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-subtle text-xs text-muted-foreground">
              <td className="px-3 py-2" colSpan={2}>
                {p.ingredients.length} {p.ingredients.length === 1 ? "ingredient" : "ingredients"}
                {rest > 0.05 && <>, {rest}% not listed on the SDS</>}
              </td>
              <td className="px-3 py-2 text-right font-medium text-foreground tabular">{Math.round(total * 10) / 10}%</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      {row.ehs && (
        <p className="text-[13px] text-muted-foreground">
          An Extremely Hazardous Substance is reportable at 500 lb or its threshold planning quantity, whichever is lower,
          counted across every mixture on site.
        </p>
      )}
    </Section>
  );
}

/* ─────────────────────────────────── SDS ───────────────────────────────── */

export function SdsTab({ row }: { row: InventoryRow }) {
  const doc = useAppStore((s) => s.sds.find((d) => d.productId === row.productId));
  const latest = doc?.versions[0];
  const st = row.sds;
  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Safety data sheet"
        action={
          <Button asChild variant="outline" size="sm" className="bg-card">
            <Link href={`/sds?product=${row.productId}`}>
              <ExternalLink data-icon="inline-start" />
              Open in SDS library
            </Link>
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <SdsStatusBadge status={st} />
          {doc?.updateRequestedAt && (
            <StatusBadge tone="info" icon={Send}>
              Update requested {formatDate(doc.updateRequestedAt)}
            </StatusBadge>
          )}
        </div>
        {!latest ? (
          <p className="text-[13px] text-muted-foreground">
            There is no SDS on file for {row.product.name}. OSHA requires a current SDS for every hazardous chemical on
            site. Upload it from the SDS library.
          </p>
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5 sm:grid-cols-3">
            <Field label="Latest version">
              <span className="tabular">{latest.version}</span>
            </Field>
            <Field label="Revision date">{formatDate(latest.revisionDate)}</Field>
            <Field label="Age">{st.ageDays !== undefined ? formatAge(st.ageDays) : "Unknown"}</Field>
            <Field label="Reaches five years">
              {st.expiresOn ? (
                <span className={cn(st.key === "expired" ? "text-critical" : st.key === "review" ? "text-warn" : "")}>
                  {formatDate(st.expiresOn)}
                  <span className="block text-xs text-muted-foreground">{formatRelative(st.expiresOn)}</span>
                </span>
              ) : (
                "Unknown"
              )}
            </Field>
            <Field label="Language">{doc.language}</Field>
            <Field label="Added to library">
              {formatDate(latest.uploadedAt)}
              <span className="block text-xs text-muted-foreground">by {latest.uploadedBy}</span>
            </Field>
          </dl>
        )}
      </Section>

      {latest && (
        <Section title="File">
          <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-subtle text-muted-foreground">
              <FileText className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-foreground">{latest.fileName}</p>
              <p className="text-xs text-muted-foreground tabular">
                {latest.pages} pages, {formatNumber(latest.fileSizeKb)} KB
              </p>
            </div>
          </div>
          {latest.changeNote && <p className="text-[13px] text-muted-foreground">{latest.changeNote}</p>}
        </Section>
      )}

      {doc && doc.versions.length > 1 && (
        <Section title="Earlier versions">
          <ul className="divide-y divide-border rounded-md border border-border text-[13px]">
            {doc.versions.slice(1).map((v) => (
              <li key={v.version + v.revisionDate} className="flex items-center gap-3 px-3 py-2">
                <CalendarClock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="w-12 shrink-0 font-medium tabular">{v.version}</span>
                <span className="text-muted-foreground">Revised {formatDate(v.revisionDate)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
