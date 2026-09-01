/**
 * FAQ category → display label.
 *
 * Single owner. This map previously existed twice, byte-identical: once inline
 * in `lib/section-renderer.tsx` and once as `CATEGORY_LABELS` in
 * `components/FAQSection.tsx`. Adding a category meant two commits or a silent
 * disagreement between the homepage strip's tabs and the section's own — the
 * Duplication Framework's "bug-fix multiplier" trigger.
 *
 * Keyed loosely (`Record<string, string>`) rather than on `FAQCategoryKey`
 * on purpose: `FAQCategoryKey` (7 values) and `FAQCategory` (8, including
 * `scam_awareness`) have already drifted apart, and an unknown key here falls
 * back to rendering the raw key rather than crashing a tab bar.
 */
export const FAQ_CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  orders_payment: "Orders & Payment",
  shipping_delivery: "Shipping",
  returns_refunds: "Returns & Refunds",
  product_information: "Products",
  account_security: "Account",
  technical_support: "Support",
};
