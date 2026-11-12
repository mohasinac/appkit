/*
 * WHY: `AdminSiteSettingsView`'s Shipping tab (⑨, "Payment methods" +
 *      "Shipping Defaults" + "Seller shipping charge defaults" sub-groups) —
 *      tenth tab migrated to the Universal Template System (Phase 3B, admin
 *      site-settings form rebuild, 2026-11-04). Fourteen `useState` calls.
 *
 *      Deliberately SEPARATE from `siteSettingsFormSchema` (render-only vs.
 *      save-time validation — see the Branding schema's header for the full
 *      reasoning, unchanged here).
 *
 * WHAT: Flat field names matching the component's own state, writing into
 *       THREE save-payload groups in `buildFullPayload()`:
 *         - `payment.{razorpayEnabled,phonepeEnabled,cashfreeEnabled,
 *           platformStoreId,codEnabled,codMaxOrderValue,
 *           otpCheckoutThreshold}` (`platformStoreId` keeps its
 *           `.trim() || undefined` transform — see `buildFullPayload()`)
 *         - `shipping.{freeShippingThreshold,defaultCarrier,maxDeliveryRadius}`
 *         - `commissions.{sellerShippingFixed,platformShippingPercent,
 *           platformShippingFixedMin}` — the SAME `commissions` object the
 *           Fees tab's schema writes the other 24 keys of; Fees's
 *           `buildFullPayload()` spread (`{...feesForm, sellerShippingFixed,
 *           platformShippingPercent, platformShippingFixedMin}`) now reads
 *           those three from THIS form's state instead of bare `useState`
 *           vars — the cross-tab seam this migration already documented in
 *           the Fees schema's own header, now closed from the other side.
 *
 * `codMaxOrderValue`'s original `disabled={!codEnabled}` became a `when`
 * predicate (hidden, not greyed) — same minor positive change already made
 * on Branding's `maintenanceMessage`. `defaultCarrier`'s option labels
 * ("Custom / Other", "Shiprocket", …) pass via `buildSectionsFromSchema`'s
 * `opts.options`, same as the Notifications tab's priority selects, because
 * the original `CARRIER_OPTIONS` copy doesn't match bare-value
 * humanisation. `CARRIER_OPTIONS` itself moved to module scope in the
 * component (beside the pre-existing `PRIORITY_OPTIONS`) so it's available
 * at the point `buildSectionsFromSchema` is called — `opts.options` is a
 * plain object evaluated eagerly, unlike a `renderers` function value,
 * which only runs later when React actually renders the field.
 *
 * Two pure sub-heading labels from the original JSX ("Payment methods",
 * "Seller shipping charge defaults") were NOT preserved — they carried no
 * information the field labels immediately below them didn't already
 * convey, unlike every other dropped prose block elsewhere in this
 * rollout, which always carried real explanatory content moved to `help`.
 *
 * EXPORTS: siteSettingsShippingFormSchema, type SiteSettingsShippingFormValues
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

export const siteSettingsShippingFormSchema = z.object({
  razorpayEnabled: annotate(z.boolean(), {
    section: "shipping", sectionLabel: "Shipping", sectionRequired: true,
    order: 1, row: "full", kind: "toggle",
    label: "Razorpay (online card/UPI/netbanking) enabled",
    help: "Needs Key ID + Key Secret under Credentials.",
  }),
  phonepeEnabled: annotate(z.boolean(), {
    section: "shipping", order: 2, row: "full", kind: "toggle",
    label: "PhonePe (online card/UPI) enabled",
    help: "When several are on, the first in the Razorpay → PhonePe → Cashfree order is the DEFAULT; carts needing split settlement still go to Cashfree.",
  }),
  cashfreeEnabled: annotate(z.boolean(), {
    section: "shipping", order: 3, row: "full", kind: "toggle",
    label: "Cashfree Payments enabled",
    help: "Needs App ID + Secret Key under Credentials. Last in the default order, but REQUIRED for any cart holding another seller's items: it is the only gateway that pays each seller directly at capture. Leave it off and those carts cannot be paid online at all.",
  }),
  /*
   * 🛑 A free-text store id rather than a picker, deliberately. This view
   * loads no store list, and the cost of a typo is FAIL-CLOSED and loud —
   * an id naming no real store behaves exactly like a blank one, so every
   * cart becomes third-party and online payment is refused with a reason,
   * which an admin notices immediately. A picker would be nicer; a wrong
   * default would be dangerous, and that is the trade this field is placed
   * on. Defaults to EMPTY, which means "every store is third-party" — the
   * fail-closed direction; it must never be helpfully pre-filled.
   */
  platformStoreId: annotate(z.string().trim().optional().or(z.literal("")), {
    section: "shipping", order: 4, row: "full", label: "Platform's own store ID",
    help: "The one store whose stock this business may collect payment for into its own account. LEAVE BLANK AND NO CART CAN BE PAID ONLINE: any cart holding another seller's items must be collected by a gateway that settles their share directly to them at capture (Cashfree Easy Split), because a non-splitting capture puts their money in this business's account first. Blank means every store counts as another seller's. e.g. store-your-official-slug.",
  }),
  codEnabled: annotate(z.boolean(), {
    section: "shipping", order: 6, row: "full", kind: "toggle",
    label: "Cash on delivery (COD) enabled",
  }),
  freeShippingThreshold: annotate(z.number().min(0), {
    section: "shipping", order: 7, label: "Free shipping threshold (₹)",
    help: "Orders above this amount get free shipping.",
  }),
  defaultCarrier: annotate(z.string(), {
    section: "shipping", order: 8, kind: "select", label: "Default carrier",
  }),
  maxDeliveryRadius: annotate(z.number().min(0), {
    section: "shipping", order: 9, label: "Max delivery radius (km, 0 = no limit)",
  }),
  /*
   * 🛑 A MAXIMUM, sitting directly above a THRESHOLD (`otpCheckoutThreshold`)
   * that is a minimum. The help text says which way each one runs, because
   * the two fields look identical and mean opposite things — and getting it
   * backwards here either refuses every COD order or refuses none.
   */
  codMaxOrderValue: annotate(z.number().min(0), {
    section: "shipping", order: 10, label: "COD maximum order value (₹)",
    help: "Carts ABOVE this subtotal cannot pay by cash on delivery; the option is shown disabled with the reason. 0 = COD off for every cart.",
    when: (values) => Boolean(values.codEnabled),
  }),
  otpCheckoutThreshold: annotate(z.number().min(0), {
    section: "shipping", order: 11, label: "High-value checkout OTP threshold (₹)",
    help: "Carts at or above this subtotal require an extra OTP verification step before payment (0 = disabled).",
  }),
  sellerShippingFixed: annotate(z.number().min(0), {
    section: "shipping", order: 12, label: "Seller shipping fixed (₹)",
    help: "Flat shipping charge collected on the seller's behalf.",
  }),
  platformShippingPercent: annotate(z.number().min(0).max(100), {
    section: "shipping", order: 13, label: "Platform shipping (%)",
    help: "Platform's own shipping markup, as a % of order value.",
  }),
  platformShippingFixedMin: annotate(z.number().min(0), {
    section: "shipping", order: 14, label: "Platform shipping minimum (₹)",
    help: "Floor for the platform shipping markup.",
  }),
});

export type SiteSettingsShippingFormValues = z.infer<typeof siteSettingsShippingFormSchema>;
