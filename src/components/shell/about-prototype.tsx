"use client";

import * as React from "react";
import {
  Bot,
  ClipboardCheck,
  Database,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Layers,
  MessagesSquare,
  Plug,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

// What this prototype contains today, and what can be added on top of it.

const BUILT: { icon: LucideIcon; title: string; points: string[] }[] = [
  {
    icon: LayoutDashboard,
    title: "Overview",
    points: [
      "Tier II filing status for every facility, with days left",
      "Key figures compared with the previous reporting year",
      "Charts for hazard classes, quantity by year and SDS age",
      "SDS alerts and a live activity feed",
    ],
  },
  {
    icon: FlaskConical,
    title: "Chemical inventory",
    points: [
      "Facility and year filters, search by name, CAS or location",
      "Filters for hazard class, state, reporting and SDS status",
      "Detail view: hazards, quantities, storage locations, ingredients",
      "Add and edit forms, bulk actions, CSV export",
    ],
  },
  {
    icon: FileText,
    title: "Safety data sheets",
    points: [
      "Automatic flag once a revision is over five years old",
      "Version history for every document",
      "Upload a new version or request one from the manufacturer",
      "Age timeline of the whole library",
    ],
  },
  {
    icon: ClipboardCheck,
    title: "Regulatory reports",
    points: [
      "Facility, year and report type selection",
      "Tier II report preview built from the inventory",
      "Checklist of what blocks a filing",
      "Filing workflow, print to PDF and CSV export",
    ],
  },
];

const NEXT: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Bot,
    title: "MCP server or API wrapper",
    text: "Connect an AI agent to the platform so it can read the database efficiently, answer questions about any facility and make changes inside set limits.",
  },
  {
    icon: MessagesSquare,
    title: "Slack bots by role",
    text: "People at different levels add and edit records from Slack. Every change carries its author's name, so the history stays transparent.",
  },
  {
    icon: Plug,
    title: "Connections to your tools",
    text: "Sync with Airtable, Attio, an ERP or purchasing, so deliveries and stock counts update the inventory without retyping.",
  },
  {
    icon: Database,
    title: "Real backend",
    text: "Database, sign-in, roles per facility, and file storage for the SDS documents themselves.",
  },
  {
    icon: ShieldCheck,
    title: "Reminders and audit trail",
    text: "Email or Slack reminders before an SDS reaches five years and before a filing is due, with a full log of who changed what.",
  },
];

export function AboutPrototype() {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <SidebarMenu>
        <SidebarMenuItem>
          <DialogTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip="About this prototype"
              className="h-auto items-start gap-2.5 rounded-lg border border-sidebar-border bg-card px-2.5 py-2.5 transition-colors duration-150 hover:border-border-strong hover:bg-card group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand-bg text-brand">
                <Layers className="size-4" />
              </span>
              <span className="grid min-w-0 gap-0.5 text-left group-data-[collapsible=icon]:hidden">
                <span className="text-[13px] leading-5 font-medium text-foreground">About this prototype</span>
                <span className="text-xs leading-4 whitespace-normal text-muted-foreground">
                  What is in it now and what can be added
                </span>
              </span>
            </SidebarMenuButton>
          </DialogTrigger>
        </SidebarMenuItem>
      </SidebarMenu>

      <DialogContent className="max-h-[min(88svh,760px)] gap-0 overflow-hidden p-0 sm:max-w-[760px]">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="text-base">About this prototype</DialogTitle>
          <DialogDescription>
            Four connected screens on sample data. Nothing is saved to a server: changes you make stay in this
            browser tab until you reload.
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-thin grid gap-6 overflow-y-auto px-5 py-5">
          <section>
            <h3 className="text-sm font-semibold">In the prototype now</h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {BUILT.map((b) => (
                <li key={b.title} className="rounded-lg border border-border p-3.5">
                  <p className="flex items-center gap-2 text-[13.5px] font-medium">
                    <b.icon className="size-4 text-muted-foreground" aria-hidden />
                    {b.title}
                  </p>
                  <ul className="mt-2 grid gap-1 text-[13px] leading-5 text-muted-foreground">
                    {b.points.map((p) => (
                      <li key={p} className="flex gap-2">
                        <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-border-strong" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] text-muted-foreground">
              Also in every screen: search with Cmd K, light and dark themes, and layouts for phones and tablets.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Can be added</h3>
            <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
              {NEXT.map((n) => (
                <li key={n.title} className="flex gap-3 p-3.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-subtle text-muted-foreground">
                    <n.icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-medium">{n.title}</span>
                    <span className="block text-[13px] leading-5 text-muted-foreground">{n.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
