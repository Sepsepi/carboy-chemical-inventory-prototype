# Carboy: design notes

Carboy is a prototype of a chemical inventory and compliance platform for a company with several industrial sites. Four screens, sample data, no backend. The goal is a product that feels like enterprise software made for this subject, not a generic admin template. Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, shadcn/ui (Radix base, `nova` preset), lucide-react, Recharts 3, TanStack Table 8, zustand.

The users are EHS (environment, health and safety) managers. Their year runs on one deadline: the Tier II chemical inventory report for each facility, due March 1 for the previous calendar year. Everything in the app serves that: know what is on each site, keep every safety data sheet (SDS) current, file the report.

## The one design rule

**Chrome is ink and paper. Colour means something.** Buttons, navigation and text are ink (`primary`) on paper (`background`, `card`). Colour appears only where it encodes a hazard or a compliance status, plus one interactive blue (`brand`) for links, focus and selection. So when something on screen is red, it is a real problem.

What makes the product look like its subject and not like a template: real hazard communication. GHS pictograms in red diamonds, the NFPA 704 fire diamond, signal words (Danger, Warning), CAS numbers, Tier II range codes. Use them where they carry information. They are the only "decoration".

## Tokens (all in `src/app/globals.css`, light and dark)

| Use | Classes |
|---|---|
| Page surface, panels | `bg-background`, `bg-card`; quieter fill `bg-subtle`; stronger fill `bg-muted` |
| Text | `text-foreground`, secondary `text-muted-foreground` |
| Rules | `border-border`, heavier `border-border-strong` |
| Ink button | `<Button>` default variant; secondary actions `variant="outline"` with `className="bg-card"` |
| Interactive blue | `text-brand`, `bg-brand-bg` |
| Status (tone = `good`, `warn`, `serious`, `critical`, `info`) | text `text-{tone}`, tint `bg-{tone}-bg`, border `border-{tone}-border`, solid mark `bg-{tone}-solid` / `var(--{tone}-solid)` |
| Chart series (fixed order, never cycled) | `var(--chart-1)` to `var(--chart-8)`; grid `var(--chart-grid)`; "everything else" `var(--chart-neutral)` |
| Radius | `rounded-md` controls, `rounded-lg` panels, `rounded-xl` dialogs. Nothing else |
| Shadows | none on panels (borders separate). Only floating things have one: popovers, sheets, dialogs (shadcn handles it) |

Never write a raw hex or a Tailwind palette colour (`text-red-600`, `bg-slate-100`) in a screen. If a token is missing, add it to `globals.css` in both themes.

## Type

IBM Plex Sans for everything, IBM Plex Mono only for identifiers (CAS numbers, document IDs, UN numbers, site codes) through the `.ident` class. Numbers that line up use `tabular` (tables do it already).

- Page title: `PageHeader` does it (20 to 22px, semibold).
- Panel title: 14px semibold. Body and table text: 13 to 14px. Captions: 12px `text-muted-foreground`.
- Big figures: 26px semibold tabular (see `StatStrip`).
- Sentence case everywhere. **No ALL CAPS labels, no letter-spaced eyebrows above headings, no "A · B · C" strings with middle dots, no "→" on links, no em dashes in copy.** These read as generated.

## Shared code

Every screen is built from these. Their header comments say how to use them.

- `src/lib/types.ts`: the data model.
- `src/lib/domain.ts`: the rules. `getSdsStatus` (the five-year flag, computed from today's date), `isReportable`, `ehsAmounts`, `tier2Range`, `TIER2_RANGES`, `hazardStatements`, `GHS_META`, `facilityStats`, `REPORT_TYPE_META`, `REPORT_STATUS_LABEL`, `SDS_STATUS_LABEL`.
- `src/lib/store.ts`: the in-memory store (zustand) and the hooks you will use most: `useScope()`, `useInventoryRows()`, `useSdsRows()`, `useReports()`, and actions `addProduct`, `upsertInventoryRecord`, `updateInventoryRecord`, `removeInventoryRecord`, `addSdsVersion`, `requestSdsUpdate`, `setReportStatus`, `upsertReport`, `logActivity`.
- `src/lib/format.ts`: `formatLb`, `formatLbCompact`, `formatNumber`, `formatDate`, `formatRelative`, `formatAge`, `formatDelta`.
- `src/lib/export.ts`: `downloadCsv` (a real download; use it for every export button).
- `src/lib/seed/`: the mock data. 6 facilities, 48 products with real names and CAS numbers, inventory for 2022 to 2026, SDS versions, Tier II reports. Read it to know what you are showing.
- `src/components/layout/page.tsx`: `PageBody`, `PageHeader`, `Panel`, `PanelHeader`, `PanelBody`, `Field`.
- `src/components/stat-strip.tsx`: `StatStrip`, the ruled band of key figures at the top of a screen.
- `src/components/data-table/index.tsx`: `DataTable` and its parts (search, faceted filters, column picker, paging, selection). Every table uses it.
- `src/components/status-badge.tsx`: `StatusBadge`, `StatusDot`, `SdsStatusBadge`, `ReportStatusBadge`, `EhsTag`, and the tone maps.
- `src/components/hazard/ghs-pictogram.tsx`: `GhsPictogram`, `GhsList`. `src/components/hazard/nfpa-diamond.tsx`: `NfpaDiamond`.
- `src/components/scope-controls.tsx`: `FacilitySelect`, `YearSelect` (bound to the app-wide scope; the top bar shows the same two controls).
- `src/components/empty-state.tsx`: `EmptyState`.
- `src/components/ui/*`: shadcn components. Radix base: `asChild` works. `cn` comes from `@/lib/utils`.
- `src/components/shell/*`: sidebar, top bar, command menu, alerts, the about panel.

## Scope: facility and reporting year

The facility ("all" or one site) and the reporting year are app-wide (`useScope()`). The top bar has the two selects; the inventory screen repeats them in its toolbar because that is where they are used most. Every screen follows the scope. 2026 is the year in progress; 2022 to 2025 are closed years with accepted reports.

## Links between screens (the URL contract)

- `/inventory?product=<productId>` opens that product's detail. Optional `&facility=<facilityId>`.
- `/sds?product=<productId>` opens that product's SDS. `/sds?status=expired|review|missing|current` pre-filters the library.
- `/reports?facility=<facilityId>&year=<year>&type=tier2|list311|sds-audit` opens that report.
- Read params with `useSearchParams()`; write them with `router.replace(..., { scroll: false })` so a detail view has a shareable URL and the back button closes it.

## Interaction standards

- Every control has hover, focus-visible, active and disabled states. shadcn components have them; anything you build by hand must too (`focus-visible:ring-2 focus-visible:ring-ring/60`, `cursor-pointer` on real buttons only).
- Durations: hover and colour 150ms, menus 200ms, sheets and dialogs 250 to 350ms in and faster out. Ease `var(--ease-out-quint)`. Nothing the user waits on takes over 300ms. Animate only `transform` and `opacity`.
- No entrance animations on page load, no hover lift on every card. Motion answers an action (open, expand, confirm) and nothing else.
- Rows that open something: whole row clickable (`onRowClick`), plus keyboard (the table does this).
- Details open in a right-hand `Sheet` (`sm:max-w-[640px]` or wider; full width on phones) so the list stays in view behind it. Short forms open in a `Dialog`. Phones may use `Drawer` (vaul) for short forms.
- After every action that changes data: a `toast` from `sonner` that uses the same verb as the button ("Add chemical" then "Chemical added"), and a `logActivity` call so the Overview feed shows it.
- Forms: visible labels (never placeholder as label), required marked in text, inline errors next to the field with an icon, submit disabled only while invalid and untouched is fine. Validate on submit and on blur.
- Empty and filtered-to-nothing states: `EmptyState` with a reason and a way out.
- Charts: Recharts through shadcn `ChartContainer` + `ChartTooltip` (`src/components/ui/chart.tsx`). Thin marks, bar ends rounded 3 to 4px on the data end only, 2px lines, a 2px gap between stacked segments, recessive grid (`var(--chart-grid)`, horizontal lines only), axis text 12px muted, **always a hover tooltip**, a legend when there are two or more series, direct labels where there are four or fewer. One y-axis only. Status colours are for status; categories take `--chart-1..8` in order. Text never takes the series colour. No pie charts with more than 4 slices; prefer bars.
- Responsive: phones get lists in place of tables, tablets get rows two across, the table shows from 1024px up (`mobileRow` in the table kit). No sideways page scroll at any width (tables scroll inside their own panel; the kit does it). Touch targets 40px or more on phones. Grids collapse to one column on phones.
- Dark mode is selected by the user and must look deliberate: use tokens only and it will.
- Accessibility: real buttons and links, `aria-label` on icon buttons, labels tied to inputs, status never by colour alone (badge = icon + word).

## Copy

Plain verbs, sentence case, the user's words ("Safety data sheet", not "document entity"). A button says what happens ("Upload new version", not "Submit"). Errors say what is wrong and how to fix it. Realistic content only: no "Lorem ipsum", no "Feature 1", no placeholder names.

## Checking a screen

`node scripts/shot.mjs <route> shots/<name>.png <width> <height>` takes a screenshot of the running dev server (flags in the file header: `--dark`, `--full`, `--scroll=<px>`, `--click=<selector>`). Every screen is checked at 1440, 820 and 390 wide, in both themes.
