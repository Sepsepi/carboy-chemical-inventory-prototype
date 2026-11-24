"use client";

import Link from "next/link";
import { Bell, CircleCheck, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FacilitySelect, YearSelect } from "@/components/scope-controls";
import { StatusDot } from "@/components/status-badge";
import { useAlerts, type AppAlert } from "./use-alerts";

function openCommand() {
  document.dispatchEvent(new CustomEvent("carboy:open-command"));
}

function AlertsButton() {
  const { alerts } = useAlerts();
  const urgent = alerts.filter((a) => a.tone === "critical" || a.tone === "serious").length;
  const groups: AppAlert["group"][] = ["Safety data sheets", "Reports"];
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Alerts, ${alerts.length} open`} className="relative">
              <Bell />
              {urgent > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-critical-solid px-1 text-[10px] leading-none font-semibold text-white ring-2 ring-background tabular">
                  {urgent}
                </span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Alerts</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-[min(92vw,380px)] gap-0 p-0">
        <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Needs attention</p>
          <p className="text-xs text-muted-foreground tabular">{alerts.length} open</p>
        </div>
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-6 py-10 text-center">
            <CircleCheck className="size-5 text-good" />
            <p className="text-sm font-medium">Nothing needs attention</p>
            <p className="text-[13px] text-muted-foreground">Every SDS is current and no report is waiting.</p>
          </div>
        ) : (
          <div className="scrollbar-thin max-h-[min(70vh,440px)] overflow-y-auto py-1">
            {groups.map((group) => {
              const items = alerts.filter((a) => a.group === group);
              if (!items.length) return null;
              return (
                <div key={group}>
                  <p className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground">{group}</p>
                  <ul>
                    {items.map((a) => (
                      <li key={a.id}>
                        <Link
                          href={a.href}
                          className="row-hover flex gap-2.5 px-4 py-2 outline-none focus-visible:bg-subtle"
                        >
                          <StatusDot tone={a.tone} className="mt-1.5" />
                          <span className="min-w-0">
                            <span className="block text-[13px] leading-5 font-medium text-foreground">{a.title}</span>
                            <span className="block text-xs text-muted-foreground">{a.detail}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ThemeButton() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
          onClick={() => setTheme(dark ? "light" : "dark")}
        >
          {dark ? <Sun /> : <Moon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{dark ? "Light theme" : "Dark theme"}</TooltipContent>
    </Tooltip>
  );
}

export function AppHeader({ className }: { className?: string }) {
  return (
    <header
      data-app-header
      className={cn("shrink-0 border-b border-border bg-background/95", className)}
    >
      <div className="flex h-13 items-center gap-2 px-3 md:px-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>
            Toggle sidebar <kbd className="ml-1 opacity-70">⌘B</kbd>
          </TooltipContent>
        </Tooltip>
        <span aria-hidden className="mx-1 hidden h-5 w-px bg-border md:block" />

        <div className="hidden items-center gap-2 md:flex">
          <FacilitySelect className="max-w-64" />
          <YearSelect />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={openCommand}
            className="hidden h-8 w-56 cursor-pointer items-center gap-2 rounded-lg border border-input bg-subtle px-2.5 text-[13px] text-muted-foreground outline-none transition-colors duration-150 hover:border-border-strong hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 lg:flex"
          >
            <Search className="size-4 shrink-0" aria-hidden />
            <span className="truncate">Search or jump to</span>
            <kbd className="ml-auto rounded border border-border bg-card px-1.5 text-[11px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </button>
          <Button variant="ghost" size="icon" aria-label="Search" className="lg:hidden" onClick={openCommand}>
            <Search />
          </Button>
          <AlertsButton />
          <ThemeButton />
        </div>
      </div>

      {/* on phones the scope controls get their own row */}
      <div className="flex items-center gap-2 border-t border-border px-3 py-2 md:hidden">
        <FacilitySelect className="min-w-0 flex-1" />
        <YearSelect />
      </div>
    </header>
  );
}
