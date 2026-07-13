"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { SearchX, UserPlus } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationBar } from "@/components/ui/pagination";
import { useRole } from "@/lib/demo-role";
import { useMockData } from "@/lib/mock/store";
import { formatNumber } from "@/lib/utils";

const PAGE_SIZE = 25;

export function EmployeesScreen() {
  const { employees } = useMockData();
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
    setPage(1);
  };

  const filtered = React.useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return employees.filter((employee) => {
      if (
        query &&
        ![employee.name, employee.employee_code, employee.email].some((field) =>
          field.toLowerCase().includes(query)
        )
      ) {
        return false;
      }
      if (filters.department !== "all" && employee.department !== filters.department) return false;
      if (filters.projectId !== "all" && String(employee.project_id) !== filters.projectId)
        return false;
      if (filters.status !== "all" && employee.status !== filters.status) return false;
      return true;
    });
  }, [employees, filters]);

  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => a[sort.key].localeCompare(b[sort.key]) * factor);
  }, [filtered, sort]);

  // Clamp rather than reset so releasing a filter never strands the user
  // on a page that no longer exists.
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const rangeStart = (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, sorted.length);
  const summary =
    sorted.length === employees.length
      ? `Showing ${rangeStart}–${rangeEnd} of ${formatNumber(employees.length)} employees`
      : `Showing ${rangeStart}–${rangeEnd} of ${formatNumber(sorted.length)} matches (${formatNumber(employees.length)} employees total)`;

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
            {sorted.length === 0 ? (
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
                  page={safePage}
                  pageCount={pageCount}
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
