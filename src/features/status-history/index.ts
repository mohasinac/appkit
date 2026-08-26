/**
 * Status history — the shared timeline rail for any entity that records how
 * it reached its current state (orders, offers, and the 8 more adopting the
 * primitive in W15).
 *
 * Deliberately NOT `features/history/` — that name was already taken by the
 * buyer's browsing-history feature (`useHistory`, guest-history utils), which
 * is an entirely unrelated concept.
 */
export { StatusTimeline, stepsFromEntries } from "./components/StatusTimeline";
export type { StatusTimelineProps, TimelineEntry, TimelineStep } from "./components/StatusTimeline";
export { RecordStatusTimeline } from "./components/RecordStatusTimeline";
export type { RecordStatusTimelineProps } from "./components/RecordStatusTimeline";
