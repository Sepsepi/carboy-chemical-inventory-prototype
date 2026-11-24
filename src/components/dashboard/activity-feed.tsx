"use client";

import Link from "next/link";
import {
  FilePlus2,
  FileSearch,
  FileText,
  FlaskConical,
  History,
  PackagePlus,
  Scale,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { formatRelative } from "@/lib/format";
import type { ActivityEvent, ActivityKind } from "@/lib/types";
import { Panel, PanelHeader } from "@/components/layout/page";
import { EmptyState } from "@/components/empty-state";

const ICON: Record<ActivityKind, LucideIcon> = {
  "inventory-updated": Scale,
  "product-added": PackagePlus,
  "sds-uploaded": FilePlus2,
  "sds-requested": FileSearch,
  "sds-flagged": TriangleAlert,
  "report-status": FileText,
  "report-generated": FlaskConical,
};

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <Panel>
      <PanelHeader title="Recent activity" divided />
      {events.length === 0 ? (
        <EmptyState
          icon={History}
          title="No activity in scope"
          description="Changes to inventory, SDSs and reports at this site will show here."
        />
      ) : (
        <ol className="py-1">
          {events.map((e) => {
            const Icon = ICON[e.kind] ?? History;
            const body = (
              <>
                <span
                  className={
                    e.kind === "sds-flagged"
                      ? "mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border border-critical-border bg-critical-bg text-critical"
                      : "mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border border-border bg-subtle text-muted-foreground"
                  }
                >
                  <Icon className="size-3.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] leading-5">
                    <span className="font-medium">{e.actor}</span> {e.summary}
                  </span>
                  <time
                    dateTime={e.at}
                    className="text-xs text-muted-foreground"
                    title={new Date(e.at).toLocaleString()}
                  >
                    {formatRelative(e.at)}
                  </time>
                </span>
              </>
            );
            const cls =
              "flex gap-3 px-4 py-2 outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset";
            return (
              <li key={e.id}>
                {e.href ? (
                  <Link
                    href={e.href}
                    className={`${cls} hover:bg-subtle focus-visible:bg-subtle`}
                  >
                    {body}
                  </Link>
                ) : (
                  <div className={cls}>{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
