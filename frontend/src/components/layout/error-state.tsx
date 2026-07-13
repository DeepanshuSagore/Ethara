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

/** Shared body for the route error.tsx boundaries — matches the not-found cards. */
export function ErrorState({
  title,
  description,
  detail,
  onRetry,
  backHref,
  backLabel,
}: ErrorStateProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <EmptyState
          icon={AlertTriangle}
          iconWrapClassName="bg-destructive/10 text-destructive"
          title={title}
          description={description}
          action={
            <>
              {onRetry && (
                <Button onClick={onRetry}>
                  <RotateCcw /> Try again
                </Button>
              )}
              {backHref && (
                <Button asChild variant="outline">
                  <Link href={backHref}>{backLabel ?? "Go back"}</Link>
                </Button>
              )}
            </>
          }
        />
        {detail && (
          <p className="border-t border-border px-6 py-3 text-center font-mono text-xs text-muted-foreground">
            {detail}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
