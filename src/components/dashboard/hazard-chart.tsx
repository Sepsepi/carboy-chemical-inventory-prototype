"use client";

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";
import { GHS_META, GHS_ORDER } from "@/lib/domain";
import type { GhsCode, InventoryRow } from "@/lib/types";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Panel, PanelBody, PanelHeader } from "@/components/layout/page";
import { GhsPictogram } from "@/components/hazard/ghs-pictogram";
import { EmptyState } from "@/components/empty-state";

const config = {
  count: { label: "Chemicals", color: "var(--chart-1)" },
} satisfies ChartConfig;

const ROW = 30;

// The labels sit flush with the left edge of the plot, pictogram first.
function Tick({
  y,
  payload,
}: {
  y?: number | string;
  payload?: { value: GhsCode };
}) {
  const code = payload?.value;
  if (!code) return null;
  return (
    <g transform={`translate(0,${Number(y ?? 0)})`}>
      <foreignObject x={0} y={-10} width={20} height={20}>
        <GhsPictogram code={code} size="xs" tooltip={false} />
      </foreignObject>
      <text
        x={27}
        y={0}
        dy="0.35em"
        textAnchor="start"
        fontSize={12}
        className="fill-foreground"
      >
        {GHS_META[code].short}
      </text>
    </g>
  );
}

export function HazardChart({ rows }: { rows: InventoryRow[] }) {
  // one count per product, so a chemical stocked at three sites counts once
  const products = new Map(rows.map((r) => [r.product.id, r.product]));
  const data = GHS_ORDER.map((code) => ({
    code,
    name: GHS_META[code].short,
    count: [...products.values()].filter((p) => p.pictograms.includes(code))
      .length,
  }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <Panel>
      <PanelHeader
        title="Chemicals by hazard class"
        description={`GHS pictograms carried by the ${products.size} chemicals in scope`}
      />
      <PanelBody>
        {data.length === 0 ? (
          <EmptyState
            title="No chemicals in scope"
            description="Pick another facility or year to see hazard classes."
          />
        ) : (
          <ChartContainer
            config={config}
            className="aspect-auto w-full"
            style={{ height: data.length * ROW + 4 }}
          >
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 32, bottom: 0, left: 0 }}
              barCategoryGap={7}
            >
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="code"
                width={140}
                tickLine={false}
                axisLine={false}
                interval={0}
                tick={(props) => <Tick {...props} />}
              />
              <ChartTooltip
                cursor={{ fill: "var(--subtle)" }}
                content={
                  <ChartTooltipContent
                    hideIndicator
                    labelFormatter={(_, payload) => {
                      const code = payload?.[0]?.payload?.code as
                        GhsCode | undefined;
                      return code ? `${GHS_META[code].short} (${code})` : null;
                    }}
                  />
                }
              />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={[0, 3, 3, 0]}
                maxBarSize={18}
              >
                <LabelList
                  dataKey="count"
                  position="right"
                  offset={6}
                  fontSize={12}
                  className="fill-foreground tabular"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </PanelBody>
    </Panel>
  );
}
