"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, FileText, FlaskConical, Moon, RotateCcw, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Command,
  CommandShortcut,
} from "@/components/ui/command";
import { NAV } from "./app-sidebar";

/** Search everything and jump anywhere. Opens with Cmd/Ctrl K or the "/" key. */
export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const products = useAppStore((s) => s.products);
  const facilities = useAppStore((s) => s.facilities);
  const setFacility = useAppStore((s) => s.setFacility);
  const resetDemo = useAppStore((s) => s.resetDemo);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    document.addEventListener("carboy:open-command", onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("carboy:open-command", onOpen);
    };
  }, []);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search Carboy"
      description="Find a chemical, a facility or a screen"
      className="sm:max-w-xl"
    >
      <Command>
        <CommandInput placeholder="Search chemicals, CAS numbers, facilities..." />
        <CommandList className="max-h-[min(60vh,420px)]">
          <CommandEmpty>Nothing found. Try a product name or a CAS number.</CommandEmpty>
          <CommandGroup heading="Go to">
            {NAV.map((item) => (
              <CommandItem key={item.href} value={`go ${item.label}`} onSelect={() => run(() => router.push(item.href))}>
                <item.icon />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Facilities">
            {facilities.map((f) => (
              <CommandItem
                key={f.id}
                value={`facility ${f.name} ${f.code} ${f.city}`}
                onSelect={() =>
                  run(() => {
                    setFacility(f.id);
                    router.push("/inventory");
                  })
                }
              >
                <Building2 />
                {f.name}
                <CommandShortcut className="ident">{f.code}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Chemicals">
            {products.map((p) => (
              <CommandItem
                key={p.id}
                value={`${p.name} ${p.manufacturer} ${p.ingredients.map((i) => `${i.name} ${i.cas}`).join(" ")}`}
                onSelect={() => run(() => router.push(`/inventory?product=${p.id}`))}
              >
                <FlaskConical />
                <span className="truncate">{p.name}</span>
                <span className="truncate text-xs text-muted-foreground">{p.manufacturer}</span>
                <CommandShortcut className="ident">{p.ingredients[0]?.cas}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Safety data sheets">
            <CommandItem value="sds over five years expired" onSelect={() => run(() => router.push("/sds?status=expired"))}>
              <FileText />
              Show SDS older than five years
            </CommandItem>
            <CommandItem value="sds missing" onSelect={() => run(() => router.push("/sds?status=missing"))}>
              <FileText />
              Show chemicals with no SDS on file
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem
              value="toggle theme dark light"
              onSelect={() => run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}
            >
              {resolvedTheme === "dark" ? <Sun /> : <Moon />}
              Switch to {resolvedTheme === "dark" ? "light" : "dark"} theme
            </CommandItem>
            <CommandItem
              value="reset sample data"
              onSelect={() =>
                run(() => {
                  resetDemo();
                  toast.success("Sample data reset");
                })
              }
            >
              <RotateCcw />
              Reset sample data
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
