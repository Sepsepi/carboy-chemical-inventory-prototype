"use client";

import * as React from "react";
import { SDS_MAX_AGE_YEARS, SDS_REVIEW_WINDOW_DAYS } from "@/lib/domain";
import { formatAge, formatDate } from "@/lib/format";
import type { SdsRow } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Panel, PanelHeader } from "@/components/layout/page";
import { SDS_TONE, StatusDot } from "@/components/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Every document as a mark on an axis of age, 0 to 9+ years, with the
// five-year limit drawn in. Wide: a stacked dot plot by exact age. Narrow:
// dots bucketed by whole year so the marks stay big enough to tap.

const MAX_YEARS = 9; // the last tick reads "9+"
const DOMAIN = MAX_YEARS + 1;
const PAD_X = 12;
const NARROW = 560;

const SOLID: Record<string, string> = {
  good: "bg-good-solid",
  warn: "bg-warn-solid",
  critical: "bg-critical-solid",
  serious: "bg-serious-solid",
};

interface Mark {
  row: SdsRow;
  years: number;
  x: number;
  level: number;
}

function useWidth<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function AgeTimeline({
  rows,
  onOpen,
  activeProductId,
}: {
  rows: SdsRow[];
  onOpen: (productId: string) => void;
  activeProductId?: string | null;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const narrow = width > 0 && width < NARROW;
  const dot = 12;
  const gap = 3;
  const step = dot + gap;
  const plotW = Math.max(0, width - PAD_X * 2);
  const xOf = React.useCallback((years: number) => PAD_X + (Math.min(years, DOMAIN) / DOMAIN) * plotW, [plotW]);

  const docs = rows.filter((r) => r.status.ageDays !== undefined);
  const missing = rows.length - docs.length;

  const marks = React.useMemo<Mark[]>(() => {
    if (!plotW) return [];
    const sorted = [...docs]
      .map((row) => ({ row, years: row.status.ageDays! / 365.25 }))
      .sort((a, b) => a.years - b.years);
    if (narrow) {
      // bucket by whole year; fill each bucket left to right, bottom to top
      const bucketW = plotW / DOMAIN;
      const perRow = Math.max(1, Math.floor((bucketW - 2) / step));
      const counts = new Map<number, number>();
      return sorted.map(({ row, years }) => {
        const b = Math.min(MAX_YEARS, Math.floor(years));
        const i = counts.get(b) ?? 0;
        counts.set(b, i + 1);
        const col = i % perRow;
        const used = perRow * step - gap;
        const x = PAD_X + b * bucketW + (bucketW - used) / 2 + col * step + dot / 2;
        return { row, years, x, level: Math.floor(i / perRow) };
      });
    }
    // stacked dot plot: each mark takes the lowest level where it does not touch another
    const levels: number[][] = [];
    return sorted.map(({ row, years }) => {
      const x = xOf(Math.min(years, MAX_YEARS + 0.8));
      let level = 0;
      while (levels[level]?.some((other) => Math.abs(other - x) < step)) level++;
      (levels[level] ??= []).push(x);
      return { row, years, x, level };
    });
  }, [docs, plotW, narrow, step, dot, gap, xOf]);

  const maxLevel = marks.reduce((m, k) => Math.max(m, k.level), 0);
  const plotH = Math.max(4, maxLevel + 1) * step + 18;
  const limitX = xOf(SDS_MAX_AGE_YEARS);
  const windowX = xOf(SDS_MAX_AGE_YEARS - SDS_REVIEW_WINDOW_DAYS / 365.25);

  const counts = { current: 0, review: 0, expired: 0 };
  for (const d of docs) if (d.status.key in counts) counts[d.status.key as keyof typeof counts]++;

  return (
    <Panel>
      <PanelHeader
        title="Age of every safety data sheet"
        description={
          <>
            Each mark is one document, placed by the age of its latest revision. Past the line it is flagged.
            {missing > 0 && ` ${missing} ${missing === 1 ? "product has" : "products have"} no SDS and ${missing === 1 ? "is" : "are"} not on the axis.`}
          </>
        }
        action={
          narrow ? undefined : <ul className="hidden items-center gap-3 text-xs text-muted-foreground md:flex">
            {(["current", "review", "expired"] as const).map((k) => (
              <li key={k} className="flex items-center gap-1.5 whitespace-nowrap">
                <StatusDot tone={SDS_TONE[k]} />
                {k === "current" ? "Current" : k === "review" ? "Review due" : "Over 5 years"}
                <span className="font-medium text-foreground tabular">{counts[k]}</span>
              </li>
            ))}
          </ul>
        }
      />
      <div ref={ref} className="px-4 pt-2 pb-3">
        {width > 0 && (
          <div className="relative" style={{ height: plotH + 26 }}>
            {/* zone past the limit and the review window before it */}
            <div
              aria-hidden
              className="absolute top-0 bg-warn-bg"
              style={{ left: windowX, width: limitX - windowX, height: plotH }}
            />
            <div
              aria-hidden
              className="absolute top-0 bg-critical-bg/50"
              style={{ left: limitX, right: 0, height: plotH }}
            />
            {/* the five-year line */}
            <div
              aria-hidden
              className="absolute top-0 w-0 border-l-[1.5px] border-dashed border-critical"
              style={{ left: limitX, height: plotH }}
            />
            <span
              className="absolute top-0 pl-1.5 text-xs font-medium whitespace-nowrap text-critical"
              style={{ left: limitX }}
            >
              5-year limit
            </span>
            {!narrow && (
              <span
                className="absolute top-0 pr-1.5 text-right text-xs whitespace-nowrap text-warn"
                style={{ right: width - windowX }}
              >
                Review window, {SDS_REVIEW_WINDOW_DAYS} days
              </span>
            )}

            {/* baseline and ticks */}
            <div aria-hidden className="absolute inset-x-0 border-t border-border-strong" style={{ top: plotH }} />
            {Array.from({ length: MAX_YEARS + 1 }, (_, y) => {
              const x = narrow ? PAD_X + (y + 0.5) * (plotW / DOMAIN) : xOf(y);
              return (
                <div key={y} aria-hidden className="absolute" style={{ left: x, top: plotH }}>
                  {!narrow && <div className="h-1.5 w-px -translate-x-1/2 bg-border-strong" />}
                  <span
                    className={cn(
                      "absolute top-2 -translate-x-1/2 text-xs whitespace-nowrap text-muted-foreground tabular",
                      y === SDS_MAX_AGE_YEARS && "font-medium text-critical",
                    )}
                  >
                    {y === MAX_YEARS ? "9+" : y}
                    {(y === 0 || y === MAX_YEARS) && " yr"}
                  </span>
                </div>
              );
            })}
            {/* marks */}
            {marks.map(({ row, x, level }) => {
              const tone = SDS_TONE[row.status.key];
              const latest = row.doc!.versions[0];
              const active = row.product.id === activeProductId;
              return (
                <Tooltip key={row.product.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`${row.product.name}, version ${latest.version}, ${formatAge(row.status.ageDays!)} old, ${row.status.label}`}
                      onClick={() => onOpen(row.product.id)}
                      className={cn(
                        "absolute grid -translate-x-1/2 cursor-pointer place-items-center rounded-full outline-none",
                        "transition-transform duration-150 ease-[var(--ease-out-quint)] hover:scale-125 focus-visible:scale-125",
                        "focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-card",
                        narrow && "before:absolute before:-inset-1 before:content-['']",
                        active && "ring-2 ring-foreground ring-offset-1 ring-offset-card",
                      )}
                      style={{ left: x, top: plotH - (level + 1) * step + gap / 2, width: dot, height: dot }}
                    >
                      <span className={cn("size-full rounded-full border border-card", SOLID[tone])} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-60">
                    <p className="font-medium">{row.product.name}</p>
                    <p className="opacity-80">
                      Version {latest.version}, revised {formatDate(latest.revisionDate)}
                    </p>
                    <p className="opacity-80">
                      {formatAge(row.status.ageDays!)} old, {row.status.label.toLowerCase()}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}
        {narrow && (
          <ul className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {(["current", "review", "expired"] as const).map((k) => (
              <li key={k} className="flex items-center gap-1.5">
                <StatusDot tone={SDS_TONE[k]} />
                {k === "current" ? "Current" : k === "review" ? "Review due" : "Over 5 years"}
                <span className="font-medium text-foreground tabular">{counts[k]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
