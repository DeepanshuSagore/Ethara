"use client";

import * as React from "react";
import { DEFAULT_ROLE, ROLES, type Role } from "@/lib/constants";

const STORAGE_KEY = "ethara-demo-role";

/**
 * localStorage-backed role store, read via useSyncExternalStore: the server
 * snapshot is DEFAULT_ROLE (so SSR and hydration always agree) and the client
 * snapshot re-reads localStorage after hydration — persistence without a
 * setState-in-effect and without a hydration mismatch.
 */
const listeners = new Set<() => void>();

function readStoredRole(): Role {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored && (ROLES as readonly string[]).includes(stored)
    ? (stored as Role)
    : DEFAULT_ROLE;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Follow role switches made in other tabs too.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function writeStoredRole(role: Role) {
  window.localStorage.setItem(STORAGE_KEY, role);
  listeners.forEach((notify) => notify());
}

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = React.createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const role = React.useSyncExternalStore(subscribe, readStoredRole, () => DEFAULT_ROLE);
  const setRole = React.useCallback((next: Role) => writeStoredRole(next), []);

  const value = React.useMemo(() => ({ role, setRole }), [role, setRole]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = React.useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within a RoleProvider");
  return ctx;
}
