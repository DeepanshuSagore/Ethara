"use client";

import * as React from "react";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationBar } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SEAT_STATUS_LABELS,
  SeatStatusBadge,
} from "@/components/seats/seat-status-badge";
import { useEmployee, type SeatIndex } from "@/lib/api/hooks";
import { ZONES } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/utils";
import type { Seat, SeatStatus } from "@/types";

const PAGE_SIZE = 25;
const STATUS_OPTIONS: SeatStatus[] = ["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"];

/** Visible label above each filter control (same recipe as EmployeeFilters). */
function FilterLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
      {children}
    </label>
  );
}

/** Lazy per-employee name — cached forever after the first page renders it. */
function OccupantCell({ employeeId }: { employeeId: number }) {
  const employee = useEmployee(employeeId);
  if (employee.isPending) return <Skeleton className="h-4 w-28" />;
  if (!employee.data) return <span className="text-muted-foreground">Unknown</span>;
  return (
    <Link
      href={`/employees/${employee.data.id}`}
      onClick={(e) => e.stopPropagation()}
      className="rounded-md font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {employee.data.name}
    </Link>
  );
}

interface SeatListProps {
  seats: Seat[];
  /** seat id → occupant's project name + tone (from the shared register). */
  seatMeta: Map<number, { name: string; tone: number }>;
  occupantBySeat: SeatIndex["occupantBySeat"];
  onSelect: (seat: Seat) => void;
}

/**
 * The seat inventory as a filterable table — the list modality for HR and
 * facilities work ("show me every reserved seat in Zone B") and the
 * screen-reader-friendly alternative to the map. Each row carries every
 * §3.3 field: seat, zone, bay, status, occupant, project, allocation date.
 * Rows open the same seat dialog the map uses.
 */
export function SeatListView({ seats, seatMeta, occupantBySeat, onSelect }: SeatListProps) {
  const [status, setStatus] = React.useState<"all" | SeatStatus>("all");
  const [zone, setZone] = React.useState<string>("all");
  const [page, setPage] = React.useState(1);

  const rows = React.useMemo(
    () =>
      seats.filter(
        (seat) =>
          (status === "all" || seat.status === status) &&
          (zone === "all" || seat.zone === zone)
      ),
    [seats, status, zone]
  );

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = rows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = (safePage - 1) * PAGE_SIZE + pageRows.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:max-w-md sm:grid-cols-[repeat(2,minmax(9rem,11rem))]">
        <div className="space-y-1.5">
          <FilterLabel htmlFor="seat-filter-status">Status</FilterLabel>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as "all" | SeatStatus);
              setPage(1);
            }}
          >
            <SelectTrigger id="seat-filter-status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {SEAT_STATUS_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <FilterLabel htmlFor="seat-filter-zone">Zone</FilterLabel>
          <Select
            value={zone}
            onValueChange={(value) => {
              setZone(value);
              setPage(1);
            }}
          >
            <SelectTrigger id="seat-filter-zone">
              <SelectValue placeholder="All zones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All zones</SelectItem>
              {ZONES.map((z) => (
                <SelectItem key={z} value={z}>
                  Zone {z}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {pageRows.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No seats match"
              description="Nothing on this floor matches the current status and zone filters."
            />
          ) : (
            <>
              <Table aria-label="Seats" className="min-w-160 md:min-w-4xl">
                <TableHeader>
                  <TableRow>
                    <TableHead>Seat</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Bay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Occupant</TableHead>
                    <TableHead className="hidden md:table-cell">Project</TableHead>
                    <TableHead className="hidden lg:table-cell">Allocated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((seat) => {
                    const occupant = occupantBySeat.get(seat.id);
                    const meta = seatMeta.get(seat.id);
                    return (
                      <TableRow
                        key={seat.id}
                        className="cursor-pointer"
                        onClick={() => {
                          if (window.getSelection()?.toString()) return;
                          onSelect(seat);
                        }}
                      >
                        <TableCell>
                          {/* Keyboard path into the dialog; data-seat-id lets
                              the dialog's close return focus here. */}
                          <button
                            type="button"
                            data-seat-id={seat.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelect(seat);
                            }}
                            className="text-metric cursor-pointer rounded-md font-mono text-xs font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            {seat.seat_code}
                          </button>
                        </TableCell>
                        <TableCell>{seat.zone}</TableCell>
                        <TableCell className="text-metric font-mono text-xs text-muted-foreground">
                          {seat.bay}
                        </TableCell>
                        <TableCell>
                          <SeatStatusBadge status={seat.status} />
                        </TableCell>
                        <TableCell>
                          {occupant ? (
                            <OccupantCell employeeId={occupant.employeeId} />
                          ) : (
                            <span className="text-muted-foreground">
                              {seat.status === "AVAILABLE" ? "Free" : "Blocked"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {meta?.name ?? ""}
                        </TableCell>
                        <TableCell className="text-metric hidden font-mono text-xs text-muted-foreground lg:table-cell">
                          {occupant ? formatDate(occupant.allocation.allocation_date) : ""}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <PaginationBar
                page={safePage}
                pageCount={pageCount}
                onPageChange={setPage}
                summary={`Showing ${formatNumber(rangeStart)}-${formatNumber(rangeEnd)} of ${formatNumber(rows.length)} seats`}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
