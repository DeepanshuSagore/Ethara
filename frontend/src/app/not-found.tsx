import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-blueprint px-4 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Compass className="size-6" aria-hidden="true" />
      </span>
      <div className="space-y-2">
        <p className="font-mono text-xs font-medium tracking-wider text-muted-foreground">404</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          This seat doesn&apos;t exist
        </h1>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          The page you&apos;re looking for was moved, released, or never allocated.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild>
          <Link href="/">Back to dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/seats">Open the seat map</Link>
        </Button>
      </div>
    </div>
  );
}
