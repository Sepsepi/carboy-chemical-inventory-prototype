import { cn } from "@/lib/utils";

/** The Carboy mark: the outline of a carboy, the jug chemicals ship in. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", className)} aria-hidden>
      <rect width="24" height="24" rx="6" className="fill-primary" />
      <path
        d="M10 4.5h4v2.2c0 .5.2.9.6 1.2l1.7 1.3c.8.6 1.2 1.5 1.2 2.5v5.3a2.5 2.5 0 0 1-2.5 2.5H9a2.5 2.5 0 0 1-2.5-2.5v-5.3c0-1 .4-1.9 1.2-2.5l1.7-1.3c.4-.3.6-.7.6-1.2Z"
        className="fill-none stroke-primary-foreground"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M6.9 13.2h10.2" className="stroke-primary-foreground" strokeWidth="1.6" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-[-0.01em]">Carboy</span>
    </span>
  );
}
