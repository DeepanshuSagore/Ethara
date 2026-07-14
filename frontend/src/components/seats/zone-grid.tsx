"use client";

import * as React from "react";
import { SeatCell } from "@/components/seats/seat-cell";
import type { Seat, SeatStatus } from "@/types";

/** How cells are colored: by seat status, or by the occupant's project. */
export type MapLens = "status" | "project";

export interface ZoneGridProps {
  zone: string;
  /** Bay entries sorted by bay number; each row holds that bay's seats. */
  bays: [number, Seat[]][];
  lens: MapLens;
  /** Status-lens focus mode: dim every seat whose status doesn't match. */
  spotlight: SeatStatus | null;
  /** seat id → occupant's project name + tone (occupied seats only). */
  seatMeta: Map<number, { name: string; tone: number }>;
  selectedSeatId: number | null;
  onSelect: (seat: Seat) => void;
}

/**
 * Roving-tabindex grid (WAI-ARIA grid pattern): one tab stop per zone, arrow
 * keys move seat focus (left/right within a bay row, up/down across bays),
 * Home/End jump within the row, and Enter/Space keep the native button
 * activation that opens the seat dialog. Below md the whole bay list scrolls
 * horizontally so every bay stays one 7-across line.
 *
 * Shared by the Seats page and the project allocation dialog's seat picker,
 * so both surfaces keep identical keyboard and visual behavior.
 */
export function ZoneGrid({ zone, bays, lens, spotlight, seatMeta, selectedSeatId, onSelect }: ZoneGridProps) {
  const [pos, setPos] = React.useState<[number, number]>([0, 0]);
  const cellRefs = React.useRef(new Map<string, HTMLButtonElement>());

  // Clamp against the current data so a refetch can never strand the tab stop.
  const focusRow = Math.min(pos[0], bays.length - 1);
  const focusCol = Math.min(pos[1], bays[focusRow][1].length - 1);

  const focusCell = (row: number, col: number) => {
    const cell = cellRefs.current.get(`${row}:${col}`);
    if (!cell) return;
    setPos([row, col]);
    cell.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    let next: [number, number] | null = null;
    switch (event.key) {
      case "ArrowRight":
        next = [focusRow, Math.min(focusCol + 1, bays[focusRow][1].length - 1)];
        break;
      case "ArrowLeft":
        next = [focusRow, Math.max(focusCol - 1, 0)];
        break;
      case "ArrowDown": {
        const row = Math.min(focusRow + 1, bays.length - 1);
        next = [row, Math.min(focusCol, bays[row][1].length - 1)];
        break;
      }
      case "ArrowUp": {
        const row = Math.max(focusRow - 1, 0);
        next = [row, Math.min(focusCol, bays[row][1].length - 1)];
        break;
      }
      case "Home":
        next = [focusRow, 0];
        break;
      case "End":
        next = [focusRow, bays[focusRow][1].length - 1];
        break;
      default:
        return;
    }
    event.preventDefault();
    focusCell(next[0], next[1]);
  };

  return (
    // p-1/-m-1 gives focus rings room to draw inside the scroll clip;
    // stagger-children rises the bay rows in on mount/floor switch.
    <div
      role="grid"
      aria-label={`Zone ${zone} seat map`}
      onKeyDown={handleKeyDown}
      className="stagger-children -m-1 space-y-3 overflow-x-auto p-1"
    >
      {bays.map(([bay, baySeats], rowIndex) => (
        <div key={bay} role="row" className="flex w-max min-w-full items-center gap-3">
          <span
            role="rowheader"
            className="sticky left-0 z-10 flex w-12 shrink-0 items-center self-stretch bg-card text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Bay {bay}
          </span>
          <div role="presentation" className="flex gap-2 md:gap-1.5">
            {baySeats.map((seat, colIndex) => {
              const meta = seatMeta.get(seat.id);
              return (
                <span key={seat.id} role="gridcell">
                  <SeatCell
                    seat={seat}
                    onSelect={onSelect}
                    projectName={meta?.name}
                    projectTone={lens === "project" ? (meta?.tone ?? null) : null}
                    dimmed={
                      lens === "project"
                        ? seat.status === "RESERVED" || seat.status === "MAINTENANCE"
                        : spotlight != null && seat.status !== spotlight
                    }
                    isOpen={selectedSeatId === seat.id}
                    tabIndex={focusRow === rowIndex && focusCol === colIndex ? 0 : -1}
                    onFocus={() => setPos([rowIndex, colIndex])}
                    ref={(el) => {
                      const key = `${rowIndex}:${colIndex}`;
                      if (el) cellRefs.current.set(key, el);
                      else cellRefs.current.delete(key);
                    }}
                  />
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
