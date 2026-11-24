"use client";

import { hazardStatements } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import type { Product, ProductCategory, SdsDocument } from "@/lib/types";
import { GhsList } from "@/components/hazard/ghs-pictogram";
import { emergencyPhone } from "@/components/sds/sds-utils";

// The first page of an SDS, laid out as paper. It stays a white sheet in dark
// mode because it stands for a printed document. There is no "paper" token in
// globals.css, so it uses white and black with opacity, as the GHS diamonds do.

const RECOMMENDED_USE: Record<ProductCategory, string> = {
  Acid: "Industrial chemical; pH adjustment, metal treatment, blending",
  Base: "Industrial chemical; neutralization, cleaning, blending",
  Solvent: "Industrial solvent; cleaning, thinning, extraction",
  Fuel: "Fuel for engines and heating equipment",
  "Compressed gas": "Industrial gas; welding, inerting, process supply",
  Oxidizer: "Oxidizing agent; bleaching, disinfection, process chemistry",
  "Water treatment": "Water and wastewater treatment",
  Coating: "Industrial coating; for professional use only",
  Lubricant: "Lubricant and hydraulic fluid for machinery",
  Cleaning: "Industrial cleaner and degreaser",
  "Raw material": "Raw material for manufacturing and construction",
  Battery: "Stationary and motive power storage battery",
};

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 break-inside-avoid">
      <h3 className="border-b-2 border-black/80 pb-1 text-[13px] font-semibold">
        Section {n}. {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_1fr] gap-x-3 py-0.5 max-sm:grid-cols-1">
      <dt className="text-black/55">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function SdsPreview({ product, doc }: { product: Product; doc: SdsDocument }) {
  const latest = doc.versions[0];
  const statements = hazardStatements(product);
  return (
    <article
      data-print="sheet"
      className="mx-auto w-full max-w-[680px] rounded-md border border-black/15 bg-white px-6 py-6 text-[12.5px] leading-[1.5] text-black shadow-[0_1px_2px_rgb(0_0_0/0.06)] sm:px-9 sm:py-8"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-black/20 pb-3">
        <div>
          <p className="text-[11px] text-black/55">Safety Data Sheet according to OSHA HazCom 2012 (29 CFR 1910.1200)</p>
          <h2 className="mt-1 text-lg font-semibold leading-tight">{product.name}</h2>
          <p className="text-black/65">{product.manufacturer}</p>
        </div>
        <dl className="text-right text-[11.5px] text-black/70">
          <div>
            Version <span className="ident text-black">{latest.version}</span>
          </div>
          <div>Revision date {formatDate(latest.revisionDate)}</div>
          <div className="ident">{doc.id}</div>
          <div>Page 1 of {latest.pages}</div>
        </dl>
      </header>

      <Section n={1} title="Identification">
        <dl>
          <Row label="Product identifier">{product.name}</Row>
          <Row label="Product code">
            <span className="ident">{product.productCode}</span>
          </Row>
          <Row label="Recommended use">{RECOMMENDED_USE[product.category]}</Row>
          <Row label="Manufacturer">{product.manufacturer}</Row>
          <Row label="Emergency phone">
            <span className="tabular">{emergencyPhone(product.manufacturer)}</span> (24 hours)
          </Row>
          {product.unNumber && (
            <Row label="UN number">
              <span className="ident">{product.unNumber}</span>
            </Row>
          )}
        </dl>
      </Section>

      <Section n={2} title="Hazard identification">
        {product.pictograms.length > 0 ? (
          <GhsList codes={product.pictograms} size="lg" className="-ml-1 gap-1" />
        ) : (
          <p className="text-black/65">Not classified as hazardous under HazCom 2012.</p>
        )}
        {product.signalWord && (
          <p className="mt-2">
            <span className="text-black/55">Signal word </span>
            <span className="text-[14px] font-semibold">{product.signalWord}</span>
          </p>
        )}
        {statements.length > 0 && (
          <>
            <p className="mt-2 text-black/55">Hazard statements</p>
            <ul className="mt-0.5">
              {statements.map((s) => (
                <li key={s.code} className="flex gap-3">
                  <span className="ident w-24 shrink-0 text-black/70">{s.code}</span>
                  <span>{s.text}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section n={3} title="Composition and information on ingredients">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-black/20 text-black/55">
              <th className="py-1 pr-3 font-normal">Chemical name</th>
              <th className="py-1 pr-3 font-normal">CAS number</th>
              <th className="py-1 text-right font-normal">Weight %</th>
            </tr>
          </thead>
          <tbody>
            {product.ingredients.map((i) => (
              <tr key={i.cas + i.name} className="border-b border-black/10 last:border-b-0">
                <td className="py-1 pr-3">{i.name}</td>
                <td className="ident py-1 pr-3">{i.cas}</td>
                <td className="py-1 text-right tabular">{i.percent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <p className="mt-6 border-t border-black/15 pt-2 text-[11px] text-black/50">
        Preview generated from sample data in this prototype. It shows the first three sections only and is not the
        manufacturer&apos;s document.
      </p>
    </article>
  );
}
