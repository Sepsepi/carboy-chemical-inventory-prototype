"use client";

// Report type, facility and year for the report in view. These write the URL,
// not the app-wide scope.

import { Building2, CalendarDays } from "lucide-react";
import { REPORT_TYPE_META } from "@/lib/domain";
import { CURRENT_REPORTING_YEAR, REPORTING_YEARS } from "@/lib/seed/facilities";
import type { Facility, ReportType } from "@/lib/types";
import { Panel, PanelBody, PanelHeader } from "@/components/layout/page";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPES = Object.keys(REPORT_TYPE_META) as ReportType[];

export function SetupPanel({
  type,
  facilityId,
  year,
  facilities,
  onChange,
}: {
  type: ReportType;
  facilityId: string;
  year: number;
  facilities: Facility[];
  onChange: (patch: { type?: ReportType; facilityId?: string; year?: number }) => void;
}) {
  return (
    <Panel>
      <PanelHeader title="Report setup" divided />
      <PanelBody className="flex flex-col gap-4 pt-3">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs text-muted-foreground">Report type</legend>
          <RadioGroup
            value={type}
            onValueChange={(v) => onChange({ type: v as ReportType })}
            className="gap-2"
            aria-label="Report type"
          >
            {TYPES.map((t) => {
              const meta = REPORT_TYPE_META[t];
              return (
                <label
                  key={t}
                  htmlFor={`report-type-${t}`}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-card px-3 py-2.5 transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/60 has-[[data-state=checked]]:border-brand has-[[data-state=checked]]:bg-brand-bg/50 [@media(hover:hover)]:hover:bg-subtle"
                >
                  <RadioGroupItem id={`report-type-${t}`} value={t} className="mt-0.5" />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-[13px] font-semibold text-foreground">{meta.short}</span>
                      <span className="text-xs text-muted-foreground">{meta.cite}</span>
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-5 text-muted-foreground">
                      {meta.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </RadioGroup>
        </fieldset>

        <div className="grid grid-cols-[minmax(0,1fr)_156px] gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="report-facility" className="text-xs font-normal text-muted-foreground">
              Facility
            </Label>
            <Select value={facilityId} onValueChange={(v) => onChange({ facilityId: v })}>
              <SelectTrigger id="report-facility" className="w-full min-w-0 bg-card">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Building2 className="text-muted-foreground" aria-hidden />
                  <span className="truncate">
                    <SelectValue />
                  </span>
                </span>
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  <SelectLabel>Facilities</SelectLabel>
                  {facilities.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      <span className="truncate">{f.name}</span>
                      <span className="ident ml-1.5 text-muted-foreground">{f.code}</span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-year" className="text-xs font-normal text-muted-foreground">
              Reporting year
            </Label>
            <Select value={String(year)} onValueChange={(v) => onChange({ year: Number(v) })}>
              <SelectTrigger id="report-year" className="w-full bg-card">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="text-muted-foreground" aria-hidden />
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectGroup>
                  <SelectLabel>Reporting year</SelectLabel>
                  {REPORTING_YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      <span className="tabular">{y}</span>
                      {y === CURRENT_REPORTING_YEAR && <span className="ml-1 text-muted-foreground">in progress</span>}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </PanelBody>
    </Panel>
  );
}
