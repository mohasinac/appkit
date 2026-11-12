/**
 * English fragmented paragraphs — the PARAGRAPH-shaped sibling of
 * `composite-sentences/en.ts` (1A-ii). A sentence needs Oxford-comma
 * grammar joining; a multi-paragraph body (each paragraph already a
 * complete, standalone clause) just needs the survivors concatenated —
 * `resolveFragmentedAnswer()` (`../fragments.ts`), already built for
 * admin-authored FAQ prose, does exactly that and is reused here unchanged
 * for STATIC developer-authored paragraph content.
 *
 * `Record<FragmentedParagraphId, ContentFragment[]>`, NOT `Partial` — same
 * compile-checked discipline as `SENTENCES_EN`.
 *
 * @tag domain:content
 * @tag layer:shared
 * @tag access:isomorphic
 * @tag sideEffects:none
 */
import type { ContentFragment } from "../fragments";

export type FragmentedParagraphId =
  | "cancellationPolicy.sections.3.body"
  | "privacy.payment"
  | "terms.payment"
  | "refundPolicy.payment";

export const PARAGRAPHS_EN: Record<FragmentedParagraphId, ContentFragment[]> = {
  /*
   * ── THE PAYMENT CLAIMS ────────────────────────────────────────────────────
   *
   * 🛑 These three exist because the APPROVED policy text (the compliance
   * branch, which serves production www) asserts COD-only in load-bearing
   * prose — *"Our only payment method is Cash on Delivery"*, *"We do not ask
   * for, collect, or store any card, UPI or bank account details on this
   * site"*. That is true of an install with no gateway and a **failure to
   * disclose** the moment one is enabled, which is an explicit R1 step.
   *
   * So the claim is not copy, it is a FUNCTION OF CONFIG. Each fragment is
   * governed by `paymentMethod: "online"`:
   *   gateway live -> `text`        (the both-tenders disclosure)
   *   COD-only     -> `whenHidden`  (the APPROVED wording, verbatim)
   *
   * ⚠ The `whenHidden` arms are the approved sentences unchanged. Do not
   * "improve" them — they are what was reviewed. The `text` arms are new and
   * carry the disclosure a card-accepting store owes.
   *
   * 🛑 And note which way the UNKNOWN case falls: `isOnlinePaymentEnabled`
   * answers `true` for an absent snapshot, so a failed settings read publishes
   * the FULLER disclosure rather than the COD-only claim. Over-disclosing is
   * harmless; under-disclosing on a money path is not.
   */
  "privacy.payment": [
    {
      governs: { governs: "paymentMethod", value: "online" },
      text: "Where you pay online, your card, UPI or netbanking details are entered with our payment provider and are processed by them under their own privacy terms. We receive confirmation that a payment succeeded, along with a transaction reference — we do not receive or store your full card number, UPI PIN or netbanking credentials. Where you pay by Cash on Delivery, no payment credential is involved at all.",
      whenHidden:
        "We do not ask for, process, or store card numbers, UPI IDs, bank account details or any other payment credential on this site. Our only payment method is Cash on Delivery, collected by our delivery partner at the time of delivery.",
    },
  ],
  "terms.payment": [
    {
      governs: { governs: "paymentMethod", value: "online" },
      text: "We accept Cash on Delivery and online payment. Online payments are taken by our payment provider; your card, UPI or netbanking details are entered with them and are not collected or stored by us. Cash on Delivery orders are paid in cash to our delivery partner at the time of delivery, for the exact amount shown on your invoice.",
      whenHidden:
        "We currently accept Cash on Delivery (COD) only. Payment is collected in cash by our delivery partner at the time of delivery. We do not ask for, collect, or store any card, UPI or bank account details on this site.",
    },
  ],
  "refundPolicy.payment": [
    {
      governs: { governs: "paymentMethod", value: "online" },
      text: "Where an order was paid online, an approved refund is returned to the original payment method, which can take a few working days to appear depending on your bank. Where an order was Cash on Delivery, no payment is collected until delivery — so a cancelled or refused order is never charged, and any refund we approve after delivery is paid by bank transfer or UPI to an account you provide.",
      whenHidden:
        "Since all orders are Cash on Delivery, no payment is collected until your order is delivered. No charge applies to a cancelled COD order, as no payment was taken, and a refused COD order is not charged. Any refund we approve is paid by bank transfer or UPI to an account you provide.",
    },
  ],
  "cancellationPolicy.sections.3.body": [
    {
      governs: { governs: "listingType", value: "collector-drop" },
      text: "A winning collector drop bid is a commitment to buy and cannot be cancelled by the buyer; failing to pay within the stated window forfeits the win.",
    },
    {
      governs: { governs: "listingType", value: "pre-order" },
      text: "Pre-orders can be cancelled before the item ships unless the listing states otherwise — some pre-orders are explicitly non-cancellable, and that is shown on the listing before you order.",
    },
    {
      governs: { governs: "listingType", value: "clearance" },
      text: "Prize-draw entries cannot be cancelled once the draw has closed.",
    },
  ],
};
