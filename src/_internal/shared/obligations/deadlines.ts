/**
 * `deadlinesFor(order)` — every deadline an order currently owes, derived.
 *
 * ## Pure, so a page can render it for free
 *
 * No reads, no writes, no `obligations` lookup. A buyer or seller page calls
 * this on an order it already has and renders "Dispatch by Thu 3 Nov".
 *
 * 🛑 That is why deadlines are DERIVED rather than stored on the order. A
 * stored `dispatchDueAt` would need a backfill for every existing order, and
 * would drift from the policy the moment an admin changed the duration — the
 * denormalised-mirror trap (Root Cause #42). The `obligations` collection
 * stores one too, and that copy is explicitly a due-date INDEX for the sweep
 * to query, not the answer.
 *
 * ## Test-window compression is PER SUBJECT
 *
 * 🛑 A tester run must be able to watch a 3-day acceptance window close inside
 * a 90-minute session, and a hard-coded duration cannot be shortened — which is
 * what made those cases untestable in any run shorter than the literal. So
 * durations scale by `TESTER_WINDOW_MINUTES`, but **only when the subject
 * itself carries `isTestData: true`.** A global switch would compress every
 * live buyer's deadline the moment somebody ran the tester, which is the one
 * mistake this must not make.
 */

/*
 * 🛑 `addBusinessDays` ONLY — `resolveHolidays` is module-private and takes
 * `(startYear, endYear, opts)`, not a Date. I imported it first and it would
 * not have compiled; `addBusinessDays` already resolves the holiday set
 * internally for every year the window spans, so the correct call passes no
 * holiday argument at all.
 */
import { addBusinessDays } from "../time/business-days";
import {
  OBLIGATION_POLICIES,
  durationToMinutes,
  type Duration,
  type ObligationPolicy,
} from "../../../features/obligations/constants/policies";
import {
  ALL_OBLIGATION_KINDS,
  type ObligationKind,
} from "../../../features/obligations/schemas/firestore";
import type { OrderDocument } from "../../../features/orders/schemas/firestore";
import { windowMinutes } from "../../../features/tester/seed-data/tester-window";

/**
 * How much a test fixture's deadlines are compressed.
 *
 * The real window is scaled so the LONGEST obligation (14-day delivery
 * confirmation) still fits inside one tester window, while the shortest
 * (24-hour proof re-upload) stays long enough to observe. Expressed as a
 * fraction of `TESTER_WINDOW_MINUTES` per real day.
 */
const TEST_MINUTES_PER_REAL_DAY = 1 / 14;

function compressForTest(minutes: number): number {
  const realDays = minutes / (24 * 60);
  const scaled = realDays * windowMinutes() * TEST_MINUTES_PER_REAL_DAY;
  /*
   * Floored at one minute. A deadline computed as zero would fire on the same
   * sweep tick that created it, so the tester could never observe the BEFORE
   * state — and a case written as "before → after" needs both halves.
   */
  return Math.max(1, scaled);
}

export interface ResolvedDeadline {
  kind: ObligationKind;
  dueAt: Date;
  /** The fact the clock started from. */
  anchoredAt: Date;
  policy: ObligationPolicy;
}

/**
 * Resolve one duration into an absolute date.
 *
 * 🛑 `business` goes through `addBusinessDays`, which counts weekends AND the
 * Indian holiday calendar. The predecessor helper subtracted CALENDAR days and
 * called them business days, so the "7-business-day" payout hold was really
 * about 5 — and a missed holiday silently SHORTENS a deadline, which is why
 * the calendar has an owner and a horizon warning.
 */
export function resolveDueAt(
  anchor: Date,
  duration: Duration,
  opts?: { isTestData?: boolean },
): Date {
  if (opts?.isTestData) {
    /*
     * A compressed fixture is always wall-clock. Business-day arithmetic on a
     * 6-minute window is meaningless, and worse: a fixture seeded on a Friday
     * would land its "2 business day" deadline on Tuesday regardless of
     * compression, so the case could never run.
     */
    return new Date(anchor.getTime() + compressForTest(durationToMinutes(duration)) * 60_000);
  }

  if (duration.calendar === "business" && duration.unit === "days") {
    return addBusinessDays(anchor, duration.value);
  }

  return new Date(anchor.getTime() + durationToMinutes(duration) * 60_000);
}

/**
 * Every deadline this order currently owes.
 *
 * Only kinds whose `precondition` holds AND whose `anchor` has fired appear —
 * an order that has not shipped owes no delivery confirmation, and that is the
 * difference between "not yet" and "overdue".
 */
export function deadlinesFor(order: OrderDocument): ResolvedDeadline[] {
  const out: ResolvedDeadline[] = [];
  const isTestData = order.isTestData === true;

  for (const kind of ALL_OBLIGATION_KINDS) {
    const policy = OBLIGATION_POLICIES[kind];
    const anchor = policy.anchor(order);
    if (!anchor) continue;
    if (!policy.precondition(order)) continue;
    out.push({
      kind,
      anchoredAt: anchor,
      dueAt: resolveDueAt(anchor, policy.duration, { isTestData }),
      policy,
    });
  }

  return out.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}

/**
 * Which obligations this order should have open, and which should be closed.
 *
 * Called from the order's own write (`updateWithHistory`), where the current
 * document is already in hand — so reconciling costs **zero extra reads**.
 *
 * 🛑 Derived from the POLICY's own `precondition`, not from a hand-written
 * `Record<OrderStatus, {opens, closes}>` table.
 *
 * The plan proposed that table, and building it this way instead is a
 * deliberate departure worth stating: a status→opens/closes map is a SECOND
 * encoding of the same facts the preconditions already express, and the two
 * would drift exactly as the plan's own proposed transition map had already
 * drifted from the census (it omitted `pending → processing`, which a live
 * sweep writes). One source, evaluated twice — once for display, once for
 * reconciliation — cannot disagree with itself.
 */
export function reconcileObligations(
  order: OrderDocument,
  /**
   * The order as it was BEFORE this write, when the caller has it.
   *
   * 🛑 THIS PARAMETER IS A COST FIX, not an optimisation. My first version
   * closed "every kind not currently open", which on an 11-kind union meant
   * **11 Firestore update attempts on every single order write** — each one a
   * billed write against a document that mostly does not exist, on the hottest
   * collection in the project. Rule #6 exists for exactly that.
   *
   * With `previous` in hand the close set is `was-open MINUS is-open`, which is
   * usually empty and never larger than the number of obligations that
   * genuinely just completed. Zero reads either way, because `updateWithHistory`
   * already holds the pre-write document.
   *
   * Omitting it falls back to the full set, which is correct for a deliberate
   * backfill over existing orders and wrong for the write path.
   */
  previous?: OrderDocument | null,
): {
  open: ResolvedDeadline[];
  close: ObligationKind[];
} {
  const shouldBeOpen = deadlinesFor(order);
  const openKinds = new Set(shouldBeOpen.map((d) => d.kind));

  if (previous) {
    const wasOpen = deadlinesFor(previous).map((d) => d.kind);
    return {
      open: shouldBeOpen,
      close: wasOpen.filter((k) => !openKinds.has(k)),
    };
  }

  return {
    open: shouldBeOpen,
    close: ALL_OBLIGATION_KINDS.filter((k) => !openKinds.has(k)),
  };
}
