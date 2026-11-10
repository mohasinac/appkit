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
    audiences: override.audiences ?? (audience ? [audience] : UNKNOWN_NOTIFICATION_RULE.audiences),
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
 * Just the audiences for a type — who should receive it.
 *
 * Separate from `resolveNotificationRule` because the fan-out caller needs
 * only this, and building a full rule there would mean supplying
 * `emailEligible`/`prefsKeyOf` answers it does not have and does not use.
 * Passing placeholder functions to satisfy a signature is how a lie gets
 * written into code that later looks authoritative.
 */
export function resolveNotificationAudiences(
  type: string,
  audienceOf: (type: string) => NotificationAudience | undefined,
  overrides: NotificationRuleOverrides = {},
): readonly NotificationAudience[] {
  const override = overrides[type]?.audiences;
  if (override) return override;
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
