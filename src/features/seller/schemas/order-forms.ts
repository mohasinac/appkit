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
