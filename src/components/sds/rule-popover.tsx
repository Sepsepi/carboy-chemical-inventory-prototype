"use client";

import { Info } from "lucide-react";
import { SDS_MAX_AGE_YEARS, SDS_REVIEW_WINDOW_DAYS } from "@/lib/domain";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SdsStatusBadge } from "@/components/status-badge";
import { SDS_STATUS_LABEL } from "@/lib/domain";
import type { SdsStatusKey } from "@/lib/types";

const RULES: { key: SdsStatusKey; text: string }[] = [
  { key: "current", text: `The latest revision date plus ${SDS_MAX_AGE_YEARS} years is more than ${SDS_REVIEW_WINDOW_DAYS} days away.` },
  { key: "review", text: `The ${SDS_MAX_AGE_YEARS}-year mark is ${SDS_REVIEW_WINDOW_DAYS} days away or less.` },
  { key: "expired", text: `The latest revision date plus ${SDS_MAX_AGE_YEARS} years has passed.` },
  { key: "missing", text: "The product has no safety data sheet in the library." },
];

/** States the flagging rule exactly. Sits next to the page description. */
export function RulePopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="How SDS status is worked out"
          className="ml-1 inline-grid size-5 cursor-pointer place-items-center rounded-md align-[-4px] text-muted-foreground outline-none transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <Info className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="border-b border-border px-3.5 py-3">
          <p className="text-sm font-semibold">How status is worked out</p>
          <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
            From the revision date printed on the latest version (Section 16) and today&apos;s date. Nobody sets it by hand, so a
            new version changes it at once.
          </p>
        </div>
        <ul className="flex flex-col gap-2.5 px-3.5 py-3">
          {RULES.map((r) => (
            <li key={r.key} className="flex flex-col gap-1">
              <SdsStatusBadge status={{ key: r.key, label: SDS_STATUS_LABEL[r.key] }} />
              <span className="text-[13px] leading-5 text-muted-foreground">{r.text}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
