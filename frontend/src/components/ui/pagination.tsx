"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationBarProps {
  /** 1-based current page (already clamped by the caller). */
  page: number;
  /** Total pages — pass when the full result set is known client-side. */
  pageCount?: number;
  /**
   * Server-side (limit/offset) mode: whether another page exists. The API's
   * list endpoints return no total count, so pass hasNext instead of
   * pageCount and the label degrades from "Page N of M" to "Page N".
   */
  hasNext?: boolean;
  onPageChange: (page: number) => void;
  /** Result-count line, e.g. "Showing 1–25 of 244 employees". */
  summary: string;
  className?: string;
}

/**
 * Table footer with a live result count and prev/next paging. The nav hides
 * itself when everything fits on one page, leaving just the count line.
 */
export function PaginationBar({
  page,
  pageCount,
  hasNext,
  onPageChange,
  summary,
  className,
}: PaginationBarProps) {
  const showNav = pageCount !== undefined ? pageCount > 1 : page > 1 || hasNext === true;
  const nextDisabled = pageCount !== undefined ? page >= pageCount : !hasNext;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p role="status" className="text-sm text-muted-foreground">
        {summary}
      </p>

      {showNav && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft /> Prev
          </Button>
          <span className="text-metric whitespace-nowrap text-sm text-muted-foreground">
            {pageCount !== undefined ? `Page ${page} of ${pageCount}` : `Page ${page}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={nextDisabled}
            aria-label="Next page"
          >
            Next <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}
