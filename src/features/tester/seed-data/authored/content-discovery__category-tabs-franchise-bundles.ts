/*
 * WHY: Authored six-part procedures for the categories-index tabs, the
 *      franchise unit and the bundle collage (2026-10-14).
 * WHAT: 9 cases, keyed by full checklist id.
 *
 * 🛑 EVERY CASE IS BEFORE → AFTER, because every defect this work produced
 * rendered a page that looked fine:
 *
 *   1. The index rendered all 1,185 rows flat — six roots buried under 752
 *      part leaves. A case reading "the categories page loads" passes against
 *      that.
 *   2. Seven franchises have no stock. Active, each is a card opening an empty
 *      shop; absent, seventeen `CharacterHotspot` links stay 404. Both look
 *      correct from any single page — which is why two cases here check the
 *      index and the detail page SEPARATELY.
 *   3. Every bundle also carries a placeholder cover, so a collage tested
 *      after the cover never renders — and one grey tile is not "broken".
 *
 * 🛑 A fifth PARTS tab was removed 2026-10-20 and its case deleted with it.
 * Parts live at `/parts/[classification]/[code]` and in the spares listing
 * type; a flat tab over 752 leaves was the worse half of both. The
 * product-detail Parts COMPOSITION tab is unrelated and still covered, on the
 * `parts-database` page.
 *
 * So each case counts an exact number or compares two surfaces. Several carry
 * a nonsense control, because a filter that returns everything looks identical
 * to a filter that works.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

import type { AuthoredCase } from "./_types";

export const authored: Record<string, AuthoredCase> = {
  "checklist-content-discovery-category-tabs-franchise-bundles-index-shows-roots-only": {
    roles: ["guest"],
    startPage: "/categories",
    steps: [
      "Open /categories.",
      "Confirm the Categories tab is the one selected on arrival.",
      "Count the cards. There must be exactly six.",
      "Read the six names: Spinning Tops, Trading Cards, Collectible Figures, Hot Wheels, Model Kits, Living Collectibles.",
      "Answer no if any deeper category appears here — 'Attack Rings', 'Beyblade Burst', '1B' or any single part name.",
    ],
    expectedBehaviour:
      "BEFORE: the index rendered the whole flat forest — 1,185 rows, of which 752 are part leaves and 220 are model leaves — so the six roots were buried and a visitor met a wall of names with no sense of where they were. AFTER: the Categories tab shows ONLY the tier-0 roots and you walk down from one.",
    expectedUiState:
      "Exactly six cards, each a root. No tier-1-or-deeper row anywhere on this tab.",
    expectedData: { rootCards: 6 },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-category-tabs-franchise-bundles-four-tabs-no-all-no-parts": {
    roles: ["guest"],
    startPage: "/categories",
    steps: [
      "Open /categories.",
      "Read the tab bar.",
      "Confirm there are exactly four tabs: Categories, Brands, Franchises, Bundles.",
      "Answer no if a tab labelled 'All' is present.",
      "Answer no if a tab labelled 'Parts' is present.",
      "Open a product detail page for a named-model Beyblade — for example /categories/category-ace-dragon-sting-charge-zan reached through Spinning Tops, or any complete-top listing — and confirm its own 'Parts' / 'What it is made of' composition section is STILL there. That is a different tab on a different surface and must not have been removed.",
    ],
    expectedBehaviour:
      "BEFORE the first fix: the tabs were All / Categories / Brands, and 'All' was the DEFAULT — it is what rendered the 1,185 rows. BEFORE this one: a fifth 'Parts' tab listed all 752 part leaves flat, duplicating /parts and the spares listing type with a worse version of both. AFTER: four tabs, no 'All' and no 'Parts'. The part leaves still exist and are still reached by drilling into a `*-parts` node; only the flat shortcut tab is gone. The product-level composition tab is untouched — removing that would have deleted the part database's own reason to exist.",
    expectedUiState:
      "Four tabs, named exactly as above. No 'All', no 'Parts'. A model listing still shows its composition section.",
    expectedData: { tabCount: 4, hasAllTab: false, hasPartsTab: false },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-category-tabs-franchise-bundles-tabs-do-not-overlap": {
    roles: ["guest"],
    startPage: "/categories",
    steps: [
      "Open /categories and note the total each of the four tabs reports: Categories, Brands, Franchises, Bundles.",
      "Expect 6, 28, 8, 5.",
      "Pick one brand by name on the Brands tab — for example Takara-Tomy.",
      "Open each of the other three tabs and search for that same name.",
      "Answer no if it appears on any tab other than Brands.",
      "Repeat once with a bundle name taken from the Bundles tab.",
    ],
    expectedBehaviour:
      "Brands, franchises and bundles are all tier-0 rows, so a predicate that tested the tier before the discriminator would list every one of them under Categories as well. The type check has to come first. A row on two tabs double-counts the catalogue and makes the totals unreadable.",
    expectedUiState:
      "Tab totals read 6 / 28 / 8 / 5. The sampled brand and bundle each appear on exactly one tab.",
    expectedData: { categories: 6, brands: 28, franchises: 8, bundles: 5 },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-category-tabs-franchise-bundles-franchise-index-hides-unstocked": {
    roles: ["guest"],
    startPage: "/franchise",
    steps: [
      "Open /franchise.",
      "Count the cards. Exactly one must be present: Beyblade.",
      "Answer no if Marvel, DC Comics, Dragon Ball, Naruto, Bleach, One Piece or One Punch Man appears here.",
    ],
    expectedBehaviour:
      "Eight franchises are seeded; seven have no stock. A row with no product is a dead facet — a card that opens an empty shop — so the index lists ACTIVE franchises only. The seven still exist and their pages still resolve; they are simply not advertised as somewhere to shop until they have something to sell.",
    expectedUiState: "One card, Beyblade. None of the seven unstocked IPs.",
    expectedData: { franchiseCards: 1 },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-category-tabs-franchise-bundles-unstocked-franchise-page-resolves": {
    roles: ["guest"],
    startPage: "/franchise/marvel",
    steps: [
      "Open /franchise/marvel directly.",
      "Confirm a real page renders — a heading reading Marvel — and NOT a 404 or not-found view.",
      "Confirm a message says plainly that this franchise is not stocked yet.",
      "Answer no if the page 404s, or if it renders an empty product grid with no explanation.",
    ],
    expectedBehaviour:
      "BEFORE: `/franchise/*` was not a route at all, so seventeen links in CharacterHotspot 404ed. AFTER: the page resolves. An unstocked franchise is NOT a 404 — the row exists deliberately so those links land somewhere honest. An unexplained empty grid would be the other wrong answer: the visitor arrived from a real link and should be told it is coming, not left to assume something broke.",
    expectedUiState:
      "The Marvel page renders with its name and an explicit 'not stocking this yet' message. No 404, no bare empty grid.",
    expectedData: { httpOk: true, explanationShown: true },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-category-tabs-franchise-bundles-franchise-detail-lists-its-products": {
    roles: ["guest"],
    startPage: "/franchise/franchise-beyblade",
    steps: [
      "Open the Beyblade franchise page from /franchise.",
      "Confirm it reports a listing count in the thousands, not zero and not a handful.",
      "Confirm product cards render.",
      "CONTROL: now open /franchise/zzznope by typing it.",
      "Confirm that page 404s rather than showing the whole catalogue.",
    ],
    expectedBehaviour:
      "The products filter matches on `franchiseSlug`, so a clause that was silently dropped would return the ENTIRE catalogue on every franchise page — which looks like a working page full of products. The nonsense control is the only step that tells a working filter from an absent one.",
    expectedUiState:
      "Beyblade lists ~1,304 listings. An unknown franchise slug 404s and never renders a populated grid.",
    expectedData: { beybladeListings: 1304, nonsenseSlug404s: true },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-category-tabs-franchise-bundles-bundle-card-shows-a-collage": {
    roles: ["guest"],
    startPage: "/categories",
    steps: [
      "Open /categories and click the Bundles tab.",
      "Confirm five bundle cards render.",
      "Look at each card's image area.",
      "Confirm it shows a COLLAGE of several product photos, not one single image.",
      "Answer no if any card shows a single flat colour tile or one lone photo.",
    ],
    expectedBehaviour:
      "BEFORE: a bundle card showed one generic placeholder tile — the least informative thing a bundle card can show, since a bundle IS its contents. AFTER: each card shows a collage built from its members' own photos, resolved at seed time so the card costs no extra query. All five bundles carry 3 or 4 member images, which clears the 3-image minimum the collage needs.",
    expectedUiState:
      "Five bundle cards, each showing a multi-image collage rather than a single tile.",
    expectedData: { bundleCards: 5, cardsWithCollage: 5 },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-category-tabs-franchise-bundles-tabs-collapse-on-narrow-viewport": {
    roles: ["guest"],
    startPage: "/categories",
    steps: [
      "Resize the viewport to a phone width, around 390px.",
      "Open /categories.",
      "Look at the tab row reading Categories / Brands / Franchises / Bundles.",
      "BEFORE a fix landed 2026-10-19: this was a plain row of `<Button variant=\"ghost\">`s with a hand-written underline — no `role=\"tablist\"`, no overflow handling, and on a narrow viewport the later tabs ran past the right edge with no scrollbar and no visible way to reach them.",
      "AFTER: the row is `<OverflowRow>`. Confirm it has collapsed into a single trigger button showing the active tab's name plus a chevron.",
      "Click the trigger. Confirm a searchable dropdown opens listing all four tabs.",
      "Pick a different tab from the dropdown and confirm the page re-filters to it.",
    ],
    expectedBehaviour:
      "A row of controls that does not fit its container must become a trigger that opens a searchable list, not a row the visitor has to discover can be scrolled. `<OverflowRow>` is the one primitive this project built for exactly this shape (see CLAUDE.md § Overflowing Pill & Tab Rows) — the old row predates it and was never migrated. 🛑 Four tabs can still overflow 390px: the threshold is MEASURED width, never a count (that is why `TabsList`'s old `items.length > 5` rule was deleted), so dropping the fifth tab does not retire this case.",
    expectedUiState:
      "At 390px: one trigger button, not four separate tab buttons. Opening it shows all four tabs in a dropdown, each clickable, with the active one marked.",
    expectedData: { tabsVisibleAsRowAt390px: false, collapsedTriggerPresent: true },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-category-tabs-franchise-bundles-tabs-hover-changes-ink": {
    roles: ["guest"],
    startPage: "/categories",
    steps: [
      "Open /categories on a desktop-width viewport (at least 1024px, so the tabs render as a row rather than a collapsed trigger).",
      "Pick a tab that is NOT currently active.",
      "BEFORE a fix landed 2026-10-19: this row (and several others — the notification bell, the admin sidebar/nav/header, the mobile bottom-nav item) carried two competing `hover:text-*` classes on one element, one of which resolved to the element's own RESTING colour. Hovering therefore changed nothing, which reads as 'hover is broken' rather than as a styling bug.",
      "Hover the mouse pointer over the inactive tab's label without clicking.",
      "Compare its text colour before and during the hover.",
      "Move the pointer away and confirm the colour returns to the resting shade.",
    ],
    expectedBehaviour:
      "Every hover state must visibly differ from the resting state. A hover ink that equals the resting ink is indistinguishable from no hover handler at all.",
    expectedUiState:
      "The inactive tab's text colour visibly changes while hovered, and reverts when the pointer leaves.",
    expectedData: { hoverChangesTextColor: true },
    endResult: "Nothing is changed; this case only reads.",
  },
};
