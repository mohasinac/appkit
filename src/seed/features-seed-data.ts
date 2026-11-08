/**
 * THE GLOBAL FEATURE LIST — the bullet points a listing or store may claim.
 *
 * Owner, 2026-11-08: *"limit features to 5 per actual listing, and max out for
 * 20 custom for store, and create a global list so that a seller or vendor
 * cannot spam all features on the listings and rename it to something else."*
 *
 * Two separate abuses are being closed here, and they need different locks:
 *
 * 1. **Spam** — a seller ticking every feature so their card out-shouts the
 *    one beside it. Closed by a HARD CAP of 5 per listing, enforced at save.
 * 2. **Renaming** — a seller taking the platform's "100% original guaranteed"
 *    badge and relabelling it "Cheapest in India". Closed by making the global
 *    features read-only: a seller SELECTS from the list, they do not author it.
 *
 * Custom features exist because a real store has real claims the platform list
 * will not cover ("we restring every launcher before dispatch"). They are
 * capped at 20 per STORE — not per listing — so the cost of a custom claim is
 * paid once and reused, rather than invented per listing.
 *
 * 🛑 Platform-verified features are a third class and are never seller-settable
 * at all: "verified authentic" is a claim the PLATFORM makes after a check, and
 * a seller who could tick it has been handed the thing the badge exists to
 * prove.
 *
 * Mocks: `mocks/10-forms.qm` (listing form), `mocks/13-vendor.qm` (storefront).
 */

export type FeatureScope = "listing" | "store" | "both";

export interface FeatureDefinition {
  /** Stable key. The LABEL is platform content; a seller never edits either. */
  id: string;
  label: string;
  scope: FeatureScope;
  /** Grouped in the picker so 40 options do not read as one list. */
  group: "trust" | "fulfilment" | "service" | "product" | "community";
  /**
   * True when only the platform may apply it, after its own check. Absent from
   * the seller picker entirely — not greyed out.
   */
  platformVerifiedOnly?: boolean;
  /**
   * A feature that asserts something checkable. If the underlying fact stops
   * being true the badge is withdrawn automatically rather than by complaint.
   */
  derivedFrom?: string;
}

export const featuresSeedData: FeatureDefinition[] = [
  // ── trust ────────────────────────────────────────────────────────────────
  { id: "authentic-verified", label: "Verified authentic", scope: "listing", group: "trust", platformVerifiedOnly: true, derivedFrom: "listing.authenticityProof" },
  { id: "verified-seller", label: "Verified seller", scope: "store", group: "trust", platformVerifiedOnly: true, derivedFrom: "store.kycVerified" },
  { id: "original-guaranteed", label: "100% original guaranteed", scope: "both", group: "trust" },
  { id: "imported", label: "Imported", scope: "listing", group: "trust" },
  { id: "photos-of-actual-item", label: "Photos are of the actual item", scope: "listing", group: "trust" },
  { id: "serial-checked", label: "Serial / mould checked", scope: "listing", group: "trust" },

  // ── fulfilment ───────────────────────────────────────────────────────────
  { id: "ships-24h", label: "Ships within 24 hours", scope: "both", group: "fulfilment", derivedFrom: "store.dispatchSlaHours" },
  { id: "free-shipping", label: "Free shipping", scope: "listing", group: "fulfilment", derivedFrom: "shipping.freeAbove" },
  { id: "insured-shipping", label: "Insured shipping", scope: "both", group: "fulfilment", derivedFrom: "shipping.insured" },
  { id: "safe-packing", label: "Bubble-wrapped and boxed", scope: "both", group: "fulfilment" },
  { id: "local-pickup", label: "Local pickup available", scope: "store", group: "fulfilment" },
  { id: "same-day-dispatch", label: "Same-day dispatch before 2pm", scope: "store", group: "fulfilment" },

  // ── service ──────────────────────────────────────────────────────────────
  { id: "returns-7day", label: "7-day returns", scope: "listing", group: "service", derivedFrom: "listingType.returnsAllowed" },
  { id: "warranty", label: "Seller warranty", scope: "listing", group: "service" },
  { id: "support-whatsapp", label: "WhatsApp support", scope: "store", group: "service" },
  { id: "gift-wrap", label: "Gift wrapping available", scope: "store", group: "service" },
  { id: "invoice-gst", label: "GST invoice provided", scope: "store", group: "service", derivedFrom: "store.gstin" },

  // ── product ──────────────────────────────────────────────────────────────
  { id: "sealed", label: "Factory sealed", scope: "listing", group: "product", derivedFrom: "listing.condition" },
  { id: "complete-in-box", label: "Complete in box", scope: "listing", group: "product" },
  { id: "stickers-unapplied", label: "Stickers unapplied", scope: "listing", group: "product" },
  { id: "rare", label: "Rare / out of production", scope: "listing", group: "product" },
  { id: "first-run", label: "First run", scope: "listing", group: "product" },
  { id: "tournament-legal", label: "Tournament legal", scope: "listing", group: "product" },

  // ── community ────────────────────────────────────────────────────────────
  { id: "supports-events", label: "Sponsors community events", scope: "store", group: "community" },
  { id: "since-year", label: "Selling since {year}", scope: "store", group: "community", derivedFrom: "store.createdAt" },
];

/**
 * The caps. Config, so raising them is an admin edit — but they exist for a
 * reason and raising them should be an argued decision, not a convenience.
 */
export const featureCapsSeedData = {
  /** Hard cap per listing. Enforced at SAVE, not at render. */
  maxPerListing: 5,
  /** Custom features a store may author, reusable across its listings. */
  maxCustomPerStore: 20,
  /** A custom feature may also only be applied within the per-listing cap. */
  customCountsTowardListingCap: true,
  /** Platform-verified features do NOT consume the seller's 5. */
  platformVerifiedCountsTowardCap: false,
  /** Custom labels are moderated before they appear publicly. */
  customRequiresModeration: true,
  /** Length limit on a custom label, so it cannot become a paragraph. */
  customLabelMaxChars: 48,
};

/**
 * What a seller may and may not do, stated so the editor can be built from it
 * rather than from a conversation.
 */
export const featureRulesSeedData = [
  { rule: "Select from the global list", allowed: true, note: "The picker is grouped and searchable." },
  { rule: "Rename a global feature", allowed: false, note: "Labels are platform content. This is the anti-spoofing lock." },
  { rule: "Reorder their own selections", allowed: true, note: "Order is presentation." },
  { rule: "Author a custom feature", allowed: true, note: "Up to 20 per store, moderated, ≤48 chars." },
  { rule: "Apply more than 5 to one listing", allowed: false, note: "Hard cap at save — the anti-shouting lock." },
  { rule: "Apply a platform-verified feature", allowed: false, note: "The platform applies these after its own check." },
  { rule: "Keep a feature whose fact stopped being true", allowed: false, note: "Derived features are withdrawn automatically." },
];

for (const f of featuresSeedData) {
  if (f.platformVerifiedOnly && !f.derivedFrom) {
    throw new Error(`feature "${f.id}" is platform-verified but names no fact it derives from`);
  }
}

export const featuresSeedDataBundle = {
  features: featuresSeedData,
  caps: featureCapsSeedData,
  rules: featureRulesSeedData,
};
