"use client";

import * as React from "react";
import { FileCheck2, PackageX, TriangleAlert } from "lucide-react";
import type { InventoryRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { EhsTag, SdsStatusBadge, StatusBadge } from "@/components/status-badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IngredientsTab, OverviewTab, SdsTab } from "./detail-info";
import { LocationsTab, QuantitiesTab } from "./detail-edit";

const TABS = [
  ["overview", "Overview"],
  ["quantities", "Quantities"],
  ["locations", "Locations"],
  ["ingredients", "Ingredients"],
  ["sds", "SDS"],
] as const;

export function InventoryDetail({
  open,
  row,
  missing,
  onOpenChange,
}: {
  open: boolean;
  row: InventoryRow | null;
  /** shown when the URL names a product that has no record in scope */
  missing?: { title: string; description: string };
  onOpenChange: (open: boolean) => void;
}) {
  const [tab, setTab] = React.useState<string>("overview");
  // keep the last row on screen while the sheet animates out
  const lastRow = React.useRef<InventoryRow | null>(row);
  if (row) lastRow.current = row;
  const shown = row ?? lastRow.current;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 outline-none data-[side=right]:w-full data-[side=right]:sm:max-w-[720px]"
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => {
          // focus the sheet itself, not the first tab, so no focus ring shows on open
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.focus();
        }}
      >
        {!row && missing ? (
          <>
            <SheetHeader className="border-b border-border px-5 py-4">
              <SheetTitle>{missing.title}</SheetTitle>
            </SheetHeader>
            <EmptyState icon={PackageX} title={missing.title} description={missing.description} />
          </>
        ) : shown ? (
          <>
            <DetailHeader row={shown} />
            <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1 gap-0">
              <div className="scrollbar-thin shrink-0 overflow-x-auto border-b border-border px-5">
                <TabsList variant="line" className="h-10 w-max gap-4 p-0">
                  {TABS.map(([value, label]) => (
                    <TabsTrigger key={value} value={value} className="h-10 flex-none px-0.5 text-[13px]">
                      {label}
                      {value === "ingredients" && (
                        <span className="text-xs text-muted-foreground tabular">{shown.product.ingredients.length}</span>
                      )}
                      {value === "locations" && (
                        <span className="text-xs text-muted-foreground tabular">{shown.locations.length}</span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-10">
                <TabsContent value="overview">
                  <OverviewTab row={shown} />
                </TabsContent>
                <TabsContent value="quantities">
                  <QuantitiesTab row={shown} />
                </TabsContent>
                <TabsContent value="locations">
                  <LocationsTab row={shown} />
                </TabsContent>
                <TabsContent value="ingredients">
                  <IngredientsTab row={shown} />
                </TabsContent>
                <TabsContent value="sds">
                  <SdsTab row={shown} />
                </TabsContent>
              </div>
            </Tabs>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DetailHeader({ row }: { row: InventoryRow }) {
  const p = row.product;
  return (
    <SheetHeader className="gap-2 border-b border-border px-5 pt-5 pb-4">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pr-8">
        <SheetTitle className="text-lg leading-6 font-semibold">{p.name}</SheetTitle>
        {p.signalWord && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[13px] font-semibold",
              p.signalWord === "Danger" ? "text-critical" : "text-warn",
            )}
          >
            <TriangleAlert className="size-3.5" aria-hidden />
            {p.signalWord}
          </span>
        )}
      </div>
      <SheetDescription asChild>
        <div className="flex flex-col gap-1 text-[13px] text-muted-foreground">
          <p>
            {p.manufacturer}
            {p.productCode && (
              <>
                , product code <span className="ident text-foreground">{p.productCode}</span>
              </>
            )}
          </p>
          <p>
            {row.facility.name} <span className="ident">({row.facility.code})</span>, reporting year{" "}
            <span className="tabular">{row.year}</span>
          </p>
        </div>
      </SheetDescription>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {row.reportable ? (
          <StatusBadge tone="info" icon={FileCheck2}>
            Tier II reportable
          </StatusBadge>
        ) : (
          <StatusBadge tone="neutral">Below threshold</StatusBadge>
        )}
        <SdsStatusBadge status={row.sds} />
        {row.ehs && <EhsTag className="h-[22px] px-1.5" />}
        {p.isNew && <StatusBadge tone="neutral">Added this session</StatusBadge>}
      </div>
    </SheetHeader>
  );
}
