/*
 * WHY: `AdminSiteSettingsView`'s Notifications tab — ninth tab migrated to
 *      the Universal Template System (Phase 3B, admin site-settings form
 *      rebuild, 2026-11-04). Eighteen `useState` calls, the first tab in
 *      this pass that writes across FOUR separate save-payload groups
 *      (`messaging`, `notificationChannels`, `emailSettings`, and —
 *      `resendApiKey` specifically — `credentials`), not one. A live
 *      correction to this migration's own earlier "Notifications is
 *      branding-tab-shaped" guess, made before re-reading this tab's actual
 *      JSX.
 *
 *      Deliberately SEPARATE from `siteSettingsFormSchema` (render-only vs.
 *      save-time validation — see the Branding schema's header for the full
 *      reasoning, unchanged here).
 *
 * WHAT: Flat field names matching the component's own state
 *       (`msgEmailEnabled`, `notifEmailTypes`, …).
 *       `buildFullPayload()` keeps reading this form's values into FOUR
 *       spots:
 *         - `messaging.{emailEnabled,whatsappEnabled,dailyCeiling:{email,whatsapp}}`
 *         - `notificationChannels.{email,whatsapp,sms}` (`inApp` is a fixed
 *           `{enabled:true,readOnly:true}` literal, not a form field — the
 *           in-app channel cannot be disabled)
 *         - `emailSettings.{fromEmail,fromName,dailyDigest:{enabled,recipients}}`
 *           — the SAME `emailSettings` object also carries
 *           `host`/`port`/`user`/`fromAddress` (SMTP connection fields)
 *           belonging to the still-unmigrated Integrations tab; those stay
 *           bare `useState` reads, untouched by this migration
 *         - `credentials.resendApiKey` — masked like every other credential
 *           on the Integrations tab, even though it's rendered here
 *
 * `notifEmailTypes`/`notifWhatsappTypes` keep their `<PaginatedSelect
 * multiple>` custom renderers — the generator's default `kind: "list"`
 * fallback is a disabled placeholder, and these two drive which
 * notification types Resend/WhatsApp attempt to send. `resendApiKey` keeps
 * its `<MaskedInput>` custom renderer, same pattern as every other
 * credential field already migrated nowhere else yet (first of its kind in
 * this rollout; Integrations itself is still unmigrated). Priority selects
 * (`notifEmailMinPriority`/`notifWhatsappMinPriority`/`notifSmsMinPriority`)
 * pass their options via `buildSectionsFromSchema`'s `opts.options`, not a
 * Zod-enum-derived label, because the original `PRIORITY_OPTIONS` copy
 * ("Low (send all)", "Critical only") is meaningfully different from what
 * `humaniseFieldName` would produce from the bare value.
 *
 * Five section-level explanatory `<Text>` blocks from the original JSX
 * (the budget intro/outro paragraphs, the digest cadence note, the
 * WhatsApp-credentials-live-elsewhere note, the SMS-gateway note) moved
 * into `help` on the section's first/most-relevant field rather than
 * staying standalone prose — the generator has no section-level
 * description slot. The "In-app (notification bell) — Always on"
 * read-only info block is NOT a field at all (nothing to toggle) and
 * stays hand-written JSX in the component, alongside the generated form.
 *
 * EXPORTS: siteSettingsNotificationsFormSchema, type SiteSettingsNotificationsFormValues
 *
 * @tag domain:admin
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:AdminSiteSettingsView
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";

/*
 * 🛑 A FACTORY, not a shared const — `annotate()` registers metadata keyed
 * by SCHEMA OBJECT IDENTITY (a WeakMap), and returns the same instance it
 * was given. This field is reused by three fields below
 * (`notifEmailMinPriority`/`notifWhatsappMinPriority`/
 * `notifSmsMinPriority`); annotating one shared instance three times would
 * make each call silently overwrite the previous one's registry entry, so
 * all three fields would resolve to whichever metadata (label, section,
 * `when`) was registered LAST — found live, 2026-11-04, while fixing the
 * identical bug on the Appearance tab's `backgroundModeSchema`. Call the
 * factory once per field to get three distinct instances.
 */
const priority = () => z.enum(["low", "normal", "high", "critical"]);

export const siteSettingsNotificationsFormSchema = z.object({
  msgEmailEnabled: annotate(z.boolean(), {
    section: "budget", sectionLabel: "Outbound messaging budget", sectionRequired: true,
    order: 1, row: "full", kind: "toggle", label: "Send user-facing email",
    help: "The master switches. These suppress user-facing messages only — the daily status digest always reaches staff, so turning customer email off never leaves the site unwatched. Transactional messages (checkout verification codes, order receipts) also keep sending, because suppressing those breaks checkout rather than quietening it.",
  }),
  msgWhatsappEnabled: annotate(z.boolean(), {
    section: "budget", order: 2, row: "full", kind: "toggle", label: "Send user-facing WhatsApp",
  }),
  msgCeilingEmail: annotate(z.number().min(0), {
    section: "budget", order: 3, label: "Daily email ceiling",
    help: "Resend's free tier is 100/day. 80 leaves headroom for password-reset mail and in-flight sends.",
  }),
  msgCeilingWhatsapp: annotate(z.number().min(0), {
    section: "budget", order: 4, label: "Daily WhatsApp ceiling",
    help: "A sanity bound. Meta bills per conversation, not per message. Some notification types never email regardless of these settings — losing a collector drop, being outbid, marketing, review activity and ticket updates are shown in the notification bell only. That is deliberate: those were the highest-volume sends and the ones most likely to exhaust the day's allowance. A support reply can still be emailed one-off from the ticket screen.",
  }),

  /*
   * ── PER-ORDER CAPS ──────────────────────────────────────────────────────
   *
   * 🛑 Distinct from the daily ceilings above, and they do different jobs.
   * The ceiling is per-channel-per-day and GLOBAL: it bounds total spend and
   * says nothing about distribution. These bound ONE ORDER, which is what
   * "re-send on every order write" needs — otherwise a single busy order can
   * consume the whole day's allowance and starve every other buyer.
   *
   * ⚠ `0` means NO LIMIT, not "block everything". Clearing the field must not
   * silence every order notification on the site; an empty input is far
   * likelier than a deliberate gag.
   *
   * ⚠ Messages marked `important` or `critical` in the matrix are EXEMPT from
   * these caps but still counted — a cap that could swallow a cancellation or
   * a payment failure is worse than no cap.
   */
  perOrderCapEmail: annotate(z.number().min(0), {
    section: "budget", order: 5, label: "Per-order email cap",
    help: "How many emails ONE order may send. 0 = no limit. Routine updates are blocked at this number; important and critical ones are exempt but still counted.",
  }),
  perOrderCapWhatsapp: annotate(z.number().min(0), {
    section: "budget", order: 6, label: "Per-order WhatsApp cap",
    help: "How many WhatsApp messages ONE order may send. 0 = no limit. This is the bound that makes 're-send on every order write' affordable — each message is billed, so an unbounded order is an unbounded cost.",
  }),

  notifEmailEnabled: annotate(z.boolean(), {
    section: "email", sectionLabel: "Email channel",
    order: 1, row: "full", kind: "toggle", label: "Email notifications",
  }),
  notifEmailMinPriority: annotate(priority(), {
    section: "email", order: 2, row: "full", label: "Minimum priority to send email",
    when: (values) => Boolean(values.notifEmailEnabled),
  }),
  resendApiKey: annotate(z.string().optional().or(z.literal("")), {
    section: "email", order: 3, row: "full", label: "Resend API Key",
    help: "Resend API, for transactional email. Get your key at resend.com — used for all transactional notifications.",
    when: (values) => Boolean(values.notifEmailEnabled),
  }),
  notifFromEmail: annotate(z.string().trim().optional().or(z.literal("")), {
    section: "email", order: 4, label: "From email", inputType: "email",
    help: "Placeholder defaults to the brand's no-reply address, e.g. no-reply@yourdomain.",
    when: (values) => Boolean(values.notifEmailEnabled),
  }),
  notifFromName: annotate(z.string().trim().optional().or(z.literal("")), {
    section: "email", order: 5, label: "From name",
    when: (values) => Boolean(values.notifEmailEnabled),
  }),
  notifEmailTypes: annotate(z.array(z.string()), {
    section: "email", order: 6, row: "full", label: "Notification types",
    help: "Leave empty to send all types.",
    when: (values) => Boolean(values.notifEmailEnabled),
  }),

  digestEnabled: annotate(z.boolean(), {
    section: "digest", sectionLabel: "Daily status digest",
    order: 1, row: "full", kind: "toggle", label: "Daily status digest",
    help: "Sent every morning at 10:00 IST with the previous 24 hours of order activity. Its arrival doubles as the platform health check — if it stops landing, something needs a look.",
  }),
  digestRecipients: annotate(z.string().optional().or(z.literal("")), {
    section: "digest", order: 2, row: "full", kind: "textarea", label: "Recipients (To)",
    help: "One address per line, e.g. the brand's support email. Each address is billed as a separate send against the daily allowance — keep this list short.",
    when: (values) => Boolean(values.digestEnabled),
  }),

  notifWhatsappEnabled: annotate(z.boolean(), {
    section: "whatsappChannel", sectionLabel: "WhatsApp channel",
    order: 1, row: "full", kind: "toggle", label: "WhatsApp notifications",
    help: "WhatsApp credentials are configured in the WhatsApp tab (⑬). OTP messages use the same phone number.",
  }),
  notifWhatsappMinPriority: annotate(priority(), {
    section: "whatsappChannel", order: 2, row: "full", label: "Minimum priority to send WhatsApp",
    when: (values) => Boolean(values.notifWhatsappEnabled),
  }),
  notifWhatsappOtpEnabled: annotate(z.boolean(), {
    section: "whatsappChannel", order: 3, row: "full", kind: "toggle",
    label: "Enable WhatsApp OTP (for login and verification)",
    when: (values) => Boolean(values.notifWhatsappEnabled),
  }),
  notifWhatsappTypes: annotate(z.array(z.string()), {
    section: "whatsappChannel", order: 4, row: "full", label: "Notification types to send over WhatsApp",
    help: "Leave empty to send all types.",
    when: (values) => Boolean(values.notifWhatsappEnabled),
  }),

  notifSmsEnabled: annotate(z.boolean(), {
    section: "sms", sectionLabel: "SMS channel",
    order: 1, row: "full", kind: "toggle", label: "SMS notifications",
    help: "SMS gateway credentials (e.g. Twilio, MSG91) can be configured in the Integrations tab once an SMS provider is connected.",
  }),
  notifSmsMinPriority: annotate(priority(), {
    section: "sms", order: 2, row: "full", label: "Minimum priority to send SMS",
    when: (values) => Boolean(values.notifSmsEnabled),
  }),
});

export type SiteSettingsNotificationsFormValues = z.infer<typeof siteSettingsNotificationsFormSchema>;
