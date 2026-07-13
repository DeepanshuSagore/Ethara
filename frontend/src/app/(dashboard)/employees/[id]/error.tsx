"use client";

import * as React from "react";
import { ErrorState } from "@/components/layout/error-state";

interface ErrorProps {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
}

export default function EmployeeDetailError({ error, unstable_retry, reset }: ErrorProps) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="Couldn't load this employee"
      description="The employee profile failed to render. Try again, or go back to the directory."
      detail={error.digest ? `Error digest: ${error.digest}` : error.message}
      onRetry={unstable_retry ?? reset}
      backHref="/employees"
      backLabel="Back to employees"
    />
  );
}
