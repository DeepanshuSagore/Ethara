"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  CircleCheck,
  List,
  Loader2,
  Map as MapIcon,
  MapPin,
  RotateCcw,
  Search,
  UserPlus,
} from "lucide-react";
import { AddJoinerDialog } from "@/components/employees/add-joiner-dialog";
import { PROJECT_CELL_TONES, SEAT_STATUS_STYLES } from "@/components/seats/seat-cell";
import { ZoneGrid } from "@/components/seats/zone-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { errorMessage } from "@/lib/api/client";
import {
  useAllocateSeat,
  useProjectEmployees,
  useSeatIndex,
  useSeats,
  useSeatSuggestions,
} from "@/lib/api/hooks";
import { FLOORS, ZONES } from "@/lib/constants";
import { cn, formatDate, formatNumber, initials } from "@/lib/utils";
import type { Employee, Project, Seat, SeatSuggestion } from "@/types";

/* Same wording as the New Joiners queue so a suggestion reads identically
   wherever it appears. */
const REASON_LABELS: Record<SeatSuggestion["reason"], string> = {
  "team-zone": "near team",
  "same-floor": "same floor",
  "alternate-zone": "alternate zone",
};

/* Same order as ProjectCard / JoinerCard avatars (id % 6), so the joiner
   avatars in this dialog wear the project's identity tone. Literal strings
   keep every tone visible to the Tailwind scanner. */
const AVATAR_TONES = [
  "bg-tone-sky-soft text-tone-sky-strong",
  "bg-tone-violet-soft text-tone-violet-strong",
  "bg-tone-emerald-soft text-tone-emerald-strong",
  "bg-tone-amber-soft text-tone-amber-strong",
  "bg-tone-rose-soft text-tone-rose-strong",
  "bg-tone-cyan-soft text-tone-cyan-strong",
] as const;

type Step = "person" | "seat";

/** Spatial map for context, filterable list for fast keyboard-first picking. */
type PickerView = "map" | "list";

interface AllocatePeopleDialogProps {
  project: Project;
  /**
   * Locks the flow to this one pending joiner: the dialog opens straight on
   * the seat step (New Joiners cards, employee detail). Omit for the
   * project-page flow, which starts by picking a person from the queue.
   */
  joiner?: Employee;
  /** The trigger, rendered via DialogTrigger asChild. */
  children: React.ReactNode;
}

/**
 * Allocation flow (business rule 5, person-first): pick one of the project's
 * pending joiners (or take the one passed in), then pick their seat straight
 * off the floor map. Suggested seats (team zone → same floor → alternate
 * zone) lead the seat step, and the map defaults to the top suggestion's
 * floor.
 */
export function AllocatePeopleDialog({
  project,
  joiner: fixedJoiner,
  children,
}: AllocatePeopleDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [stepState, setStep] = React.useState<Step>("person");
  const [search, setSearch] = React.useState("");
  const [pickedJoiner, setPickedJoiner] = React.useState<Employee | null>(null);
  const [seat, setSeat] = React.useState<Seat | null>(null);
  const [view, setView] = React.useState<PickerView>("map");
  // null = follow the top suggestion once it lands; a number = user's choice.
  const [floorOverride, setFloorOverride] = React.useState<number | null>(null);

  const step: Step = fixedJoiner ? "seat" : stepState;
  const joiner = fixedJoiner ?? pickedJoiner;

  // The queue is only browsed in the person-first flow.
  const membersQuery = useProjectEmployees(open && !fixedJoiner ? project.id : 0);
  const suggestionsQuery = useSeatSuggestions(open ? (joiner?.id ?? 0) : 0);
  const allocate = useAllocateSeat();

  const pending = React.useMemo(
    () => (membersQuery.data ?? []).filter((m) => m.status === "PENDING_ALLOCATION"),
    [membersQuery.data]
  );

  const term = search.trim().toLowerCase();
  const candidates = term
    ? pending.filter(
        (m) =>
          m.name.toLowerCase().includes(term) ||
          m.email.toLowerCase().includes(term) ||
          m.employee_code.toLowerCase().includes(term)
      )
    : pending;

  const suggestions = React.useMemo(
    () => suggestionsQuery.data ?? [],
    [suggestionsQuery.data]
  );
  const floor = floorOverride ?? suggestions[0]?.seat.floor ?? FLOORS[0];
  // Wait for suggestions to settle before fetching the map, so the first
  // fetch is already the suggested floor instead of a throwaway Floor 1 load.
  const seatsQuery = useSeats(
    { floor },
    open && step === "seat" && !suggestionsQuery.isPending
  );
  const floorSeats = React.useMemo(
    () => (step === "seat" ? (seatsQuery.data ?? []) : []),
    [seatsQuery.data, step]
  );

  // A refetch can flip the picked seat to OCCUPIED under us (someone else
  // allocated it) — drop the stale pick during render, not in an effect.
  // Only positive evidence counts: keepPreviousData shows the previous
  // floor's rows while a floor switch is in flight, and the pick must not
  // be judged against a list it was never part of.
  const listedSeat = seat ? floorSeats.find((s) => s.id === seat.id) : undefined;
  if (seat && listedSeat && listedSeat.status !== "AVAILABLE") setSeat(null);

  // Where this project's team already sits: seats whose ACTIVE allocation
  // belongs to the project wear its identity tone on the map (same id % 6
  // recipe as the seats page's project lens), so the picker shows the
  // territory the joiner should land near.
  const { occupantBySeat } = useSeatIndex();
  const teamTone = project.id % PROJECT_CELL_TONES.length;
  const seatMeta = React.useMemo(() => {
    const meta = new Map<number, { name: string; tone: number }>();
    for (const s of floorSeats) {
      const occupant = occupantBySeat.get(s.id);
      if (occupant?.allocation.project_id === project.id) {
        meta.set(s.id, { name: project.name, tone: teamTone });
      }
    }
    return meta;
  }, [floorSeats, occupantBySeat, project.id, project.name, teamTone]);

  const { byZone, availableOnFloor } = React.useMemo(() => {
    const byZone = new Map<string, Map<number, Seat[]>>();
    let availableOnFloor = 0;
    for (const s of floorSeats) {
      if (s.status === "AVAILABLE") availableOnFloor++;
      let bays = byZone.get(s.zone);
      if (!bays) byZone.set(s.zone, (bays = new Map()));
      let baySeats = bays.get(s.bay);
      if (!baySeats) bays.set(s.bay, (baySeats = []));
      baySeats.push(s);
    }
    return { byZone, availableOnFloor };
  }, [floorSeats]);

  // The project team's home zone, straight from the rule-5 ranking: the zone
  // a "team-zone" suggestion lives in. Absent when the ranking found none.
  const teamZone = React.useMemo(() => {
    const teamPick = suggestions.find((s) => s.reason === "team-zone");
    return teamPick ? { floor: teamPick.seat.floor, zone: teamPick.seat.zone } : null;
  }, [suggestions]);

  // List view rows: this floor's free seats, best picks first (suggested,
  // then team zone, then the rest in seat order).
  const listSeats = React.useMemo(() => {
    const suggested = new Set(suggestions.map((g) => g.seat.id));
    const rank = (s: Seat) =>
      suggested.has(s.id)
        ? 0
        : teamZone && teamZone.floor === s.floor && teamZone.zone === s.zone
          ? 1
          : 2;
    return floorSeats
      .filter((s) => s.status === "AVAILABLE")
      .sort((a, b) => rank(a) - rank(b) || a.id - b.id);
  }, [floorSeats, suggestions, teamZone]);

  // Focus hand-off between steps: the clicked row unmounts, so land focus on
  // the new step's anchor instead of letting it fall to <body>.
  const searchRef = React.useRef<HTMLInputElement>(null);
  const seatHeadingRef = React.useRef<HTMLParagraphElement>(null);
  React.useEffect(() => {
    if (!open) return;
    if (step === "seat") seatHeadingRef.current?.focus();
    else searchRef.current?.focus();
  }, [step, open]);

  // A suggestion chip can point at another floor, whose grid only exists
  // after that floor's seats land — scroll to the cell once it renders.
  const scrollSeatIdRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (scrollSeatIdRef.current == null) return;
    const cell = document.querySelector(
      `[data-picker-map] [data-seat-id="${scrollSeatIdRef.current}"]`
    );
    if (cell) {
      scrollSeatIdRef.current = null;
      cell.scrollIntoView({ block: "center", behavior: "auto" });
    }
  }, [floorSeats]);

  const reset = () => {
    setStep("person");
    setSearch("");
    setPickedJoiner(null);
    setSeat(null);
    setView("map");
    setFloorOverride(null);
  };

  const handleOpenChange = (next: boolean) => {
    // Never dismissable while the request is in flight.
    if (!next && allocate.isPending) return;
    setOpen(next);
    if (!next) reset();
  };

  const choosePerson = (person: Employee) => {
    setPickedJoiner(person);
    setSeat(null);
    setFloorOverride(null);
    setStep("seat");
  };

  const chooseSuggestion = (suggestion: SeatSuggestion) => {
    setFloorOverride(suggestion.seat.floor);
    setSeat(suggestion.seat);
    // Bring the picked cell into view; if the chip switched floors, the
    // effect above finishes the job once the new grid renders.
    scrollSeatIdRef.current = suggestion.seat.id;
    requestAnimationFrame(() => {
      const cell = document.querySelector(
        `[data-picker-map] [data-seat-id="${suggestion.seat.id}"]`
      );
      if (cell) {
        scrollSeatIdRef.current = null;
        cell.scrollIntoView({ block: "center", behavior: "auto" });
      }
    });
  };

  const handleAllocate = () => {
    if (!joiner || !seat) return;
    allocate.mutate(
      { employeeId: joiner.id, seatId: seat.id },
      {
        onSuccess: () => {
          toast({
            title: "Seat allocated",
            description: `${joiner.name} is now seated at ${seat.seat_code} on Floor ${seat.floor}.`,
          });
          // Person-first flow with more joiners waiting: stay open on the
          // (refreshed) queue so HR can seat the next one without reopening
          // the dialog. Fixed-joiner flow: the job is done, close.
          if (!fixedJoiner && pending.length > 1) {
            setStep("person");
            setSearch("");
            setPickedJoiner(null);
            setSeat(null);
            setFloorOverride(null);
          } else {
            setOpen(false);
            reset();
          }
        },
        onError: (error) =>
          // 409 details name the violated rule (already seated / not available).
          toast({
            title: "Allocation failed",
            description: errorMessage(error),
            variant: "destructive",
          }),
      }
    );
  };

  const avatarTone = AVATAR_TONES[project.id % AVATAR_TONES.length];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        // minmax(0,1fr) stops the content-sized implicit grid track from
        // blowing the dialog out past the viewport on phones (the floor tabs
        // and zone grids are wide; they must scroll inside, not stretch).
        className="max-w-4xl grid-cols-[minmax(0,1fr)]"
        onInteractOutside={(e) => {
          if (allocate.isPending) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (allocate.isPending) e.preventDefault();
        }}
      >
        {step === "person" ? (
          <>
            <DialogHeader>
              <DialogTitle>Allocate people</DialogTitle>
              <DialogDescription>
                Pick a pending joiner on {project.name}, then choose their seat on the map.
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-96 space-y-3">
              {membersQuery.isError ? (
                <div className="flex items-start gap-2 rounded-lg border border-destructive-strong/20 bg-destructive-soft p-3">
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0 text-destructive-strong"
                    aria-hidden="true"
                  />
                  <div className="space-y-2">
                    <p className="text-sm text-destructive-strong">
                      Could not load the team: {errorMessage(membersQuery.error)}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => membersQuery.refetch()}>
                      <RotateCcw /> Try again
                    </Button>
                  </div>
                </div>
              ) : membersQuery.isPending ? (
                <div role="status" aria-label="Loading pending joiners" className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  {Array.from({ length: 5 }, (_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : pending.length === 0 ? (
                <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-center">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-success-soft text-success-strong">
                    <CircleCheck className="size-6" aria-hidden="true" />
                  </span>
                  <div className="space-y-1">
                    <p className="font-medium">Everyone on {project.name} is seated</p>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      New joiners you add to this project will appear here for allocation.
                    </p>
                  </div>
                  <AddJoinerDialog defaultProjectId={project.id}>
                    <Button variant="outline">
                      <UserPlus /> Add new joiner
                    </Button>
                  </AddJoinerDialog>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      ref={searchRef}
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search pending joiners…"
                      aria-label="Search pending joiners by name, code or email"
                      className="pl-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground" role="status">
                    {formatNumber(candidates.length)} of {formatNumber(pending.length)} pending{" "}
                    {pending.length === 1 ? "joiner" : "joiners"}
                  </p>
                  {candidates.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      No pending joiner matches “{search.trim()}”.
                    </p>
                  ) : (
                    <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
                      {candidates.map((person) => (
                        <li key={person.id}>
                          <button
                            type="button"
                            onClick={() => choosePerson(person)}
                            className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors duration-150 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            <span
                              className={cn(
                                "flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-medium",
                                avatarTone
                              )}
                              aria-hidden="true"
                            >
                              {initials(person.name)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">
                                {person.name}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {person.role} · {person.department}
                              </span>
                            </span>
                            <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                              joined{" "}
                              <time className="font-mono" dateTime={person.joining_date}>
                                {formatDate(person.joining_date)}
                              </time>
                            </span>
                            <ChevronRight
                              className="size-4 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span className="sr-only">, choose their seat</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          joiner && (
            <>
              <DialogHeader>
                <DialogTitle>Pick a seat for {joiner.name}</DialogTitle>
                <DialogDescription>
                  Suggested seats sit closest to the {project.name} team. Any outlined seat is
                  available.
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-96 space-y-4">
                {/* Who is being seated, with the one road back. */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-medium",
                        avatarTone
                      )}
                      aria-hidden="true"
                    >
                      {initials(joiner.name)}
                    </span>
                    <p
                      ref={seatHeadingRef}
                      tabIndex={-1}
                      className="min-w-0 truncate text-sm focus-visible:outline-none"
                    >
                      <span className="font-medium">{joiner.name}</span>{" "}
                      <span className="text-muted-foreground">
                        · <span className="font-mono text-xs">{joiner.employee_code}</span> ·{" "}
                        {project.name}
                      </span>
                    </p>
                  </div>
                  {!fixedJoiner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={allocate.isPending}
                      onClick={() => {
                        setStep("person");
                        setSeat(null);
                      }}
                    >
                      <ArrowLeft /> Change person
                    </Button>
                  )}
                </div>

                {/* Rule-5 suggestions lead; the map below covers everything else. */}
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                    Suggested seats
                  </p>
                  {suggestionsQuery.isPending ? (
                    <div
                      role="status"
                      aria-label="Loading seat suggestions"
                      className="flex flex-wrap gap-2"
                    >
                      {Array.from({ length: 3 }, (_, i) => (
                        <Skeleton key={i} className="h-6.5 w-44 rounded-full" />
                      ))}
                    </div>
                  ) : suggestionsQuery.isError ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm text-destructive-strong">
                        Could not load suggestions. Pick straight from the map, or retry.
                      </p>
                      <Button variant="outline" size="sm" onClick={() => suggestionsQuery.refetch()}>
                        <RotateCcw /> Retry
                      </Button>
                    </div>
                  ) : suggestions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No seats are available anywhere. Release a seat first.
                    </p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {suggestions.map((suggestion) => {
                        const isPicked = seat?.id === suggestion.seat.id;
                        return (
                          <li key={suggestion.seat.id}>
                            <button
                              type="button"
                              aria-pressed={isPicked}
                              onClick={() => chooseSuggestion(suggestion)}
                              className={cn(
                                "flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                isPicked
                                  ? "border-accent-solid bg-accent text-accent-foreground"
                                  : "border-border bg-card hover:bg-muted/60"
                              )}
                            >
                              <span className="text-metric font-mono text-xs font-medium">
                                {suggestion.seat.seat_code}
                              </span>
                              <span
                                className={cn(
                                  isPicked ? "text-accent-foreground/80" : "text-muted-foreground"
                                )}
                              >
                                Floor {suggestion.seat.floor} · {REASON_LABELS[suggestion.reason]}
                              </span>
                              <span className="sr-only">
                                {isPicked ? ", selected" : `, select for ${joiner.name}`}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* The floor map itself — same cells, same keyboard grid as /seats. */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <Tabs
                      value={String(floor)}
                      onValueChange={(value) => {
                        setFloorOverride(Number(value));
                      }}
                    >
                      <TabsList className="max-w-full snap-x justify-start overflow-x-auto">
                        {FLOORS.map((f) => (
                          <TabsTrigger key={f} value={String(f)} className="snap-start">
                            Floor {f}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      {seatsQuery.data && (
                        <p className="text-xs text-muted-foreground" role="status">
                          <span className="text-metric font-mono font-medium text-foreground">
                            {formatNumber(availableOnFloor)}
                          </span>{" "}
                          available on Floor {floor}
                        </p>
                      )}
                      {/* Same segmented control as the Seats page's view toggle. */}
                      <div
                        role="group"
                        aria-label="Choose seats from"
                        className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5"
                      >
                        {(
                          [
                            { value: "map", label: "Map", icon: MapIcon },
                            { value: "list", label: "List", icon: List },
                          ] as const
                        ).map(({ value, label, icon: Icon }) => (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={view === value}
                            onClick={() => setView(value)}
                            className={cn(
                              "flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                              view === value
                                ? "bg-card text-foreground shadow-soft"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <Icon className="size-3.5" aria-hidden="true" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Map key: the team's toned seats vs free outlined ones —
                      swatches reuse the exact cell recipes. */}
                  {view === "map" && (
                    <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <span
                          className={cn("size-3.5 shrink-0 rounded-md", PROJECT_CELL_TONES[teamTone])}
                          aria-hidden="true"
                        />
                        {project.name} team
                      </li>
                      <li className="flex items-center gap-2">
                        <span
                          className={cn("size-3.5 shrink-0 rounded-md", SEAT_STATUS_STYLES.AVAILABLE)}
                          aria-hidden="true"
                        />
                        Available
                      </li>
                    </ul>
                  )}

                  {seatsQuery.isError ? (
                    <div className="flex items-start gap-2 rounded-lg border border-destructive-strong/20 bg-destructive-soft p-3">
                      <AlertTriangle
                        className="mt-0.5 size-4 shrink-0 text-destructive-strong"
                        aria-hidden="true"
                      />
                      <div className="space-y-2">
                        <p className="text-sm text-destructive-strong">
                          Could not load the seat map: {errorMessage(seatsQuery.error)}
                        </p>
                        <Button variant="outline" size="sm" onClick={() => seatsQuery.refetch()}>
                          <RotateCcw /> Try again
                        </Button>
                      </div>
                    </div>
                  ) : seatsQuery.isPending ? (
                    <div
                      role="status"
                      aria-label="Loading the seat map"
                      className="grid gap-4 sm:grid-cols-2"
                    >
                      {ZONES.map((zone) => (
                        <div key={zone} className="space-y-2">
                          <Skeleton className="h-5 w-24" />
                          <Skeleton className="h-48 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : view === "list" ? (
                    <div className="max-h-[38vh] overflow-y-auto rounded-lg border border-border bg-card">
                      {listSeats.length === 0 ? (
                        <p className="p-6 text-center text-sm text-muted-foreground">
                          No seats are available on Floor {floor}. Try another floor.
                        </p>
                      ) : (
                        <ul aria-label={`Available seats on Floor ${floor}`}>
                          {listSeats.map((s) => {
                            const isSelected = seat?.id === s.id;
                            const isSuggested = suggestions.some((g) => g.seat.id === s.id);
                            const inTeamZone =
                              teamZone?.floor === s.floor && teamZone.zone === s.zone;
                            return (
                              <li key={s.id} className="border-b border-border/60 last:border-b-0">
                                <button
                                  type="button"
                                  aria-pressed={isSelected}
                                  onClick={() => setSeat(s)}
                                  className={cn(
                                    "flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                                    isSelected ? "bg-accent" : "hover:bg-muted/60"
                                  )}
                                >
                                  <span className="text-metric w-16 shrink-0 font-mono text-sm font-medium">
                                    {s.seat_code}
                                  </span>
                                  <span className="truncate text-sm text-muted-foreground">
                                    Zone {s.zone} · Bay {s.bay}
                                  </span>
                                  <span className="ml-auto flex shrink-0 items-center gap-2">
                                    {isSuggested && <Badge variant="secondary">Suggested</Badge>}
                                    {inTeamZone && <Badge variant="info">Team zone</Badge>}
                                    <Check
                                      className={cn(
                                        "size-4",
                                        isSelected ? "text-accent-solid" : "invisible"
                                      )}
                                      aria-hidden="true"
                                    />
                                  </span>
                                  <span className="sr-only">
                                    {isSelected ? ", selected" : ", select this seat"}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <div
                      data-picker-map
                      className="max-h-[38vh] overflow-y-auto rounded-lg border border-border bg-card px-3 pb-3"
                    >
                      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                        {ZONES.map((zone) => {
                          const bays = byZone.get(zone);
                          const sortedBays = [
                            ...(bays ?? new Map<number, Seat[]>()).entries(),
                          ].sort(([a], [b]) => a - b);
                          if (sortedBays.length === 0) return null;
                          const zoneAvailable = sortedBays
                            .flatMap(([, seats]) => seats)
                            .filter((s) => s.status === "AVAILABLE").length;
                          return (
                            <section key={zone} aria-label={`Zone ${zone}`}>
                              {/* pt-3 replaces the container's top padding so
                                  scrolled rows pass under this bar, never
                                  through the padding gap above it. */}
                              <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-2 border-b border-border/60 bg-card px-1 pb-2 pt-3">
                                <h3 className="font-display text-sm font-semibold">
                                  Zone {zone}
                                </h3>
                                {teamZone?.floor === floor && teamZone.zone === zone && (
                                  <Badge variant="info">Team zone</Badge>
                                )}
                                <span className="text-metric ml-auto font-mono text-xs text-muted-foreground">
                                  {formatNumber(zoneAvailable)} available
                                </span>
                              </div>
                              <ZoneGrid
                                key={`${floor}-${zone}`}
                                zone={zone}
                                bays={sortedBays}
                                lens="project"
                                spotlight={null}
                                seatMeta={seatMeta}
                                selectedSeatId={seat?.id ?? null}
                                onSelect={(picked) => {
                                  // Only free seats are pickable; occupied ones
                                  // stay muted (or team-toned) context.
                                  if (picked.status === "AVAILABLE") setSeat(picked);
                                }}
                              />
                            </section>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="sm:items-center">
                <p
                  className="text-sm text-muted-foreground sm:mr-auto"
                  role="status"
                  aria-live="polite"
                >
                  {seat ? (
                    <>
                      Selected{" "}
                      <span className="text-metric font-mono font-medium text-foreground">
                        {seat.seat_code}
                      </span>{" "}
                      · Floor {seat.floor}
                    </>
                  ) : (
                    "Pick an available seat from the suggestions or the map."
                  )}
                </p>
                <Button
                  variant="outline"
                  disabled={allocate.isPending}
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAllocate} disabled={!seat || allocate.isPending}>
                  {allocate.isPending ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden="true" /> Allocating…
                    </>
                  ) : seat ? (
                    `Allocate ${seat.seat_code}`
                  ) : (
                    "Allocate seat"
                  )}
                </Button>
              </DialogFooter>
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
