"use client";

import { ChevronsUpDown, Keyboard, Monitor, Moon, RotateCcw, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { CURRENT_USER } from "@/lib/seed/facilities";
import { useAppStore } from "@/lib/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

export function UserAvatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-[13px] font-semibold tracking-wide text-primary-foreground ${className ?? ""}`}
    >
      {initials}
    </span>
  );
}

export function UserMenu() {
  const { isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const resetDemo = useAppStore((s) => s.resetDemo);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={CURRENT_USER.name}
              className="h-auto gap-2.5 rounded-lg px-2 py-2 transition-colors duration-150 data-[state=open]:bg-sidebar-accent group-data-[collapsible=icon]:p-0!"
            >
              <UserAvatar initials={CURRENT_USER.initials} />
              <span className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-medium text-foreground">{CURRENT_USER.name}</span>
                <span className="truncate text-[13px] text-muted-foreground">{CURRENT_USER.title}</span>
              </span>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? "top" : "right"}
            align="end"
            sideOffset={8}
            className="w-60"
          >
            <DropdownMenuLabel className="font-normal">
              <span className="block text-sm font-medium text-foreground">{CURRENT_USER.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{CURRENT_USER.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Appearance</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="light">
                <Sun /> Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon /> Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <Monitor /> Match system
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onSelect={() => document.dispatchEvent(new CustomEvent("carboy:open-command"))}
              >
                <Keyboard /> Search and shortcuts
                <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  resetDemo();
                  toast.success("Sample data reset", { description: "Everything is back to its starting state." });
                }}
              >
                <RotateCcw /> Reset sample data
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
