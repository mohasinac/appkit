/**
 * Pay periods for employee payouts — ONE resolver, two cadences.
 *
 * ## 🛑 Why this is a module and not a ternary at each call site
 *
 * Two cadences means two period-boundary rules, and a reopened ticket can
 * straddle a boundary differently per employee: the same reopen is inside the
 * period for a monthly payee and across it for a weekly one. A branch written
 * at each call site is two chances per site to disagree about where a week
 * starts — and the symptom is a payslip that is quietly short, which nobody
 * reports as a bug because nobody has the other number to compare it to.
 *
 * So the period is resolved once, from a date and a cadence, and every caller
 * takes the pair it returns.
 *
 * ## 🛑 Go-forward, no clawback
 *
 * A payslip is final once issued. If a ticket is reopened after the period it
 * was paid in has closed, the money is not recovered and the period is not
 * recomputed — the ticket simply does not count again in the period where it
 * is next resolved. Recomputing a closed period would mean an employee's pay
 * changing after they were told what it was, which is a worse failure than
 * occasionally paying for work that was later reopened.
 */

export type PayCadence = "weekly" | "monthly";

export const PAY_CADENCE_VALUES = ["weekly", "monthly"] as const satisfies readonly PayCadence[];

/** A cadence absent here is a compile error, not a silently unpayable employee. */
const _CADENCE_COVERS_UNION: Record<PayCadence, true> = { weekly: true, monthly: true };
void _CADENCE_COVERS_UNION;

export interface PayPeriod {
  start: Date;
  /** EXCLUSIVE. See the note below — this is the half-open convention. */
  end: Date;
  cadence: PayCadence;
}

/**
 * The period containing `when`.
 *
 * ## 🛑 Half-open: `start <= t < end`
 *
 * An inclusive end means the last millisecond of a period is also the first of
 * the next, so a ticket resolved exactly at midnight is counted twice — paid
 * in two periods — or, if one side uses `<` and the other `<=`, in neither.
 * Half-open makes both impossible by construction, and every consumer must
 * compare with `< end`, never `<= end`.
 *
 * ## 🛑 Weeks start MONDAY
 *
 * `Date.getDay()` returns 0 for Sunday, so the naive `d - d.getDay()` produces
 * a Sunday-start week. India's working week is Monday–Saturday and a support
 * rota is read that way, so a Sunday boundary would split every weekend across
 * two payslips. The `(day + 6) % 7` shift is what makes Monday day 0.
 *
 * ## 🛑 Local midnight, not UTC
 *
 * Wages are a human-calendar concept: an employee's Monday is their Monday.
 * `setHours(0,0,0,0)` is local, and the server runs in the deployment's zone —
 * which is why `periodLabel` renders the same boundary a payslip prints.
 */
export function payPeriodFor(when: Date, cadence: PayCadence): PayPeriod {
  const start = new Date(when.getTime());
  start.setHours(0, 0, 0, 0);

  if (cadence === "weekly") {
    const mondayIndex = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayIndex);
    const end = new Date(start.getTime());
    end.setDate(end.getDate() + 7);
    return { start, end, cadence };
  }

  start.setDate(1);
  const end = new Date(start.getTime());
  /*
   * `setMonth(+1)` on the 1st is safe; it is only unsafe on day 29–31, which
   * `setDate(1)` above has already removed. Doing it the other way round is
   * the classic bug — 31 January + 1 month is 3 March.
   */
  end.setMonth(end.getMonth() + 1);
  return { start, end, cadence };
}

/** The period immediately before the one containing `when`. */
export function previousPayPeriod(when: Date, cadence: PayCadence): PayPeriod {
  const current = payPeriodFor(when, cadence);
  const justBefore = new Date(current.start.getTime() - 1);
  return payPeriodFor(justBefore, cadence);
}

/** Half-open membership. The ONLY correct way to ask; see `payPeriodFor`. */
export function isWithinPeriod(t: Date, period: PayPeriod): boolean {
  const ms = t.getTime();
  return ms >= period.start.getTime() && ms < period.end.getTime();
}

/**
 * What a payslip prints.
 *
 * 🛑 Renders the end as the LAST DAY INSIDE the period, not the exclusive
 * boundary. "1 Jan – 1 Feb" on a January payslip reads as an overlap with
 * February's and invites someone to "fix" the half-open convention that makes
 * the arithmetic correct.
 */
export function periodLabel(period: PayPeriod, locale = "en-IN"): string {
  const lastDay = new Date(period.end.getTime() - 1);
  const fmt = (d: Date) => d.toLocaleDateString(locale, { dateStyle: "medium" });
  return `${fmt(period.start)} – ${fmt(lastDay)}`;
}

/**
 * The tickets a period actually pays for.
 *
 * 🛑 **Tickets STILL RESOLVED at period end — not tickets closed during it.**
 * Paying per ticket closed rewards closing rather than resolving: close it,
 * let the buyer reopen it, close it again, and it pays twice. So a ticket
 * counts only when it is resolved, was resolved inside the period, and is
 * still resolved when the period ends.
 *
 * A reopen therefore removes the ticket from that period even if the reopen
 * happened after the resolution — which is why this takes the whole ticket
 * rather than a timestamp, and why `resolvedBy` must be CLEARED on reopen.
 */
export interface PayableTicket {
  id: string;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  /** The live status, read at the moment the period is computed. */
  isResolved: boolean;
}

export function resolvedTicketsForPeriod(
  tickets: readonly PayableTicket[],
  employeeUid: string,
  period: PayPeriod,
): string[] {
  return tickets
    .filter(
      (t) =>
        t.isResolved &&
        t.resolvedBy === employeeUid &&
        t.resolvedAt != null &&
        isWithinPeriod(t.resolvedAt, period),
    )
    .map((t) => t.id);
}
