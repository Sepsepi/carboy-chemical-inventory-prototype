"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { SDS_MAX_AGE_YEARS } from "@/lib/domain";
import type { SdsRow } from "@/lib/store";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Panel, PanelBody, PanelHeader } from "@/components/layout/page";
import { EmptyState } from "@/components/empty-state";
import { stackShape } from "@/components/dashboard/stack-shape";

const config = {
  current: { label: "Current", color: "var(--chart-neutral)" },
  review: { label: "Review due", color: "var(--warn-solid)" },
  expired: { label: "Over 5 years", color: "var(--critical-solid)" },
} satisfies ChartConfig;

const KEYS = ["current", "review", "expired"] as const;

const BUCKETS = [
  { tick: "<1", label: "Under 1 year" },
  { tick: "1–2", label: "1 to 2 years" },
  { tick: "2–3", label: "2 to 3 years" },
  { tick: "3–4", label: "3 to 4 years" },
  { tick: "4–5", label: "4 to 5 years" },
  { tick: "5–6", label: "5 to 6 years" },
  { tick: "6+", label: "6 years or more" },
];

export function SdsAgeChart({ rows }: { rows: SdsRow[] }) {
  const data = BUCKETS.map((b) => ({
    ...b,
    current: 0,
    review: 0,
    expired: 0,
  }));
  let missing = 0;
  for (const r of rows) {
    if (r.status.key === "missing" || r.status.ageDays === undefined) {
      missing += 1;
      continue;
    }
    const years = r.status.ageDays / 365.25;
    const i = Math.min(BUCKETS.length - 1, Math.floor(years));
    data[i][r.status.key as (typeof KEYS)[number]] += 1;
  }
  const dated = rows.length - missing;
  const over = data.reduce((s, d) => s + d.expired, 0);

  return (
    <Panel>
      <PanelHeader
        title="SDS age"
        description={
          dated === 0
            ? "No dated safety data sheets in scope"
            : `Years since the latest revision of ${dated} sheets. ${over} past the five-year limit${
                missing ? `, ${missing} with no SDS on file` : ""
              }.`
        }
      />
      <PanelBody>
        {dated === 0 ? (
          <EmptyState
            title="Nothing to chart"
            description="No chemical in scope has an SDS with a revision date."
          />
        ) : (
          <ChartContainer
            config={config}
            className="aspect-auto h-[260px] w-full"
          >
            <BarChart
              data={data}
              margin={{ top: 22, right: 4, bottom: 0, left: -18 }}
              barCategoryGap="18%"
            >
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis
                dataKey="tick"
                tickLine={false}
                axisLine={false}
                interval={0}
                fontSize={12}
                tickMargin={6}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                fontSize={12}
                width={44}
              />
              <ReferenceLine
                x={BUCKETS[SDS_MAX_AGE_YEARS].tick}
                position="start"
                stroke="var(--critical-solid)"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={{
                  value: "5-year limit",
                  position: "insideTopLeft",
                  offset: 0,
                  dy: -18,
                  dx: 4,
                  fontSize: 12,
                  className: "fill-critical",
                }}
              />
              <ChartTooltip
                cursor={{ fill: "var(--subtle)" }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const label = payload?.[0]?.payload?.label as
                        string | undefined;
                      return label ? `${label} since revision` : null;
                    }}
                  />
                }
              />
              <ChartLegend
                content={
                  <ChartLegendContent className="flex-wrap gap-x-4 gap-y-1" />
                }
              />
              {KEYS.map((k) => (
                <Bar
                  key={k}
                  dataKey={k}
                  stackId="age"
                  fill={`var(--color-${k})`}
                  stroke="var(--card)"
                  strokeWidth={1}
                  shape={stackShape(KEYS, k)}
                  maxBarSize={44}
                />
              ))}
            </BarChart>
          </ChartContainer>
        )}
      </PanelBody>
    </Panel>
  );
}
