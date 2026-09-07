/**
 * Shared vocabulary for "may this message go out, and does the budget allow
 * it" — the types both the server guard and the settings schema speak.
 *
 * Lives in `_internal/shared/` because the channel/audience unions are read on
 * both sides: the guard enforces them server-side, the admin settings view
 * renders them.
 */

/**
 * A metered outbound channel.
 *
 * `sms` is declared and has no sender. That is deliberate rather than
 * aspirational: `notificationChannels.sms` has existed in the settings schema
 * (and been seeded `enabled: true`) for a long time while no code has ever
 * read it, so anyone adding an SMS provider will reach for this union first
 * and find the budget already covers them. A channel that is born capped
 * cannot repeat what email did.
 */
export type MessageChannel = "email" | "whatsapp" | "sms";

/**
 * Who the message is FOR — which is what the kill switch keys on.
 *
 * `user` is a buyer or seller receiving something about their own activity.
 * `staff` is the operators of the site receiving something about the site.
 *
 * The kill switch suppresses `user` only. Turning off customer email must not
 * also blind the people running the shop: the daily digest is how a support
 * message or a stuck payment proof gets noticed at all, and silencing it is
 * how an outage becomes a week-long outage.
 */
export type MessageAudience = "user" | "staff";

/**
 * What a caller must state before a message can leave the building.
 *
 * Every field is required except `transactional`, and that asymmetry is the
 * point — a sender that cannot say who this is for and why has not thought
 * about it, and an optional field defaults to whatever is least safe.
 */
export interface SendGuardContext {
  channel: MessageChannel;
  /**
   * Stable identifier for WHAT is being sent — a notification type
   * (`order_shipped`), or a named non-notification flow (`daily_digest`,
   * `checkout_otp`, `payout_summary`).
   *
   * Recorded on every allow and deny, so "what ate the quota today" is a
   * question with an answer.
   */
  feature: string;
  audience: MessageAudience;
  /**
   * The message is part of a flow the user is actively in, and suppressing it
   * breaks that flow rather than merely quietening it.
   *
   * Exempt from the KILL SWITCH ONLY — the daily ceiling still applies, since
   * the ceiling exists to stop the provider rejecting everything, and a
   * transactional mail that would be rejected anyway is not worth pretending
   * about.
   *
   * Only two things qualify today and the bar should stay this high:
   *   · the high-value checkout OTP — the buyer cannot complete an order above
   *     the threshold without the code;
   *   · the order confirmation — the buyer's receipt for money already taken.
   */
  transactional?: boolean;
}

export type SendDecision =
  | { allow: true }
  | {
      allow: false;
      /** Machine-readable, for logs and the suppression record. */
      reason:
        | "type_ineligible"
        | "env_disabled"
        | "admin_disabled"
        | "daily_ceiling";
      /** One line, for the log. Never shown to an end user. */
      detail: string;
    };

/**
 * Defaults, mirrored into `DEFAULT_SITE_SETTINGS_DATA.messaging`.
 *
 * 🛑 `emailEnabled` and `whatsappEnabled` default to FALSE. An install that
 * has not made a decision should be quiet, not loud — the opposite default is
 * how a fresh deploy mails real people from a half-configured site.
 */
export const MESSAGE_BUDGET_DEFAULTS = {
  emailEnabled: false,
  whatsappEnabled: false,
  dailyCeiling: {
    /**
     * Resend's free tier is 100/day. 80 is not timidity — the counter is
     * reserve-then-send and a burst can race slightly past the check, and
     * Firebase-side auth mail (password resets, verification) draws on a
     * different quota but the same inbox reputation. Twenty messages of
     * headroom is what stops "at the limit" from becoming "over it".
     */
    email: 80,
    /** Meta's pricing is per-conversation, not per-message; this is a sanity bound, not a tier limit. */
    whatsapp: 200,
    /** No sender exists yet. Present so one cannot ship uncapped. */
    sms: 50,
  },
} as const;

/**
 * Hard kill, checked before any Firestore read so it works even when Firestore
 * is the thing that is unhappy.
 *
 * Any of `1` / `true` / `yes` counts, case-insensitively — an operator setting
 * this at 3am should not have to remember which spelling the parser wanted.
 */
export function isEnvKillSwitchOn(): boolean {
  const raw = process.env.EMAIL_DISABLED?.trim().toLowerCase() ?? "";
  return raw === "1" || raw === "true" || raw === "yes";
}
