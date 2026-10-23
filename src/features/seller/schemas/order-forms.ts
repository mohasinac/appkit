/*
 * WHY: The seller's "Update order" panel wrote a status change, a tracking
 *      number, a carrier and a tracking URL with no schema at all — the one
 *      form in the seller dashboard that changes what a BUYER sees about a
 *      shipment they are waiting on.
 *
 *      Two rules were missing, both invisible until a buyer complained. A
 *      tracking URL was a free string, so a typo'd or non-http value went
 *      straight into the tracking link a buyer clicks. And a status could move
 *      to `shipped` with no tracking number at all — the seller's own carrier
 *      fields sat right there, empty, and nothing said so.
 *
 * WHAT: The four fields the panel offers, annotated for
 *       `buildSectionsFromSchema`.
 *
 * EXPORTS:
 *   sellerOrderUpdateSchema, type SellerOrderUpdateValues
 *
 * @tag domain:seller,orders
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:SellerOrderDetailPanel
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import { normalizeError } from "../../../errors/normalize";

/**
 * 🛑 `""` is a real, meaningful value here — it is "keep the current status",
 * which is what the panel's first option means and what its diff-against-the-
 * loaded-order payload relies on. It is not an empty required field.
 */
export const sellerOrderUpdateSchema = z
  .object({
    status: annotate(
      z.enum(["", "confirmed", "processing", "shipped", "delivered", "cancelled"]),
      {
        section: "status", sectionLabel: "Update order", sectionRequired: true,
        quick: true, order: 1, row: "full", kind: "select", label: "New status",
      },
    ),
    trackingNumber: annotate(z.string().trim().max(120).optional().or(z.literal("")), {
      section: "shipping", sectionLabel: "Shipment", order: 1, row: "pair",
      label: "Tracking number",
    }),
    carrier: annotate(z.string().trim().max(80).optional().or(z.literal("")), {
      section: "shipping", order: 2, row: "pair",
    }),
    trackingUrl: annotate(z.string().trim().max(2000).optional().or(z.literal("")), {
      section: "shipping", order: 3, row: "full", inputType: "url",
      label: "Tracking URL (optional)",
    }),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    // Marking an order shipped is what starts the buyer's "where is it"
    // question, and the field that answers it is on this same panel.
    if (v.status === "shipped" && !v.trackingNumber?.trim()) {
      issue("trackingNumber", "A shipped order needs a tracking number.");
    }

    const url = v.trackingUrl?.trim();
    if (url) {
      let parsed: URL | null = null;
      try {
        parsed = new URL(url);
      } catch (err) {
        void normalizeError(err);
        parsed = null;
      }
      if (!parsed) issue("trackingUrl", "That is not a valid URL.");
      else if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        issue("trackingUrl", "A tracking URL must start with http or https.");
      }
    }
  });

export type SellerOrderUpdateValues = z.infer<typeof sellerOrderUpdateSchema>;

/*
 * ── Two schemas lifted out of a `"use server"` module, 2026-10-17 ──
 *
 * `shipOrderSchema` and `markEmiInstallmentPaidSchema` were declared privately
 * inside `src/actions/seller.actions.ts`. The actions safe-parse with them, so
 * the rule WAS enforced — but their routes could not reach it: a `"use server"`
 * module may only export async functions, so a schema declared there is
 * unexportable by construction.
 *
 * The consequence was that `POST /api/store/orders/[id]/ship` and
 * `PATCH .../emi-installment` both did `parseJsonBody(…).catch(() => ({}))`
 * and handed the result on `as never` — a route reading a body it could not
 * validate, with the real check an import away and unreachable.
 *
 * Declared here so the route and the action share ONE definition rather than
 * two copies that drift (Root Cause #75). The action keeps its own `safeParse`:
 * it is also called directly from a server action, where no route ran first.
 */

/**
 * Shipment entry — manual, or booked through the platform.
 *
 * 🛑 **`method` was `z.literal("custom")`, and that literal WAS bug 0e.**
 *
 * Its comment said *"a literal rather than an enum because
 * `ManualShippingProvider` is the only provider"* — no longer true:
 * `providers/shipping-shiprocket/` is 570 lines with all six methods, and
 * `providers.config.ts` already resolves it from
 * `siteSettings.shipping.provider`. The seller simply could not EXPRESS
 * "book this through us", so there was no option to offer, and
 * `platformBookedShipment` — which `order-math.ts` gates reimbursement on —
 * had zero writers.
 *
 * A DISCRIMINATED UNION rather than an enum plus optional fields, because
 * the two branches need different things and an optional-everything shape
 * cannot say so:
 *
 * · `custom` — the seller posted it and types the carrier and tracking id.
 *   Those are REQUIRED, which is the rule enforced in three places today.
 * · `platform` — we book it, so there is no tracking id to type; it comes
 *   back from the carrier. Requiring one here would be asking the seller to
 *   invent the thing the booking produces.
 */
export const shipOrderSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("custom"),
    shippingCarrier: z.string().min(1),
    trackingNumber: z.string().min(1),
    trackingUrl: z.string().url(),
  }),
  z.object({
    method: z.literal("platform"),
    /* The store address the courier collects from. */
    pickupAddressId: z.string().min(1),
    dimensions: z.object({
      weight: z.number().positive().max(50),
      length: z.number().positive().max(200),
      width: z.number().positive().max(200),
      height: z.number().positive().max(200),
    }),
  }),
]);

export type ShipOrderValues = z.infer<typeof shipOrderSchema>;

/**
 * Marking one EMI installment paid. `installmentIndex` is 1-based, matching
 * how the schedule is presented to the buyer.
 */
export const markEmiInstallmentPaidSchema = z.object({
  installmentIndex: z.number().int().min(1),
  transactionId: z.string().min(1).optional(),
  proofUrl: z.string().min(1).optional(),
});

export type MarkEmiInstallmentPaidValues = z.infer<typeof markEmiInstallmentPaidSchema>;
