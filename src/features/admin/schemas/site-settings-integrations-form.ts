/*
 * WHY: `AdminSiteSettingsView`'s Integrations tab (⑧) — fifteenth tab
 *      migrated to the Universal Template System (Phase 3B, admin
 *      site-settings form rebuild, 2026-11-04), and the LARGEST by field
 *      count (30) in the whole rollout. Nine provider sub-groups
 *      (Razorpay, PhonePe, Cashfree, SMTP/Email, Google Places, Analytics
 *      & Tracking, Meta, TikTok, DeviantArt).
 *
 *      Deliberately SEPARATE from `siteSettingsFormSchema` (render-only vs.
 *      save-time validation — see the Branding schema's header for the full
 *      reasoning, unchanged here).
 *
 * WHAT: Flat field names matching the component's own state, writing into
 *       THREE save-payload groups in `buildFullPayload()`:
 *         - `credentials.*` (21 fields, via `maskedOrReal()`) — every
 *           Razorpay/PhonePe/Cashfree/Google-Maps/Google-Place/Meta/
 *           TikTok/DeviantArt field, INCLUDING the ones that render as
 *           plain (non-dot-obscured) inputs here (`googlePlaceId`,
 *           `metaPageId`, `phonepeClientVersion`,
 *           `phonepeEnvironment`/`cashfreeEnvironment`). Only 16 of the 21
 *           get the `<MaskedInput>` UI treatment — the rest are
 *           operationally non-secret but still masked at the save layer,
 *           same asymmetry already documented on the WhatsApp tab's schema.
 *           (Was 22/17 — `cashfreeWebhookSecret` removed 2026-11-05:
 *           Cashfree has no separate webhook-signing secret, confirmed
 *           against both their docs and the dashboard directly; webhooks
 *           are signed with `cashfreeSecretKey`, same as API calls.)
 *         - `emailSettings.{host,port,user,fromAddress}` — SHARED with the
 *           Notifications tab, which already writes `fromEmail`/`fromName`/
 *           `dailyDigest` into the SAME object. This migration closes that
 *           cross-tab seam from the Integrations side (the Notifications
 *           schema's own header already named it as "still bare vars").
 *         - `integrations.{googleAnalyticsId,facebookPixelId,
 *           gtmContainerId,clarityProjectId}` — plain, genuinely unmasked,
 *           its own standalone object.
 *
 *       `MASKED_CREDENTIAL_FIELDS` is exported alongside the schema so the
 *       component can build its seventeen identical-shaped `<MaskedInput>`
 *       custom renderers from ONE array via `Object.fromEntries`, same
 *       pattern `LEGAL_PAGE_FIELDS` already established for the Legal tab's
 *       nine uniform textareas.
 *
 *       `phonepeEnvironment`/`cashfreeEnvironment` pass their option
 *       labels ("Sandbox (test)", "Production (live)") via
 *       `buildSectionsFromSchema`'s `opts.options`, same mechanism as
 *       Shipping's `defaultCarrier` and Notifications' priority selects —
 *       `GATEWAY_ENVIRONMENT_OPTIONS` moved to module scope in the
 *       component (beside `CARRIER_OPTIONS`/`PRIORITY_OPTIONS`) for the
 *       same eager-evaluation reason documented there.
 *
 *       🛑 `cashfreeEnvironment`'s original comment is preserved verbatim
 *       below: the Select correctly shows NO selection once a real value
 *       is stored, because `maskSecret` returns "****" for anything under
 *       12 chars — both "sandbox" and "production" collapse to the same
 *       masked string, matching no option. Do NOT default the hydrate to
 *       "sandbox"; that would make the displayed state differ from the
 *       mask and the next save of ANY tab would silently overwrite a
 *       stored "production" with "sandbox".
 *
 * EXPORTS: siteSettingsIntegrationsFormSchema, type
 *          SiteSettingsIntegrationsFormValues, MASKED_CREDENTIAL_FIELDS
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

const str = () => z.string().optional().or(z.literal(""));

export const siteSettingsIntegrationsFormSchema = z.object({
  // --- Razorpay ---
  razorpayKeyId: annotate(str(), {
    section: "razorpay", sectionLabel: "Razorpay", sectionRequired: true,
    order: 1, label: "Razorpay Key ID",
    help: "Keys are masked in transit and stored encrypted. Click Reveal to view.",
  }),
  razorpayKeySecret: annotate(str(), { section: "razorpay", order: 2, label: "Razorpay Key Secret" }),
  razorpayWebhookSecret: annotate(str(), { section: "razorpay", order: 3, label: "Razorpay Webhook Secret" }),

  // --- PhonePe ---
  phonepeClientId: annotate(str(), {
    section: "phonepe", sectionLabel: "PhonePe", order: 1, label: "PhonePe Client ID",
  }),
  phonepeClientSecret: annotate(str(), { section: "phonepe", order: 2, label: "PhonePe Client Secret" }),
  phonepeClientVersion: annotate(str(), { section: "phonepe", order: 3, label: "PhonePe Client Version" }),
  phonepeEnvironment: annotate(str(), { section: "phonepe", order: 4, kind: "select", label: "PhonePe Environment" }),
  phonepeWebhookUsername: annotate(str(), { section: "phonepe", order: 5, label: "PhonePe Webhook Username" }),
  phonepeWebhookPassword: annotate(str(), { section: "phonepe", order: 6, label: "PhonePe Webhook Password" }),

  // --- Cashfree ---
  // 🛑 The App ID is NOT publishable, unlike Razorpay's Key ID — Cashfree
  // hands the browser a per-order payment_session_id, so no Cashfree
  // credential ever leaves the server. Both fields are masked for that
  // reason.
  cashfreeAppId: annotate(str(), {
    section: "cashfree", sectionLabel: "Cashfree Payments", order: 1, label: "Cashfree App ID",
    help: "The App ID is NOT publishable, unlike Razorpay's Key ID — Cashfree hands the browser a per-order payment_session_id, so no Cashfree credential ever leaves the server.",
  }),
  cashfreeSecretKey: annotate(str(), { section: "cashfree", order: 2, label: "Cashfree Secret Key" }),
  cashfreeEnvironment: annotate(str(), {
    section: "cashfree", order: 3, kind: "select", label: "Cashfree Environment",
  }),

  // --- SMTP / Email (emailSettings.*, shared with the Notifications tab) ---
  smtpHost: annotate(str(), {
    section: "smtp", sectionLabel: "SMTP / Email", order: 1, label: "SMTP host",
    help: "Transactional email is delivered through Resend — set the Resend API key on the Notifications tab. These SMTP fields are stored but not currently used for delivery.",
  }),
  smtpPort: annotate(str(), { section: "smtp", order: 2, kind: "number", label: "SMTP port" }),
  smtpUser: annotate(str(), { section: "smtp", order: 3, label: "SMTP user" }),
  smtpFrom: annotate(str(), {
    section: "smtp", order: 4, label: "From address", inputType: "email",
    help: "Placeholder defaults to the brand's no-reply address, e.g. no-reply@yourdomain.",
  }),

  // --- Google Places (store reviews) ---
  googleMapsApiKey: annotate(str(), {
    section: "google-places", sectionLabel: "Google Places (store reviews)",
    order: 1, label: "Google Maps API key",
  }),
  googlePlaceId: annotate(str(), { section: "google-places", order: 2, label: "Default Google Place ID" }),

  // --- Analytics & Tracking (integrations.*, genuinely unmasked) ---
  gaMeasurementId: annotate(str(), {
    section: "analytics", sectionLabel: "Analytics & Tracking", order: 1, label: "Google Analytics ID",
  }),
  fbPixelId: annotate(str(), { section: "analytics", order: 2, label: "Facebook Pixel ID" }),
  gtmContainerId: annotate(str(), { section: "analytics", order: 3, label: "GTM Container ID" }),
  clarityProjectId: annotate(str(), {
    section: "analytics", order: 4, label: "Microsoft Clarity Project ID",
    help: "Heatmaps and session replay. Recording is strictly masked — no text or input values are captured. Leave blank to keep Clarity off.",
  }),

  // --- Meta (Instagram & Facebook Social Feed) ---
  metaPageAccessToken: annotate(str(), {
    section: "meta", sectionLabel: "Meta (Instagram & Facebook Social Feed)",
    order: 1, label: "Page Access Token",
    help: "Used by the Social Feed section to fetch Instagram and Facebook posts via Meta Graph API v19.",
  }),
  metaPageId: annotate(str(), { section: "meta", order: 2, label: "Page ID (or handle)" }),

  // --- TikTok for Developers (Social Feed) ---
  tiktokClientKey: annotate(str(), {
    section: "tiktok", sectionLabel: "TikTok for Developers (Social Feed)",
    order: 1, label: "Client Key",
    help: "Client credentials + long-lived access token from TikTok for Developers. Used to list your account's public videos.",
  }),
  tiktokClientSecret: annotate(str(), { section: "tiktok", order: 2, label: "Client Secret" }),
  tiktokAccessToken: annotate(str(), { section: "tiktok", order: 3, label: "Access Token (long-lived)" }),

  // --- DeviantArt OAuth2 (Social Feed) ---
  deviantartClientId: annotate(str(), {
    section: "deviantart", sectionLabel: "DeviantArt OAuth2 (Social Feed)",
    order: 1, label: "Client ID",
    help: "Client credentials for DeviantArt gallery fetching (client-credentials OAuth2 flow — no user login required).",
  }),
  deviantartClientSecret: annotate(str(), { section: "deviantart", order: 2, label: "Client Secret" }),
});

export type SiteSettingsIntegrationsFormValues = z.infer<typeof siteSettingsIntegrationsFormSchema>;

/** Drives the component's seventeen identical custom `<MaskedInput>` renderers. */
export const MASKED_CREDENTIAL_FIELDS: {
  name: keyof SiteSettingsIntegrationsFormValues;
  label: string;
  placeholder: string;
}[] = [
  { name: "razorpayKeyId", label: "Razorpay Key ID", placeholder: "rzp_test_… / rzp_live_…" },
  { name: "razorpayKeySecret", label: "Razorpay Key Secret", placeholder: "••••••••" },
  { name: "razorpayWebhookSecret", label: "Razorpay Webhook Secret", placeholder: "••••••••" },
  { name: "phonepeClientId", label: "PhonePe Client ID", placeholder: "MERCHANTID_…" },
  { name: "phonepeClientSecret", label: "PhonePe Client Secret", placeholder: "••••••••" },
  { name: "phonepeWebhookUsername", label: "PhonePe Webhook Username", placeholder: "••••••••" },
  { name: "phonepeWebhookPassword", label: "PhonePe Webhook Password", placeholder: "••••••••" },
  { name: "cashfreeAppId", label: "Cashfree App ID", placeholder: "••••••••" },
  { name: "cashfreeSecretKey", label: "Cashfree Secret Key", placeholder: "••••••••" },
  { name: "googleMapsApiKey", label: "Google Maps API key", placeholder: "••••••••" },
  { name: "metaPageAccessToken", label: "Page Access Token", placeholder: "EAAxxxxxxx…" },
  { name: "tiktokClientKey", label: "Client Key", placeholder: "aw…" },
  { name: "tiktokClientSecret", label: "Client Secret", placeholder: "••••••••" },
  { name: "tiktokAccessToken", label: "Access Token (long-lived)", placeholder: "••••••••" },
  { name: "deviantartClientId", label: "Client ID", placeholder: "1234" },
  { name: "deviantartClientSecret", label: "Client Secret", placeholder: "••••••••" },
];
