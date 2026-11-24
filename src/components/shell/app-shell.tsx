"use client";

import * as React from "react";
import { Suspense } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { CommandMenu } from "./command-menu";
import { LogoMark } from "./logo";

// The prototype has no server data: everything comes from the in-memory store
// and from today's date. So the app renders in the browser only, after mount.
// That keeps "today" honest (SDS ages are computed live) with no mismatch
// between a server render and the browser.

function useMounted() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted;
}

function BootScreen() {
  return (
    <div className="grid h-svh place-items-center bg-sidebar">
      <div className="flex flex-col items-center gap-3">
        <LogoMark className="size-9 animate-pulse" />
        <p className="text-[13px] text-muted-foreground">Loading Carboy</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const mounted = useMounted();
  if (!mounted) return <BootScreen />;
  return (
    <SidebarProvider
      // tablets start with the icon rail so the content gets the width
      defaultOpen={typeof window === "undefined" || window.matchMedia("(min-width: 1100px)").matches}
      className="h-svh overflow-hidden"
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-hidden md:border md:border-sidebar-border md:peer-data-[variant=inset]:shadow-none">
        <AppHeader />
        <div id="main" data-scroll-root tabIndex={-1} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto outline-none">
          <Suspense fallback={null}>{children}</Suspense>
        </div>
      </SidebarInset>
      <CommandMenu />
    </SidebarProvider>
  );
}
