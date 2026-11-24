"use client";

import { Bomb, Fish, Flame, Skull, TestTubeDiagonal, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { GHS_META, GHS_ORDER } from "@/lib/domain";
import type { GhsCode } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// GHS hazard pictograms: a black symbol on white inside a red diamond.
// The frame colours are fixed by the standard, so they do not follow the theme.

function Symbol({ code, className }: { code: GhsCode; className?: string }) {
  const filled = { className, fill: "currentColor", strokeWidth: 1.25 } as const;
  switch (code) {
    case "GHS01":
      return <Bomb {...filled} />;
    case "GHS02":
      return <Flame {...filled} />;
    case "GHS03":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path
            d="M12 1.5c1.6 2.3 3.4 3.6 3.4 6.1a3.4 3.4 0 0 1-6.8 0c0-1.5.8-2.3 1.5-3.5.5.8 1 1.1 1.4 1.2-.1-1.2.1-2.5.5-3.8Z"
            fill="currentColor"
          />
          <circle cx="12" cy="17" r="4.6" fill="none" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      );
    case "GHS04":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <g transform="rotate(-38 12 12)" fill="currentColor">
            <rect x="8" y="6.5" width="8" height="15" rx="3.2" />
            <rect x="10.4" y="2.2" width="3.2" height="3.4" rx="0.8" />
          </g>
        </svg>
      );
    case "GHS05":
      return <TestTubeDiagonal className={className} strokeWidth={2.4} />;
    case "GHS06":
      return <Skull {...filled} stroke="white" />;
    case "GHS07":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M12 3.5v10.5" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" />
          <circle cx="12" cy="19.4" r="2.1" fill="currentColor" />
        </svg>
      );
    case "GHS08":
      return <User {...filled} />;
    case "GHS09":
      return <Fish {...filled} stroke="white" />;
  }
}

const SIZES = {
  xs: { box: "size-5", symbol: "size-2.5", border: "border-[1.5px]" },
  sm: { box: "size-6", symbol: "size-3", border: "border-[1.5px]" },
  md: { box: "size-8", symbol: "size-4", border: "border-2" },
  lg: { box: "size-12", symbol: "size-6", border: "border-[3px]" },
  xl: { box: "size-16", symbol: "size-8", border: "border-4" },
} as const;

export function GhsPictogram({
  code,
  size = "sm",
  tooltip = true,
  className,
}: {
  code: GhsCode;
  size?: keyof typeof SIZES;
  tooltip?: boolean;
  className?: string;
}) {
  const s = SIZES[size];
  const meta = GHS_META[code];
  const mark = (
    <span
      role="img"
      aria-label={`${code}: ${meta.short}`}
      className={cn("relative inline-grid shrink-0 place-items-center", s.box, className)}
    >
      <span
        aria-hidden
        className={cn("absolute inset-[14.5%] rotate-45 rounded-[1px] border-ghs bg-white", s.border)}
      />
      <Symbol code={code} className={cn("relative text-neutral-950", s.symbol)} />
    </span>
  );
  if (!tooltip) return mark;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{mark}</TooltipTrigger>
      <TooltipContent className="max-w-56">
        <p className="font-medium">
          {meta.short} <span className="ident opacity-70">{code}</span>
        </p>
        <p className="opacity-80">{meta.meaning}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/** A row of pictograms in the standard order. `max` folds the rest into "+2". */
export function GhsList({
  codes,
  size = "sm",
  max,
  className,
  emptyLabel = "Not classified",
}: {
  codes: GhsCode[];
  size?: keyof typeof SIZES;
  max?: number;
  className?: string;
  emptyLabel?: string | null;
}) {
  const ordered = GHS_ORDER.filter((c) => codes.includes(c));
  if (ordered.length === 0) {
    return emptyLabel ? <span className="text-xs text-muted-foreground">{emptyLabel}</span> : null;
  }
  const shown = max ? ordered.slice(0, max) : ordered;
  const rest = ordered.length - shown.length;
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {shown.map((c) => (
        <GhsPictogram key={c} code={c} size={size} />
      ))}
      {rest > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="ml-1 text-xs font-medium text-muted-foreground tabular">+{rest}</span>
          </TooltipTrigger>
          <TooltipContent>
            {ordered
              .slice(shown.length)
              .map((c) => GHS_META[c].short)
              .join(", ")}
          </TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}
