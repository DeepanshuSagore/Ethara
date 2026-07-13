"use client";

import * as React from "react";
import { ErrorState } from "@/components/layout/error-state";

interface ErrorProps {
  error: Error & { digest?: string };
  /** Next 16.2 retry: re-fetches and re-renders the segment. */
  unstable_retry?: () => void;
  reset?: () => void;
}

export default function DashboardError({ error, unstable_retry, reset }: ErrorProps) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="Something went wrong"
      description="This screen failed to render. Try again — if it keeps happening, head back to the dashboard."
      detail={error.digest ? `Error digest: ${error.digest}` : error.message}
      onRetry={unstable_retry ?? reset}
      backHref="/"
      backLabel="Go to dashboard"
    />
  );
}
