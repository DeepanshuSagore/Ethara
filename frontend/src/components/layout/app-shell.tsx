"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * App frame. Layout contract (other screens depend on it):
 * - the shell is an h-dvh flex row; the sidebar column is fixed-height;
 * - <main> is the ONLY page scroll container (flex-1 overflow-y-auto
 *   bg-blueprint) and its content wrapper is `flex min-h-full flex-col`
 *   so full-height screens (assistant) can flex to the bottom.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Close the drawer if the viewport grows past lg, so Radix's scroll lock
  // and focus trap don't linger invisibly behind the desktop sidebar.
  React.useEffect(() => {
    if (!mobileOpen) return;
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mql.matches) setMobileOpen(false);
    };
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [mobileOpen]);

  return (
    <div className="flex h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Skip to content
      </a>

      {/* Desktop sidebar — fixed-height column, never scrolls the page. */}
      <aside
        className={cn(
          // Width tween is a deliberate one-shot layout animation (200ms on
          // user action) — reduced-motion collapses it globally.
          "hidden h-full shrink-0 border-r border-border transition-[width] duration-200 ease-out lg:block",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((c) => !c)} />
      </aside>

      {/* Mobile drawer — Radix Dialog gives us the focus trap, focus restore,
          Esc-to-close and body scroll lock natively. */}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogPortal>
          <DialogOverlay className="lg:hidden" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              // The opener lives in the Topbar, not a DialogTrigger, so Radix
              // has nothing to restore focus to — send it back ourselves.
              const opener = document.querySelector<HTMLButtonElement>(
                '[aria-label="Open navigation menu"]'
              );
              if (opener) {
                event.preventDefault();
                opener.focus();
              }
            }}
            className="fixed inset-y-0 left-0 z-50 w-60 border-r border-border bg-sidebar shadow-overlay outline-none data-[state=open]:animate-in data-[state=closed]:animate-fade-out lg:hidden"
          >
            <DialogTitle className="sr-only">Navigation menu</DialogTitle>
            <Sidebar
              collapsed={false}
              onToggleCollapsed={() => {}}
              onNavigate={() => setMobileOpen(false)}
            />
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-3"
                aria-label="Close navigation menu"
              >
                <X aria-hidden="true" />
              </Button>
            </DialogClose>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* Main column */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
        <main id="main-content" className="flex-1 overflow-y-auto bg-blueprint">
          <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
