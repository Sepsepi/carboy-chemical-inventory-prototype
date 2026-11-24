"use client";

// The table kit. Every table in the app is built from these pieces so that
// sorting, search, filters, paging and row hover behave the same everywhere.
//
//   <DataTable
//     columns={columns}
//     data={rows}
//     getRowId={(r) => r.id}
//     onRowClick={(r) => open(r)}
//     activeRowId={openId}
//     initialSorting={[{ id: "maxDailyLb", desc: true }]}
//     mobileRow={(r) => <MyCompactRow row={r} />}   // phones get a list, not a sideways table
//     toolbar={(table) => (
//       <>
//         <DataTableSearch table={table} placeholder="Search chemicals, CAS, location" />
//         <DataTableFacetedFilter column={table.getColumn("state")} title="State" options={...} />
//         <DataTableViewOptions table={table} />
//       </>
//     )}
//   />
//
// Column extras live in `meta`: { align, label, className, headerClassName, sticky }.

import * as React from "react";
import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Table as TanstackTable,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CirclePlus,
  Search,
  SearchX,
  Settings2,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** text alignment of header and cells; numbers go right */
    align?: "left" | "right" | "center";
    /** name shown in the column picker when the header is not plain text */
    label?: string;
    className?: string;
    headerClassName?: string;
    /** keep this column in view while the table scrolls sideways */
    sticky?: boolean;
  }
}

/* ───────────────────────────────── table ───────────────────────────────── */

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  data: TData[];
  getRowId?: (row: TData) => string;
  /** makes rows clickable (and reachable by keyboard) */
  onRowClick?: (row: TData) => void;
  /** the row whose detail is open, drawn as selected */
  activeRowId?: string | null;
  initialSorting?: SortingState;
  initialVisibility?: VisibilityState;
  pageSize?: number;
  /** content above the table, given the table instance: search, filters, actions */
  toolbar?: (table: TanstackTable<TData>) => React.ReactNode;
  /** shown in place of the toolbar while rows are selected */
  selectionBar?: (table: TanstackTable<TData>) => React.ReactNode;
  /** turn on the checkbox column */
  selectable?: boolean;
  /** what the rows are called, for "38 chemicals" */
  noun?: [singular: string, plural: string];
  emptyTitle?: string;
  emptyDescription?: React.ReactNode;
  className?: string;
  /** minimum width before the table scrolls sideways */
  minWidth?: number;
  /** let a parent read filtered rows (for exports and totals) */
  onTable?: (table: TanstackTable<TData>) => void;
  /**
   * How one row reads on a small screen. When given, phones get a list of
   * these and tablets in portrait get them two across; the table itself shows
   * from 1024px up. Put the name, the status and the one or two figures that
   * matter in it.
   */
  mobileRow?: (row: TData) => React.ReactNode;
}

export function DataTable<TData>({
  columns,
  data,
  getRowId,
  onRowClick,
  activeRowId,
  initialSorting = [],
  initialVisibility = {},
  pageSize = 25,
  toolbar,
  selectionBar,
  selectable = false,
  noun = ["row", "rows"],
  emptyTitle = "Nothing matches these filters",
  emptyDescription = "Clear a filter or change the search to see more.",
  className,
  minWidth = 880,
  onTable,
  mobileRow,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialVisibility);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  const allColumns = React.useMemo<ColumnDef<TData, unknown>[]>(
    () => (selectable ? [selectionColumn<TData>(), ...columns] : columns),
    [columns, selectable],
  );

  const table = useReactTable({
    data,
    columns: allColumns,
    getRowId,
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter },
    initialState: { pagination: { pageSize } },
    enableRowSelection: selectable,
    autoResetPageIndex: true,
    globalFilterFn: "includesString",
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  React.useEffect(() => {
    onTable?.(table);
  });

  const rows = table.getRowModel().rows;
  const selected = table.getFilteredSelectedRowModel().rows.length;
  const filtered = table.getState().columnFilters.length > 0 || Boolean(table.getState().globalFilter);

  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      {(toolbar || selectionBar) && (
        <div className="flex min-h-12 flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          {selected > 0 && selectionBar ? (
            <>
              <span className="pl-1 text-[13px] font-medium tabular">{selected} selected</span>
              <div className="flex flex-wrap items-center gap-2">{selectionBar(table)}</div>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => table.resetRowSelection()}>
                Clear selection
              </Button>
            </>
          ) : (
            <>
              {toolbar?.(table)}
              {filtered && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    table.resetColumnFilters();
                    table.setGlobalFilter("");
                  }}
                >
                  Clear filters
                  <X data-icon="inline-end" />
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {mobileRow && (
        <ul className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:hidden">
          {rows.map((row) => {
            const active = activeRowId != null && row.id === activeRowId;
            const content = mobileRow(row.original);
            return (
              <li key={row.id} className="min-w-0 border-b border-border sm:odd:border-r">
                {onRowClick ? (
                  <button
                    type="button"
                    onClick={() => onRowClick(row.original)}
                    data-state={active ? "active" : undefined}
                    className="block h-full w-full cursor-pointer px-3.5 py-3 text-left outline-none transition-colors duration-150 active:bg-subtle focus-visible:bg-subtle data-[state=active]:bg-brand-bg/60"
                  >
                    {content}
                  </button>
                ) : (
                  <div className="px-3.5 py-3">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className={cn("scrollbar-thin overflow-x-auto", mobileRow && "max-lg:hidden")}>
        <table className="w-full caption-bottom border-collapse text-[13px]" style={{ minWidth }}>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-border bg-subtle">
                {group.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      style={header.column.columnDef.size !== 150 ? { width: header.getSize() } : undefined}
                      className={cn(
                        "h-9 px-3 text-left text-xs font-medium whitespace-nowrap text-muted-foreground",
                        meta?.align === "right" && "text-right",
                        meta?.align === "center" && "text-center",
                        meta?.sticky && "sticky left-0 z-10 bg-subtle",
                        meta?.headerClassName,
                      )}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row) => {
              const active = activeRowId != null && row.id === activeRowId;
              return (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : active ? "active" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row.original);
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    "group/row border-b border-border outline-none last:border-b-0",
                    "data-[state=active]:bg-brand-bg/60 data-[state=selected]:bg-brand-bg/40",
                    onRowClick &&
                      "row-hover cursor-pointer focus-visible:bg-subtle focus-visible:shadow-[inset_2px_0_0_var(--brand)]",
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta;
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          "h-11 px-3 py-1.5 align-middle",
                          meta?.align === "right" && "text-right",
                          meta?.align === "center" && "text-center",
                          meta?.sticky &&
                            "sticky left-0 z-[1] bg-card group-data-[state=active]/row:bg-[color-mix(in_oklch,var(--brand-bg)_60%,var(--card))] [@media(hover:hover)]:group-hover/row:bg-subtle",
                          meta?.className,
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div>
        {rows.length === 0 && (
          <EmptyState
            icon={SearchX}
            title={emptyTitle}
            description={emptyDescription}
            action={
              filtered ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    table.resetColumnFilters();
                    table.setGlobalFilter("");
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        )}
      </div>

      {data.length > 10 && <DataTablePagination table={table} noun={noun} />}
    </div>
  );
}

/* ───────────────────────────── selection column ────────────────────────── */

export function selectionColumn<TData>(): ColumnDef<TData, unknown> {
  return {
    id: "select",
    size: 36,
    enableSorting: false,
    enableHiding: false,
    enableGlobalFilter: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all rows on this page"
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(Boolean(v))}
      />
    ),
    cell: ({ row }) => (
      <span onClick={(e) => e.stopPropagation()} className="grid place-items-center">
        <Checkbox
          aria-label="Select row"
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(Boolean(v))}
        />
      </span>
    ),
  };
}

/* ───────────────────────────── sortable header ─────────────────────────── */

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}) {
  const right = column.columnDef.meta?.align === "right";
  if (!column.getCanSort()) return <span className={className}>{title}</span>;
  const sorted = column.getIsSorted();
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === "asc")}
      aria-label={`Sort by ${title}${sorted ? `, currently ${sorted === "asc" ? "ascending" : "descending"}` : ""}`}
      className={cn(
        "group/sort -mx-1.5 inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-1.5 text-xs font-medium outline-none transition-colors duration-150",
        "hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60",
        sorted ? "text-foreground" : "text-muted-foreground",
        right && "flex-row-reverse",
        className,
      )}
    >
      {title}
      <Icon
        aria-hidden
        className={cn("size-3 transition-opacity", sorted ? "opacity-100" : "opacity-0 group-hover/sort:opacity-60")}
      />
    </button>
  );
}

/* ──────────────────────────────── search ───────────────────────────────── */

export function DataTableSearch<TData>({
  table,
  placeholder = "Search",
  className,
}: {
  table: TanstackTable<TData>;
  placeholder?: string;
  className?: string;
}) {
  const value = (table.getState().globalFilter as string) ?? "";
  return (
    <label
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-lg border border-input bg-card px-2.5 text-sm transition-colors sm:w-72",
        "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40",
        className,
      )}
    >
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <input
        value={value}
        onChange={(e) => table.setGlobalFilter(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => table.setGlobalFilter("")}
          className="grid size-5 cursor-pointer place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </label>
  );
}

/* ───────────────────────────── faceted filter ──────────────────────────── */

export interface FacetOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  /** custom node shown before the label, e.g. a pictogram or status dot */
  leading?: React.ReactNode;
}

/**
 * Multi-select filter for one column. The column needs
 * `filterFn: facetFilter` (exported below) so several values can match.
 */
export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: {
  column?: Column<TData, TValue>;
  title: string;
  options: FacetOption[];
}) {
  if (!column) return null;
  const facets = column.getFacetedUniqueValues();
  const selected = new Set((column.getFilterValue() as string[] | undefined) ?? []);
  const countFor = (value: string) => {
    let n = 0;
    facets.forEach((count, key) => {
      if (Array.isArray(key) ? key.includes(value) : key === value) n += count;
    });
    return n;
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="default" className="border-dashed bg-card font-normal">
          <CirclePlus data-icon="inline-start" className="text-muted-foreground" />
          {title}
          {selected.size > 0 && (
            <>
              <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
              {selected.size > 2 ? (
                <span className="rounded bg-accent px-1.5 text-xs font-medium tabular">{selected.size} selected</span>
              ) : (
                options
                  .filter((o) => selected.has(o.value))
                  .map((o) => (
                    <span key={o.value} className="rounded bg-accent px-1.5 text-xs font-medium">
                      {o.label}
                    </span>
                  ))
              )}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          {options.length > 7 && <CommandInput placeholder={title} />}
          <CommandList>
            <CommandEmpty>No match.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      const next = new Set(selected);
                      if (isSelected) next.delete(option.value);
                      else next.add(option.value);
                      column.setFilterValue(next.size ? [...next] : undefined);
                    }}
                  >
                    <span
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded-[4px] border",
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input",
                      )}
                    >
                      {isSelected && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    {option.leading}
                    {option.icon && <option.icon className="size-4 text-muted-foreground" />}
                    <span className="truncate">{option.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground tabular">{countFor(option.value)}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selected.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => column.setFilterValue(undefined)} className="justify-center">
                    Clear filter
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** filterFn for faceted columns: the cell value (or any of its values) is in the selected list. */
export function facetFilter<TData>(
  row: { getValue: (id: string) => unknown } & { original: TData },
  columnId: string,
  filterValue: string[],
): boolean {
  if (!filterValue?.length) return true;
  const value = row.getValue(columnId);
  if (Array.isArray(value)) return value.some((v) => filterValue.includes(String(v)));
  return filterValue.includes(String(value));
}

/* ───────────────────────────── column picker ───────────────────────────── */

export function DataTableViewOptions<TData>({ table }: { table: TanstackTable<TData> }) {
  const columns = table.getAllColumns().filter((c) => c.getCanHide());
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="ml-auto bg-card font-normal">
          <Settings2 data-icon="inline-start" className="text-muted-foreground" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Show columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            onCheckedChange={(v) => column.toggleVisibility(Boolean(v))}
            onSelect={(e) => e.preventDefault()}
          >
            {column.columnDef.meta?.label ??
              (typeof column.columnDef.header === "string" ? column.columnDef.header : column.id)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ──────────────────────────────── paging ───────────────────────────────── */

export function DataTablePagination<TData>({
  table,
  noun = ["row", "rows"],
}: {
  table: TanstackTable<TData>;
  noun?: [string, string];
}) {
  const total = table.getFilteredRowModel().rows.length;
  const all = table.getCoreRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(total, (pageIndex + 1) * pageSize);
  const pages = Math.max(1, table.getPageCount());
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border px-3 py-2 text-[13px] text-muted-foreground">
      <p className="tabular">
        {total === 0 ? (
          <>No {noun[1]}</>
        ) : (
          <>
            {from} to {to} of {total} {total === 1 ? noun[0] : noun[1]}
            {total !== all && <span> (filtered from {all})</span>}
          </>
        )}
      </p>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 sm:flex">
          <span>Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
            <SelectTrigger size="sm" aria-label="Rows per page" className="bg-card tabular">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {[10, 25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="tabular">
          Page {pageIndex + 1} of {pages}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden bg-card sm:inline-flex"
            aria-label="First page"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.setPageIndex(0)}
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="bg-card"
            aria-label="Previous page"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="bg-card"
            aria-label="Next page"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden bg-card sm:inline-flex"
            aria-label="Last page"
            disabled={!table.getCanNextPage()}
            onClick={() => table.setPageIndex(pages - 1)}
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
