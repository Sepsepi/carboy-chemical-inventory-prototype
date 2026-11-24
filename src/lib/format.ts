import { parseDate } from "@/lib/domain";

const INT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** 1,250,000 */
export function formatNumber(n: number): string {
  return INT.format(n);
}

/** 1.3M, 46K, 950 */
export function formatCompact(n: number): string {
  return COMPACT.format(n);
}

/** "1,250,000 lb" */
export function formatLb(lb: number): string {
  return `${INT.format(lb)} lb`;
}

/** "1.3M lb" */
export function formatLbCompact(lb: number): string {
  return `${COMPACT.format(lb)} lb`;
}

/** lb to short tons, one decimal: "625.0 tons" */
export function formatTons(lb: number): string {
  return `${(lb / 2000).toLocaleString("en-US", { maximumFractionDigits: 1 })} tons`;
}

const DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const DATE_SHORT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const DATE_LONG = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** "Mar 12, 2024" */
export function formatDate(iso: string): string {
  return DATE.format(parseDate(iso));
}

/** "Mar 12" */
export function formatDateShort(iso: string): string {
  return DATE_SHORT.format(parseDate(iso));
}

/** "March 12, 2024" */
export function formatDateLong(iso: string): string {
  return DATE_LONG.format(parseDate(iso));
}

/** "3 hours ago", "in 97 days", "yesterday" */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffMs = parseDate(iso).getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < hour) return rtf.format(Math.round(diffMs / minute), "minute");
  if (abs < day) return rtf.format(Math.round(diffMs / hour), "hour");
  if (abs < 45 * day) return rtf.format(Math.round(diffMs / day), "day");
  if (abs < 365 * day) return rtf.format(Math.round(diffMs / (30.44 * day)), "month");
  return rtf.format(Math.round(diffMs / (365.25 * day)), "year");
}

/** Age of a document: "5 yr 2 mo", "8 mo", "12 days" */
export function formatAge(days: number): string {
  if (days < 31) return `${days} ${days === 1 ? "day" : "days"}`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} yr ${rest} mo` : `${years} yr`;
}

/** "+4.2%" / "-1.0%"; an em-less "0.0%" when flat */
export function formatDelta(current: number, previous: number): string {
  if (!previous) return "new";
  const pct = ((current - previous) / previous) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** today as an ISO calendar date in UTC */
export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
