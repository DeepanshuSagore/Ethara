"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ErrorState } from "@/components/layout/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
}

export default function ProjectDetailError({ error, unstable_retry, reset }: ErrorProps) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  // Keep the page's h1 in the boundary so the heading outline never breaks,
  // and keep the one back-to-projects treatment (ghost/sm with ArrowLeft).
  return (
    <>
      <PageHeader
        title="Project"
        description="Headcount, seats and team members for this project."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/projects">
              <ArrowLeft /> All projects
            </Link>
          </Button>
        }
      />
      <ErrorState
        title="Couldn't load this project"
        description="The project page failed to render. Try again, or head back to all projects."
        detail={error.digest ? `Error digest: ${error.digest}` : error.message}
        onRetry={unstable_retry ?? reset}
      />
    </>
  );
}
