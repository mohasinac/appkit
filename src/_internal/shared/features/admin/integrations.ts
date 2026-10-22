/**
 * The integration switches, and what turning each one OFF actually does.
 *
 * ## 🛑 This is a VIEW over existing fields, never a second store
 *
 * Three of the four already have an authoritative field:
 *
 *   payments  -> `payment.razorpayEnabled`
 *   email     -> `messaging.emailEnabled`   (read by `guardSend`)
 *   shipping  -> `shipping.provider`        ("manual" | "shiprocket")
 *
 * Adding an `integrationSwitches.payments` beside those would be a
 * denormalised mirror, and it would drift the first time a path wrote one of
 * the pair and not the other (Root Cause #42) — at which point the admin page
 * says "on" while the code that enforces it reads "off". Only `support.enabled`
 * is new, because only support had nothing.
 *
 * ## 🛑 Off does not mean the same thing twice
 *
 * "Payments off" stops money. "Support off" hides a contact route. "Shipping
 * off" is not even expressible — a parcel still has to move, so the shipping
 * switch selects manual (self-ship) rather than stopping anything.
 *
 * Presenting four interchangeable toggles would invite an admin to flip the
 * expensive one by muscle memory, so every row carries its own
 * `offConsequence` and the dangerous ones are marked.
 */

import type { SiteSettingsDocument } from "../../../../features/admin/schemas/firestore";

export type IntegrationId = "payments" | "email" | "shipping" | "support";

export interface IntegrationDescriptor {
  id: IntegrationId;
  label: string;
  /** One line: what this integration IS. */
  summary: string;
  /** 🛑 Shown on the row. What switching it off does, in the admin's terms. */
  offConsequence: string;
  /**
   * `true` when turning it off stops money or breaks a flow a user is
   * mid-way through. Drives a confirmation and a visual warning — an
   * accidental click here is expensive.
   */
  severe: boolean;
  /** The settings path the switch actually writes. Named, so it is auditable. */
  field: string;
  /**
   * Whether this integration's API routes are closed when it is off, and WHY
   * that answer is what it is. Three different answers for four integrations,
   * so a uniform wrapper applied to everything would be wrong three ways.
   *
   * - `"gated"`  — the routes 404 when off (payments, support).
   * - `"none"`   — there is nothing to gate, stated with the reason, so nobody
   *                later "completes" the set by guarding a route that must
   *                stay open.
   */
  routeGuard: "gated" | "none";
  /** Human reason for `routeGuard`, shown nowhere — it is for the next reader. */
  routeGuardNote: string;
  /**
   * 🛑 Which way the guard fails when the settings read itself throws, and this
   * genuinely DIFFERS per integration — a single uniform direction would be
   * the wrong call for one of them whichever one was picked.
   *
   * `true` (payments): a Firestore blip must not open a money route. Closed is
   * the safe direction for money.
   *
   * `false` (support): refusing support because Firestore hiccupped is worse
   * than briefly allowing a ticket nobody wanted — and it is the same choice
   * `guardSend` makes on the same read.
   */
  failClosed: boolean;
}

/**
 * 🛑 A `Record<IntegrationId, …>`, so a fifth integration cannot be added
 * without writing its off-consequence. A row with no stated consequence is
 * exactly the interchangeable-toggle failure this file exists to prevent.
 */
export const INTEGRATIONS: Record<IntegrationId, IntegrationDescriptor> = {
  payments: {
    id: "payments",
    label: "Online payments",
    summary: "Card, UPI and netbanking at checkout, through whichever gateway is live.",
    /*
     * 🛑 The second sentence is the one that matters and it was missing until
     * the route guards were traced. `withOnlinePaymentEnabled` fails CLOSED and
     * guards SIX routes including `/api/payment/verify` and the Razorpay
     * WEBHOOK — so flipping this switch while a buyer is on the gateway's page
     * abandons that payment: the money is captured and the callback that would
     * have placed the order 404s. Razorpay retries on 5xx, NOT on 404, so it is
     * not retried either.
     *
     * Ungating those two routes does not fix it — `providers.config.ts` only
     * registers the gateway when this flag is on, so a completion path would
     * reach `ManualPaymentProvider` and fail differently. The real fix is a
     * bigger change (keep the provider registered for completion while refusing
     * new orders), so until then this is a WARNING an admin must read rather
     * than a hazard they discover.
     */
    offConsequence:
      "Buyers can no longer pay online. Checkout falls back to the manual methods (cash, UPI with a proof upload), which need an admin to verify every payment by hand. 🛑 Payments already in progress are abandoned — a buyer part-way through the gateway may be charged without an order being placed. Switch off when nobody is checking out.",
    severe: true,
    // Both gateways, because the enforcing guard is an OR across them. See the
    // note on `readIntegrationStates`.
    field: "payment.razorpayEnabled + payment.phonepeEnabled",
    routeGuard: "gated",
    routeGuardNote:
      "withOnlinePaymentEnabled, on all six /api/payment routes. Predates this page; this page now reads the same expression so the two cannot disagree.",
    failClosed: true,
  },
  email: {
    id: "email",
    label: "Email sending (Resend)",
    summary: "Order, offer and account emails.",
    offConsequence:
      "Customer email stops. STAFF email is deliberately unaffected — the daily digest is how an operator notices a stuck payment or a new ticket, so switching customer mail off must not blind you.",
    severe: true,
    field: "messaging.emailEnabled",
    routeGuard: "none",
    /*
     * 🛑 Not an oversight, and not a gap to close later. Email has no inbound
     * route to guard — it is an OUTBOUND effect, and `guardSend` already
     * enforces this flag at the single place that sends. Adding a route guard
     * would mean inventing a route to guard.
     */
    routeGuardNote:
      "Nothing to gate: email is outbound. guardSend() enforces this flag at sendEmail(), the only sender.",
    failClosed: false,
  },
  shipping: {
    id: "shipping",
    label: "Courier booking (Shiprocket)",
    summary: "We book the courier and pay the freight.",
    /*
     * Not "shipping stops". The switch selects the PROVIDER, and manual is a
     * working path, not a degraded one — it is the self-ship flow sellers
     * already use and claim postage back through.
     */
    offConsequence:
      "We stop booking couriers. Sellers ship themselves and claim the postage back — the flow they already have. Nothing stops moving; in-flight shipments are unaffected.",
    severe: false,
    field: "shipping.provider",
    routeGuard: "none",
    /*
     * 🛑 `/api/shipping/quote` must stay OPEN when this is off, and that is the
     * whole reason this field exists rather than a blanket wrapper over every
     * integration's routes.
     *
     * "Off" here means `provider: "manual"`, which is a WORKING path, not a
     * disabled one. 404ing the quote route would break the self-ship flow that
     * switching the integration off is specifically selecting — the guard would
     * take out the fallback it is falling back to.
     */
    routeGuardNote:
      "Deliberately ungated: off means provider=manual, a working path. Guarding /api/shipping/quote would break the self-ship flow this switch selects.",
    failClosed: false,
  },
  support: {
    id: "support",
    label: "Support & tickets",
    summary: "The buyer's contact form and ticket history.",
    /*
     * The owner chose the widest reading of "off", and the consequence is real
     * enough that the row has to state it plainly rather than let an admin
     * discover it.
     */
    offConsequence:
      "The ticket surface disappears for buyers — no new tickets, no ticket list, no nav entry. The public Help Centre and its FAQs stay up, because self-service is what reduces tickets. Staff keep full access, so open tickets are still workable. A buyer with a conversation in progress loses sight of it.",
    severe: true,
    field: "support.enabled",
    routeGuard: "gated",
    /*
     * 🛑 The line this note draws is RAISING vs ANSWERING, not buyer vs staff,
     * and it decides three surfaces — so it is written down rather than left to
     * be re-derived by whoever next "completes" the gating.
     *
     * GATED (raising): `/api/support/tickets` GET and POST, and a server layout
     * over all of `/user/support/*`. The GET too, because gating only the write
     * leaves a buyer looking at a ticket list they cannot reply to.
     *
     * NOT GATED (answering): `/admin/support-tickets`, and `/store/support` —
     * which is the seller reading tickets raised ABOUT their store, not filing
     * them. It is served by `SELLER_ENDPOINTS.SUPPORT`, a store-scoped endpoint,
     * so it is untouched by the gate above and that is correct: the owner's rule
     * is that open tickets stay workable, and a seller answering one is on the
     * same side of that line as staff.
     *
     * EXEMPT: `unban_request`, the formal appeal channel. It already bypasses
     * the soft-ban guard and the ticket cap, and an integration toggle must not
     * be able to close a channel a soft ban is explicitly forbidden from
     * closing.
     */
    routeGuardNote:
      "Gated on the RAISING side only: /api/support/tickets (GET+POST) and a server layout over /user/support/*. /store/support and /admin/support-tickets stay open — answering, not raising. unban_request is exempt.",
    failClosed: false,
  },
};

/** Display order. Money first, because it is what an admin came to check. */
export const INTEGRATION_ORDER: readonly IntegrationId[] = [
  "payments",
  "email",
  "shipping",
  "support",
];

/** What a switch reads/writes. `shipping` is a provider, not a boolean. */
export type IntegrationState = { enabled: boolean };

/**
 * Read each switch out of a settings document.
 *
 * 🛑 Defaults differ per integration and are NOT a uniform `?? false`:
 * `razorpayEnabled` genuinely defaults off (it is opt-in and the account runs
 * test keys), while email and support default ON because an older settings
 * document with no such field must not read as "we stopped talking to
 * customers".
 *
 * 🛑 THIS FUNCTION IS THE EXPRESSION THE ROUTE GUARDS USE. `withOnlinePaymentEnabled`
 * had hand-written the payments half, and the first version of this file
 * reproduced it WRONG — see the payments line. Both now resolve here, so the
 * admin page and the guard cannot disagree about whether an integration is on.
 * That disagreement is the entire failure mode this file's header warns about
 * (Root Cause #42), and it had already happened once, inside the file.
 */
export function readIntegrationStates(
  settings: Partial<SiteSettingsDocument> | null | undefined,
): Record<IntegrationId, IntegrationState> {
  return {
    /*
     * 🛑 An OR across BOTH gateways, not `razorpayEnabled` alone.
     *
     * This was wrong when written, and wrong in the direction that matters: the
     * route guard is `razorpayEnabled === true || phonepeEnabled === true`, so
     * with PhonePe on and Razorpay off the page would have reported "payments
     * OFF" while all six /api/payment routes were OPEN and taking money. An
     * admin reading that row would believe they had stopped payments.
     *
     * The guard's own docstring explains why it is an OR and must stay one:
     * these routes are provider-AGNOSTIC — they call `getProviders().payment`,
     * whichever single gateway `providers.config.ts` registered. The question
     * is "is an online gateway live at all", asked once.
     */
    payments: {
      enabled:
        settings?.payment?.razorpayEnabled === true ||
        settings?.payment?.phonepeEnabled === true,
    },
    email: { enabled: settings?.messaging?.emailEnabled !== false },
    // "Enabled" means we are booking couriers, i.e. the provider is not manual.
    shipping: { enabled: settings?.shipping?.provider === "shiprocket" },
    support: { enabled: settings?.support?.enabled !== false },
  };
}

/**
 * Turn a desired state into the settings patch that expresses it.
 *
 * Returned as a nested partial rather than applied here, so the caller does
 * one write and the audit log records one action.
 */
/**
 * The settings groups an integration switch may write, and nothing else.
 *
 * 🛑 Deliberately a LOCAL shape rather than `Partial<SiteSettingsDocument>`.
 * This module sits in `_internal/shared` and the settings schema pulls in the
 * whole admin feature; importing it here to describe four booleans would add
 * an edge `audit-import-cycles` exists to keep out. The four groups below are
 * the entire surface these two functions write, so a local type is both
 * narrower and honest.
 *
 * It replaces `Record<string, unknown>`, which said "some object" and
 * therefore type-checked a patch that wrote a misspelled group or the wrong
 * value shape — on a function whose whole job is flipping production kill
 * switches.
 */
export interface IntegrationPatch {
  payment?: { razorpayEnabled?: boolean; phonepeEnabled?: boolean };
  messaging?: { emailEnabled: boolean };
  shipping?: { provider: "manual" | "shiprocket" };
  support?: { enabled: boolean };
}

export function integrationPatch(
  id: IntegrationId,
  enabled: boolean,
): IntegrationPatch {
  switch (id) {
    case "payments":
      /*
       * 🛑 Writes BOTH gateway flags, and the OFF case is why.
       *
       * The guard is an OR, so clearing only `razorpayEnabled` while PhonePe
       * was on would leave every /api/payment route open — the switch would
       * report success and change nothing. "Disable payments" has to mean no
       * online gateway is live, which is one flag per gateway.
       *
       * The ON case re-enables RAZORPAY only, deliberately asymmetric:
       * `providers.config.ts` prefers Razorpay and ignores PhonePe when both
       * are true (it logs exactly that), so turning both on would set a flag
       * with no effect and make the page claim two gateways where there is
       * one. Choosing a gateway is a different decision from switching
       * payments on, and it belongs in Site Settings → Payment.
       */
      return enabled
        ? { payment: { razorpayEnabled: true } }
        : { payment: { razorpayEnabled: false, phonepeEnabled: false } };
    case "email":
      return { messaging: { emailEnabled: enabled } };
    case "shipping":
      /*
       * 🛑 `manual`, never a missing value. The field's own docstring is
       * explicit that a provider which fails to resolve must not silently
       * become manual — so the OFF state has to be manual EXPLICITLY, and the
       * absence of a value must never be how we express it.
       */
      return { shipping: { provider: enabled ? "shiprocket" : "manual" } };
    case "support":
      return { support: { enabled } };
    default: {
      /*
       * Exhaustive. A fifth integration will not compile until someone decides
       * which field it writes — which is the one decision that cannot be
       * guessed later from the switch alone.
       */
      const unreachable: never = id;
      return unreachable;
    }
  }
}

/** Every patch for a bulk enable/disable, merged into one object. */
export function allIntegrationsPatch(enabled: boolean): IntegrationPatch {
  const merged: IntegrationPatch = {};
  for (const id of INTEGRATION_ORDER) {
    const patch = integrationPatch(id, enabled);
    /*
     * Merged per GROUP, so two integrations writing different fields of the
     * same group (none do today, but `payment` already carries two flags)
     * cannot clobber each other.
     *
     * Spelled out per key rather than via `Object.entries`, which erased the
     * types this patch now carries — and listing the groups is also a forcing
     * function: a fifth integration writing a NEW group does not silently
     * vanish from the bulk switch, it fails to merge until someone adds the
     * line. Same argument as the exhaustive `never` in `integrationPatch`.
     */
    if (patch.payment) merged.payment = { ...merged.payment, ...patch.payment };
    if (patch.messaging) merged.messaging = { ...merged.messaging, ...patch.messaging };
    if (patch.shipping) merged.shipping = { ...merged.shipping, ...patch.shipping };
    if (patch.support) merged.support = { ...merged.support, ...patch.support };
  }
  return merged;
}
