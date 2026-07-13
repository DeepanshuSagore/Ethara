"use client";

import { ThemeProvider } from "next-themes";
import { RoleProvider } from "@/lib/demo-role";
import { MockDataProvider } from "@/lib/mock/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <RoleProvider>
        <MockDataProvider>{children}</MockDataProvider>
      </RoleProvider>
    </ThemeProvider>
  );
}
