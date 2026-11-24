"use client";

import NumberFlow, { type Format } from "@number-flow/react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusDot, type Tone } from "@/components/status-badge";

// One ruled band of figures. Used at the top of every screen so the key
// numbers always sit in the same place and read the same way.

export interface Stat {
  label: string;
  value: number;
  /** how to print the value; default is a plain integer */
  format?: Format;
  /** printed after the number, e.g. "lb" or "%" */
  suffix?: string;
  /** a line under the number: context, not decoration */
  hint?: React.ReactNode;
  /** a status dot before the label when the figure is a status */
  tone?: Tone;
  /** change against the comparison period, in percent */
  deltaPct?: number | null;
  /** label for the comparison, e.g. "vs 2025" */
  deltaLabel?: string;
  /** true when a rise is bad (expired documents), so it is not coloured as good */
  riseIsBad?: boolean;
  onClick?: () => void;
}

function Delta({ pct, label, riseIsBad }: { pct: number; label?: string; riseIsBad?: boolean }) {
  const flat = Math.abs(pct) < 0.05;
  const up = pct > 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const good = flat ? null : up !== Boolean(riseIsBad);
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-medium tabular",
          good === null ? "text-muted-foreground" : good ? "text-good" : "text-critical",
        )}
      >
        <Icon className="size-3" strokeWidth={2.5} aria-hidden />
        {Math.abs(pct).toFixed(1)}%
      </span>
      {label}
    </span>
  );
}

export function StatStrip({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <div className={cn("@container", className)}>
    <dl
      className={cn(
        // rules between cells come from the 1px gaps showing the border colour
        "grid gap-px overflow-hidden rounded-lg border border-border bg-border",
        "grid-cols-2 @xl:grid-cols-3 @3xl:grid-flow-col @3xl:auto-cols-fr @3xl:grid-cols-none",
      )}
    >
      {stats.map((s, i) => {
        const Comp = s.onClick ? "button" : "div";
        return (
          <Comp
            key={s.label}
            onClick={s.onClick}
            className={cn(
              "flex min-w-0 flex-col gap-1 bg-card px-4 py-3.5 text-left",
              // the last cell stretches so no row ends in an empty slot:
              // two columns on phones, three on tablets, one row on desktop
              i === stats.length - 1 && stats.length % 2 === 1 && "@max-xl:col-span-2",
              i === stats.length - 1 && stats.length % 3 === 2 && "@xl:@max-3xl:col-span-2",
              i === stats.length - 1 && stats.length % 3 === 1 && "@xl:@max-3xl:col-span-3",
              s.onClick &&
                "cursor-pointer outline-none transition-colors duration-150 hover:bg-subtle focus-visible:bg-subtle focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset",
            )}
          >
            <dt className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              {s.tone && <StatusDot tone={s.tone} />}
              <span className="truncate">{s.label}</span>
            </dt>
            <dd className="flex items-baseline gap-1 text-[26px] leading-8 font-semibold tracking-[-0.02em] text-foreground tabular">
              <NumberFlow value={s.value} format={s.format} />
              {s.suffix && <span className="text-sm font-medium text-muted-foreground">{s.suffix}</span>}
            </dd>
            <dd className="flex min-h-4 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              {s.deltaPct !== undefined && s.deltaPct !== null && (
                <Delta pct={s.deltaPct} label={s.deltaLabel} riseIsBad={s.riseIsBad} />
              )}
              {s.hint}
            </dd>
          </Comp>
        );
      })}
    </dl>
    </div>
  );
}
