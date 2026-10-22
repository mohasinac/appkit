/*
 * WHY: ONE definition of the Diwali → New Year promotional window, so the
 *      event that advertises a code and the coupon that honours it cannot
 *      disagree about when it is live.
 * WHAT: Absolute IST instants for the season window and the shorter
 *       Diwali-only cashback window.
 *
 * ## 🛑 THIS EXISTS BECAUSE THE TWO HAD ALREADY DRIFTED
 *
 * `coupons-seed-data.ts` carried `startDate: daysAhead(16)` under a comment
 * reading "MUST match `event-festive-cashback-10`'s `startsAt` — both
 * daysAhead(16)". `events-seed-data.ts` carried `startsAt: daysAhead(7)`
 * under a comment reading "both `daysAhead(7)`". Each file asserted the
 * invariant and the two numbers were nine days apart, so for nine days the
 * event published CASHBACK10 as live while `isCouponValid` refused it — a
 * buyer following the event's own instructions would be told their code was
 * invalid, and nothing anywhere reports that.
 *
 * A comment cannot hold an invariant between two files. An import can.
 *
 * ## 🛑 ABSOLUTE DATES, NOT `Date.now()` OFFSETS
 *
 * A festival has a date. `daysAhead(16)` means "16 days after whenever the
 * seed last ran", so the Diwali sale moved every time anyone reseeded, and
 * the event's own prose ("Dhanteras falls on Friday 6 November") was only
 * true if the seed happened to run on 21 October.
 *
 * This is NOT the non-determinism Root Cause #25 warns about — that is about
 * values that CHANGE between runs breaking idempotency. These are constants,
 * which is the opposite: the same instant on every run, forever.
 *
 * EXPORTS:
 *   SEASON_START, SEASON_END — the 3-month Diwali → New Year window
 *   DIWALI_CASHBACK_END      — the shorter festival-only cashback window
 *
 * @tag domain:events,coupons
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/coupons-seed-data.ts,seed/events-seed-data.ts
 * @tag sideEffects:none
 */

/*
 * 🛑 `+05:30` IS LOAD-BEARING. Without an offset these parse as UTC, which is
 * 05:30 LATE in India — a sale that opens at 05:30 on Dhanteras morning and,
 * worse, an end instant that falls on the wrong calendar day for every buyer
 * and every admin reading it. The store sells in INR to IST customers; the
 * window is defined in their clock.
 */

/** Dhanteras, Friday 6 November 2026 — the first day anything is spendable. */
export const SEASON_START = new Date("2026-11-06T00:00:00+05:30");

/**
 * Three months on. The poll asked about "this Diwali to New Year", and the
 * owner's instruction was three months — which carries the window past New
 * Year rather than stopping on it, so the offers cover the return-and-replace
 * weeks in January that follow the gifting season.
 */
export const SEASON_END = new Date("2027-02-05T23:59:59+05:30");

/**
 * CASHBACK10 is the FESTIVAL coupon and keeps its own short window — it is
 * deliberately not a season-long offer, which is the distinction the poll
 * drew when it said "this is different from per festival coupons".
 *
 * 16 November is what the event's own description has always promised
 * ("The code stays live until 16 November"); the computed date it shipped
 * with resolved to the 17th, so the prose and the data disagreed by a day.
 */
export const DIWALI_CASHBACK_END = new Date("2026-11-16T23:59:59+05:30");
