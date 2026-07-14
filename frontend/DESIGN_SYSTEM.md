# Ethara "Blueprint" Design System

Ink-navy precision console with a drafting-grid signature. One solid action
color (ink), one saturated accent (sky) for wayfinding, AA-safe status trios,
and JetBrains Mono for every identifier and metric. All values live as CSS
variables in `src/app/globals.css`; components consume semantic Tailwind
classes only — **never raw palette classes** (`bg-indigo-500`) **or hex**.

## Color roles

| Class | Light | Dark | Use for |
|---|---|---|---|
| `bg-background` | `#F6F8FA` | `#0A0F1A` | page canvas (carries `bg-blueprint` grid) |
| `bg-card` | `#FFFFFF` | `#0F1B2D` | cards, inputs, table surfaces |
| `bg-popover` | `#FFFFFF` | `#152238` | menus, select lists, dialogs sit on `card` |
| `text-foreground` | `#101828` | `#E6EBF3` | primary text |
| `text-muted-foreground` | `#52627A` | `#97A7C2` | secondary text (AA on card + background) |
| `bg-primary` | ink | light ink | **the only solid button fill** |
| `bg-accent` + `text-accent-foreground` | soft sky | deep sky | selected/hover surfaces, informational chips, icon chips |
| `text-accent-solid` | `#0369A1` | `#38BDF8` | links, active-nav text/indicator, chart emphasis. Never a button background. |
| `ring-ring` | sky | bright sky | focus rings only |
| `border-border` / `border-input` | hairline | hairline | dividers / form control borders |

**Status trios** — each of `success`, `warning`, `destructive`, `info`:

- `bg-{s}-soft` + `text-{s}-strong` (+ `border-{s}-strong/20`) → badges, tinted
  cells, any text on tint. AA-safe at 12px in both themes.
- `bg-{s}` / `text-{s}` (solid) → charts, icons, solid fills, the destructive
  button. In dark mode solids are bright (graphic grade); never put white text
  on them except `destructive`.
- Status is **never color-only**: pair with a label, icon, or fill/outline
  shape difference.

## Typography

| Role | Classes |
|---|---|
| Page title (h1) | `font-display text-2xl font-semibold tracking-tight` (`md:text-3xl` on hero pages) |
| Card/section title | `font-display text-base font-semibold tracking-tight` (CardTitle default; set `as=` for outline order) |
| Big metric | `font-mono text-metric text-3xl font-semibold tracking-tight` |
| Mid metric | `font-mono text-metric text-2xl font-semibold` |
| IDs & codes (ETH-0001, A1-7, emails) | `font-mono text-xs font-medium` (inherit color) |
| Body / cell text | `text-sm` |
| Caption / table header | `text-xs`; table headers add `font-medium uppercase tracking-wider text-muted-foreground` |

Every page has exactly one `h1`; section headings step down without skips
(CardTitle accepts `as="h2"`). Numbers that align in columns always get
`text-metric`.

## Shape, elevation, spacing

- Radii: controls `rounded-lg` (8px) · cards/dialogs/popovers `rounded-xl`
  (12px) · badges/chips `rounded-full`. Icon chips: `rounded-lg` up to
  size-9, `rounded-xl` for size-10+.
- Shadows: `shadow-soft` (controls) · `shadow-card` (resting cards) ·
  `shadow-raised` (card hover — never jump to overlay) · `shadow-overlay`
  (dialogs, menus, toasts only).
- Spacing rhythm: 4px scale. Page gutters `px-4 sm:px-6 lg:px-8`; section
  gaps `gap-4`/`gap-6`; card padding p-5 (via Card primitives). Dense grids
  may use p-4 — never odd one-off values.
- Touch: interactive controls ≥40px tall (buttons h-10, inputs h-10);
  primary touch surfaces on mobile ≥44px (`size-11 md:size-9` pattern).

## Interaction states

- Focus (exact recipe, everywhere, including links):
  `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`
- Hover tint for rows/list items: `hover:bg-muted/60` — the only alpha.
- Selected surfaces: `bg-accent text-accent-foreground` (+ `aria-pressed`/
  `data-state` where applicable).
- Clickable non-button elements add `cursor-pointer`.
- Disabled: `disabled:opacity-50` + `disabled:pointer-events-none`.

## Motion

- Tokens only: enters 180–220ms `--ease-out`, exits 120–140ms `--ease-in`
  (`animate-in`, `animate-fade-out`, `animate-dialog-in/out`,
  `animate-toast-in/out`, `animate-overlay-in`).
- Hover/color transitions: `transition-colors duration-150`.
- Transform/opacity only — never animate width/height/top/left. Bars/donuts
  may transition `transform: scaleX` or SVG dash offsets.
- Global `prefers-reduced-motion` clamp lives in globals.css — do not add
  per-component overrides.

## State patterns (empty / loading / error)

- **Empty**: `EmptyState` with an icon, one-line title, guidance description,
  and an action whenever a next step exists. Icon chip stays `bg-accent`.
- **Loading**: skeletons must mirror the loaded layout's exact structure
  (same card shells, heights, column count) — no phantom controls, nothing
  that morphs on swap. Wrap in `role="status"` + `aria-label="Loading …"`.
- **Error**: `ErrorState` (destructive-tinted icon chip, human message,
  retry action) — never render an error as success/empty; check `isError`
  before `data`-empty branches. Technical detail goes in a `<details>` or
  `font-mono text-xs break-words` line.

## Blueprint signature

- The app shell's scroll canvas carries `bg-blueprint` (32px drafting grid).
- Brand chip: `bg-primary text-primary-foreground` square `rounded-lg` — the
  gradient is gone.
- KPI/stat cards: mono metrics, `text-xs uppercase tracking-wider` labels —
  labels read like drawing annotations.
