"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, CalendarCheck, ChevronsUpDown, CircleAlert, FileText, Upload, X } from "lucide-react";
import { addYears, daysBetween, parseDate, SDS_REVIEW_WINDOW_DAYS } from "@/lib/domain";
import { formatDate, formatNumber, todayIso } from "@/lib/format";
import { CURRENT_USER } from "@/lib/seed/facilities";
import { useAppStore, type SdsRow } from "@/lib/store";
import type { SdsDocument } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SdsStatusBadge } from "@/components/status-badge";
import { nextMajorVersion, reviewStartsOn } from "@/components/sds/sds-utils";

// One form for both entry points: "Upload SDS" from the page header (pick the
// product first) and "Upload new version" from a document (product fixed).
// Nothing is uploaded anywhere: the file is read in the browser for its name,
// size and page count, and the version goes into the in-memory store.

type Language = SdsDocument["language"];

interface PickedFile {
  name: string;
  sizeKb: number;
  pages: number;
}

async function readPdf(file: File): Promise<PickedFile> {
  let pages = 0;
  try {
    const text = await file.text();
    pages = (text.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
  } catch {
    pages = 0;
  }
  return { name: file.name, sizeKb: Math.max(1, Math.round(file.size / 1024)), pages: pages || 1 };
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-[13px] text-critical">
      <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

export function UploadDialog({
  open,
  onOpenChange,
  rows,
  productId: fixedProductId,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: SdsRow[];
  /** set when uploading a new version of a known product */
  productId?: string | null;
  onUploaded?: (productId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[560px]">
        {open && (
          <UploadForm
            rows={rows}
            fixedProductId={fixedProductId ?? null}
            onDone={(id) => {
              onOpenChange(false);
              onUploaded?.(id);
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function UploadForm({
  rows,
  fixedProductId,
  onDone,
  onCancel,
}: {
  rows: SdsRow[];
  fixedProductId: string | null;
  onDone: (productId: string) => void;
  onCancel: () => void;
}) {
  const addSdsVersion = useAppStore((s) => s.addSdsVersion);
  const logActivity = useAppStore((s) => s.logActivity);
  const today = todayIso();

  const [productId, setProductId] = React.useState<string | null>(fixedProductId);
  const row = rows.find((r) => r.product.id === productId);
  const latest = row?.doc?.versions[0];

  const [file, setFile] = React.useState<PickedFile | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [revisionDate, setRevisionDate] = React.useState("");
  const [version, setVersion] = React.useState(nextMajorVersion(latest?.version));
  const [language, setLanguage] = React.useState<Language>(row?.doc?.language ?? "English");
  const [note, setNote] = React.useState("");
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // when the product changes from the picker, prefill from its document
  const pick = (id: string) => {
    setProductId(id);
    const r = rows.find((x) => x.product.id === id);
    setVersion(nextMajorVersion(r?.doc?.versions[0]?.version));
    setLanguage(r?.doc?.language ?? "English");
  };

  const errors: Record<string, string | undefined> = {
    product: productId ? undefined : "Choose the product this safety data sheet is for.",
    file: file ? undefined : fileError ?? "Add the PDF of the safety data sheet.",
    revisionDate: !revisionDate
      ? "Enter the revision date printed on the SDS, usually in Section 16."
      : Number.isNaN(parseDate(revisionDate).getTime())
        ? "Enter a valid date."
        : revisionDate > today
          ? "The revision date cannot be in the future."
          : latest && revisionDate < latest.revisionDate
            ? `This is older than the version on file (v${latest.version}, ${formatDate(latest.revisionDate)}).`
            : undefined,
    version: !version.trim()
      ? "Enter the version number printed on the SDS."
      : row?.doc?.versions.some((v) => v.version === version.trim())
        ? `Version ${version.trim()} is already on file. Use the number printed on the new SDS.`
        : undefined,
  };
  const show = (k: string) => (submitted || touched[k]) && errors[k];
  const valid = Object.values(errors).every((e) => !e);

  const acceptFile = async (f: File | undefined) => {
    setTouched((t) => ({ ...t, file: true }));
    if (!f) return;
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setFile(null);
      setFileError(`${f.name} is not a PDF. Safety data sheets are stored as PDF files.`);
      return;
    }
    setFileError(null);
    setFile(await readPdf(f));
  };

  // live line under the date: how long this revision will stay current
  let dateLine: React.ReactNode = null;
  if (revisionDate && !errors.revisionDate) {
    const expires = addYears(revisionDate, 5);
    const daysLeft = daysBetween(new Date(), parseDate(expires));
    if (daysLeft < 0) {
      dateLine = (
        <p className="flex items-start gap-1.5 rounded-md border border-critical-border bg-critical-bg px-2.5 py-2 text-[13px] text-critical">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          This revision passed five years on {formatDate(expires)}. The document will still be flagged Over 5 years after
          upload. Ask the manufacturer for a newer revision.
        </p>
      );
    } else if (daysLeft <= SDS_REVIEW_WINDOW_DAYS) {
      dateLine = (
        <p className="flex items-start gap-1.5 rounded-md border border-warn-border bg-warn-bg px-2.5 py-2 text-[13px] text-warn">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          This revision turns five years old on {formatDate(expires)}, so it will show as Review due right away.
        </p>
      );
    } else {
      dateLine = (
        <p className="flex items-start gap-1.5 text-[13px] text-muted-foreground">
          <CalendarCheck className="mt-0.5 size-3.5 shrink-0 text-good" aria-hidden />
          This revision will be current until {formatDate(reviewStartsOn(revisionDate))} and flagged on{" "}
          {formatDate(expires)}.
        </p>
      );
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!valid || !row || !file) return;
    const v = version.trim();
    addSdsVersion(
      row.product.id,
      {
        version: v,
        revisionDate,
        uploadedAt: today,
        uploadedBy: CURRENT_USER.name,
        fileName: file.name,
        fileSizeKb: file.sizeKb,
        pages: file.pages,
        changeNote: note.trim() || (row.doc ? "New revision from the manufacturer" : "First version on file"),
      },
      language,
    );
    logActivity({
      kind: "sds-uploaded",
      summary: `uploaded version ${v} of the ${row.product.name} SDS`,
      productId: row.product.id,
      href: `/sds?product=${row.product.id}`,
    });
    toast.success("Version uploaded", {
      description: `${row.product.name}, version ${v}, revised ${formatDate(revisionDate)}.`,
    });
    onDone(row.product.id);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{fixedProductId ? "Upload new version" : "Upload SDS"}</DialogTitle>
        <DialogDescription>
          {row && fixedProductId
            ? `${row.product.name}, ${row.product.manufacturer}. ${latest ? `Version ${latest.version} is on file now.` : "No version is on file yet."}`
            : "Add a safety data sheet to the library. Its status is worked out from the revision date."}
        </DialogDescription>
      </DialogHeader>

      {!fixedProductId && (
        <div className="flex flex-col gap-1.5">
          <Label id="sds-product-label">
            Product <span className="font-normal text-muted-foreground">(required)</span>
          </Label>
          <ProductPicker
            rows={rows}
            value={productId}
            onChange={(id) => {
              pick(id);
              setTouched((t) => ({ ...t, product: true }));
            }}
            invalid={Boolean(show("product"))}
          />
          {show("product") && <FieldError id="sds-product-error">{errors.product}</FieldError>}
          {row && (
            <p className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
              <SdsStatusBadge status={row.status} />
              {latest ? `Version ${latest.version} on file, revised ${formatDate(latest.revisionDate)}.` : "No SDS on file yet."}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sds-file">
          PDF file <span className="font-normal text-muted-foreground">(required)</span>
        </Label>
        <input
          ref={inputRef}
          id="sds-file"
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          aria-describedby={show("file") ? "sds-file-error" : undefined}
          onChange={(e) => {
            void acceptFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {file ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-subtle px-3 py-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-card text-muted-foreground">
              <FileText className="size-4.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="ident truncate text-[13px] text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground tabular">
                {formatNumber(file.sizeKb)} KB, {file.pages} {file.pages === 1 ? "page" : "pages"}. Stays on this device.
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${file.name}`} onClick={() => setFile(null)}>
              <X />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void acceptFile(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-center outline-none transition-colors duration-150",
              "hover:border-border-strong hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring/60",
              dragging ? "border-brand bg-brand-bg" : show("file") ? "border-critical-border" : "border-border-strong",
            )}
          >
            <Upload className="size-5 text-muted-foreground" aria-hidden />
            <span className="text-[13px] font-medium text-foreground">Drop the PDF here, or choose a file</span>
            <span className="text-xs text-muted-foreground">PDF only. It is read on this device and not sent anywhere.</span>
          </button>
        )}
        {show("file") && <FieldError id="sds-file-error">{errors.file}</FieldError>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sds-rev">
            Revision date <span className="font-normal text-muted-foreground">(required)</span>
          </Label>
          <Input
            id="sds-rev"
            type="date"
            max={today}
            value={revisionDate}
            onChange={(e) => setRevisionDate(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, revisionDate: true }))}
            aria-invalid={Boolean(show("revisionDate"))}
            aria-describedby="sds-rev-hint"
            className="tabular"
          />
          <p id="sds-rev-hint" className="text-xs text-muted-foreground">
            The date printed on the SDS, not today&apos;s date.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sds-version">
            Version <span className="font-normal text-muted-foreground">(required)</span>
          </Label>
          <Input
            id="sds-version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, version: true }))}
            aria-invalid={Boolean(show("version"))}
            className="ident"
          />
          <p className="text-xs text-muted-foreground">
            {latest ? `Next after v${latest.version}. Change it to match the document.` : "Use the number on the document."}
          </p>
        </div>
      </div>
      {show("revisionDate") && <FieldError id="sds-rev-error">{errors.revisionDate}</FieldError>}
      {show("version") && <FieldError id="sds-version-error">{errors.version}</FieldError>}
      {dateLine}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sds-language">Language</Label>
        <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
          <SelectTrigger id="sds-language" className="w-full bg-card sm:w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="English">English</SelectItem>
            <SelectItem value="English, Spanish">English, Spanish</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sds-note">Change note</Label>
        <Textarea
          id="sds-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="For example: Section 8 exposure limits revised"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" className="bg-card" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitted && !valid}>
          <Upload data-icon="inline-start" />
          {fixedProductId ? "Upload new version" : "Upload SDS"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ProductPicker({
  rows,
  value,
  onChange,
  invalid,
}: {
  rows: SdsRow[];
  value: string | null;
  onChange: (id: string) => void;
  invalid: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = rows.find((r) => r.product.id === value);
  const flagged = rows.filter((r) => r.status.key !== "current");
  const rest = rows.filter((r) => r.status.key === "current");
  const item = (r: SdsRow) => (
    <CommandItem
      key={r.product.id}
      value={`${r.product.name} ${r.product.manufacturer} ${r.product.id}`}
      data-checked={r.product.id === value}
      onSelect={() => {
        onChange(r.product.id);
        setOpen(false);
      }}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate">{r.product.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{r.product.manufacturer}</span>
      </span>
      <SdsStatusBadge status={r.status} />
    </CommandItem>
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-labelledby="sds-product-label"
          aria-invalid={invalid}
          className={cn("h-9 w-full justify-between bg-card font-normal", invalid && "border-critical-border")}
        >
          {selected ? (
            <span className="truncate">{selected.product.name}</span>
          ) : (
            <span className="text-muted-foreground">Choose a product</span>
          )}
          <ChevronsUpDown className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 p-0">
        <Command>
          <CommandInput placeholder="Search products or manufacturers" />
          <CommandList className="max-h-72">
            <CommandEmpty>No product matches.</CommandEmpty>
            {flagged.length > 0 && <CommandGroup heading="Needs a new SDS">{flagged.map(item)}</CommandGroup>}
            <CommandGroup heading="Current">{rest.map(item)}</CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
