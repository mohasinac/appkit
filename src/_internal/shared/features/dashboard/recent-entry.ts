/**
 * RecentEntry — one dashboard-landing "recently used" card (Phase 9, overhaul
 * brief).
 *
 * ## Three kinds, not one
 *
 * A recent entry can be a navigated-to PAGE, a flipped TOGGLE, or a
 * viewed/searched CHART/stat — the owner's own extension beyond "recently
 * visited pages": *"if it is just 1 toggle then on the card itself I can
 * toggle it automatically without going into the depth"* and *"every chart
 * recently searched also becomes that... a preview of the original charts."*
 * A discriminated union rather than one flat shape with optional fields,
 * because each kind has its own identity (`href` / `toggleId` / `chartId`)
 * and its own card renderer — an optional-everything shape would let a
 * `page` entry carry a `toggleId` with nothing to stop it.
 *
 * ## 🛑 No state/value snapshot, ever
 *
 * A toggle or chart entry records only that it was used, never its state or
 * value at that moment. A stale "was off" or a stale "was ₹3,548" is actively
 * misleading on a card whose entire point is to show the CURRENT number —
 * the card always reads the toggle's live on/off state or the chart's live
 * current value at render time, the same way `AdminCommandPaletteMount`'s
 * existing Listing Types toggles already fetch-on-mount rather than cache.
 *
 * Declared here (shared, type-only-safe) rather than hand-duplicated across
 * the Firestore schema and the client `useProfile.ts` types, because a
 * hand-copied discriminated union drifts far more easily than a copied
 * `Record<string, string[]>` — a missed variant member compiles silently on
 * whichever side was not updated.
 */
export type RecentEntry =
  | { kind: "page"; href: string; label: string; visitedAt: string }
  | { kind: "toggle"; toggleId: string; label: string; visitedAt: string }
  | { kind: "chart"; chartId: string; label: string; visitedAt: string };

/** Per-user recently-visited/used cards, namespaced by `"{portal}:hub"` scope — same convention as `hiddenHubCards`. */
export type RecentlyVisitedMap = Record<string, RecentEntry[]>;

/** Hard cap enforced by both the client hook and the server merge route — "10 cards" is the owner's own number. */
export const RECENT_ENTRIES_MAX = 10;

/**
 * 🛑 Plain `Omit<T, K>` does NOT distribute over a union. `keyof RecentEntry`
 * collapses to the fields common to every variant (`kind` / `label` /
 * `visitedAt`) — so `Omit<RecentEntry, "visitedAt">` silently drops `href` /
 * `toggleId` / `chartId` entirely, and callers trying to build a `{kind:
 * "toggle", toggleId, label}` literal get "`toggleId` does not exist".
 * `T extends unknown ? ... : never` is a NAKED type parameter in a
 * conditional, which is what triggers TypeScript's distributive behaviour.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** What a caller supplies to `recordVisit` — every `RecentEntry` field except `visitedAt`, which the hook stamps itself. */
export type RecentEntryInput = DistributiveOmit<RecentEntry, "visitedAt">;
