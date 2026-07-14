/**
 * Re-keyed by Next.js on every navigation, so the page-enter rise replays per
 * route change (a layout would animate once and never again). flex-1 + flex-col
 * preserves the AppShell layout contract — full-height screens (assistant)
 * still stretch to the bottom through this wrapper.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 animate-page-enter flex-col">{children}</div>;
}
