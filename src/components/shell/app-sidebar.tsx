"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, FileText, FlaskConical, LayoutDashboard, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ORGANIZATION } from "@/lib/seed/facilities";
import { useInventoryRows } from "@/lib/store";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { AboutPrototype } from "./about-prototype";
import { LogoMark } from "./logo";
import { useAlerts } from "./use-alerts";
import { UserMenu } from "./user-menu";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/inventory", label: "Chemical inventory", icon: FlaskConical },
  { href: "/sds", label: "Safety data sheets", icon: FileText },
  { href: "/reports", label: "Regulatory reports", icon: ClipboardCheck },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function Count({ value, tone }: { value: number; tone?: "critical" }) {
  if (!value) return null;
  return (
    <SidebarMenuBadge
      className={cn(
        "tabular",
        tone === "critical" &&
          "rounded-md bg-critical-bg px-1.5 text-critical peer-data-active/menu-button:text-critical",
      )}
    >
      {value}
    </SidebarMenuBadge>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const rows = useInventoryRows();
  const { sdsCount, reportsOpen } = useAlerts();

  const counts: Record<string, React.ReactNode> = {
    "/inventory": <Count value={rows.length} />,
    "/sds": <Count value={sdsCount} tone="critical" />,
    "/reports": <Count value={reportsOpen} />,
  };

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Carboy" className="hover:bg-transparent active:bg-transparent">
              <Link href="/" onClick={() => isMobile && setOpenMobile(false)}>
                <LogoMark className="size-8 shrink-0" />
                <span className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">Carboy</span>
                  <span className="truncate text-xs text-muted-foreground">{ORGANIZATION.name}</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {NAV.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={cn(
                        "h-9 text-[13.5px] transition-colors duration-150",
                        "data-active:bg-card data-active:font-medium data-active:shadow-[0_0_0_1px_var(--sidebar-border)]",
                      )}
                    >
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => isMobile && setOpenMobile(false)}
                      >
                        <item.icon className={cn(active ? "text-brand" : "text-muted-foreground")} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {counts[item.href]}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2">
        <AboutPrototype />
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
