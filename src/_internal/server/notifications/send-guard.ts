/**
 * May this message go out?
 *
 * One decision function, called from the only two places that know both WHO a
 * message is for and WHY: `sendEmail()` and `sendNotification()`'s channel
 * branches.
 *
 * ## Why not inside the Resend provider
 *
 * That would catch 100% of sends, which sounds like the stronger design and is
 * not. The transport sees `to`, `subject` and `html` — it has no notion of
 * feature or audience, so it could not tell a customer marketing blast from the
 * daily digest, and every kill-switch decision would degrade to all-or-nothing.
 * Worse, a counter there plus a counter here would double-charge the same
 * message.
 *
 * The guarantee that nothing bypasses this is STRUCTURAL instead: the guard
 * argument is REQUIRED on `sendEmail` and on both WhatsApp senders, so an
 * unguarded send does not typecheck, and `scripts/audit-unguarded-send.mjs`
 * fails the build on a raw `createResendProvider().send()`. Make the wrong
 * thing unrepresentable rather than adding a second layer of defence that has
 * to be kept in sync with the first (CLAUDE.md Rule #22).
 */

import { normalizeError } from "../../../errors/normalize";
import { serverLogger } from "../../../monitoring";
import { siteSettingsRepository } from "../../../features/admin/repository/site-settings.repository";
import { messageBudgetRepository } from "../../../features/messaging/repository/message-budget.repository";
import {
  MESSAGE_BUDGET_DEFAULTS,
  isEnvKillSwitchOn,
  type SendDecision,
  type SendGuardContext,
} from "../../shared/features/messaging/config";

/**
 * Evaluate the guard. Never throws — a guard that can throw turns a config
 * problem into a failed checkout.
 *
 * Order is deliberate and is cost-ordered: the two free checks run before the
 * Firestore read, and the Firestore WRITE runs last, so a message that was
 * never going out costs nothing to refuse.
 */
export async function guardSend(ctx: SendGuardContext): Promise<SendDecision> {
  // 1. Hard kill. No I/O, so it still works when Firestore is the problem.
  if (isEnvKillSwitchOn() && !ctx.transactional) {
    return {
      allow: false,
      reason: "env_disabled",
      detail: `EMAIL_DISABLED is set; suppressed ${ctx.channel}/${ctx.feature}`,
    };
  }

  let settings: Awaited<ReturnType<typeof siteSettingsRepository.getSingleton>> | null = null;
  try {
    settings = await siteSettingsRepository.getSingleton();
  } catch (err) {
    void normalizeError(err);
    /*
     * Fail OPEN on an unreadable settings document, and only here.
     *
     * The alternative — refuse everything — means one Firestore blip silences
     * order confirmations and checkout OTPs site-wide. The ceiling below still
     * applies with its default, so failing open cannot become unbounded; it
     * just means the admin toggle is briefly ignored, which is the smaller of
     * the two harms.
     */
    serverLogger.warn("guardSend: siteSettings unreadable — falling back to defaults", {
      channel: ctx.channel,
      feature: ctx.feature,
    });
  }

  const messaging = settings?.messaging;

  // 2. Admin kill switch. USER-facing only — staff mail is how an operator
  //    finds out anything is wrong, so it is never suppressed by this.
  if (ctx.audience === "user" && !ctx.transactional) {
    const channelEnabled =
      ctx.channel === "email"
        ? (messaging?.emailEnabled ?? MESSAGE_BUDGET_DEFAULTS.emailEnabled)
        : ctx.channel === "whatsapp"
          ? (messaging?.whatsappEnabled ?? MESSAGE_BUDGET_DEFAULTS.whatsappEnabled)
          : false; // sms has no sender; if one appears it starts disabled.
    if (!channelEnabled) {
      return {
        allow: false,
        reason: "admin_disabled",
        detail: `${ctx.channel} is disabled for user-facing mail in Site Settings`,
      };
    }
  }

  // 3. The daily ceiling. Applies to EVERYTHING, including staff and
  //    transactional mail — the ceiling exists to keep the provider from
  //    rejecting, and a provider that is rejecting rejects those too.
  const ceiling =
    messaging?.dailyCeiling?.[ctx.channel] ??
    MESSAGE_BUDGET_DEFAULTS.dailyCeiling[ctx.channel];

  try {
    const { allowed, count } = await messageBudgetRepository.reserveSend(ctx.channel, ceiling);
    if (!allowed) {
      // `error`, not `warn`: hitting the ceiling means real messages are being
      // dropped, and it should be visible in the admin error list rather than
      // buried among ordinary warnings.
      serverLogger.error("guardSend: daily ceiling reached — message suppressed", {
        channel: ctx.channel,
        feature: ctx.feature,
        audience: ctx.audience,
        transactional: ctx.transactional === true,
        count,
        ceiling,
      });
      return {
        allow: false,
        reason: "daily_ceiling",
        detail: `${ctx.channel} daily ceiling of ${ceiling} reached`,
      };
    }
  } catch (err) {
    void normalizeError(err);
    /*
     * Fail OPEN on a counter that will not write, for the same reason as the
     * settings read above — but note the asymmetry: this branch cannot be
     * reached without Firestore being broadly unavailable, in which case very
     * little is being sent anyway.
     */
    serverLogger.warn("guardSend: budget reservation failed — allowing send", {
      channel: ctx.channel,
      feature: ctx.feature,
    });
  }

  return { allow: true };
}

/**
 * Record a suppression so "why did nobody get that" has an answer.
 *
 * Separate from `guardSend` so the decision function stays pure-ish and
 * callable from a dry run. Deliberately `info`: a suppression is the system
 * working, not failing — the ceiling case above already logs at `error` on its
 * own.
 */
export function logSuppressedSend(ctx: SendGuardContext, decision: SendDecision): void {
  if (decision.allow) return;
  serverLogger.info("send suppressed", {
    channel: ctx.channel,
    feature: ctx.feature,
    audience: ctx.audience,
    reason: decision.reason,
    detail: decision.detail,
  });
}
