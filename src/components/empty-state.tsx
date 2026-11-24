import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shown when a list or table has nothing to show. Says why and what to do next. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-12 text-center", className)}>
      {Icon && (
        <span className="mb-1 grid size-10 place-items-center rounded-lg border border-border bg-subtle text-muted-foreground">
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-[13px] leading-5 text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
