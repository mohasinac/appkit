/**
 * The ONE reason → {HTTP status, stable code} map for the two event prize-draw
 * job cores (`assignSpinPrize`, `triggerEventRaffle`).
 *
 * ## Why this exists
 *
 * Each core returns a `reason` string instead of throwing, and each is reachable
 * by TWO entry points — a Next.js API route and a Firebase callable handler.
 * That made four translations of one vocabulary, and all four disagreed:
 *
 *   · `api/events/[id]/spin/route.ts`       — had `feature_disabled`, no `not_active`
 *   · `jobs/handlers/assignSpinPrize.ts`    — `identity_required` → 400 (route said 401),
 *                                             no `feature_disabled` branch at all
 *   · `api/admin/events/[id]/trigger-raffle/route.ts` — EVERYTHING → 409
 *   · `jobs/handlers/triggerEventRaffle.ts` — only 404 / 422
 *
 * Root Cause #85 ("a handler reachable by two entry points with different
 * behaviour"), four times over in one feature. The spin route's own header
 * already documented the trap and still only fixed its own half.
 *
 * ## Two rules that produced real bugs
 *
 * 1. 🛑 **A PERMANENT refusal must never take a retryable status.** The spin
 *    route's fallback was 409 (`ALREADY_EXISTS`), described in its own comment
 *    as "a benign can't-spin-right-now state". An unlisted permanent reason
 *    therefore shipped `{code:"ALREADY_EXISTS", error:"<reason>"}` — an envelope
 *    naming two unrelated things — which the UI rendered as "Spin failed.
 *    Please try again.", inviting a retry that could never succeed.
 *
 * 2. 🛑 **A reason-less result is a SUCCESS to both routes.** Both check
 *    `if (data.reason && !data.<successField>)`, so a core branch that returned
 *    early *without* a `reason` fell through to `successResponse`.
 *    `triggerEventRaffle`'s feature-flag branch did exactly that and answered
 *    `200 "Raffle triggered"` with no winner. Every non-success branch in either
 *    core must set a reason from this map.
 *
 * There is deliberately NO fallback entry here: `reasonToHttp` is exhaustive
 * over `EventDrawReason`, so adding a reason without a status is a compile
 * error rather than a silent 409.
 */

import { EVENT_DRAW_ERROR_CODES } from "../../../../errors/error-codes";

export const EVENT_DRAW_REASON = {
  /** Neither a signed-in user nor a hashed guest identity was supplied. */
  IDENTITY_REQUIRED: "identity_required",
  /** Guest attempt on an event that has not opted into guest participation. */
  LOGIN_REQUIRED: "login_required",
  EVENT_NOT_FOUND: "event_not_found",
  /** Draft / paused / cancelled / ended — see each core's status precondition. */
  NOT_ACTIVE: "not_active",
  NO_PRIZES_CONFIGURED: "no_prizes_configured",
  OUTSIDE_SPIN_WINDOW: "outside_spin_window",
  /** This identity has already consumed its `spinMaxPerUser` allowance. */
  ALREADY_USED: "already_used",
  NOT_A_SPIN_WHEEL: "not_a_spin_wheel",
  NOT_A_RAFFLE: "not_a_raffle",
  /** A winner is already recorded; a second draw would mean two winners. */
  ALREADY_TRIGGERED: "already_triggered",
  NO_ELIGIBLE_ENTRIES: "no_eligible_entries",
} as const;

export type EventDrawReason =
  (typeof EVENT_DRAW_REASON)[keyof typeof EVENT_DRAW_REASON];

export interface EventDrawHttpMapping {
  status: number;
  /** Stable code the client resolves through `toUserMessage` / `errors.codes.*`. */
  code: string;
  /**
   * Developer-facing fallback sentence. The client renders copy from `code`, so
   * this is what shows in a log, a curl, or a locale with no key — never the
   * primary UI string.
   */
  message: string;
}

const MAPPING: Record<EventDrawReason, EventDrawHttpMapping> = {
  [EVENT_DRAW_REASON.IDENTITY_REQUIRED]: {
    status: 401,
    code: EVENT_DRAW_ERROR_CODES.IDENTITY_REQUIRED,
    message: "No user or guest identity was provided",
  },
  [EVENT_DRAW_REASON.LOGIN_REQUIRED]: {
    status: 401,
    code: EVENT_DRAW_ERROR_CODES.LOGIN_REQUIRED,
    message: "Sign in to take part in this event",
  },
  [EVENT_DRAW_REASON.EVENT_NOT_FOUND]: {
    status: 404,
    code: EVENT_DRAW_ERROR_CODES.EVENT_NOT_FOUND,
    message: "Event not found",
  },
  [EVENT_DRAW_REASON.NOT_ACTIVE]: {
    status: 409,
    code: EVENT_DRAW_ERROR_CODES.EVENT_NOT_ACTIVE,
    message: "This event is not running right now",
  },
  [EVENT_DRAW_REASON.NO_PRIZES_CONFIGURED]: {
    status: 422,
    code: EVENT_DRAW_ERROR_CODES.SPIN_NO_PRIZES,
    message: "No spin prizes are configured for this event",
  },
  [EVENT_DRAW_REASON.OUTSIDE_SPIN_WINDOW]: {
    status: 403,
    code: EVENT_DRAW_ERROR_CODES.SPIN_OUTSIDE_WINDOW,
    message: "This spin wheel is not open right now",
  },
  [EVENT_DRAW_REASON.ALREADY_USED]: {
    status: 409,
    code: EVENT_DRAW_ERROR_CODES.SPIN_ALREADY_USED,
    message: "This identity has already used its spins for this event",
  },
  [EVENT_DRAW_REASON.NOT_A_SPIN_WHEEL]: {
    status: 422,
    code: EVENT_DRAW_ERROR_CODES.NOT_A_SPIN_WHEEL,
    message: "This event is not a spin wheel",
  },
  [EVENT_DRAW_REASON.NOT_A_RAFFLE]: {
    status: 422,
    code: EVENT_DRAW_ERROR_CODES.RAFFLE_NOT_A_RAFFLE,
    message: "This event does not have a raffle",
  },
  [EVENT_DRAW_REASON.ALREADY_TRIGGERED]: {
    status: 409,
    code: EVENT_DRAW_ERROR_CODES.RAFFLE_ALREADY_DRAWN,
    message: "A winner has already been drawn for this raffle",
  },
  [EVENT_DRAW_REASON.NO_ELIGIBLE_ENTRIES]: {
    status: 409,
    code: EVENT_DRAW_ERROR_CODES.RAFFLE_NO_ELIGIBLE_ENTRIES,
    message: "No eligible entries to draw from",
  },
};

const UNKNOWN: EventDrawHttpMapping = {
  status: 500,
  code: EVENT_DRAW_ERROR_CODES.UNKNOWN_REASON,
  message: "The event could not be processed",
};

/**
 * Translate a core's `reason` into the response shape both entry points use.
 *
 * An unrecognised reason maps to **500**, not to the old 409 fallback: a reason
 * this map has never heard of is a bug in the core, and a 5xx is what gets it
 * recorded by `onRequestError` instead of being filed as an ordinary conflict.
 */
export function reasonToHttp(reason: string | undefined): EventDrawHttpMapping {
  if (!reason) return UNKNOWN;
  return MAPPING[reason as EventDrawReason] ?? UNKNOWN;
}
