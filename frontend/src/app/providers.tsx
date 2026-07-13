"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { RoleProvider } from "@/lib/demo-role";

export function Providers({ children }: { children: React.ReactNode }) {
  // One client per app instance (useState, not module scope, so a server
  // render never shares cache between requests).
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <RoleProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </RoleProvider>
    </ThemeProvider>
  );
}
