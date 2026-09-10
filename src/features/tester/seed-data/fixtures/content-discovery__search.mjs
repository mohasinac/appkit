/*
 * Per-batch fixtures for content-discovery/search.
 *
 * These three rows exist because two cases were UNANSWERABLE BY CONSTRUCTION
 * without them, and a tester said so in as many words:
 *
 *   search-typeahead-no-drafts    "the suggestion payload exposes only objectID,
 *                                  type, title, subtitle and url — there is no
 *                                  status field to inspect — and I could not
 *                                  identify a known draft or archived listing to
 *                                  probe with"
 *   search-finds-older-records    "the catalogue on this environment was freshly
 *                                  seeded, so every product carries current
 *                                  search tokens and there is no older record"
 *
 * There is no draft or archived product anywhere in `appkit/src/seed/**` — every
 * seeded product is published. And a fresh seed cannot, by definition, contain a
 * record that predates the search backfill. Both gaps are the same shape: the
 * ordinary catalogue has no reason to hold a deliberately-broken row, so the
 * batch makes one, uses it, and removes it.
 *
 * 🛑 NO WINDOW HELPER HERE ON PURPOSE. `createdAt` below is an absolute offset
 * from seed time, not a fraction of TESTER_WINDOW_MINUTES. Audit R4 requires the
 * window import for the long-lived sandbox seed and forbids it here — see the
 * header of lib/fixtures.mjs for why the two rules point in opposite directions.
 */

import { at } from "../../../../../../tester/scripts/lib/fixtures.mjs";

const STORE = "store-beyblade-arena";

export const fixtures = [
  {
    collection: "products",
    id: "product-{{w}}-draft-probe",
    data: () => ({
      id: "product-{{w}}-draft-probe",
      slug: "product-{{w}}-draft-probe",
      title: "Draftprobe Hidden Listing",
      description:
        "A draft listing that must never reach a public suggestion list. Created for one batch and removed after it.",
      // The word the case searches for. Distinctive enough that a match cannot
      // be a coincidence from the ordinary catalogue.
      searchTokens: ["draftprobe", "hidden", "listing"],
      status: "draft",
      listingType: "standard",
      price: 499,
      currency: "INR",
      stockQuantity: 1,
      condition: "new",
      storeId: STORE,
      mainImage: "/test-media/sample-image.png",
      images: [],
      categorySlugs: ["category-beyblade-burst"],
      isTestData: true,
      createdAt: at.hoursAgo(1),
      updatedAt: at.hoursAgo(1),
    }),
  },
  {
    collection: "products",
    id: "product-{{w}}-archived-probe",
    data: () => ({
      id: "product-{{w}}-archived-probe",
      slug: "product-{{w}}-archived-probe",
      title: "Draftprobe Archived Listing",
      description:
        "An archived listing that must never reach a public suggestion list. Created for one batch and removed after it.",
      searchTokens: ["draftprobe", "archived", "listing"],
      status: "archived",
      listingType: "standard",
      price: 499,
      currency: "INR",
      stockQuantity: 0,
      condition: "new",
      storeId: STORE,
      mainImage: "/test-media/sample-image.png",
      images: [],
      categorySlugs: ["category-beyblade-burst"],
      isTestData: true,
      createdAt: at.hoursAgo(1),
      updatedAt: at.hoursAgo(1),
    }),
  },
  {
    collection: "products",
    id: "product-{{w}}-untokenised",
    data: () => ({
      id: "product-{{w}}-untokenised",
      slug: "product-{{w}}-untokenised",
      title: "Untokenised Legacy Listing",
      description:
        "Stands in for a record written before the search token field existed. PUBLISHED and otherwise ordinary — the only thing missing is searchTokens.",
      // 🛑 searchTokens is DELIBERATELY ABSENT. That absence is the whole
      // fixture: it is what a pre-backfill row looks like, and the case exists
      // to detect that such a row is unfindable.
      status: "published",
      listingType: "standard",
      price: 1299,
      currency: "INR",
      stockQuantity: 3,
      condition: "used",
      storeId: STORE,
      mainImage: "/test-media/sample-image.png",
      images: [],
      categorySlugs: ["category-beyblade-burst"],
      isTestData: true,
      createdAt: at.hoursAgo(2),
      updatedAt: at.hoursAgo(2),
    }),
  },
];
