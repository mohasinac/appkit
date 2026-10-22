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
}

/**
 * 🛑 A `Record<IntegrationId, …>`, so a fifth integration cannot be added
 * without writing its off-consequence. A row with no stated consequence is
 * exactly the interchangeable-toggle failure this file exists to prevent.
 */
export const INTEGRATIONS: Record<IntegrationId, IntegrationDescriptor> = {
  payments: {
    id: "payments",
    label: "Online payments (Razorpay)",
    summary: "Card, UPI and netbanking at checkout.",
    offConsequence:
      "Buyers can no longer pay online. Checkout falls back to the manual methods (cash, UPI with a proof upload), which need an admin to verify every payment by hand.",
    severe: true,
    field: "payment.razorpayEnabled",
  },
  email: {
    id: "email",
    label: "Email sending (Resend)",
    summary: "Order, offer and account emails.",
    offConsequence:
      "Customer email stops. STAFF email is deliberately unaffected — the daily digest is how an operator notices a stuck payment or a new ticket, so switching customer mail off must not blind you.",
    severe: true,
    field: "messaging.emailEnabled",
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
      "The whole support surface disappears for buyers — no contact form, no ticket list, no nav entry. Staff keep full access, so open tickets are still workable. A buyer with a conversation in progress loses sight of it.",
    severe: true,
    field: "support.enabled",
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
 */
export function readIntegrationStates(
  settings: Partial<SiteSettingsDocument> | null | undefined,
): Record<IntegrationId, IntegrationState> {
  return {
    payments: { enabled: settings?.payment?.razorpayEnabled === true },
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
export function integrationPatch(
  id: IntegrationId,
  enabled: boolean,
): Record<string, unknown> {
  switch (id) {
    case "payments":
      return { payment: { razorpayEnabled: enabled } };
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
export function allIntegrationsPatch(enabled: boolean): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const id of INTEGRATION_ORDER) {
    const patch = integrationPatch(id, enabled);
    for (const [group, value] of Object.entries(patch)) {
      merged[group] = { ...(merged[group] as object | undefined), ...(value as object) };
    }
  }
  return merged;
}
