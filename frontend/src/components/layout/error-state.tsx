"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface ErrorStateProps {
  title: string;
  description: string;
  /** error.digest (or message) shown in small mono text for bug reports. */
  detail?: string;
  onRetry?: () => void;
  backHref?: string;
  backLabel?: string;
}

/** Shared body for query failures and the route error.tsx boundaries. */
export function ErrorState({
  title,
  description,
  detail,
  onRetry,
  backHref,
  backLabel,
}: ErrorStateProps) {
  return (
    // role="alert" announces the async swap from content/skeleton to error.
    <Card role="alert">
      <CardContent className="p-0">
        <EmptyState
          icon={AlertTriangle}
          iconWrapClassName="bg-destructive-soft text-destructive-strong"
          title={title}
          description={description}
          action={
            <>
              {onRetry && (
                <Button variant="outline" onClick={onRetry}>
                  <RotateCcw aria-hidden="true" /> Try again
                </Button>
              )}
              {backHref && (
                <Button asChild variant="ghost">
                  <Link href={backHref}>{backLabel ?? "Go back"}</Link>
                </Button>
              )}
            </>
          }
        />
        {detail && (
          <p className="wrap-break-word border-t border-border px-6 py-3 text-center font-mono text-xs text-muted-foreground">
            {detail}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
