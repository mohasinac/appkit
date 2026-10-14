/*
 * WHY: Authored six-part procedures for the categories-index tabs, the
 *      franchise unit and the bundle collage (2026-10-14).
 * WHAT: 8 cases, keyed by full checklist id.
 *
 * 🛑 EVERY CASE IS BEFORE → AFTER, because every defect this work produced
 * rendered a page that looked fine:
 *
 *   1. The index rendered all 1,185 rows flat — six roots buried under 752
 *      part leaves. A case reading "the categories page loads" passes against
 *      that.
 *   2. The Parts tab first returned 772, catching the 20 classification NODES
 *      as well as the leaves, because their own `parentIds` also pass through
 *      a `*-parts` node. A list mixing "Attack Rings" with attack rings is not
 *      visibly wrong.
 *   3. Seven franchises have no stock. Active, each is a card opening an empty
 *      shop; absent, seventeen `CharacterHotspot` links stay 404. Both look
 *      correct from any single page — which is why two cases here check the
 *      index and the detail page SEPARATELY.
 *   4. Every bundle also carries a placeholder cover, so a collage tested
 *      after the cover never renders — and one grey tile is not "broken".
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

  "checklist-content-discovery-category-tabs-franchise-bundles-five-tabs-no-all": {
    roles: ["guest"],
    startPage: "/categories",
    steps: [
      "Open /categories.",
      "Read the tab bar.",
      "Confirm there are exactly five tabs: Categories, Brands, Franchises, Parts, Bundles.",
      "Answer no if a tab labelled 'All' is present.",
    ],
    expectedBehaviour:
      "BEFORE: the tabs were All / Categories / Brands, and 'All' was the DEFAULT — it is what rendered the 1,185 rows. AFTER: five tabs, no 'All'. Every tab answers a question ('which parts do you have?'); 'all' answered none of them, which is why it was removed rather than reordered.",
    expectedUiState: "Five tabs, named exactly as above, with no 'All'.",
    expectedData: { tabCount: 5, hasAllTab: false },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-category-tabs-franchise-bundles-parts-tab-is-leaves-only": {
    roles: ["guest"],
    startPage: "/categories",
    steps: [
      "Open /categories and click the Parts tab.",
      "Read the total the pager reports.",
      "Confirm it reads 752 and not 772.",
      "Scan the first page and confirm every card is an individual PART — '1B', 'Ten Heavy', 'Neo Right SG'.",
      "Answer no if a classification GROUP appears as a card: 'Attack Rings', 'Weight Disks', 'Performance Tips', 'Bit Chips'.",
    ],
    expectedBehaviour:
      "BEFORE: the tab returned 772, because the predicate matched any row whose ancestry passes a `*-parts` node — which is true of the 20 classification NODES as well as the leaves beneath them. The list mixed groups with their own contents and was not visibly wrong. AFTER: leaves only, 752. A part is a leaf by itself; a classification is a branch you reach by drilling down.",
    expectedUiState:
      "752 parts reported. Every card is a single part; no classification group appears.",
    expectedData: { partsTotal: 752, classificationNodesShown: 0 },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-category-tabs-franchise-bundles-tabs-do-not-overlap": {
    roles: ["guest"],
    startPage: "/categories",
    steps: [
      "Open /categories and note the total each of the five tabs reports: Categories, Brands, Franchises, Parts, Bundles.",
      "Expect 6, 28, 8, 752, 5.",
      "Pick one brand by name on the Brands tab — for example Takara-Tomy.",
      "Open each of the other four tabs and search for that same name.",
      "Answer no if it appears on any tab other than Brands.",
      "Repeat once with a bundle name taken from the Bundles tab.",
    ],
    expectedBehaviour:
      "Brands, franchises and bundles are all tier-0 rows, so a predicate that tested the tier before the discriminator would list every one of them under Categories as well. The type check has to come first. A row on two tabs double-counts the catalogue and makes the totals unreadable.",
    expectedUiState:
      "Tab totals read 6 / 28 / 8 / 752 / 5. The sampled brand and bundle each appear on exactly one tab.",
    expectedData: { categories: 6, brands: 28, franchises: 8, parts: 752, bundles: 5 },
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
};
