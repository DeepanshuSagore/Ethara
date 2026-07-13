"use client";

import { ThemeProvider } from "next-themes";
import { RoleProvider } from "@/lib/demo-role";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <RoleProvider>{children}</RoleProvider>
    </ThemeProvider>
  );
}
