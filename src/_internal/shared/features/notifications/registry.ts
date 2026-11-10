/**
 * The notification registry — ONE resolved rule per notification type.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Five hardcoded maps currently answer five different questions about the same
 * 29 notification types, and they group them three different ways:
 *
 *   `TYPE_AUDIENCE`        (./action-url.ts)      which portal a link points at
 *   `EMAIL_ELIGIBLE_TYPES` (./email-eligibility)  may this type email at all
 *   `typeToPrefsKey`       (notification-actions) which user-pref bucket it honours
 *   `ORDER_GATED_TYPES`    (notification-actions) does it need a store subscription
 *   `STATUS_CONFIG`        (jobs/onOrderStatusChange) which transitions notify
 *
 * None is configurable, so "which states message whom, on which channel" is a
 * deploy rather than a setting — the opposite of the project's standing rule
 * that the machinery is code and the choice is config.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * 🛑 WHY THIS DERIVES FROM THOSE MAPS INSTEAD OF REPLACING THEM TODAY
 * ────────────────────────────────────────────────────────────────────────────
 *
 * The obvious move is to transcribe all 29 types into a fresh table. That is
 * exactly the move to avoid: it is ~150 hand-copied values across five sources
 * whose entries are interleaved with comments, and a single missed row changes
 * behaviour **silently** for the one type nobody noticed. A notification that
 * stops emailing does not raise an error; it simply never arrives.
 *
 * So the registry starts as a RESOLUTION LAYER:
 *
 *   defaults  ← read live from the existing maps (zero transcription)
 *   overrides ← admin config, merged on top
 *
 * Day one is therefore a provable no-op — same inputs, same answers — while
 * every field becomes configurable immediately. Retiring the maps afterwards
 * is a separate change that can be verified against this one, rather than a
 * big-bang rewrite whose correctness nobody can check.
 *
 * ⚠ The maps stay the DEFAULT SOURCE, not the decision point. Consumers must
 * read `resolveNotificationRule()`, never the maps directly, or the config
 * layer is bypassed and we are back where we started.
 */

import type { MessageChannel } from "../messaging/config";
import type { NotificationAudience } from "./action-url";

/**
 * How much a message is allowed to be suppressed by a cap.
 *
 * 🛑 This exists because a per-order cap that counts EVERY message eventually
 * eats the one that mattered. "You already had three updates, so we did not
 * tell you your order was cancelled" is the failure it prevents.
 *
 * ⚠ It also fixes a live bug in the opposite direction: `guardSend`'s
 * `transactional` flag exempts a send from the kill switch but **not** from
 * the daily ceiling, so on a busy day the checkout OTP can be refused — and
 * `sendCheckoutValueOtp` turns that refusal into a hard error, breaking
 * high-value checkout for everyone until midnight. `critical` is what that
 * path needs.
 */
export type NotificationTier = "routine" | "important" | "critical";

export interface NotificationTierPolicy {
  /** Counted against the per-order cap, and blocked once it is reached. */
  readonly perOrderCap: boolean;
  /** Counted against the global per-channel daily ceiling, and blocked at it. */
  readonly dailyCeiling: boolean;
}

/**
 * 🛑 A bypassed send is still COUNTED, just not BLOCKED — see `recordOnly`.
 * An exemption that also skips the counter makes a runaway loop on a critical
 * type invisible, which is the failure mode of every "this one is important"
 * escape hatch.
 */
export const NOTIFICATION_TIER_POLICY: Readonly<Record<NotificationTier, NotificationTierPolicy>> = {
  routine: { perOrderCap: true, dailyCeiling: true },
  important: { perOrderCap: false, dailyCeiling: true },
  critical: { perOrderCap: false, dailyCeiling: false },
};

/**
 * Default tier per notification type (owner, 2026-11-10: *money and terminal
 * states are critical*).
 *
 * 🛑 The principle: a cap may swallow CHATTER, never BAD NEWS. "You already
 * had three updates, so we did not tell you your order was cancelled" is the
 * exact failure this table prevents. Anything that tells a buyer their money
 * moved, failed to move, or that the order is over is exempt.
 *
 * ⚠ Anything NOT listed resolves to `routine` — so a new type is droppable by
 * default. That is the safe direction: a type nobody classified should not
 * silently gain the right to bypass every cap on the site.
 *
 * ⚠ This is a DEFAULT, not a decision. Admin config overrides any row, which
 * is why the table lives here as machinery rather than being inlined at the
 * call sites that read it.
 */
export const DEFAULT_NOTIFICATION_TIERS: Readonly<Record<string, NotificationTier>> = {
  // ── critical: the order is over, or money went wrong ──────────────────────
  order_cancelled: "critical",
  refund_initiated: "critical",
  payment_review: "critical",
  emi_installment_overdue: "critical",
  // An account action is a security event; a cap must never hide one.
  account_action: "critical",

  // ── important: money moved, or the buyer is owed an action ────────────────
  order_placed: "important",
  order_delivered: "important",
  emi_installment_due_soon: "important",
  prize_won: "important",

  // ── everything else stays routine, including order_confirmed/shipped ──────
  // Progress updates are precisely the chatter a per-order cap exists to bound.
};

/** A fully resolved rule: defaults merged with config overrides. */
export interface NotificationRule {
  /**
   * The type slug. ⚠ Deliberately `string`, not the closed 29-value union —
   * a new type must be addable as config, exactly as event `type` became an
   * open validated slug.
   */
  readonly type: string;
  /** Who receives it. More than one is allowed; today's maps only ever say one. */
  readonly audiences: readonly NotificationAudience[];
  /** Channels other than in-app, which is always on and not configurable. */
  readonly channels: readonly MessageChannel[];
  readonly tier: NotificationTier;
  /** The user-preference bucket this honours, if any. */
  readonly prefsKey?: string;
  /** Requires the store's WhatsApp subscription before the WhatsApp arm runs. */
  readonly requiresStoreSubscription: boolean;
}

/**
 * What an UNKNOWN type resolves to.
 *
 * 🛑 In-app only, routine, no audience assumption beyond the buyer. Newer
 * config against an older deploy must degrade, never throw — and it must not
 * guess its way into emailing or WhatsApping a type this build has never
 * heard of. Silence on an unknown type is recoverable; an unintended send is
 * not.
 */
export const UNKNOWN_NOTIFICATION_RULE: Omit<NotificationRule, "type"> = {
  audiences: ["buyer"],
  channels: [],
  tier: "routine",
  requiresStoreSubscription: false,
};

/**
 * Per-type overrides, as stored in site settings. Every field optional: an
 * absent field means "keep the derived default", so an admin who sets only a
 * tier does not accidentally blank the audiences.
 */
export interface NotificationRuleOverride {
  readonly audiences?: readonly NotificationAudience[];
  readonly channels?: readonly MessageChannel[];
  readonly tier?: NotificationTier;
  readonly prefsKey?: string;
  readonly requiresStoreSubscription?: boolean;
}

export type NotificationRuleOverrides = Readonly<Record<string, NotificationRuleOverride>>;

/** The default-bearing inputs, injected so this module imports no maps directly. */
export interface NotificationRuleDefaults {
  /** `TYPE_AUDIENCE[type]` */
  readonly audienceOf: (type: string) => NotificationAudience | undefined;
  /** `EMAIL_ELIGIBLE_TYPES[type]` */
  readonly emailEligible: (type: string) => boolean;
  /** `whatsapp.types` allow-list membership, or the order-template set */
  readonly whatsappEligible: (type: string) => boolean;
  /** `typeToPrefsKey[type]` */
  readonly prefsKeyOf: (type: string) => string | undefined;
  /** `ORDER_GATED_TYPES.has(type)` */
  readonly storeGated: (type: string) => boolean;
  /** Tier is genuinely new — nothing today expresses it. */
  readonly tierOf?: (type: string) => NotificationTier | undefined;
}

/**
 * Resolve one type's rule.
 *
 * Order is **defaults, then overrides** — config wins, because config is the
 * point. `undefined` on an override field falls through to the default rather
 * than clearing it.
 */
export function resolveNotificationRule(
  type: string,
  defaults: NotificationRuleDefaults,
  overrides: NotificationRuleOverrides = {},
): NotificationRule {
  const audience = defaults.audienceOf(type);
  const override = overrides[type] ?? {};

  /*
   * An unrecognised type gets `UNKNOWN_NOTIFICATION_RULE`'s shape, but config
   * may still describe it — that is how a type the code has never heard of
   * becomes deliverable without a deploy. The DEFAULTS are unknown; the
   * overrides are not.
   */
  const channels: MessageChannel[] = [];
  if (defaults.emailEligible(type)) channels.push("email");
  if (defaults.whatsappEligible(type)) channels.push("whatsapp");

  return {
    type,
    /*
     * 🛑 Same precedence as `resolveNotificationAudiences`, and it MUST stay
     * the same. This field is what the admin matrix renders and what
     * `ruleReachesAudience` answers from; if it disagreed with the function
     * the dispatcher actually calls, the screen would show order types as
     * buyer-only while sellers were being messaged — two sources of truth for
     * one question, which is the divergent-copy problem in its most
     * misleading form.
     */
    audiences:
      override.audiences ??
      DEFAULT_MULTI_AUDIENCE_TYPES[type] ??
      (audience ? [audience] : UNKNOWN_NOTIFICATION_RULE.audiences),
    channels: override.channels ?? channels,
    tier: override.tier ?? defaults.tierOf?.(type) ?? UNKNOWN_NOTIFICATION_RULE.tier,
    ...(override.prefsKey ?? defaults.prefsKeyOf(type)
      ? { prefsKey: override.prefsKey ?? defaults.prefsKeyOf(type) }
      : {}),
    requiresStoreSubscription:
      override.requiresStoreSubscription ?? defaults.storeGated(type),
  };
}

/**
 * ────────────────────────────────────────────────────────────────────────────
 * 🛑 TYPES THAT REACH MORE THAN ONE AUDIENCE BY DEFAULT
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `TYPE_AUDIENCE` is `Record<NotificationType, NotificationAudience>` —
 * **singular**. It answers *"which portal does this type's action URL point
 * at?"*, which is a one-answer question, and every order type answers
 * `"buyer"`. It was never a statement about who should RECEIVE the event.
 *
 * ⚠ That distinction was missed once already, and it cost a whole slice.
 * `onOrderStatusChange` was switched to `dispatchNotification` with a comment
 * reading *"one event, every audience the registry says should receive it"* —
 * and because the registry derived a single `"buyer"` for every order type,
 * **the seller arm never fired at all.** The fan-out, the seller action URL
 * and the seller template were all built, shipped, and unreachable: the
 * declared-but-unwired defect class, arrived at through a map whose name made
 * it look like the right source.
 *
 * So multi-audience defaults live here, consulted BEFORE the singular map.
 *
 * 🛑 This is a code-level DEFAULT TEMPLATE, deliberately — not a seed row.
 * Config overrides it per type (that is what the admin matrix edits), but the
 * default must survive a failed settings read: `dispatchNotification` falls
 * back to `{}` overrides on an outage, and with the default in config alone
 * every seller would silently stop being told they had a sale for the duration
 * of it. Machinery in code, choice in config — and "a seller hears about their
 * own sales" is machinery.
 *
 * Each entry is justified, because "notify everyone" is the easy wrong answer:
 *   · `order_placed`    — a new sale they must act on
 *   · `order_confirmed` — payment cleared; dispatch now
 *   · `order_shipped`   — usually their own action, but not when an admin or a
 *                         split shipment moves it; config can drop this one
 *   · `order_delivered` — starts the settlement and return windows
 *   · `order_cancelled` — stock is back and the money reversed
 *
 * ⚠ Expanding this list expands who gets messaged. The WhatsApp channel stays
 * gated on the store's paid subscription (`requiresStoreSubscription`), so an
 * entry here adds an in-app row and an email, never a billed send.
 */
export const DEFAULT_MULTI_AUDIENCE_TYPES: Readonly<
  Record<string, readonly NotificationAudience[]>
> = {
  order_placed: ["buyer", "seller"],
  order_confirmed: ["buyer", "seller"],
  order_shipped: ["buyer", "seller"],
  order_delivered: ["buyer", "seller"],
  order_cancelled: ["buyer", "seller"],
};

/**
 * Just the audiences for a type — who should receive it.
 *
 * Separate from `resolveNotificationRule` because the fan-out caller needs
 * only this, and building a full rule there would mean supplying
 * `emailEligible`/`prefsKeyOf` answers it does not have and does not use.
 * Passing placeholder functions to satisfy a signature is how a lie gets
 * written into code that later looks authoritative.
 *
 * Precedence: explicit config override → multi-audience default → the
 * singular `audienceOf` map → the unknown-type fallback. Config first, so an
 * admin can always narrow a default they disagree with.
 */
export function resolveNotificationAudiences(
  type: string,
  audienceOf: (type: string) => NotificationAudience | undefined,
  overrides: NotificationRuleOverrides = {},
): readonly NotificationAudience[] {
  const override = overrides[type]?.audiences;
  if (override) return override;
  const multi = DEFAULT_MULTI_AUDIENCE_TYPES[type];
  if (multi) return multi;
  const derived = audienceOf(type);
  return derived ? [derived] : UNKNOWN_NOTIFICATION_RULE.audiences;
}

/** Does this rule permit `channel`? In-app is always permitted and never listed. */
export function ruleAllowsChannel(rule: NotificationRule, channel: MessageChannel): boolean {
  return rule.channels.includes(channel);
}

/** Does this rule reach `audience`? */
export function ruleReachesAudience(
  rule: NotificationRule,
  audience: NotificationAudience,
): boolean {
  return rule.audiences.includes(audience);
}

/**
 * Whether a cap may block this send, and whether it should still be counted.
 *
 * Returns `{ blocked, recordOnly }` rather than a bare boolean so the caller
 * can honour the guardrail above: an exempt send increments its counter
 * (`recordOnly`) instead of skipping it, keeping a runaway loop visible.
 */
export function capDecision(
  rule: NotificationRule,
  scope: "perOrder" | "daily",
  atLimit: boolean,
): { blocked: boolean; recordOnly: boolean } {
  const policy = NOTIFICATION_TIER_POLICY[rule.tier];
  const enforced = scope === "perOrder" ? policy.perOrderCap : policy.dailyCeiling;
  if (!enforced) return { blocked: false, recordOnly: true };
  return { blocked: atLimit, recordOnly: false };
}
