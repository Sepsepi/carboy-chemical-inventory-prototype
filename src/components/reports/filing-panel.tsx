"use client";

// Filing status and workflow for one facility's Tier II report, plus the
// "Before you file" checklist that gates submission.

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, CircleCheck, CircleX, Send, TriangleAlert, Undo2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysBetween, parseDate, REPORT_STATUS_LABEL } from "@/lib/domain";
import { formatDate, formatDateLong, todayIso } from "@/lib/format";
import { CURRENT_USER } from "@/lib/seed/facilities";
import { useAppStore } from "@/lib/store";
import type { Facility, Report } from "@/lib/types";
import { Panel, PanelBody, PanelHeader } from "@/components/layout/page";
import { ReportStatusBadge, StatusBadge, type Tone } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  NEXT_STEP,
  PREV_STEP,
  sercFor,
  statusSentence,
  WORKFLOW,
  type CheckLevel,
  type CheckLine,
} from "./report-data";

const CHECK_META: Record<CheckLevel, { tone: Tone; icon: LucideIcon; word: string }> = {
  pass: { tone: "good", icon: CircleCheck, word: "Pass" },
  warn: { tone: "warn", icon: TriangleAlert, word: "Warning" },
  problem: { tone: "critical", icon: CircleX, word: "Problem" },
};

/* ─────────────────────────────── status ──────────────────────────────── */

export function FilingPanel({
  report,
  facility,
  checks,
}: {
  report: Report | undefined;
  facility: Facility;
  checks: CheckLine[];
}) {
  const setReportStatus = useAppStore((s) => s.setReportStatus);
  const logActivity = useAppStore((s) => s.logActivity);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!report) {
    return (
      <Panel>
        <PanelHeader title="Filing status" divided />
        <EmptyState
          title="No Tier II filing for this year"
          description="Pick another reporting year to see its filing."
        />
      </Panel>
    );
  }

  const year = report.year;
  const next = NEXT_STEP[report.status];
  const prev = PREV_STEP[report.status];
  const problems = checks.filter((c) => c.level === "problem").length;
  const blocked = report.status === "ready" && problems > 0;
  const daysLeft = daysBetween(new Date(), parseDate(report.dueDate));
  const closed = report.status === "accepted";
  const stageIndex = WORKFLOW.indexOf(report.status);
  const href = `/reports?facility=${facility.id}&year=${year}&type=tier2`;

  function move(to: Report["status"], toastText: string, patch: Partial<Report> = {}) {
    setReportStatus(report!.id, to, patch);
    logActivity({ kind: "report-status", summary: statusSentence(year, to), facilityId: facility.id, href });
    toast.success(toastText, { description: `${facility.name}, Tier II ${year}` });
  }

  function forward() {
    if (!next) return;
    if (report!.status === "ready") {
      setConfirmOpen(true);
      return;
    }
    const patch: Partial<Report> =
      next.to === "draft"
        ? { preparedBy: report!.preparedBy ?? CURRENT_USER.name }
        : next.to === "in-review"
          ? { reviewedBy: report!.reviewedBy ?? CURRENT_USER.name }
          : {};
    move(next.to, next.toast, patch);
  }

  function submit() {
    const confirmation = `T2-${facility.state}-${year}-${String(100000 + Math.floor(Math.random() * 900000))}`;
    move("submitted", "Submitted to state", { submittedAt: todayIso(), confirmation });
    setConfirmOpen(false);
  }

  return (
    <Panel>
      <PanelHeader
        title="Filing status"
        description={`Tier II for ${facility.code}, reporting year ${year}`}
        action={<ReportStatusBadge status={report.status} />}
        divided
      />
      <PanelBody className="flex flex-col gap-4 pt-3">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <StatusField label={closed || report.status === "submitted" ? "Was due" : "Due"}>
            {formatDate(report.dueDate)}
            {!closed && report.status !== "submitted" && (
              <span className={cn("block text-xs", daysLeft <= 30 ? "text-critical" : "text-muted-foreground")}>
                {daysLeft >= 0 ? `in ${daysLeft} days` : `${-daysLeft} days overdue`}
              </span>
            )}
          </StatusField>
          <StatusField label="Last updated">{formatDate(report.updatedAt)}</StatusField>
          <StatusField label="Prepared by">{report.preparedBy ?? <Muted>Not yet</Muted>}</StatusField>
          <StatusField label="Reviewed by">{report.reviewedBy ?? <Muted>Not yet</Muted>}</StatusField>
          {report.submittedAt && <StatusField label="Submitted">{formatDate(report.submittedAt)}</StatusField>}
          {report.confirmation && (
            <StatusField label="Confirmation">
              <span className="ident">{report.confirmation}</span>
            </StatusField>
          )}
        </dl>

        <ol aria-label="Filing workflow" className="flex flex-col">
          {WORKFLOW.map((stage, i) => {
            const done = i < stageIndex || (closed && i === stageIndex);
            const current = i === stageIndex && !closed;
            return (
              <li key={stage} className="relative flex h-8 items-center gap-3">
                {i < WORKFLOW.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-[22px] left-[9px] h-[20px] w-px",
                      i < stageIndex ? "bg-foreground/70" : "bg-border-strong",
                    )}
                  />
                )}
                <span
                  aria-hidden
                  className={cn(
                    "relative grid size-[19px] shrink-0 place-items-center rounded-full border text-[10px] font-semibold",
                    done && "border-foreground bg-foreground text-background",
                    current && "border-brand bg-brand-bg text-brand ring-3 ring-brand-bg",
                    !done && !current && "border-border-strong bg-card text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className={cn(
                    "text-[13px]",
                    current ? "font-semibold text-foreground" : done ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {REPORT_STATUS_LABEL[stage]}
                  <span className="sr-only">{done ? ", done" : current ? ", current stage" : ", to do"}</span>
                </span>
                {current && <span className="ml-auto text-xs text-brand">Current stage</span>}
              </li>
            );
          })}
        </ol>

        {closed ? (
          <p className="rounded-md border border-good-border bg-good-bg px-3 py-2 text-[13px] leading-5 text-good">
            Accepted by the state on {formatDateLong(report.updatedAt)}. This filing is closed.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {next && (
                <Button onClick={forward} disabled={blocked} className="h-9 px-3">
                  {report.status === "ready" && <Send data-icon="inline-start" />}
                  {next.label}
                </Button>
              )}
              {prev && (
                <Button
                  variant="ghost"
                  className="h-9 text-muted-foreground"
                  onClick={() => move(prev.to, prev.toast)}
                >
                  <Undo2 data-icon="inline-start" />
                  {prev.label}
                </Button>
              )}
            </div>
            {blocked && (
              <p className="flex items-start gap-1.5 text-[13px] leading-5 text-critical" role="status">
                <CircleX className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Submitting is blocked: {problems} {problems === 1 ? "problem" : "problems"} in Before you file. Fix{" "}
                {problems === 1 ? "it" : "them"} first.
              </p>
            )}
            {report.status === "submitted" && (
              <p className="text-[13px] leading-5 text-muted-foreground">
                Waiting for the state to accept it. Record acceptance when the confirmation arrives.
              </p>
            )}
          </div>
        )}
      </PanelBody>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Submit the {year} Tier II report?</DialogTitle>
            <DialogDescription>
              {facility.name} files its inventory for January 1 to December 31, {year}. It goes to all three
              recipients:
            </DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border text-[13px]">
            <Recipient role="State emergency response commission" name={sercFor(facility.state)} />
            <Recipient role="Local emergency planning committee" name={facility.lepc} />
            <Recipient role="Fire department" name={facility.fireDepartment} />
          </ul>
          <p className="text-[13px] text-muted-foreground">
            {checks.filter((c) => c.level === "warn").length > 0
              ? "Warnings in Before you file do not block submission, but check them first."
              : "Every check in Before you file passes."}
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="bg-card">
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={submit}>
              <Send data-icon="inline-start" />
              Submit to state
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

function Recipient({ role, name }: { role: string; name: string }) {
  return (
    <li className="flex flex-col px-3 py-2">
      <span className="text-xs text-muted-foreground">{role}</span>
      <span className="text-foreground">{name}</span>
    </li>
  );
}

function StatusField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[13px] text-foreground">{children}</dd>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}

/* ───────────────────────────── checklist ─────────────────────────────── */

export function ChecklistPanel({ checks, year, closed = false }: { checks: CheckLine[]; year: number; closed?: boolean }) {
  const problems = checks.filter((c) => c.level === "problem").length;
  const warns = checks.filter((c) => c.level === "warn").length;
  const summary =
    problems + warns === 0
      ? `All ${checks.length} checks pass.`
      : [problems && `${problems} ${problems === 1 ? "problem" : "problems"}`, warns && `${warns} ${warns === 1 ? "warning" : "warnings"}`]
          .filter(Boolean)
          .join(", ") + (closed ? ". This filing is already closed." : ". Problems block submission.");
  return (
    <Panel id="before-you-file">
      <PanelHeader title="Before you file" description={`${summary} Checked against ${year} data.`} divided />
      <ul className="flex flex-col divide-y divide-border">
        {checks.map((c) => (
          <CheckRow key={c.id} check={c} />
        ))}
      </ul>
    </Panel>
  );
}

function CheckRow({ check }: { check: CheckLine }) {
  const meta = CHECK_META[check.level];
  const [open, setOpen] = useState(false);
  const shown = open ? check.items : check.items.slice(0, 4);
  return (
    <li className="flex flex-col gap-1.5 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium text-foreground">{check.title}</span>
        <StatusBadge tone={meta.tone} icon={meta.icon}>
          {meta.word}
        </StatusBadge>
      </div>
      <p className="text-[13px] leading-5 text-muted-foreground">{check.detail}</p>
      {check.items.length > 0 && (
        <ul className="mt-0.5 flex flex-col gap-1">
          {shown.map((it) => (
            <li key={it.id} className="flex items-baseline justify-between gap-3 text-[13px]">
              <Link
                href={it.href}
                className="min-w-0 truncate rounded-sm text-brand underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                {it.label}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">{it.note}</span>
            </li>
          ))}
          {check.items.length > 4 && (
            <li>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="cursor-pointer rounded-sm text-xs text-muted-foreground underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                {open ? "Show fewer" : `Show all ${check.items.length}`}
              </button>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
