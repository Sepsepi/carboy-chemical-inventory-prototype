"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarClock, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  daysBetween,
  parseDate,
  tier2DueDate,
} from "@/lib/domain";
import { formatDate, formatDateLong, formatDateShort } from "@/lib/format";
import type { Facility, Report, ReportStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/layout/page";
import { ReportStatusBadge, StatusBadge } from "@/components/status-badge";

// The anchor of the Overview: where each facility's Tier II filing stands
// against the March 1 deadline.

/** The steps a filing moves through, in order. "Not started" is before step one. */
const STEPS: ReportStatus[] = [
  "draft",
  "in-review",
  "ready",
  "submitted",
  "accepted",
];
/** short step names so five fit side by side on a phone */
const STEP_LABEL: Partial<Record<ReportStatus, string>> = {
  draft: "Draft",
  "in-review": "Review",
  ready: "Ready",
  submitted: "Submitted",
  accepted: "Accepted",
};
const ORDER: ReportStatus[] = [
  "accepted",
  "submitted",
  "ready",
  "in-review",
  "draft",
  "not-started",
];

const SUMMARY_WORD: Record<ReportStatus, string> = {
  accepted: "accepted",
  submitted: "submitted",
  ready: "ready to submit",
  "in-review": "in review",
  draft: "in draft",
  "not-started": "not started",
};

const NEXT_STEP: Record<ReportStatus, string> = {
  "not-started":
    "Start a draft from this year's inventory. Nothing has been prepared yet.",
  draft:
    "Finish the draft, check every reportable chemical, and send it for review.",
  "in-review":
    "The report is with the reviewer. Resolve their comments, then mark it ready.",
  ready: "Reviewed and ready. Submit it to the state through Tier2 Submit.",
  submitted: "Submitted. Waiting for the state to accept it.",
  accepted: "Accepted by the state. Nothing left to do for this year.",
};

function stepIndex(status: ReportStatus) {
  return STEPS.indexOf(status) + 1; // 0 for not started
}

function StepTrack({
  status,
  className,
}: {
  status: ReportStatus;
  className?: string;
}) {
  const done = stepIndex(status);
  return (
    <span aria-hidden className={cn("grid grid-cols-5 gap-0.5", className)}>
      {STEPS.map((s, i) => (
        <span
          key={s}
          className={cn(
            "h-1 rounded-[1px]",
            i < done
              ? status === "accepted"
                ? "bg-good-solid"
                : "bg-foreground/75"
              : "bg-muted",
          )}
        />
      ))}
    </span>
  );
}

function summarize(reports: Report[]) {
  const parts = ORDER.map((s) => ({
    s,
    n: reports.filter((r) => r.status === s).length,
  }))
    .filter((p) => p.n > 0)
    .map((p) => `${p.n} ${SUMMARY_WORD[p.s]}`);
  if (parts.length === 0) return "No filings for this year yet.";
  const text = parts.join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1) + ".";
}

function reportHref(facilityId: string, year: number) {
  return `/reports?facility=${facilityId}&year=${year}&type=tier2`;
}

function Deadline({
  year,
  closed,
  reports,
}: {
  year: number;
  closed: boolean;
  reports: Report[];
}) {
  const due = tier2DueDate(year);
  const daysLeft = daysBetween(new Date(), parseDate(due));
  if (closed) {
    const dates = reports
      .map((r) => r.submittedAt)
      .filter((d): d is string => Boolean(d))
      .sort();
    return (
      <div className="flex flex-col gap-1">
        <span className="flex items-baseline gap-2 text-[26px] leading-8 font-semibold tracking-[-0.02em] tabular">
          <CircleCheck className="size-5 self-center text-good" aria-hidden />
          Filed
        </span>
        <span className="text-xs text-muted-foreground">
          {dates.length > 0
            ? `Submitted ${formatDateShort(dates[0])} to ${formatDate(dates[dates.length - 1])}`
            : `Due ${formatDate(due)}`}
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-baseline gap-1.5 text-[26px] leading-8 font-semibold tracking-[-0.02em] tabular">
        {daysLeft < 0 ? Math.abs(daysLeft) : daysLeft}
        <span className="text-sm font-medium text-muted-foreground">
          {daysLeft < 0
            ? "days overdue"
            : daysLeft === 1
              ? "day left"
              : "days left"}
        </span>
      </span>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <CalendarClock className="size-3.5" aria-hidden />
        Due {formatDateLong(due)}
      </span>
    </div>
  );
}

export function FilingPanel({
  year,
  closed,
  reports,
  facilities,
  facility,
}: {
  year: number;
  closed: boolean;
  reports: Report[];
  facilities: Facility[];
  /** set when one facility is in scope */
  facility?: Facility;
}) {
  const tier2 = reports.filter((r) => r.type === "tier2");
  const byFacility = new Map(tier2.map((r) => [r.facilityId, r]));

  if (facility) {
    const report = byFacility.get(facility.id);
    return (
      <Panel aria-labelledby="filing-title">
        <div className="grid gap-x-8 gap-y-4 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="filing-title" className="text-sm font-semibold">
                Tier II filing for {year}
              </h2>
              {report && <ReportStatusBadge status={report.status} />}
            </div>
            {report ? (
              <>
                <ol
                  className="grid max-w-xl grid-cols-5 gap-x-2"
                  aria-label="Filing steps"
                >
                  {STEPS.map((s, i) => {
                    const done = i < stepIndex(report.status);
                    const current = s === report.status;
                    return (
                      <li key={s} className="flex min-w-0 flex-col gap-1.5">
                        <span
                          className={cn(
                            "h-1 rounded-[1px]",
                            done
                              ? report.status === "accepted"
                                ? "bg-good-solid"
                                : "bg-foreground/75"
                              : "bg-muted",
                          )}
                        />
                        <span
                          className={cn(
                            "text-[11px] leading-tight sm:text-xs",
                            current
                              ? "font-medium text-foreground"
                              : "text-muted-foreground",
                          )}
                          aria-current={current ? "step" : undefined}
                        >
                          {STEP_LABEL[s]}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                <p className="max-w-[62ch] text-[13px] leading-5 text-foreground">
                  <span className="font-medium">Next step: </span>
                  {NEXT_STEP[report.status]}
                </p>
                <dl className="flex flex-wrap gap-x-8 gap-y-2 text-[13px]">
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Prepared by
                    </dt>
                    <dd>{report.preparedBy ?? "Not assigned"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Reviewer</dt>
                    <dd>{report.reviewedBy ?? "Not assigned"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Last updated
                    </dt>
                    <dd className="tabular">{formatDate(report.updatedAt)}</dd>
                  </div>
                  {report.confirmation && (
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Confirmation
                      </dt>
                      <dd className="ident">{report.confirmation}</dd>
                    </div>
                  )}
                </dl>
              </>
            ) : (
              <p className="text-[13px] text-muted-foreground">
                No Tier II report exists for this site and year yet.
              </p>
            )}
          </div>
          <div className="flex flex-row items-end justify-between gap-4 md:flex-col md:items-end md:justify-between">
            <Deadline
              year={year}
              closed={closed}
              reports={report ? [report] : []}
            />
            <Button asChild variant="outline" className="bg-card">
              <Link href={reportHref(facility.id, year)}>
                Open report
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
      </Panel>
    );
  }

  const allAccepted =
    tier2.length > 0 && tier2.every((r) => r.status === "accepted");

  return (
    <Panel aria-labelledby="filing-title">
      <div className="flex flex-col gap-4 px-4 pt-4 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="filing-title" className="text-sm font-semibold">
            Tier II filing for {year}
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
            {allAccepted
              ? `All ${tier2.length} facility reports were accepted by the state.`
              : summarize(tier2)}
          </p>
        </div>
        <Deadline year={year} closed={closed} reports={tier2} />
      </div>
      <ul className="grid grid-cols-2 border-t border-border sm:grid-cols-3 xl:grid-cols-6">
        {facilities.map((f, i) => {
          const r = byFacility.get(f.id);
          return (
            <li
              key={f.id}
              className={cn(
                "min-w-0 border-border",
                // rules between cells for 2, 3 and 6 columns
                "max-sm:[&:nth-child(even)]:border-l max-sm:[&:nth-child(n+3)]:border-t",
                "sm:max-xl:[&:not(:nth-child(3n+1))]:border-l sm:max-xl:[&:nth-child(n+4)]:border-t",
                i > 0 && "xl:border-l",
              )}
            >
              <Link
                href={reportHref(f.id, year)}
                className="group flex h-full flex-col gap-2 px-4 py-3 outline-none transition-colors duration-150 hover:bg-subtle focus-visible:bg-subtle focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset"
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="ident text-xs text-muted-foreground">
                    {f.code}
                  </span>
                  <span className="truncate text-[13px] font-medium group-hover:text-brand">
                    {f.city}
                  </span>
                </span>
                {r ? (
                  <>
                    <ReportStatusBadge status={r.status} />
                    <StepTrack status={r.status} />
                    <span className="truncate text-xs text-muted-foreground tabular">
                      {r.status === "accepted" && r.confirmation ? (
                        <span className="ident">{r.confirmation}</span>
                      ) : r.preparedBy ? (
                        r.preparedBy
                      ) : (
                        "No one assigned"
                      )}
                    </span>
                  </>
                ) : (
                  <StatusBadge>No report</StatusBadge>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
