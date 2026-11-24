# Carboy

A prototype of a chemical inventory and compliance platform for a company with several industrial sites. Four connected screens, realistic sample data, no backend.

Live demo: https://sepis-prototype-is-the-best.vercel.app

| Screen | Route | What it does |
|---|---|---|
| Overview | `/` | Tier II filing status per facility, key figures, hazard and quantity charts, SDS alerts, recent activity |
| Chemical inventory | `/inventory` | Searchable table with facility and year filters, product detail (hazards, quantities, storage locations, ingredients), add and edit forms, CSV export |
| Safety data sheets | `/sds` | Document register with version history, an automatic flag for any SDS whose latest revision is over five years old, upload and request-update flows |
| Regulatory reports | `/reports` | Facility and year selection, a Tier II report preview built from the inventory, a pre-filing checklist, the filing workflow, print and CSV export |

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Phones get tap-friendly lists in place of tables, tablets get an icon sidebar and rows two across, and there is a light and a dark theme.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui on Radix, lucide-react, Recharts, TanStack Table, zustand.

## How it is put together

- `src/lib/types.ts`: the data model (facility, product, inventory record, SDS document and versions, report).
- `src/lib/domain.ts`: the rules, as pure functions. The five-year SDS flag is computed from each document's revision date and today's date. Tier II reportability is computed from quantities, thresholds and EHS ingredients. Nothing is hard-coded as "flagged".
- `src/lib/seed/`: the sample data. Chemical names and CAS numbers are real; companies, sites, people and quantities are invented. The dataset is deterministic.
- `src/lib/store.ts`: one in-memory store. Every add, edit and upload changes it, and every screen reads from it, so a change on one screen shows on the others. A reload resets it.
- `src/components/`: shared pieces (table kit, stat strip, status badges, GHS pictograms, NFPA diamond, app shell) and one folder per screen.
- `DESIGN.md`: the design rules the screens follow.

## Moving to a real backend

The screens only talk to the store's hooks and actions (`useInventoryRows`, `useSdsRows`, `addSdsVersion`, `setReportStatus` and so on). Replacing the store's internals with API calls leaves the screens as they are.

## What is not real

No authentication, no database, no file storage. The SDS upload form reads a file's name and size and stores nothing. Report submission changes a status in memory and sends nothing anywhere. The Tier II preview is a sample layout, not an official form.
