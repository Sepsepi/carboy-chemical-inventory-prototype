import Link from "next/link";
import { LogoMark } from "@/components/shell/logo";

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center bg-sidebar px-6">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <LogoMark className="size-9" />
        <h1 className="text-xl font-semibold tracking-[-0.01em]">This page is not in Carboy</h1>
        <p className="text-sm text-muted-foreground">
          The address may be mistyped, or the screen is not part of this prototype.
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/85 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Go to the overview
        </Link>
      </div>
    </main>
  );
}
