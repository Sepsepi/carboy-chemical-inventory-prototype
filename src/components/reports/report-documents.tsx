"use client";

// The three report documents, set on the sheet. Each is built only from the
// inventory rows for one facility and one year.

import { REPORT_STATUS_LABEL, REPORT_TYPE_META, SDS_STATUS_LABEL, tier2Range } from "@/lib/domain";
import { formatAge, formatDate, formatDateLong, formatLb, formatNumber } from "@/lib/format";
import { PEOPLE } from "@/lib/seed/facilities";
import type { Facility, InventoryRow, Report, SdsDocument, SdsStatusKey } from "@/lib/types";
import { SdsStatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { byMaxDesc, ehsNames, hazardGroups, sdsAuditRows, sercFor, singleCas } from "./report-data";
import { DocHeader, DocSection, FormCell, FormGrid, ReportSheet, SheetTable, td } from "./sheet";

interface DocProps {
  facility: Facility;
  year: number;
  rows: InventoryRow[];
  report?: Report;
}

function period(year: number) {
  return `Reporting period: January 1 to December 31, ${year}`;
}

function docId(prefix: string, facility: Facility, year: number) {
  return `${prefix}-${facility.code}-${year}`;
}

function NoChemicals({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-dashed border-border-strong px-3 py-6 text-center text-[12px] text-muted-foreground">
      {children}
    </p>
  );
}

/* ─────────────────────────────── Tier II ──────────────────────────────── */

export function Tier2Document({ facility, year, rows, report }: DocProps) {
  const list = rows.filter((r) => r.reportable).sort(byMaxDesc);
  const ehsCount = list.filter((r) => r.ehs).length;
  const certifier = PEOPLE.find((p) => p.name === facility.siteLead);
  const id = docId("T2", facility, year);

  return (
    <ReportSheet footer={`${id}  ${REPORT_TYPE_META.tier2.cite}, 40 CFR Part 370`}>
      <DocHeader
        kicker={`${REPORT_TYPE_META.tier2.cite}, 40 CFR Part 370`}
        title="Tier II Emergency and Hazardous Chemical Inventory"
        period={period(year)}
        meta={[
          { label: "Reporting year", value: <span className="tabular">{year}</span> },
          { label: "Facility ID", value: <span className="ident">{facility.code}</span> },
          { label: "Document", value: <span className="ident">{id}</span> },
          { label: "Status", value: report ? REPORT_STATUS_LABEL[report.status] : "Not started" },
          ...(report?.confirmation
            ? [{ label: "Confirmation", value: <span className="ident">{report.confirmation}</span> }]
            : []),
          ...(report?.submittedAt ? [{ label: "Submitted", value: formatDate(report.submittedAt) }] : []),
        ]}
      />

      <DocSection number={1} of={3} title="Facility identification">
        <FormGrid className="grid-cols-2 sm:grid-cols-6">
          <FormCell label="Facility name" className="col-span-2 sm:col-span-4">
            <span className="font-medium">{facility.name}</span>
          </FormCell>
          <FormCell label="Site code" className="col-span-2">
            <span className="ident">{facility.code}</span>
          </FormCell>
          <FormCell label="Street address" className="col-span-2 sm:col-span-3">
            {facility.street}
          </FormCell>
          <FormCell label="City" className="sm:col-span-2">
            {facility.city}
          </FormCell>
          <FormCell label="State">{facility.state}</FormCell>
          <FormCell label="ZIP code">
            <span className="tabular">{facility.zip}</span>
          </FormCell>
          <FormCell label="County or parish" className="sm:col-span-2">
            {facility.county}
          </FormCell>
          <FormCell label="NAICS code">
            <span className="ident">{facility.naics}</span>
          </FormCell>
          <FormCell label="Maximum occupants">
            <span className="tabular">{facility.maxOccupants}</span>
          </FormCell>
          <FormCell label="Manned or unmanned" className="col-span-2 sm:col-span-1">
            {facility.manned ? "Manned" : "Unmanned"}
          </FormCell>
        </FormGrid>

        <h4 className="mt-5 mb-2 text-[12px] font-semibold text-foreground">Emergency contact</h4>
        <FormGrid className="grid-cols-2 sm:grid-cols-3">
          <FormCell label="Name">{facility.emergencyContact.name}</FormCell>
          <FormCell label="Title">{facility.emergencyContact.title}</FormCell>
          <FormCell label="24-hour phone" className="col-span-2 sm:col-span-1">
            <span className="tabular">{facility.emergencyContact.phone}</span>
          </FormCell>
        </FormGrid>

        <h4 className="mt-5 mb-2 text-[12px] font-semibold text-foreground">Submitted to</h4>
        <FormGrid className="grid-cols-1 sm:grid-cols-3">
          <FormCell label="State emergency response commission">{sercFor(facility.state)}</FormCell>
          <FormCell label="Local emergency planning committee">{facility.lepc}</FormCell>
          <FormCell label="Fire department">{facility.fireDepartment}</FormCell>
        </FormGrid>
      </DocSection>

      <DocSection
        number={2}
        of={3}
        title="Chemical inventory"
        note={
          <>
            <span className="font-medium text-foreground">
              {list.length} {list.length === 1 ? "chemical" : "chemicals"} reported, {ehsCount} containing an
              Extremely Hazardous Substance.
            </span>{" "}
            Listed by maximum daily amount. Range codes per the Tier II reporting ranges.
          </>
        }
      >
        {list.length === 0 ? (
          <NoChemicals>No chemical at this facility met a reporting threshold in {year}.</NoChemicals>
        ) : (
          <ol className="flex flex-col gap-4">
            {list.map((r, i) => (
              <ChemicalBlock key={r.id} row={r} index={i + 1} total={list.length} />
            ))}
          </ol>
        )}
      </DocSection>

      <DocSection number={3} of={3} title="Certification" className="break-inside-avoid">
        <p className="max-w-[72ch] text-[12px] leading-[1.55] text-foreground">
          I certify under penalty of law that I have personally examined and am familiar with the information
          submitted in this and all attached documents, and that based on my inquiry of those individuals responsible
          for obtaining the information, I believe that the submitted information is true, accurate, and complete.
        </p>
        <FormGrid className="mt-4 grid-cols-2 sm:grid-cols-4">
          <FormCell label="Name of owner, operator or authorized representative" className="col-span-2">
            {facility.siteLead}
          </FormCell>
          <FormCell label="Title" className="col-span-2">
            {certifier?.title ?? "Site lead"}
          </FormCell>
          <FormCell label="Signature" className="col-span-2 sm:col-span-3">
            <span className="block h-7 border-b border-foreground/60" aria-label="Signature line" />
          </FormCell>
          <FormCell label="Date signed" className="col-span-2 sm:col-span-1">
            {report?.submittedAt ? formatDate(report.submittedAt) : <span className="block h-7" />}
          </FormCell>
        </FormGrid>
      </DocSection>
    </ReportSheet>
  );
}

function ChemicalBlock({ row: r, index, total }: { row: InventoryRow; index: number; total: number }) {
  const p = r.product;
  const cas = singleCas(p);
  const ehs = ehsNames(p);
  const avg = tier2Range(r.avgDailyLb);
  const max = tier2Range(r.maxDailyLb);
  return (
    <li className="break-inside-avoid overflow-hidden border border-border-strong">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border-strong bg-subtle px-2.5 py-1.5">
        <h4 className="text-[13px] font-semibold text-foreground">
          <span className="mr-2 tabular text-muted-foreground">
            {String(index).padStart(2, "0")}
          </span>
          {p.name}
        </h4>
        <span className="text-[10.5px] text-muted-foreground">
          Chemical {index} of {total}
        </span>
      </div>

      <FormGrid className="mr-[-1px] grid-cols-2 border-t-0 border-l-0 sm:grid-cols-4">
        <FormCell label="CAS number">{cas ? <span className="ident">{cas}</span> : "Mixture"}</FormCell>
        <FormCell label="Extremely Hazardous Substance">
          {ehs.length ? (
            <span>
              <span className="font-semibold">Yes</span>: {ehs.join(", ")}
            </span>
          ) : (
            "No"
          )}
        </FormCell>
        <FormCell label="Physical state">{p.physicalState}</FormCell>
        <FormCell label="Days on site">
          <span className="tabular">{r.daysOnSite}</span>
        </FormCell>
        <FormCell label="Maximum daily amount" className="col-span-2">
          <span className="tabular">{formatLb(r.maxDailyLb)}</span>
          <span className="ml-2 text-muted-foreground">
            Range code <span className="ident text-foreground">{max.code}</span> ({max.label})
          </span>
        </FormCell>
        <FormCell label="Average daily amount" className="col-span-2">
          <span className="tabular">{formatLb(r.avgDailyLb)}</span>
          <span className="ml-2 text-muted-foreground">
            Range code <span className="ident text-foreground">{avg.code}</span> ({avg.label})
          </span>
        </FormCell>
        <FormCell label="Physical hazards" className="col-span-2">
          {p.physicalHazards.length ? p.physicalHazards.join("; ") : "None"}
        </FormCell>
        <FormCell label="Health hazards" className="col-span-2">
          {p.healthHazards.length ? p.healthHazards.join("; ") : "None"}
        </FormCell>
      </FormGrid>

      {!cas && (
        <div className="border-b border-border-strong px-2.5 pt-2 pb-2.5">
          <p className="mb-1.5 text-[10.5px] text-muted-foreground">Mixture components</p>
          <SheetTable
            minWidth={420}
            head={[{ label: "Component" }, { label: "CAS number" }, { label: "Percent", align: "right" }, { label: "EHS" }]}
          >
            {p.ingredients.map((ing) => (
              <tr key={ing.cas + ing.name}>
                <td className={td}>{ing.name}</td>
                <td className={cn(td, "ident")}>{ing.cas}</td>
                <td className={cn(td, "text-right tabular")}>{ing.percent}%</td>
                <td className={td}>{ing.ehs ? <span className="font-semibold">Yes</span> : "No"}</td>
              </tr>
            ))}
          </SheetTable>
        </div>
      )}

      <div className="px-2.5 pt-2 pb-2.5">
        <p className="mb-1.5 text-[10.5px] text-muted-foreground">Storage locations</p>
        {r.locations.length === 0 ? (
          <p className="text-[12px] text-critical">No storage location recorded.</p>
        ) : (
          <SheetTable
            minWidth={500}
            head={[
              { label: "Location on site" },
              { label: "Container" },
              { label: "Pressure" },
              { label: "Temperature" },
              { label: "Max amount", align: "right" },
            ]}
          >
            {r.locations.map((l) => (
              <tr key={l.id}>
                <td className={td}>
                  {l.area}, {l.detail}
                </td>
                <td className={td}>{l.containerType}</td>
                <td className={td}>{l.pressure}</td>
                <td className={td}>{l.temperature}</td>
                <td className={cn(td, "text-right whitespace-nowrap tabular")}>{formatLb(l.maxLb)}</td>
              </tr>
            ))}
          </SheetTable>
        )}
      </div>
    </li>
  );
}

/* ──────────────────────────── Section 311 list ────────────────────────── */

export function List311Document({ facility, year, rows }: DocProps) {
  const groups = hazardGroups(rows);
  const count = rows.filter((r) => r.reportable).length;
  const id = docId("L311", facility, year);
  return (
    <ReportSheet footer={`${id}  ${REPORT_TYPE_META.list311.cite}`}>
      <DocHeader
        kicker={`${REPORT_TYPE_META.list311.cite}, 40 CFR 370.30`}
        title="Hazardous Chemical List"
        period={period(year)}
        meta={[
          { label: "Reporting year", value: <span className="tabular">{year}</span> },
          { label: "Facility ID", value: <span className="ident">{facility.code}</span> },
          { label: "Document", value: <span className="ident">{id}</span> },
          { label: "Chemicals", value: <span className="tabular">{count}</span> },
        ]}
      />
      <p className="mt-4 text-[12px] text-foreground">
        <span className="font-medium">{facility.name}</span>, {facility.street}, {facility.city}, {facility.state}{" "}
        {facility.zip}. Chemicals for which an SDS is required, present at or above the EPCRA reporting thresholds,
        grouped by hazard category. A chemical appears under every category it meets.
      </p>
      {count === 0 ? (
        <div className="mt-6">
          <NoChemicals>No chemical at this facility met a reporting threshold in {year}.</NoChemicals>
        </div>
      ) : (
        groups.map((g, gi) => (
          <DocSection key={g.kind} number={gi + 1} of={2} title={`${g.kind} hazards`}>
            {g.categories.length === 0 ? (
              <NoChemicals>No chemical in this list has a {g.kind.toLowerCase()} hazard.</NoChemicals>
            ) : (
              <div className="flex flex-col gap-4">
                {g.categories.map((c) => (
                  <div key={c.name} className="break-inside-avoid">
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <h4 className="text-[12.5px] font-semibold text-foreground">{c.name}</h4>
                      <span className="text-[10.5px] text-muted-foreground tabular">
                        {c.rows.length} {c.rows.length === 1 ? "chemical" : "chemicals"}
                      </span>
                    </div>
                    <SheetTable minWidth={440} head={[{ label: "Chemical" }, { label: "CAS number" }]}>
                      {c.rows.map((r) => {
                        const cas = singleCas(r.product);
                        return (
                          <tr key={r.id}>
                            <td className={cn(td, "w-1/2")}>{r.product.name}</td>
                            <td className={td}>
                              {cas ? (
                                <span className="ident">{cas}</span>
                              ) : (
                                <span>
                                  Mixture:{" "}
                                  <span className="ident text-muted-foreground">
                                    {r.product.ingredients.filter((i) => i.cas !== "7732-18-5").map((i) => i.cas).join(", ")}
                                  </span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </SheetTable>
                  </div>
                ))}
              </div>
            )}
          </DocSection>
        ))
      )}
    </ReportSheet>
  );
}

/* ─────────────────────────── SDS compliance summary ───────────────────── */

const SDS_KEYS: SdsStatusKey[] = ["missing", "expired", "review", "current"];

export function SdsAuditDocument({ facility, year, rows, sdsDocs }: DocProps & { sdsDocs: SdsDocument[] }) {
  const list = sdsAuditRows(rows);
  const docs = new Map(sdsDocs.map((d) => [d.productId, d]));
  const id = docId("SDS", facility, year);
  const today = new Date().toISOString().slice(0, 10);
  const flagged = list.filter((r) => r.sds.key !== "current").length;
  return (
    <ReportSheet footer={`${id}  Internal compliance record`}>
      <DocHeader
        kicker="Internal compliance record"
        title="SDS Compliance Summary"
        period={`Chemicals on site in ${year}. Status as of ${formatDateLong(today)}.`}
        meta={[
          { label: "Reporting year", value: <span className="tabular">{year}</span> },
          { label: "Facility ID", value: <span className="ident">{facility.code}</span> },
          { label: "Document", value: <span className="ident">{id}</span> },
          { label: "Chemicals", value: <span className="tabular">{list.length}</span> },
        ]}
      />
      <p className="mt-4 text-[12px] text-foreground">
        <span className="font-medium">{facility.name}</span>. An SDS is flagged when its latest revision is over five
        years old, and marked for review in the 180 days before that.
      </p>

      <DocSection number={1} of={2} title="Totals">
        <FormGrid className="grid-cols-2 sm:grid-cols-5">
          <FormCell label="Chemicals on site">
            <span className="text-[17px] font-semibold tabular">{list.length}</span>
          </FormCell>
          {SDS_KEYS.map((k) => (
            <FormCell key={k} label={SDS_STATUS_LABEL[k]}>
              <span className="text-[17px] font-semibold tabular">
                {list.filter((r) => r.sds.key === k).length}
              </span>
            </FormCell>
          ))}
        </FormGrid>
        <p className="mt-2 text-[11.5px] text-muted-foreground">
          {flagged
            ? `${flagged} of ${list.length} need action. They are listed first.`
            : `All ${list.length} safety data sheets are current.`}
        </p>
      </DocSection>

      <DocSection number={2} of={2} title="Safety data sheets">
        {list.length === 0 ? (
          <NoChemicals>No chemicals were on site in {year}.</NoChemicals>
        ) : (
          <SheetTable
            minWidth={680}
            head={[
              { label: "Chemical" },
              { label: "Manufacturer" },
              { label: "Version", align: "right" },
              { label: "Revision date" },
              { label: "Age", align: "right" },
              { label: "Status" },
            ]}
          >
            {list.map((r) => {
              const v = docs.get(r.product.id)?.versions[0];
              return (
                <tr key={r.id} className="break-inside-avoid">
                  <td className={cn(td, "font-medium")}>{r.product.name}</td>
                  <td className={td}>{r.product.manufacturer}</td>
                  <td className={cn(td, "text-right tabular")}>{v?.version ?? "None"}</td>
                  <td className={cn(td, "whitespace-nowrap")}>{v ? formatDate(v.revisionDate) : "None"}</td>
                  <td className={cn(td, "text-right whitespace-nowrap tabular")}>
                    {r.sds.ageDays !== undefined ? formatAge(r.sds.ageDays) : ""}
                  </td>
                  <td className={cn(td, "py-1")}>
                    <SdsStatusBadge status={r.sds} />
                  </td>
                </tr>
              );
            })}
          </SheetTable>
        )}
      </DocSection>
      <p className="mt-3 text-[11px] text-muted-foreground tabular">
        Total maximum daily amount on site: {formatNumber(rows.reduce((s, r) => s + r.maxDailyLb, 0))} lb.
      </p>
    </ReportSheet>
  );
}
