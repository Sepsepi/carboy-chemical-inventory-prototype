"use client";

import Link from "next/link";
import { formatLb, formatLbCompact } from "@/lib/format";
import type { Facility, InventoryRow } from "@/lib/types";
import { Field, Panel, PanelHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

const MAX_AREAS = 8;

export function FacilityProfile({
  facility,
  rows,
  onShowAll,
}: {
  facility: Facility;
  rows: InventoryRow[];
  onShowAll: () => void;
}) {
  const areas = new Map<string, { lb: number; products: Set<string> }>();
  for (const row of rows) {
    for (const loc of row.locations) {
      const a = areas.get(loc.area) ?? { lb: 0, products: new Set<string>() };
      a.lb += loc.maxLb;
      a.products.add(row.productId);
      areas.set(loc.area, a);
    }
  }
  const ranked = [...areas.entries()]
    .map(([area, a]) => ({ area, lb: a.lb, count: a.products.size }))
    .sort((a, b) => b.lb - a.lb);
  const shown = ranked.slice(0, MAX_AREAS);
  const max = Math.max(1, ...shown.map((a) => a.lb));
  const f = facility;

  return (
    <Panel>
      <PanelHeader
        title={f.name}
        description={
          <>
            <span className="ident">{f.code}</span> {f.type}
          </>
        }
        action={
          <Button variant="ghost" size="sm" onClick={onShowAll}>
            Show all facilities
          </Button>
        }
        divided
      />
      <div className="@container">
        <div className="grid @2xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <dl className="grid grid-cols-2 content-start gap-x-6 gap-y-4 px-4 py-4">
            <Field label="Address" className="col-span-2">
              {f.street}, {f.city}, {f.state} {f.zip}
            </Field>
            <Field label="County">{f.county}</Field>
            <Field label="NAICS">
              <span className="ident">{f.naics}</span>
            </Field>
            <Field label="Max occupants">
              <span className="tabular">{f.maxOccupants}</span>
              <span className="text-muted-foreground">
                {f.manned ? ", manned" : ", unmanned"}
              </span>
            </Field>
            <Field label="Site lead">{f.siteLead}</Field>
            <Field label="Emergency contact" className="col-span-2">
              {f.emergencyContact.name}, {f.emergencyContact.title}
              <a
                href={`tel:${f.emergencyContact.phone.replace(/\D/g, "")}`}
                className="block w-fit rounded-sm text-brand tabular outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                {f.emergencyContact.phone}
              </a>
            </Field>
            <Field label="LEPC" className="col-span-2">
              {f.lepc}
            </Field>
            <Field label="Fire department" className="col-span-2">
              {f.fireDepartment}
            </Field>
          </dl>
          <div className="border-t border-border px-4 py-4 @2xl:border-t-0 @2xl:border-l">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="text-[13px] font-medium">
                Storage areas by quantity held
              </h3>
              <span className="text-xs text-muted-foreground tabular">
                {ranked.length} areas
              </span>
            </div>
            {shown.length === 0 ? (
              <EmptyState
                className="py-6"
                title="No storage recorded"
                description="This site has no inventory for the year in view."
              />
            ) : (
              <ol className="flex flex-col gap-2.5">
                {shown.map((a) => (
                  <li
                    key={a.area}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1"
                  >
                    <span className="truncate text-[13px]">{a.area}</span>
                    <span className="text-xs tabular" title={formatLb(a.lb)}>
                      {formatLbCompact(a.lb)}
                      <span className="text-muted-foreground">
                        {" "}
                        in {a.count} {a.count === 1 ? "chemical" : "chemicals"}
                      </span>
                    </span>
                    <span className="col-span-2 h-1.5 rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-chart-neutral"
                        style={{ width: `${Math.max(2, (a.lb / max) * 100)}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {ranked.length > MAX_AREAS && (
              <Link
                href="/inventory"
                className="mt-3 inline-block rounded-sm text-[13px] text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                See all {ranked.length} areas in the inventory
              </Link>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
