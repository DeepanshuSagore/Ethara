"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { UserPlus } from "lucide-react";
import { AddJoinerDialog } from "@/components/employees/add-joiner-dialog";
import {
  DEFAULT_EMPLOYEE_FILTERS,
  EmployeeFilters,
  type EmployeeFilterState,
} from "@/components/employees/employee-filters";
import { EmployeeTable } from "@/components/employees/employee-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRole } from "@/lib/demo-role";
import { useMockData } from "@/lib/mock/store";
import { formatNumber } from "@/lib/utils";

// Phase 3 adds real pagination; for now cap the rendered rows.
const MAX_ROWS = 60;

export function EmployeesScreen() {
  const { employees } = useMockData();
  const { role } = useRole();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("query") ?? "";

  const [filters, setFilters] = React.useState<EmployeeFilterState>({
    ...DEFAULT_EMPLOYEE_FILTERS,
    search: initialQuery,
  });

  // Follow new global-search submissions from the Topbar (adjust-state-on-
  // prop-change pattern — setState during render, not in an effect).
  const [prevQuery, setPrevQuery] = React.useState(initialQuery);
  if (prevQuery !== initialQuery) {
    setPrevQuery(initialQuery);
    setFilters((prev) => ({ ...prev, search: initialQuery }));
  }

  const canManage = role === "Admin" || role === "HR";

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

  const visible = filtered.slice(0, MAX_ROWS);

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
        <EmployeeFilters filters={filters} onChange={setFilters} />

        <Card>
          <CardContent className="p-0">
            <EmployeeTable employees={visible} />
            <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
              {filtered.length === 0
                ? "No employees match your search — try different filters."
                : filtered.length > MAX_ROWS
                  ? `Showing first ${MAX_ROWS} of ${formatNumber(filtered.length)} matches — refine your search to narrow down.`
                  : `Showing ${formatNumber(filtered.length)} of ${formatNumber(employees.length)} employees.`}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
