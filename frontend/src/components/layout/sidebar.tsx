"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Armchair, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { navItemsFor } from "@/lib/constants";
import { useRole } from "@/lib/demo-role";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate?: () => void;
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function Sidebar({ collapsed, onToggleCollapsed, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { role } = useRole();
  const navItems = navItemsFor(role);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-border px-4",
          collapsed && "justify-center px-2"
        )}
      >
        <Link
          href="/"
          onClick={onNavigate}
          className={cn("group flex items-center gap-2.5 rounded-lg", focusRing)}
          aria-label="Ethara home"
        >
          {/* Gradient brand mark — the one place the accent hues mix, so the
              chrome carries a signature without recoloring every control. */}
          <span className="ease-spring flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-accent-solid to-tone-violet text-white shadow-[0_2px_12px_-2px] shadow-accent-solid/50 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
            <Armchair className="size-4" aria-hidden="true" />
          </span>
          {!collapsed && (
            <span className="font-display text-lg font-semibold tracking-tight text-foreground">
              Ethara
            </span>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2" aria-label="Main navigation">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-[color,background-color,transform] duration-150 ease-out",
                    focusRing,
                    collapsed && "justify-center px-2",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-sidebar-foreground hover:translate-x-0.5 hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {/* Non-color active cue: 3px gradient rail with a soft glow
                      (grows in on route change). */}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="animate-rail-in absolute inset-y-2 left-0 w-0.75 rounded-full bg-linear-to-b from-accent-solid to-tone-cyan shadow-[0_0_8px] shadow-accent-solid/60"
                    />
                  )}
                  <item.icon
                    className="ease-spring size-4 shrink-0 transition-transform duration-300 group-hover:scale-110"
                    aria-hidden="true"
                  />
                  {/* Label stays in the accessibility tree when collapsed. */}
                  <span className={collapsed ? "sr-only" : "truncate"}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden shrink-0 border-t border-border p-2 lg:block">
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors duration-150 hover:bg-muted/60 hover:text-foreground",
            focusRing,
            collapsed && "justify-center px-2"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" aria-hidden="true" />
          ) : (
            <>
              <PanelLeftClose className="size-4" aria-hidden="true" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
