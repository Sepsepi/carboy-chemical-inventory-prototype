import { cn } from "@/lib/utils";

// Page-level layout pieces shared by every screen, so headers, panels and
// spacing match across the app.

/** Wraps a screen's content: max width, side padding, vertical rhythm. */
export function PageBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("mx-auto flex w-full max-w-[1480px] flex-col gap-5 px-4 py-5 md:px-6 md:py-6", className)}>
      {children}
    </div>
  );
}

/** Title, one line of context, and the screen's main actions. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-[-0.01em] text-foreground md:text-[22px]">{title}</h1>
        {description && <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A bordered section. Flat on purpose: borders separate, shadows are for things that float. */
export function Panel({
  className,
  children,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("min-w-0 rounded-lg border border-border bg-card text-card-foreground", className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  description,
  action,
  className,
  divided = false,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** draw a rule under the header */
  divided?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 px-4 pt-3.5",
        divided ? "border-b border-border pb-3" : "pb-1",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-1.5">{action}</div>}
    </div>
  );
}

export function PanelBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("px-4 pt-2 pb-4", className)}>{children}</div>;
}

/** Label and value pair for detail views. */
export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  );
}
