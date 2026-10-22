/**
 * EMI is an OPT-IN ON THE ORDER, not a way of paying.
 *
 * 🛑 Until 2026-10-22 it was a sixth `paymentMethod`, and that conflated two
 * independent decisions: *do I want to spread this over months* and *how does
 * the money reach you*. A buyer who wanted instalments had, by picking "Pay in
 * EMI", also implicitly chosen the tender — and the tender they got was the
 * manual bank/UPI proof flow, because `MANUAL_PAYMENT_METHODS` is
 * `["cash","upi_manual","emi"]` and `hasPaymentWindow` tested for `EMI`
 * alongside the other two. Nothing in the UI said so.
 *
 * The two axes are now separate: `emiOptIn` + `emiTenureMonths` describe the
 * arrangement, `paymentMethod` describes the tender for the token. Everything
 * downstream — the schedule, the surcharge, the order fields — keys on
 * `emiOptIn`, so an EMI order can be paid online or by hand.
 *
 * ── Why the legacy value is MAPPED rather than rejected ────────────────────
 *
 * A browser tab opened before this change still posts `paymentMethod: "emi"`.
 * Mapping it to `{ tender: "upi_manual", emiOptIn: true }` is not a guess: it
 * is exactly what that request did before, measured at
 * `actions.ts`'s `hasPaymentWindow` (a 15-minute window plus a displayed UPI
 * id — i.e. the manual-proof flow) and at `MANUAL_PAYMENT_METHODS`. So the
 * stale tab keeps behaving identically instead of 400ing at the one moment a
 * buyer is trying to pay.
 *
 * ── Why this returns a RESULT rather than throwing ─────────────────────────
 *
 * The same answer has to serve two callers with different jobs: the order
 * action, which must refuse, and the pricing preview, which must still price
 * *something* rather than 500 while a buyer fiddles with a radio. A plain
 * value lets each decide.
 */
import type { CheckoutPaymentMethod } from "../checkout/config";

/** The tender — `emi` is excluded by construction, which is the whole point. */
export type EmiTender = Exclude<CheckoutPaymentMethod, "emi">;

export interface EmiChoiceRequest {
  paymentMethod: CheckoutPaymentMethod;
  /**
   * The DURABLE selection, read off `CartDocument.emiPlan`.
   *
   * 🛑 Not a request-body field, and that is the point: the online path
   * decides the capture amount in one request and writes the order in
   * another, so a body-carried choice cannot be read by both. See the schema
   * note on `CartDocument.emiPlan`.
   */
  cartEmiPlan?: { tenureMonths: number } | null;
  /**
   * Legacy only: a tab opened before 2026-10-22 posts
   * `paymentMethod: "emi"` plus a tenure in the body, with nothing on the
   * cart. Honoured so that buyer is not 400'd mid-payment, and ignored
   * whenever the cart carries a plan.
   */
  legacyTenureMonths?: number;
}

export interface EmiChoice {
  paymentMethod: EmiTender;
  emiOptIn: boolean;
  /**
   * 🛑 Set ONLY when `emiOptIn` is true. A tenure left over from a radio the
   * buyer un-ticked must not reach `computeBuyerEmiQuote`, or they are
   * surcharged for an arrangement they declined.
   */
  emiTenureMonths?: number;
}

export type EmiChoiceResult =
  | { ok: true; choice: EmiChoice }
  | { ok: false; reason: string };

/** The tender a pre-2026-10-22 `paymentMethod: "emi"` request actually got. */
const EMI_LEGACY_TENDER: EmiTender = "upi_manual";

/**
 * Tenders that cannot carry an instalment plan, with the reason stated rather
 * than the combination silently dropped.
 *
 * - `cod` collects the balance at the door; "the balance" is precisely what an
 *   instalment plan is for. The two describe opposite settlements of the same
 *   money.
 * - `admin_bypass` marks an order paid without a payment. The existing order
 *   writer already nulls every `emi*` field under `adminBypass`, so the
 *   combination has never produced an EMI order — this refuses it out loud
 *   instead of producing a plain order that looks like the EMI one the tester
 *   asked for.
 */
const EMI_INCOMPATIBLE: Partial<Record<EmiTender, string>> = {
  cod: "Cash on delivery collects the balance when the parcel arrives, so it cannot also be paid in monthly instalments. Pay the token online or by bank/UPI transfer instead.",
  admin_bypass:
    "The admin bypass marks an order paid without taking a payment, so there is no token to collect and no instalment plan to start.",
};

/**
 * Normalise a checkout request's payment axes. **Every** caller that reads
 * `paymentMethod` or decides whether to build an EMI schedule must resolve
 * through this — two copies of "is this an EMI order" is the drift that this
 * function exists to end (Root Cause #75).
 */
/**
 * The TENDER alone — a pure function of the request, needing no cart.
 *
 * Split out because the early checkout guards (is COD enabled, is manual UPI
 * accepted) run *before* the cart is read and must already be talking about
 * the real tender. `resolveEmiChoice` calls this, so the legacy mapping has
 * one definition rather than two that agree today.
 */
export function emiTenderFor(method: CheckoutPaymentMethod): EmiTender {
  return method === "emi" ? EMI_LEGACY_TENDER : (method as EmiTender);
}

export function resolveEmiChoice(request: EmiChoiceRequest): EmiChoiceResult {
  const legacy = request.paymentMethod === "emi";
  const paymentMethod = emiTenderFor(request.paymentMethod);

  /*
   * The cart WINS. A stale tab's body tenure is a fallback for the one case
   * where there is nothing on the cart to read — never an override, or a
   * client could re-price an order the server has already quoted.
   */
  const tenureMonths = request.cartEmiPlan?.tenureMonths ?? (legacy ? request.legacyTenureMonths : undefined);
  const emiOptIn = tenureMonths !== undefined;

  if (!emiOptIn) {
    return { ok: true, choice: { paymentMethod, emiOptIn: false } };
  }

  const incompatible = EMI_INCOMPATIBLE[paymentMethod];
  if (incompatible) return { ok: false, reason: incompatible };

  return {
    ok: true,
    choice: { paymentMethod, emiOptIn: true, emiTenureMonths: tenureMonths },
  };
}

/**
 * The tenders a buyer may pick while opted in, for disabling a control rather
 * than letting them pick it and be refused at submit. Derived from the same
 * map the refusal reads, so the affordance and the rule cannot disagree.
 */
export function isTenderCompatibleWithEmi(method: EmiTender): boolean {
  return EMI_INCOMPATIBLE[method] === undefined;
}

/** Why a tender is unavailable while instalments are on. `null` when it is available. */
export function emiTenderBlockReason(method: EmiTender): string | null {
  return EMI_INCOMPATIBLE[method] ?? null;
}
