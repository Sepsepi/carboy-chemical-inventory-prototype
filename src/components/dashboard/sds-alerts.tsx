"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { formatAge } from "@/lib/format";
import type { SdsRow } from "@/lib/store";
import { Panel, PanelHeader } from "@/components/layout/page";
import { SdsStatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";

const SHOW = 6;

function detail(row: SdsRow) {
  const s = row.status;
  if (s.key === "missing") return "No sheet on file";
  if (s.key === "expired") return `Revised ${formatAge(s.ageDays ?? 0)} ago`;
  const days = s.daysLeft ?? 0;
  return `Turns five in ${days} ${days === 1 ? "day" : "days"}`;
}

/** `rows` are the flagged SDS rows in scope, worst first. */
export function SdsAlerts({
  rows,
  allSites,
}: {
  rows: SdsRow[];
  /** number of facilities, to say "All sites" */ allSites: number;
}) {
  const counts = {
    missing: rows.filter((r) => r.status.key === "missing").length,
    expired: rows.filter((r) => r.status.key === "expired").length,
    review: rows.filter((r) => r.status.key === "review").length,
  };
  const parts = [
    counts.missing && `${counts.missing} missing`,
    counts.expired && `${counts.expired} over five years`,
    counts.review && `${counts.review} due for review`,
  ].filter(Boolean);

  return (
    <Panel>
      <PanelHeader
        title="Safety data sheets to act on"
        description={rows.length ? parts.join(", ") : undefined}
        action={
          rows.length > 0 ? (
            <Link
              href="/sds"
              className="rounded-sm text-[13px] text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              SDS library
            </Link>
          ) : undefined
        }
        divided
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Every safety data sheet is current"
          description="No chemical in scope is missing an SDS or close to the five-year limit."
        />
      ) : (
        <>
          <ul>
            {rows.slice(0, SHOW).map((row) => (
              <li
                key={row.product.id}
                className="border-b border-border last:border-b-0"
              >
                <Link
                  href={`/sds?product=${row.product.id}`}
                  className="group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 px-4 py-2.5 outline-none transition-colors duration-150 hover:bg-subtle focus-visible:bg-subtle focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium group-hover:text-brand">
                      {row.product.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {row.product.manufacturer}
                    </span>
                  </span>
                  <SdsStatusBadge status={row.status} />
                  <span className="col-span-2 flex min-w-0 items-baseline justify-between gap-3 text-xs text-muted-foreground">
                    <span className="truncate tabular">{detail(row)}</span>
                    <span className="shrink-0">
                      {row.facilities.length >= allSites ? (
                        "All sites"
                      ) : (
                        <span className="flex gap-1.5">
                          {row.facilities.map((f) => (
                            <span
                              key={f.id}
                              className="ident text-[11px]"
                              title={f.name}
                            >
                              {f.code}
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {counts.expired > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
              {rows.length > SHOW ? (
                <span className="tabular">
                  {rows.length - SHOW} more not shown
                </span>
              ) : (
                <span />
              )}
              <Link
                href="/sds?status=expired"
                className="rounded-sm text-[13px] text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                View all {counts.expired} over five years
              </Link>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
