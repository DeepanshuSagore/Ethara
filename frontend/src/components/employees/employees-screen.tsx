"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, RotateCcw, SearchX, UserPlus } from "lucide-react";
import { AddJoinerDialog } from "@/components/employees/add-joiner-dialog";
import {
  ActiveFilterChips,
  countActiveFilters,
  DEFAULT_EMPLOYEE_FILTERS,
  EmployeeFilters,
  type EmployeeFilterState,
} from "@/components/employees/employee-filters";
import {
  EmployeeTable,
  type EmployeeSort,
  type EmployeeSortKey,
} from "@/components/employees/employee-table";
import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/layout/skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationBar } from "@/components/ui/pagination";
import { errorMessage } from "@/lib/api/client";
import type { EmployeeListParams } from "@/lib/api/employees";
import { useEmployees } from "@/lib/api/hooks";
import { useRole } from "@/lib/demo-role";
import { formatNumber } from "@/lib/utils";
import type { EmployeeStatus } from "@/types";

const PAGE_SIZE = 25;

export function EmployeesScreen() {
  const { role } = useRole();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("query") ?? "";

  const [filters, setFilters] = React.useState<EmployeeFilterState>({
    ...DEFAULT_EMPLOYEE_FILTERS,
    search: initialQuery,
  });
  const [sort, setSort] = React.useState<EmployeeSort | null>(null);
  const [page, setPage] = React.useState(1);

  // Follow new global-search submissions from the Topbar (adjust-state-on-
  // prop-change pattern — setState during render, not in an effect).
  const [prevQuery, setPrevQuery] = React.useState(initialQuery);
  if (prevQuery !== initialQuery) {
    setPrevQuery(initialQuery);
    setFilters((prev) => ({ ...prev, search: initialQuery }));
    setPage(1);
  }

  // Defer the search term so fast typing doesn't fire a request per keystroke;
  // keepPreviousData in useEmployees keeps the last results visible meanwhile.
  const search = React.useDeferredValue(filters.search.trim());

  // Filtering runs server-side over all 5,000 rows; one extra row tells us
  // whether a next page exists (the API returns no total count).
  const params: EmployeeListParams = {
    search: search || undefined,
    department: filters.department !== "all" ? filters.department : undefined,
    project_id: filters.projectId !== "all" ? Number(filters.projectId) : undefined,
    status: filters.status !== "all" ? (filters.status as EmployeeStatus) : undefined,
    limit: PAGE_SIZE + 1,
    offset: (page - 1) * PAGE_SIZE,
  };
  const employeesQuery = useEmployees(params);

  const canManage = role === "Admin" || role === "HR";

  const updateFilters = (next: EmployeeFilterState) => {
    setFilters(next);
    setPage(1);
  };

  const toggleSort = (key: EmployeeSortKey) => {
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  const hasNext = (employeesQuery.data?.length ?? 0) > PAGE_SIZE;
  const pageRows = React.useMemo(() => {
    const rows = (employeesQuery.data ?? []).slice(0, PAGE_SIZE);
    if (!sort) return rows;
    const factor = sort.dir === "asc" ? 1 : -1;
    // The API pages by id and has no sort param, so sorting reorders the
    // current page only.
    return [...rows].sort((a, b) => a[sort.key].localeCompare(b[sort.key]) * factor);
  }, [employeesQuery.data, sort]);

  const rangeStart = (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = (page - 1) * PAGE_SIZE + pageRows.length;
  // Total is only knowable on the last page (no count endpoint).
  const summary = hasNext
    ? `Showing ${formatNumber(rangeStart)}–${formatNumber(rangeEnd)} employees`
    : `Showing ${formatNumber(rangeStart)}–${formatNumber(rangeEnd)} of ${formatNumber(rangeEnd)} matches`;

  const activeFilterCount = countActiveFilters(filters);

  return (
    <>
      <PageHeader
        title="Employees"
        description="Directory of all employees with search, filters and seat status."
        actions={
          canManage ? (
            <AddJoinerDialog>
              <Button>
                <UserPlus /> Add employee
              </Button>
            </AddJoinerDialog>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <EmployeeFilters filters={filters} onChange={updateFilters} />
        <ActiveFilterChips filters={filters} onChange={updateFilters} />

        <Card>
          <CardContent className="p-0">
            {employeesQuery.isError ? (
              <EmptyState
                icon={AlertTriangle}
                iconWrapClassName="bg-destructive/10 text-destructive"
                title="Could not load employees"
                description={`The Ethara API did not respond — ${errorMessage(employeesQuery.error)}`}
                action={
                  <Button onClick={() => employeesQuery.refetch()}>
                    <RotateCcw /> Try again
                  </Button>
                }
              />
            ) : employeesQuery.isPending ? (
              <TableSkeleton rows={10} columns={7} />
            ) : pageRows.length === 0 && page === 1 ? (
              <EmptyState
                icon={SearchX}
                title="No employees found"
                description={
                  activeFilterCount > 0
                    ? "Nothing in the directory matches the current search and filters."
                    : "The directory is empty — add an employee to get started."
                }
                action={
                  activeFilterCount > 0 ? (
                    <Button variant="outline" onClick={() => updateFilters(DEFAULT_EMPLOYEE_FILTERS)}>
                      Clear all filters
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <EmployeeTable employees={pageRows} sort={sort} onSortChange={toggleSort} />
                <PaginationBar
                  page={page}
                  hasNext={hasNext}
                  onPageChange={setPage}
                  summary={summary}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
