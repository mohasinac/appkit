/*
 * WHY: `AdminSiteSettingsView`'s Listings tab (⑱, "what the marketplace
 *      offers") — seventeenth tab migrated to the Universal Template
 *      System (Phase 3B, admin site-settings form rebuild, 2026-11-04).
 *      Three fields, and all three are DYNAMIC registry-driven toggle
 *      grids (`Record<string, boolean>`), not fixed scalar fields — the
 *      key set for each comes from a runtime constant
 *      (`LISTING_TYPE_KEYS`/`CATEGORY_TYPE_KEYS`/`BROWSE_PAGE_KEYS`,
 *      themselves derived from `ALL_LISTING_TYPES`/a hand-written tuple/
 *      `ALL_BROWSE_PAGES`), so a static Zod object shape cannot name them
 *      field-by-field the way every scalar-field tab in this rollout does.
 *
 *      Deliberately SEPARATE from `siteSettingsFormSchema` (render-only vs.
 *      save-time validation — see the Branding schema's header for the full
 *      reasoning, unchanged here). `siteSettingsFormSchema` does not
 *      validate `listings` at all.
 *
 * WHAT: THREE `Record<string, boolean>` fields
 *       (`listingTypeFlags`/`categoryTypeFlags`/`browsePageFlags`), each
 *       with its own custom renderer that reproduces the original's
 *       `.map()` over its registry — writing into
 *       `listings.{listingTypes,categoryTypes,browsePages}`.
 *
 *       This tab was "Feature Flags" until 2026-08-29 and carried 12 more
 *       toggles. Eleven of them had no reader anywhere in the codebase, so
 *       an admin could switch "Wishlists" or "Reviews" off and watch
 *       nothing happen; the twelfth (`offers`) is now governed by the two
 *       gates a person actually sets — the listing type's capability and
 *       the seller's own per-listing opt-in. What remains are the three
 *       genuine axes migrated here: listing types are what we SELL,
 *       category types are what a taxonomy row may BE, and browse
 *       sections are whether a public ENTRY POINT is open — switching
 *       "Brands" off in browse sections does not untag one product; it
 *       closes the door.
 *
 * EXPORTS: siteSettingsListingsFormSchema, type SiteSettingsListingsFormValues
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

/**
 * 🛑 `boolean | "unlisted"`, not `boolean` — THREE states, because all three
 * stored axes are declared `boolean | "unlisted"` and a two-state schema made
 * the middle one unreachable from the admin UI.
 *
 * `"unlisted"` has been a real stored value since 2026-11-07 (the owner's
 * *"do not show their links or filters, but do not 404 their pages"*), and
 * `isListingTypeEnabled` / `isListingTypeListed` read it correctly. But this
 * schema said `z.boolean()` and the renderer drew a two-state `Toggle`, so a
 * stored `"unlisted"` appeared as fully ON and flipping that toggle wrote a
 * boolean over it — the state was invisible and destroyable, settable only by
 * editing Firestore by hand. A capability that is data but has no control is
 * still a code change in practice, which is what the capability model exists
 * to prevent.
 */
const flagRecord = () =>
  z.record(z.string(), z.union([z.boolean(), z.literal("unlisted")]));

export const siteSettingsListingsFormSchema = z.object({
  /*
   * 🛑 WHO MAY SELL — ordered first because it outranks every flag below it.
   *
   * The three registry grids answer "what do we offer"; this answers "whose
   * goods are they". Collecting a buyer's money for a third party's stock is
   * Payment Aggregator activity (RBI Directions 2025 para 4(i)), so this is a
   * compliance control wearing a toggle, not a catalogue preference.
   *
   * ⚠ A plain `z.boolean()` here, unlike its neighbours' three-state
   * `boolean | "unlisted"`. There is no middle state to express: either other
   * people's goods may be sold or they may not, and inventing an "unlisted"
   * third option would create exactly the ambiguity the gate exists to remove.
   *
   * 🛑 Both fields render even when selling is closed. Hiding the store picker
   * behind the toggle is how an admin turns third-party selling on and
   * discovers afterwards that nothing sells because no store is nominated.
   */
  thirdPartySellingEnabled: annotate(z.boolean(), {
    section: "who-sells", sectionLabel: "Who may sell", sectionRequired: true,
    order: 1, row: "full", label: "Allow other stores to sell",
    help: "Off means this site sells only its own stock. Leave it off unless the payments setup settles each seller directly — collecting a buyer's money for someone else's goods and paying it on afterwards requires a Payment Aggregator authorisation. Turning it off refuses NEW listings and checkouts from other stores; orders already placed still deliver, dispute, refund and settle, and existing listings are hidden rather than deleted.",
  }),
  platformSellerStoreId: annotate(z.string().optional(), {
    section: "who-sells", sectionLabel: "Who may sell",
    order: 2, row: "full", label: "This site's own store",
    help: "The store ID whose listings this site sells as its own — it is an ordinary store that pays the same fees and ranks the same way, just nominated here. While 'Allow other stores to sell' is off and this is empty, nothing can be sold at all.",
  }),
  listingTypeFlags: annotate(flagRecord(), {
    section: "listing-types", sectionLabel: "Listing types", sectionRequired: true,
    order: 1, row: "full", label: "Listing types",
    help: "Which listing and category types the marketplace offers. A disabled type is hidden from every browse surface and rejected on create and add-to-cart — existing data is untouched, it just becomes unreachable until re-enabled. Disabled types are hidden from listings and reject create/add-to-cart.",
  }),
  categoryTypeFlags: annotate(flagRecord(), {
    section: "category-types", sectionLabel: "Category types",
    order: 1, row: "full", label: "Category types",
  }),
  browsePageFlags: annotate(flagRecord(), {
    section: "browse-sections", sectionLabel: "Browse sections",
    order: 1, row: "full", label: "Browse sections",
    help: "A closed section returns Not Found and disappears from the navbar, the sidebar, the mobile menu, the footer and the sitemap. Products, categories and stores are untouched — only the public way in is withdrawn, and re-opening restores it.",
  }),
});

export type SiteSettingsListingsFormValues = z.infer<typeof siteSettingsListingsFormSchema>;
