"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceArea,
  XAxis,
  YAxis,
} from "recharts";
import { CURRENT_REPORTING_YEAR, REPORTING_YEARS } from "@/lib/seed/facilities";
import { formatLb, formatLbCompact } from "@/lib/format";
import type { Facility, InventoryRecord } from "@/lib/types";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Panel, PanelBody, PanelHeader } from "@/components/layout/page";
import { stackShape } from "@/components/dashboard/stack-shape";

const YEARS = [...REPORTING_YEARS].sort((a, b) => a - b);

function YearTick({
  x,
  y,
  payload,
}: {
  x?: number | string;
  y?: number | string;
  payload?: { value: number };
}) {
  const year = payload?.value;
  const inProgress = year === CURRENT_REPORTING_YEAR;
  return (
    <g transform={`translate(${Number(x ?? 0)},${Number(y ?? 0)})`}>
      <text
        y={0}
        dy={12}
        textAnchor="middle"
        fontSize={12}
        className="fill-muted-foreground tabular"
      >
        {year}
      </text>
      {inProgress && (
        <text
          y={0}
          dy={27}
          textAnchor="middle"
          fontSize={11}
          className="fill-muted-foreground"
        >
          in progress
        </text>
      )}
    </g>
  );
}

export function QuantityChart({
  inventory,
  facilities,
  facility,
  year,
}: {
  inventory: InventoryRecord[];
  facilities: Facility[];
  /** set when one facility is in scope: a single series */
  facility?: Facility;
  /** the reporting year in scope, shaded */
  year: number;
}) {
  const series = facility ? [facility] : facilities;
  const keys = series.map((f) => f.id);
  const config: ChartConfig = Object.fromEntries(
    series.map((f, i) => [
      f.id,
      { label: f.city, color: `var(--chart-${facility ? 1 : i + 1})` },
    ]),
  );
  const data = YEARS.map((y) => {
    const row: Record<string, number> = { year: y };
    for (const f of series) row[f.id] = 0;
    for (const rec of inventory) {
      if (rec.year !== y || !(rec.facilityId in row)) continue;
      row[rec.facilityId] += rec.maxDailyLb;
    }
    return row;
  });
  const totals = data.map((d) => series.reduce((s, f) => s + d[f.id], 0));
  const first = totals[0];
  const last = totals[totals.length - 1];
  const change = first ? Math.round(((last - first) / first) * 100) : 0;

  return (
    <Panel>
      <PanelHeader
        title="Quantity on site by reporting year"
        description={`Sum of maximum daily amounts${facility ? ` at ${facility.name}` : ", stacked by facility"}. ${
          change === 0
            ? "Flat"
            : `${change > 0 ? "Up" : "Down"} ${Math.abs(change)}%`
        } since ${YEARS[0]}.`}
      />
      <PanelBody>
        <ChartContainer
          config={config}
          className="aspect-auto h-[260px] w-full"
        >
          <BarChart
            data={data}
            margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
            barCategoryGap="28%"
          >
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <ReferenceArea
              x1={year}
              x2={year}
              fill="var(--subtle)"
              fillOpacity={1}
              ifOverflow="extendDomain"
            />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              interval={0}
              height={40}
              tick={(p) => <YearTick {...p} />}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={58}
              fontSize={12}
              tickFormatter={(v: number) => formatLbCompact(v)}
            />
            <ChartTooltip
              cursor={{ fill: "var(--subtle)" }}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const y = payload?.[0]?.payload?.year as number | undefined;
                    if (!y) return null;
                    const total = series.reduce(
                      (s, f) => s + Number(payload?.[0]?.payload?.[f.id] ?? 0),
                      0,
                    );
                    return (
                      <span className="flex items-baseline justify-between gap-4">
                        <span>
                          {y}
                          {y === CURRENT_REPORTING_YEAR ? " (in progress)" : ""}
                        </span>
                        {series.length > 1 && (
                          <span className="font-normal text-muted-foreground tabular">
                            {formatLbCompact(total)}
                          </span>
                        )}
                      </span>
                    );
                  }}
                  formatter={(value, name, item) => (
                    <span className="flex w-full items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: item.color }}
                        aria-hidden
                      />
                      <span className="text-muted-foreground">
                        {config[String(name)]?.label ?? name}
                      </span>
                      <span className="ml-auto pl-3 font-medium text-foreground tabular">
                        {formatLb(Number(value))}
                      </span>
                    </span>
                  )}
                />
              }
            />
            {series.length > 1 && (
              <ChartLegend
                itemSorter={(item) => keys.indexOf(String(item.dataKey))}
                content={
                  <ChartLegendContent className="flex-wrap gap-x-4 gap-y-1" />
                }
              />
            )}
            {series.map((f) => (
              <Bar
                key={f.id}
                dataKey={f.id}
                stackId="qty"
                fill={`var(--color-${f.id})`}
                stroke="var(--card)"
                strokeWidth={series.length > 1 ? 1 : 0}
                shape={stackShape(keys, f.id)}
                maxBarSize={56}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </PanelBody>
    </Panel>
  );
}
