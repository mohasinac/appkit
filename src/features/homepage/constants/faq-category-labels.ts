/**
 * FAQ category → display label, for the homepage strip's tab bar.
 *
 * Single owner. This map previously existed twice, byte-identical: once inline
 * in `lib/section-renderer.tsx` and once as `CATEGORY_LABELS` in
 * `components/FAQSection.tsx`. Adding a category meant two commits or a silent
 * disagreement between the homepage strip's tabs and the section's own — the
 * Duplication Framework's "bug-fix multiplier" trigger.
 *
 * 🛑 It is now DERIVED from the canonical map rather than hand-written, and
 * that is the fix to a real defect rather than tidying.
 *
 * Its previous docstring said it was keyed loosely "on purpose" because
 * `FAQCategoryKey` (7 values) and `FAQCategory` (8) "have already drifted
 * apart, and an unknown key here falls back to rendering the raw key rather
 * than crashing a tab bar". That reasoning accepted the drift instead of
 * closing it — and the consequence was visible: a tab for a category this map
 * did not know rendered its raw slug as the label (`shipping_delivery` rather
 * than "Shipping & Delivery"). By the time `scam_awareness` and
 * `fees_and_taxes` existed, it was two keys behind.
 *
 * `FAQ_CATEGORY_LABELS` in `features/faq/schemas/firestore.ts` is a
 * `Record<FAQCategory, string>`, so a tenth category is a COMPILE ERROR there
 * and arrives here for free. The loose `Record<string, string>` type is kept
 * on the export because the renderer still indexes it with a value read from
 * Firestore, which no type can promise is a union member — the `?? cat`
 * fallback at the call sites stays as the last line of defence for a stored
 * value written before a category was renamed.
 */
import { FAQ_CATEGORY_LABELS as CANONICAL_FAQ_CATEGORY_LABELS } from "../../faq/schemas/firestore";

export const FAQ_CATEGORY_LABELS: Record<string, string> = CANONICAL_FAQ_CATEGORY_LABELS;
