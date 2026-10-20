/**
 * Who is the supplier of record on this order's invoice.
 *
 * ── The rule ──────────────────────────────────────────────────────────────
 *
 * A seller WITH their own GSTIN invoices under it. A seller WITHOUT one
 * invoices under LetItRip's. The official store carries its own, so it is the
 * first case rather than a special case.
 *
 * ── Why this is one function ──────────────────────────────────────────────
 *
 * 🛑 It would be two lines to write `store?.gstin ?? settings.gst?.gstin` at
 * the call site, and that is exactly how Root Cause #75 happened: a money rule
 * described as "the single source of truth" that was reachable by copy-paste,
 * got copied four times, and two copies never learned about a branch added
 * later — so Razorpay captured the list price for an accepted offer. Grepping
 * for a FUNCTION name finds every caller; grepping for the SHAPE of an
 * expression does not.
 *
 * The three fields also have to move TOGETHER. A GSTIN printed under the wrong
 * legal name is a worse invoice than no GSTIN at all, so this never mixes a
 * seller's GSTIN with the platform's name — see `resolve` below.
 *
 * ── Why it is snapshot, not looked up ─────────────────────────────────────
 *
 * The caller writes the result onto `OrderDocument.supplierGstin` /
 * `supplierLegalName` / `supplierAddress` at creation and never recomputes it.
 * `OrderDocument`'s own comment is explicit that these are "OUR GST
 * registration as it stood at the moment of supply" — an admin correcting a
 * typo in the GSTIN must not silently reissue every invoice ever produced.
 */

import type { StoreDocument } from "../../../../features/stores/schemas/firestore";
import type { SiteSettingsDocument } from "../../../../features/admin/schemas/firestore";
import { getPlatformSupplier } from "../../../shared/features/site-settings/supplier-of-record";

export interface SupplierIdentity {
  gstin?: string;
  legalName?: string;
  address?: string;
  /**
   * Which party the invoice is issued by.
   *
   * Not decoration: the invoice renderers use it to decide whether to say
   * "Tax Invoice", and an operator reading an order needs to know which
   * registration was applied without re-deriving the rule.
   */
  source: "seller" | "platform" | "none";
}

const trimmed = (v: string | undefined | null): string | undefined => {
  const s = (v ?? "").trim();
  return s.length > 0 ? s : undefined;
};

/**
 * Resolve the supplier identity for an order from `store`.
 *
 * Returns `source: "none"` when GST is disabled or the platform has no GSTIN
 * configured and the seller has none either. A caller must treat that as "this
 * is not a tax invoice" rather than as an error — GST is genuinely optional
 * and `siteSettings.gst.enabled` defaults to false.
 */
export function resolveSupplierIdentity(
  store: Pick<StoreDocument, "gstin" | "legalName" | "registeredAddress"> | null | undefined,
  settings: Pick<SiteSettingsDocument, "gst"> | null | undefined,
): SupplierIdentity {
  const sellerGstin = trimmed(store?.gstin);

  /*
   * Seller branch. Taken on the GSTIN alone, and the legal name and address
   * come from the SELLER too — falling back to the platform's for a missing
   * name would print LetItRip's legal entity beside the seller's registration,
   * which identifies neither party correctly.
   *
   * A seller with a GSTIN and no legal name is a data gap worth seeing as a
   * blank on the invoice, not one worth papering over with the wrong name.
   */
  if (sellerGstin) {
    return {
      gstin: sellerGstin,
      legalName: trimmed(store?.legalName),
      address: trimmed(store?.registeredAddress),
      source: "seller",
    };
  }

  /*
   * Platform branch. Still gated on `gst.enabled` — disabling GST must
   * continue to produce plain invoices rather than tax invoices, and
   * `source: "none"` must stay reachable.
   *
   * 🛑 But the IDENTITY now comes from `appkit.config.js → business`, not from
   * `siteSettings.gst.*`.
   *
   * That block documents itself as "THE one owner of the business's statutory
   * identity", and records that before it existed the legal name, address,
   * GSTIN and support channels lived in five places that already disagreed —
   * four different support addresses published, the registered address saying
   * Solapur while the warehouse said Hyderabad. Reading the GSTIN from site
   * settings here made this invoice path a SIXTH owner, and the one that
   * decides what a tax invoice says.
   *
   * `siteSettings.gst.enabled` stays the switch because whether to charge GST
   * at all is an operational decision an admin makes. WHO the supplier is, is
   * not: it is a fact about the registered entity, it is legally required to be
   * published, and it belongs in a committed, code-reviewed file.
   *
   * The snapshot contract is unchanged — the caller writes the result onto the
   * order at creation and never recomputes it, so correcting a typo in the
   * business block does not reissue historical invoices.
   */
  const gst = settings?.gst;
  if (gst?.enabled) {
    const platform = getPlatformSupplier();
    const platformGstin = trimmed(platform.gstin);
    if (platformGstin) {
      return {
        gstin: platformGstin,
        legalName: trimmed(platform.legalName),
        address: trimmed(platform.address),
        source: "platform",
      };
    }
  }

  return { source: "none" };
}
