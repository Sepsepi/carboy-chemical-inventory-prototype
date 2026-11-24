// Small pure helpers for the SDS screen. The rule itself lives in
// src/lib/domain.ts (getSdsStatus); this file only words and shapes it.

import { addYears, daysBetween, parseDate, SDS_MAX_AGE_YEARS, SDS_REVIEW_WINDOW_DAYS } from "@/lib/domain";
import { formatAge, formatDate, formatNumber } from "@/lib/format";
import type { SdsRow } from "@/lib/store";
import type { SdsStatus, SdsStatusKey } from "@/lib/types";

/** The filters a stat or the URL can put on the register. */
export type StatFilter = SdsStatusKey | "requested";
export const STAT_FILTERS: StatFilter[] = ["current", "review", "expired", "missing", "requested"];

export function isStatFilter(v: string | null): v is StatFilter {
  return v !== null && (STAT_FILTERS as string[]).includes(v);
}

/** "4.1" -> "5.0"; none -> "1.0" */
export function nextMajorVersion(latest?: string): string {
  if (!latest) return "1.0";
  const major = Number.parseInt(latest, 10);
  return Number.isFinite(major) ? `${major + 1}.0` : "1.0";
}

/** "in 97 days" / "312 days ago" / "today" */
export function daysPhrase(daysLeft: number): string {
  if (daysLeft === 0) return "today";
  const n = formatNumber(Math.abs(daysLeft));
  const unit = Math.abs(daysLeft) === 1 ? "day" : "days";
  return daysLeft > 0 ? `in ${n} ${unit}` : `${n} ${unit} ago`;
}

/** The first day of the review window for a revision date. */
export function reviewStartsOn(revisionDate: string): string {
  const d = parseDate(addYears(revisionDate, SDS_MAX_AGE_YEARS));
  d.setUTCDate(d.getUTCDate() - SDS_REVIEW_WINDOW_DAYS);
  return d.toISOString().slice(0, 10);
}

/** One sentence that explains a status with its dates. */
export function statusSentence(status: SdsStatus, revisionDate?: string): string {
  if (status.key === "missing" || !revisionDate || !status.expiresOn || status.daysLeft === undefined) {
    return "No safety data sheet is on file for this product, so it cannot pass an SDS audit.";
  }
  const revised = `Revised ${formatDate(revisionDate)}.`;
  const five = formatDate(status.expiresOn);
  if (status.key === "expired") {
    return `${revised} Passed five years on ${five}, ${daysPhrase(status.daysLeft)}.`;
  }
  if (status.key === "review") {
    return `${revised} Turns five years old on ${five}, ${daysPhrase(status.daysLeft)}. Ask the manufacturer for a current revision.`;
  }
  return `${revised} Current until review starts on ${formatDate(reviewStartsOn(revisionDate))}; turns five years old on ${five}.`;
}

/** "2 yr 4 mo later" between two revision dates */
export function gapLabel(olderIso: string, newerIso: string): string {
  const days = daysBetween(parseDate(olderIso), parseDate(newerIso));
  return `${formatAge(Math.max(0, days))} later`;
}

/** A 555 emergency number derived from the manufacturer name, so it is stable. */
export function emergencyPhone(manufacturer: string): string {
  let h = 0;
  for (const ch of manufacturer) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const last = String(100 + (h % 90)).padStart(4, "0");
  return `1-800-555-${last}`;
}

export function sitesLabel(row: SdsRow): string {
  return row.facilities.map((f) => f.code).join(" ");
}
