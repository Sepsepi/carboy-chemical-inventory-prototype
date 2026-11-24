"use client";

import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/** Label, control, and an inline error with an icon. Required is said in text. */
export function FormField({
  id,
  label,
  required,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="text-[13px] font-medium">
        {label}
        {required ? (
          <span className="font-normal text-muted-foreground">(required)</span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1 text-xs text-critical">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Parse a typed amount: "12,500" and "12500" both work. NaN when empty or not a number. */
export function parseAmount(s: string): number {
  const t = s.replace(/[,\s]/g, "");
  if (!t) return NaN;
  return Number(t);
}

export function validateQuantities(v: { max: string; avg: string; days: string }) {
  const max = parseAmount(v.max);
  const avg = parseAmount(v.avg);
  const days = parseAmount(v.days);
  const errors: Partial<Record<"max" | "avg" | "days", string>> = {};
  if (!Number.isFinite(max) || max < 0) errors.max = "Enter the largest amount on site in a day, in lb.";
  else if (max === 0) errors.max = "Enter an amount above 0 lb.";
  if (!Number.isFinite(avg) || avg < 0) errors.avg = "Enter the average daily amount, in lb.";
  else if (Number.isFinite(max) && avg > max) errors.avg = "The average cannot be more than the maximum.";
  if (!Number.isFinite(days) || !Number.isInteger(days) || days < 1 || days > 365)
    errors.days = "Enter a whole number of days from 1 to 365.";
  return { errors, max, avg, days };
}
