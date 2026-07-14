"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface TopbarProps {
  onOpenMobileNav: () => void;
}

export function Topbar({ onOpenMobileNav }: TopbarProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  // Client-only constant: null on the server (kbd hint hidden in SSR HTML),
  // resolved from the real platform after hydration.
  const isMac = React.useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => null
  );
  const shortcutKey = isMac === null ? null : isMac ? "⌘K" : "Ctrl K";

  React.useEffect(() => {
    // ⌘K / Ctrl+K anywhere, or "/" outside editable fields, jumps to search.
    const onKeyDown = (event: KeyboardEvent) => {
      const isCommandK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      const isSlash =
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !(event.target instanceof HTMLElement &&
          event.target.closest("input, textarea, select, [contenteditable]"));
      if (!isCommandK && !isSlash) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/employees?query=${encodeURIComponent(trimmed)}` : "/employees");
  };

  return (
    // Frosted glass over the ambient wash — translucent bg + blur gives the
    // chrome depth without a second surface color.
    <header className="relative flex h-16 shrink-0 items-center gap-2 border-b border-border/70 bg-background/70 px-4 backdrop-blur-xl sm:gap-3 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation menu"
      >
        <Menu aria-hidden="true" />
      </Button>

      {/* <sm: the search field collapses to an icon-only shortcut into the
          directory instead of showing a truncated placeholder. */}
      <Button asChild variant="ghost" size="icon" className="sm:hidden" aria-label="Search employees">
        <Link href="/employees">
          <Search aria-hidden="true" />
        </Link>
      </Button>

      <form
        onSubmit={handleSubmit}
        role="search"
        className="relative hidden w-full min-w-0 max-w-sm sm:block"
      >
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search employees…"
          className="pl-9 md:pr-14"
          aria-label="Search employees"
          aria-keyshortcuts="Control+K Meta+K /"
        />
        {shortcutKey && (
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground md:block"
          >
            {shortcutKey}
          </kbd>
        )}
      </form>

      <div className="ml-auto flex items-center gap-2">
        <RoleSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
