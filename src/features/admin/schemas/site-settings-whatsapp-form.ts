/*
 * WHY: `AdminSiteSettingsView`'s WhatsApp tab (⑬, platform-level WhatsApp
 *      Business Cloud API credentials) — fourteenth tab migrated to the
 *      Universal Template System (Phase 3B, admin site-settings form
 *      rebuild, 2026-11-04). Ten `useState` calls, ALL of them masked
 *      credentials at the save layer (`maskedOrReal()`, same as every
 *      field in the Integrations tab) — not just the one field
 *      (`waCloudApiToken`) that gets the masked-INPUT UI treatment.
 *      Phone number ID, admin notify numbers and the six template names
 *      are operationally non-secret but still carry the server's
 *      preserve-on-untouched masking semantics, because they hydrate from
 *      `credentialsMasked`, the same bucket the real secret does.
 *
 *      Deliberately SEPARATE from `siteSettingsFormSchema` (render-only vs.
 *      save-time validation — see the Branding schema's header for the full
 *      reasoning, unchanged here). `siteSettingsFormSchema` does not
 *      validate `credentials` at all (masked-credential handling is its
 *      own mechanism, not a format check).
 *
 * WHAT: Flat field names matching the component's own state (`waPhoneNumberId`,
 *       `waCloudApiToken`, …), all writing into `credentials.whatsapp*` via
 *       `maskedOrReal()` in `buildFullPayload()` — unchanged by this
 *       migration, still reading the NEW combined form's values instead of
 *       bare vars.
 *
 *       `waCloudApiToken` keeps its `<MaskedInput>` custom renderer — the
 *       one field here an admin should never see in plaintext once saved.
 *       The other nine use the generator's default text renderer; they
 *       participate in the same server-side preserve-on-untouched masking
 *       but don't need the dot-obscured UI, matching the original's own
 *       choice to render them as plain `<Input>`.
 *
 * EXPORTS: siteSettingsWhatsappFormSchema, type SiteSettingsWhatsappFormValues
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

const waField = (order: number, label: string, help?: string) =>
  annotate(z.string().optional().or(z.literal("")), {
    section: "whatsapp", order, label, help,
  });

export const siteSettingsWhatsappFormSchema = z.object({
  waPhoneNumberId: annotate(z.string().optional().or(z.literal("")), {
    section: "whatsapp", sectionLabel: "Whatsapp", sectionRequired: true,
    order: 1, label: "Phone Number ID",
    help: "From Meta for Developers → App → WhatsApp → API Setup. Platform-level WhatsApp Business Cloud API credentials, used for automated purchase announcements to admin numbers when orders are placed. Store owners configure their own credentials in Store → WhatsApp.",
  }),
  waCloudApiToken: waField(2, "Cloud API System User Token",
    "Long-lived system user access token with WhatsApp Business permissions."),
  waAdminNotifyNumbers: waField(3, "Admin Notify Numbers",
    "Comma-separated, digits-only, include country code. These receive a WhatsApp message when any order is placed."),
  waTemplateLanguage: waField(4, "Template language code",
    "BCP-47 code the templates below were approved in, e.g. en or en_US. Approved Meta message templates for the buyer-facing WhatsApp order-updates addon (Fees tab) — Meta rejects business-initiated free-text WhatsApp messages outside a 24h customer-service window, so a real template name here is required for that notification type to actually deliver. Leave blank to skip WhatsApp for that type (in-app + email still fire)."),
  waTemplateOrderPlaced: waField(5, "Order placed template name", "e.g. order_placed_update."),
  waTemplateOrderConfirmed: waField(6, "Order confirmed template name", "e.g. order_confirmed_update."),
  waTemplateOrderShipped: waField(7, "Order shipped template name", "e.g. order_shipped_update."),
  waTemplateOrderDelivered: waField(8, "Order delivered template name", "e.g. order_delivered_update."),
  waTemplateOrderCancelled: waField(9, "Order cancelled template name", "e.g. order_cancelled_update."),
  waTemplateRefundInitiated: waField(10, "Refund initiated template name", "e.g. refund_initiated_update."),
});

export type SiteSettingsWhatsappFormValues = z.infer<typeof siteSettingsWhatsappFormSchema>;
