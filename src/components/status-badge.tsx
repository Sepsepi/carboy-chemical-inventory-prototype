import {
  BadgeCheck,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Clock,
  Eye,
  FileX,
  PencilLine,
  Send,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { REPORT_STATUS_LABEL } from "@/lib/domain";
import type { ReportStatus, SdsStatus, SdsStatusKey } from "@/lib/types";

// Status is never colour alone: every badge carries an icon and a label.

export type Tone = "good" | "warn" | "serious" | "critical" | "info" | "neutral";

const TONE: Record<Tone, string> = {
  good: "bg-good-bg text-good border-good-border",
  warn: "bg-warn-bg text-warn border-warn-border",
  serious: "bg-serious-bg text-serious border-serious-border",
  critical: "bg-critical-bg text-critical border-critical-border",
  info: "bg-info-bg text-info border-info-border",
  neutral: "bg-muted text-muted-foreground border-border",
};

const DOT: Record<Tone, string> = {
  good: "bg-good-solid",
  warn: "bg-warn-solid",
  serious: "bg-serious-solid",
  critical: "bg-critical-solid",
  info: "bg-info-solid",
  neutral: "bg-chart-neutral",
};

export function StatusBadge({
  tone = "neutral",
  icon: Icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] w-fit shrink-0 items-center gap-1 rounded-md border px-1.5 text-xs font-medium whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3 shrink-0" strokeWidth={2.25} aria-hidden />}
      {children}
    </span>
  );
}

export function StatusDot({ tone, className }: { tone: Tone; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", DOT[tone], className)} />;
}

export const SDS_TONE: Record<SdsStatusKey, Tone> = {
  current: "good",
  review: "warn",
  expired: "critical",
  missing: "serious",
};

export const SDS_ICON: Record<SdsStatusKey, LucideIcon> = {
  current: CircleCheck,
  review: Clock,
  expired: CircleAlert,
  missing: FileX,
};

export function SdsStatusBadge({ status, className }: { status: SdsStatus; className?: string }) {
  return (
    <StatusBadge tone={SDS_TONE[status.key]} icon={SDS_ICON[status.key]} className={className}>
      {status.label}
    </StatusBadge>
  );
}

export const REPORT_TONE: Record<ReportStatus, Tone> = {
  "not-started": "neutral",
  draft: "neutral",
  "in-review": "info",
  ready: "warn",
  submitted: "info",
  accepted: "good",
};

export const REPORT_ICON: Record<ReportStatus, LucideIcon> = {
  "not-started": CircleDashed,
  draft: PencilLine,
  "in-review": Eye,
  ready: BadgeCheck,
  submitted: Send,
  accepted: CircleCheck,
};

export function ReportStatusBadge({ status, className }: { status: ReportStatus; className?: string }) {
  return (
    <StatusBadge tone={REPORT_TONE[status]} icon={REPORT_ICON[status]} className={className}>
      {REPORT_STATUS_LABEL[status]}
    </StatusBadge>
  );
}

/** Small tag for an Extremely Hazardous Substance. */
export function EhsTag({ className }: { className?: string }) {
  return (
    <span
      title="Contains an Extremely Hazardous Substance (EPCRA Section 302)"
      className={cn(
        "inline-flex h-[18px] items-center rounded-sm border border-serious-border bg-serious-bg px-1 text-[11px] font-semibold tracking-wide text-serious",
        className,
      )}
    >
      EHS
    </span>
  );
}
