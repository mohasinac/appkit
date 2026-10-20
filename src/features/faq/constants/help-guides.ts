import type { FAQCategory } from "../types/index";

/**
 * The Help Centre guide that answers a FAQ category at length.
 *
 * A FAQ is a short answer to one question; a help guide is the surrounding
 * explanation. They were written as separate surfaces and never linked —
 * measured 2026-10-20, the FAQ seed contained **zero** `/help/` links across
 * 91 entries — so a reader who wanted the fuller version had to already know
 * the Help Centre existed and find the right page in it.
 *
 * 🛑 `Record<FAQCategory, …>`, deliberately, so adding a tenth category is a
 * COMPILE error rather than a category that silently offers no guide. This is
 * the same decision as `ALL_LISTING_TYPES_MAP` and `EMAIL_ELIGIBLE_TYPES`, and
 * the reason is Root Cause #61: every hand-written enumeration of a union in
 * this codebase has eventually fallen behind it.
 *
 * `null` is a real answer and not a gap. `technical_support` and `general`
 * span the whole product, so pointing them at one guide would be arbitrary —
 * they get the Help Centre index instead, via `HELP_INDEX_PATH`. Writing a
 * guide to point them at later is a content decision, not a missing entry.
 *
 * 🛑 Paths, not `ROUTES`. The Help Centre pages are consumer routes under
 * `src/app/[locale]/help/`, and `ROUTES` is appkit's own map — adding them
 * there would make appkit declare pages it does not own. They are stable,
 * linked from the footer, and covered by `audit-nav-page-wiring`.
 */
export const HELP_INDEX_PATH = "/help" as const;

/**
 * The orders guide, named once because THREE categories share it.
 *
 * `orders_payment`, `shipping_delivery` and `returns_refunds` all resolve to
 * the same page — see the per-entry notes below for why — so the path and the
 * label were written out three times each. Extracted so a retitle is one edit
 * rather than three, and so the three cannot drift into disagreeing labels for
 * one destination.
 */
const ORDERS_GUIDE = {
  path: "/help/orders",
  label: "Orders, Returns & Support guide",
} as const;

export const FAQ_CATEGORY_HELP_GUIDE: Record<
  FAQCategory,
  { path: string; label: string } | null
> = {
  orders_payment: ORDERS_GUIDE,
  // Shipping questions are about an order in flight, which is what the orders
  // guide covers end to end. A separate shipping guide does not exist, and a
  // link to one that did not would be worse than this.
  shipping_delivery: ORDERS_GUIDE,
  returns_refunds: ORDERS_GUIDE,
  // "Is my Beyblade original?" — the vocabulary behind most questions about
  // what an item actually is.
  product_information: { path: "/help/authenticity", label: "Is my Beyblade original?" },
  account_security: { path: "/help/account", label: "Account & Safety guide" },
  // Safety, not shopping: the account guide is where reporting and blocking
  // live.
  scam_awareness: { path: "/help/account", label: "Account & Safety guide" },
  fees_and_taxes: { path: "/help/shopping", label: "Shopping & Checkout guide" },
  technical_support: null,
  general: null,
};

/** The guide for a category, or the Help Centre index when none is specific. */
export function helpGuideFor(category: FAQCategory): { path: string; label: string } {
  return (
    FAQ_CATEGORY_HELP_GUIDE[category] ?? {
      path: HELP_INDEX_PATH,
      label: "Help Centre",
    }
  );
}
