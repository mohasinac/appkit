/*
 * WHY: `AdminSiteSettingsView`'s Fees tab (⑦) — sixth tab migrated to the
 *      Universal Template System (Phase 3B, admin site-settings form
 *      rebuild, 2026-11-04). Twenty-four `useState` calls, all under the
 *      single `commissions` save-payload key — the largest tab by field
 *      count migrated so far, but the LOWEST-risk in shape: every field is
 *      a plain percentage, rupee amount or enable toggle, no media/list/
 *      masked-credential renderer needed anywhere in it.
 *
 *      Deliberately SEPARATE from `siteSettingsFormSchema` (render-only vs.
 *      save-time validation — see the Branding schema's header for the full
 *      reasoning, unchanged here). `siteSettingsFormSchema.commissions`
 *      already validates a SUBSET of these (platformFeePercent,
 *      gatewayFeePercent, platformFeeMax, minPayoutAmount, payoutHoldDays,
 *      codDepositPercent) with real min/max rules; this schema does not
 *      duplicate those bounds — it is a layout schema, not a second
 *      validator, same split every prior tab schema already draws.
 *
 * WHAT: Flat field names matching the component's own state
 *       (`platformFeePercent`, `whatsappNotifyFeeEnabled`, …) — all write
 *       into the ONE `commissions.*` object in `buildFullPayload()`, which
 *       ALSO carries three fields belonging to a still-unmigrated Shipping
 *       tab (`sellerShippingFixed`/`platformShippingPercent`/
 *       `platformShippingFixedMin`) — those stay bare `useState` reads in
 *       `buildFullPayload()`, untouched by this migration.
 *
 *       Four fields (`collectorDropListingFee`/`preOrderListingFee`/
 *       `featuredSlotFee`/`promotedSlotFee`) carry a `help` string noting
 *       they currently charge nobody (D57/D60 — no billing path reads
 *       them yet) — preserved verbatim from the original inline comment,
 *       not dropped just because it moved from JSX to a schema `help`.
 *
 *       Four enable-toggle pairs (`whatsappNotifyFee`/`giftWrapFee`/
 *       `shipmentProtectionFee{Percent,Min}`/`saleProtectionFee{Percent,Min}`)
 *       move from `disabled={!xEnabled}` to a `when` predicate — HIDDEN
 *       while off, not just greyed out, same minor positive change already
 *       made on Branding's `maintenanceMessage`. `codHandlingFee{Percent,Cap}`
 *       has no toggle at all, by design (COD handling applies to every COD
 *       order; whether COD is offered is a different tab's field) — kept
 *       unconditional here too.
 *
 * EXPORTS: siteSettingsFeesFormSchema, type SiteSettingsFeesFormValues
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

const NOT_YET_BILLED_HELP =
  "Not charged yet — no billing path exists for seller listing fees. Setting a value records the intended price; nothing collects it.";

export const siteSettingsFeesFormSchema = z.object({
  platformFeePercent: annotate(z.number().min(0).max(100), {
    section: "fees", sectionLabel: "Fees & Commissions", sectionRequired: true,
    order: 1, label: "Platform fee — our cut (%)",
    help: "% charged on order value. Buyer pays this.",
  }),
  gstPercent: annotate(z.number().min(0).max(100), {
    section: "fees", order: 2, label: "GST on platform fee (%)",
    help: "Applied to our fee only (not full order). Usually 18%.",
  }),
  gatewayFeePercent: annotate(z.number().min(0).max(10), {
    section: "fees", order: 3, label: "PhonePe gateway cost (%)",
    help: "Gateway's own fee — absorbed by platform, not passed through.",
  }),
  minimumTransactionFee: annotate(z.number().min(0), {
    section: "fees", order: 4, label: "Minimum transaction fee (₹)",
    help: "Per-transaction floor. Total charge will never be below base + this.",
  }),
  platformFeeMax: annotate(z.number().min(0), {
    section: "fees", order: 5, label: "Maximum platform fee (₹)",
    help: "Ceiling on the buyer's platform commission, charged once per checkout on every payment method. GST is calculated on the capped amount.",
  }),
  payoutHoldDays: annotate(z.number().min(0), {
    section: "fees", order: 6, label: "Seller payout hold (days)",
  }),
  minPayoutAmount: annotate(z.number().min(0), {
    section: "fees", order: 7, label: "Minimum payout amount (₹)",
  }),
  collectorDropListingFee: annotate(z.number().min(0), {
    section: "fees", order: 8, label: "Collector Drop listing fee (₹)",
    help: NOT_YET_BILLED_HELP,
  }),
  preOrderListingFee: annotate(z.number().min(0), {
    section: "fees", order: 9, label: "Pre-order listing fee (₹)",
    help: NOT_YET_BILLED_HELP,
  }),
  featuredSlotFee: annotate(z.number().min(0), {
    section: "fees", order: 10, label: "Featured slot fee (₹)",
    help: `${NOT_YET_BILLED_HELP} /admin/deals sets isPromoted for free today.`,
  }),
  promotedSlotFee: annotate(z.number().min(0), {
    section: "fees", order: 11, label: "Promoted slot fee (₹)",
    help: `${NOT_YET_BILLED_HELP} /admin/deals sets isPromoted for free today.`,
  }),
  codDepositPercent: annotate(z.number().min(0).max(100), {
    section: "fees", order: 12, label: "COD deposit (%)",
    help: "% of order collected upfront on COD orders; remainder paid on delivery.",
  }),

  whatsappNotifyFeeEnabled: annotate(z.boolean(), {
    section: "fees", order: 13, row: "full", kind: "toggle",
    label: "Offer the WhatsApp order-updates addon at checkout",
  }),
  whatsappNotifyFee: annotate(z.number().min(0), {
    section: "fees", order: 14, row: "full", label: "WhatsApp addon fee (₹)",
    help: "Flat fee charged to the buyer when they opt in. Requires WhatsApp credentials + at least one approved template — see the WhatsApp tab.",
    when: (values) => Boolean(values.whatsappNotifyFeeEnabled),
  }),

  giftWrapFeeEnabled: annotate(z.boolean(), {
    section: "fees", order: 15, row: "full", kind: "toggle",
    label: "Offer the gift-wrap addon at checkout",
  }),
  giftWrapFee: annotate(z.number().min(0), {
    section: "fees", order: 16, row: "full", label: "Gift wrap fee (₹)",
    help: "Flat fee charged to the buyer when they opt in.",
    when: (values) => Boolean(values.giftWrapFeeEnabled),
  }),

  shipmentProtectionFeeEnabled: annotate(z.boolean(), {
    section: "fees", order: 17, row: "full", kind: "toggle",
    label: "Offer the shipment-protection addon at checkout",
  }),
  shipmentProtectionFeePercent: annotate(z.number().min(0).max(100), {
    section: "fees", order: 18, label: "Shipment protection (%)",
    help: "% of order subtotal, charged when the buyer opts in.",
    when: (values) => Boolean(values.shipmentProtectionFeeEnabled),
  }),
  shipmentProtectionFeeMin: annotate(z.number().min(0), {
    section: "fees", order: 19, label: "Shipment protection minimum (₹)",
    help: "Floor for the shipment-protection fee.",
    when: (values) => Boolean(values.shipmentProtectionFeeEnabled),
  }),

  saleProtectionFeeEnabled: annotate(z.boolean(), {
    section: "fees", order: 20, row: "full", kind: "toggle",
    label: "Offer the sale-protection addon at checkout",
  }),
  saleProtectionFeePercent: annotate(z.number().min(0).max(100), {
    section: "fees", order: 21, label: "Sale protection (%)",
    help: "% of order subtotal, charged when the buyer opts in. Covers the item against not-as-described and counterfeit claims.",
    when: (values) => Boolean(values.saleProtectionFeeEnabled),
  }),
  saleProtectionFeeMin: annotate(z.number().min(0), {
    section: "fees", order: 22, label: "Sale protection minimum (₹)",
    help: "Floor for the sale-protection fee.",
    when: (values) => Boolean(values.saleProtectionFeeEnabled),
  }),

  /*
   * No enable toggle, deliberately — COD handling applies to every COD
   * order; whether COD is offered at all is `payment.codEnabled` on a
   * different tab.
   */
  codHandlingFeePercent: annotate(z.number().min(0).max(100), {
    section: "fees", order: 23, label: "COD handling fee (%)",
    help: "% of order subtotal, charged on Cash-on-Delivery orders only.",
  }),
  codHandlingFeeCap: annotate(z.number().min(0), {
    section: "fees", order: 24, label: "COD handling fee cap (₹)",
    help: "Ceiling for the COD handling fee, however large the order.",
  }),
});

export type SiteSettingsFeesFormValues = z.infer<typeof siteSettingsFeesFormSchema>;
