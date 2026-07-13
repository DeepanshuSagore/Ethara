"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationBarProps {
  /** 1-based current page (already clamped by the caller). */
  page: number;
  pageCount: number;
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
  onPageChange,
  summary,
  className,
}: PaginationBarProps) {
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

      {pageCount > 1 && (
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
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
          >
            Next <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}
