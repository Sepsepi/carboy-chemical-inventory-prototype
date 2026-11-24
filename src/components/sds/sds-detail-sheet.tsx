"use client";

import { FilePlus2, Mail, MailCheck, Printer, Upload, X } from "lucide-react";
import { formatDate, formatDateShort, formatNumber } from "@/lib/format";
import type { SdsRow } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/empty-state";
import { SDS_TONE, SdsStatusBadge, StatusBadge } from "@/components/status-badge";
import { SdsPreview } from "@/components/sds/sds-preview";
import { gapLabel, statusSentence } from "@/components/sds/sds-utils";

const TONE_TEXT = { good: "text-good", warn: "text-warn", critical: "text-critical", serious: "text-serious" } as const;

export function SdsDetailSheet({
  row,
  requestedAt,
  onClose,
  onUpload,
  onRequest,
}: {
  row: SdsRow | undefined;
  /** when an update was requested, ISO date */
  requestedAt?: string;
  onClose: () => void;
  onUpload: (productId: string) => void;
  onRequest: (row: SdsRow) => void;
}) {
  return (
    <Sheet open={Boolean(row)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cn(
          "gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[760px]",
          "data-open:duration-300 data-closed:duration-200 ease-[var(--ease-out-quint)]",
          "print:static print:h-auto print:overflow-visible print:border-0 print:shadow-none",
        )}
      >
        {row && <Detail row={row} requestedAt={requestedAt} onClose={onClose} onUpload={onUpload} onRequest={onRequest} />}
      </SheetContent>
    </Sheet>
  );
}

function Detail({
  row,
  requestedAt,
  onClose,
  onUpload,
  onRequest,
}: {
  row: SdsRow;
  requestedAt?: string;
  onClose: () => void;
  onUpload: (productId: string) => void;
  onRequest: (row: SdsRow) => void;
}) {
  const { product, doc, status } = row;
  const latest = doc?.versions[0];
  const tone = SDS_TONE[status.key];

  return (
    <>
      <header
        data-print="hide"
        className="sticky top-0 z-10 flex flex-col gap-2 border-b border-border bg-popover px-5 pt-4 pb-4 sm:px-6"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-lg leading-tight font-semibold">{product.name}</SheetTitle>
            <SheetDescription className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px]">
              <span>{product.manufacturer}</span>
              {doc && <span className="ident text-foreground">{doc.id}</span>}
              {latest && <span>Version {latest.version}</span>}
            </SheetDescription>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose} className="-mr-1.5 shrink-0">
            <X />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SdsStatusBadge status={status} />
          {requestedAt && (
            <StatusBadge tone="info" icon={MailCheck}>
              Update requested {formatDate(requestedAt)}
            </StatusBadge>
          )}
        </div>
        <p className={cn("text-[13px] leading-5", status.key === "current" ? "text-muted-foreground" : TONE_TEXT[tone as keyof typeof TONE_TEXT])}>
          {statusSentence(status, latest?.revisionDate)}
          {requestedAt && ` An updated SDS was requested from ${product.manufacturer} on ${formatDate(requestedAt)}.`}
        </p>
        <Actions row={row} requestedAt={requestedAt} onUpload={onUpload} onRequest={onRequest} />
      </header>

      {doc && latest ? (
        <div className="flex flex-col gap-6 px-5 py-5 sm:px-6">
          <section className="flex flex-col gap-3">
            <div data-print="hide" className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Preview</h3>
              <Button variant="outline" size="sm" className="bg-card" onClick={() => window.print()}>
                <Printer data-icon="inline-start" />
                Print preview
              </Button>
            </div>
            <div className="rounded-lg bg-muted p-3 sm:p-5 print:bg-transparent print:p-0">
              <SdsPreview product={product} doc={doc} />
            </div>
          </section>

          <section data-print="hide" className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">
              Version history{" "}
              <span className="font-normal text-muted-foreground tabular">
                {doc.versions.length} {doc.versions.length === 1 ? "version" : "versions"}
              </span>
            </h3>
            <ol className="relative">
              {doc.versions.map((v, i) => {
                const older = doc.versions[i + 1];
                const current = i === 0;
                return (
                  <li key={v.version + v.revisionDate} className="relative flex gap-3 pb-5 last:pb-0">
                    {/* rail */}
                    {i < doc.versions.length - 1 && (
                      <span aria-hidden className="absolute top-4 bottom-0 left-[5px] w-px bg-border-strong" />
                    )}
                    <span
                      aria-hidden
                      className={cn(
                        "relative mt-1.5 size-[11px] shrink-0 rounded-full border-2",
                        current ? "border-foreground bg-foreground" : "border-border-strong bg-popover",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-semibold">Version {v.version}</span>
                        {current ? (
                          <span className="rounded-md border border-border-strong px-1.5 text-xs font-medium leading-5">
                            Current version
                          </span>
                        ) : (
                          <span className="rounded-md bg-muted px-1.5 text-xs leading-5 text-muted-foreground">
                            Superseded
                          </span>
                        )}
                        {older && (
                          <span className="text-xs text-muted-foreground">
                            {gapLabel(older.revisionDate, v.revisionDate)} than v{older.version}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[13px]">
                        Revised <span className="font-medium tabular">{formatDate(v.revisionDate)}</span>
                        <span className="text-muted-foreground">
                          . Added by {v.uploadedBy} on {formatDate(v.uploadedAt)}.
                        </span>
                      </p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">{v.changeNote}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span className="ident break-all text-foreground">{v.fileName}</span>
                        <span className="tabular">
                          {formatNumber(v.fileSizeKb)} KB, {v.pages} pages
                        </span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      ) : (
        <div data-print="hide" className="px-5 py-5 sm:px-6">
          <div className="rounded-lg border border-dashed border-border-strong">
            <EmptyState
              icon={FilePlus2}
              title="No safety data sheet on file"
              description={
                row.facilities.length
                  ? `${product.name} is held at ${row.facilities.map((f) => f.name).join(", ")} without an SDS. OSHA requires one for every hazardous chemical on site.`
                  : `${product.name} is in the catalog but has no SDS. Add one before it is stocked at a site.`
              }
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => onUpload(product.id)}>
                    <Upload data-icon="inline-start" />
                    Upload SDS
                  </Button>
                  <RequestButton row={row} requestedAt={requestedAt} onRequest={onRequest} label="Request from manufacturer" />
                </div>
              }
            />
          </div>
        </div>
      )}
    </>
  );
}

function Actions({
  row,
  requestedAt,
  onUpload,
  onRequest,
}: {
  row: SdsRow;
  requestedAt?: string;
  onUpload: (productId: string) => void;
  onRequest: (row: SdsRow) => void;
}) {
  if (!row.doc) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <Button onClick={() => onUpload(row.product.id)}>
        <Upload data-icon="inline-start" />
        Upload new version
      </Button>
      <RequestButton row={row} requestedAt={requestedAt} onRequest={onRequest} label="Request update from manufacturer" />
    </div>
  );
}

function RequestButton({
  row,
  requestedAt,
  onRequest,
  label,
}: {
  row: SdsRow;
  requestedAt?: string;
  onRequest: (row: SdsRow) => void;
  label: string;
}) {
  if (requestedAt) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/* span so the tooltip still works on a disabled button */}
          <span tabIndex={0} className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
            <Button variant="outline" className="pointer-events-none bg-card" disabled>
              <MailCheck data-icon="inline-start" />
              Requested {formatDateShort(requestedAt)}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Asked {row.product.manufacturer} for a current SDS on {formatDate(requestedAt)}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Button variant="outline" className="bg-card" onClick={() => onRequest(row)}>
      <Mail data-icon="inline-start" />
      {label}
    </Button>
  );
}
