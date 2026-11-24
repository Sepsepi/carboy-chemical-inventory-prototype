"use client";

import { Building2, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { CURRENT_REPORTING_YEAR, REPORTING_YEARS } from "@/lib/seed/facilities";
import { useScope } from "@/lib/store";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// The facility and reporting year in view. They are app-wide: change them
// here or in the top bar and every screen follows.

export function FacilitySelect({
  className,
  allowAll = true,
  size = "default",
}: {
  className?: string;
  /** offer "All facilities"; reports need one facility, so they pass false */
  allowAll?: boolean;
  size?: "sm" | "default";
}) {
  const { facilityId, setFacility, facilities } = useScope();
  const value = !allowAll && facilityId === "all" ? facilities[0]?.id : facilityId;
  return (
    <Select value={value} onValueChange={setFacility}>
      <SelectTrigger size={size} aria-label="Facility" className={cn("min-w-0 bg-card", className)}>
        <span className="flex min-w-0 items-center gap-1.5">
          <Building2 className="text-muted-foreground" aria-hidden />
          <span className="truncate">
            <SelectValue placeholder="Facility" />
          </span>
        </span>
      </SelectTrigger>
      <SelectContent align="start">
        {allowAll && (
          <>
            <SelectItem value="all">All facilities</SelectItem>
            <SelectSeparator />
          </>
        )}
        <SelectGroup>
          <SelectLabel>Facilities</SelectLabel>
          {facilities.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate">{f.name}</span>
                <span className="ident text-muted-foreground">{f.code}</span>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function YearSelect({ className, size = "default" }: { className?: string; size?: "sm" | "default" }) {
  const { year, setYear } = useScope();
  return (
    <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
      <SelectTrigger size={size} aria-label="Reporting year" className={cn("bg-card", className)}>
        <span className="flex min-w-0 items-center gap-1.5">
          <CalendarDays className="text-muted-foreground" aria-hidden />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent align="start">
        <SelectGroup>
          <SelectLabel>Reporting year</SelectLabel>
          {REPORTING_YEARS.map((y) => (
            <SelectItem key={y} value={String(y)}>
              <span className="flex items-center gap-1.5">
                <span className="tabular">{y}</span>
                {y === CURRENT_REPORTING_YEAR && <span className="text-muted-foreground">in progress</span>}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
