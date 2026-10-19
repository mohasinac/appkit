/*
 * WHY: Authored six-part procedures for content-discovery/parts-database.
 * WHAT: 9 cases, keyed by full checklist id.
 *
 * 🛑 EVERY CASE HERE IS WRITTEN AS BEFORE → AFTER, because every defect this
 * feature has already produced returned HTTP 200 with plausible content. A case
 * reading "check the parts page works" passes against all four of them:
 *
 *   1. `getCompositionsForCategory` first queried a `searchTxt` field that
 *      `modelComposition` does not have. Zero rows, no error, an empty panel
 *      that reads as "no composition recorded".
 *   2. The composition `name` was a FILE PATH for all 259 rows, so the
 *      category join matched 0 of 259 — and a model page with no panel is
 *      indistinguishable from a model we have no data for.
 *   3. Without the paren-stripped fallback the join reached only 150 of 259,
 *      and HMS models in particular silently had no panel.
 *   4. 🛑 The one live listing whose leaf has a composition is an ART POSTER,
 *      so before `LISTING_TYPE_HAS_COMPOSITION` the only Parts tab in the
 *      catalogue offered a poster an attack ring and a blade base — a correct
 *      part list for the wrong kind of object.
 *
 * So each case below names what the WRONG answer looked like, and several
 * compare two surfaces that must agree rather than checking that something
 * rendered.
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
  "checklist-content-discovery-parts-database-index-lists-every-classification": {
    roles: ["guest"],
    startPage: "/parts",
    steps: [
      "Open /parts.",
      "Confirm the page heading reads 'Beyblade parts gallery'.",
      "Count the classification tiles.",
      "Confirm every tile reads as a part NAME in sentence case — 'Performance Tip', 'Fusion Wheel', 'Bit Chip' — and not as a URL slug like 'performance-tip' or 'bit-chip'.",
      "Open any one tile and confirm it loads a page rather than 404ing.",
    ],
    expectedBehaviour:
      "BEFORE: there was no parts reference at all, so a buyer reading '105RF' on a listing had nowhere to learn that 105 is a spin-track height and RF is a rubber flat tip. AFTER: 20 classifications, each a real page, under the heading 'Beyblade parts gallery'. The labels come from a compile-checked map rather than being title-cased from the slug, because 'Bit Chip' is not 'bit-chip' title-cased and 'Armour' is not 'armour'.",
    expectedUiState:
      "The heading reads 'Beyblade parts gallery'. Exactly 20 tiles, each labelled in sentence case, each a working link.",
    expectedData: { classificationTiles: 20 },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-parts-database-index-shows-no-fabricated-counts": {
    roles: ["guest"],
    startPage: "/parts",
    steps: [
      "Open /parts.",
      "Look at each classification tile and confirm NO tile shows a number of parts.",
      "Answer no if any tile shows a count, including a zero.",
    ],
    expectedBehaviour:
      "A per-classification count on this page would be 20 queries or a 753-document scan on a page that exists only to route — against a ~3-round-trip budget per render. The honest version of 'we are not going to pay for that number' is to not show a number, rather than to show a stale or a zero one.",
    expectedUiState: "Tiles carry a label and a link, and no count.",
    expectedData: { tileShowsCount: false },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-parts-database-classification-page-lists-its-parts": {
    roles: ["guest"],
    startPage: "/parts",
    steps: [
      "Open /parts, then open the Performance Tip tile.",
      "Read the count in the line under the heading.",
      "Count the rows listed.",
      "Confirm the rows are in alphabetical order by part name.",
      "Confirm a part that has a recorded weight shows it as '(N g)' and a part with no recorded weight shows nothing in its place — not '0 g' and not an em-dash.",
    ],
    expectedBehaviour:
      "The count is a promise about the list directly beneath it, so the two must agree exactly. Only 98 of 753 parts carry a weight and only 23 carry a code; both are facts about our sources rather than missing data, so an absent one renders as nothing at all. A '0 g' would be a measurement we never took.",
    expectedUiState:
      "The stated count equals the number of rows. Rows are alphabetical. Weights appear only where recorded.",
    expectedData: { statedCountEqualsRowCount: true },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-parts-database-unknown-classification-404s": {
    roles: ["guest"],
    startPage: "/parts",
    steps: [
      "Open /parts, then edit the address bar to /parts/zzzznope and load it.",
      "Confirm you get a 404 page.",
      "Then go back to /parts and open the Performance Tip tile as a positive control, and confirm it loads with rows.",
      "Answer no if /parts/zzzznope renders an EMPTY classification page instead of 404ing.",
    ],
    expectedBehaviour:
      "BEFORE the guard existed, casting a URL segment to a slot type would have made this a perfectly successful query for a classification no document has: zero rows, HTTP 200, and a page reading 'No parts recorded in this classification yet' — which is a lie about our data rather than a statement about the URL. The positive control is what distinguishes a working 404 from a page that 404s on everything.",
    expectedUiState:
      "/parts/zzzznope is a 404. /parts/performance-tip loads and lists parts.",
    expectedData: { unknownSegment404s: true, knownSegmentLoads: true },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-parts-database-part-page-shows-which-models-use-it": {
    roles: ["guest"],
    startPage: "/parts",
    steps: [
      "Open /parts, then open Disc, then open the part named Sting.",
      "Read the 'Used by N models' heading.",
      "Count the model rows beneath it.",
      "Click one model row and confirm it opens that model's category page.",
      "Confirm any model row that is NOT a link is still readable as plain text rather than rendering as a broken link.",
    ],
    expectedBehaviour:
      "'Which beys use this part' is the single most useful thing a part page says and the reason the glossary is a collection rather than a lookup table. 210 of 259 compositions joined to a category, so a model that did not join renders as plain text — a link to a page that does not exist is worse than no link.",
    expectedUiState:
      "The heading count equals the number of rows. Linked models open their category page; unlinked models render as text.",
    expectedData: { headingCountEqualsRowCount: true },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-parts-database-part-page-shows-no-prices": {
    roles: ["guest"],
    startPage: "/parts",
    steps: [
      "Open /parts, then Disc, then Sting.",
      "Read the Listings section.",
      "Confirm NO row shows a rupee amount.",
      "Confirm no row shows 'Sign in to see price' either.",
      "Click 'Search the catalogue' or 'See all listings' and confirm it lands on /products with a search term.",
    ],
    expectedBehaviour:
      "Prices are withheld from signed-out visitors, so an amount here would need the price gate and would make this a client-rendered page. A row carrying a title, a condition and a link has nothing to gate and therefore nothing to leak — which is why there is no 'Sign in to see price' placeholder either. The price lives one click away on the listing, where the gate already is.",
    expectedUiState:
      "Listing rows show a title and optionally a condition. No rupee amounts, no sign-in-to-see-price text.",
    expectedData: { pricesOnPartPage: false },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-parts-database-model-page-shows-its-composition": {
    roles: ["guest"],
    startPage: "/categories/category-ace-dragon-sting-charge-zan",
    steps: [
      "Open /categories/category-ace-dragon-sting-charge-zan — a tier-4 named-model leaf. Every category id carries the `category-` prefix and a URL without it does not resolve.",
      "Find the 'What it is made of' section.",
      "Confirm it lists at least one slot row, each reading as a part classification on the left and a part name on the right.",
      "Click a part name and confirm it opens that part's page under /parts/.",
      "Then open /categories/category-burst-gt — the generation LINE one level up — and confirm it has NO 'What it is made of' section at all.",
    ],
    expectedBehaviour:
      "BEFORE: the panel showed nothing on every model, twice over — the read queried a field the collection does not have, and separately every composition's name was a file path so none of them joined to a category. Both failures rendered as an absent section, which is indistinguishable from a model we have no data for. AFTER: the leaf shows its parts and each one links out. The LINE shows nothing deliberately — 'Burst GT' is not made of parts, the beys under it are.",
    expectedUiState:
      "The model leaf shows a composition with linked part names. The line above it shows no composition section.",
    expectedData: { leafHasPanel: true, lineHasPanel: false },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-parts-database-art-listing-has-no-parts-tab": {
    roles: ["guest"],
    startPage: "/products/art-dranzer-phoenix-poster",
    steps: [
      "Open /products/art-dranzer-phoenix-poster — an art print filed under the Dranzer F model leaf.",
      "Read the tab strip above the description.",
      "Confirm there is NO 'Parts' tab.",
      "Answer no if a Parts tab appears listing an attack ring, a weight disk or a blade base.",
    ],
    expectedBehaviour:
      "BEFORE: this was the ONLY listing in the catalogue that satisfied every other condition, so the one Parts tab in the whole product catalogue offered a poster an attack ring and a blade base. It rendered a correct part list for the wrong kind of object, with no error anywhere. AFTER: a print, a sticker sheet and a redemption code are excluded by type. They file under the model's leaf on purpose — a sticker sheet belongs beside the bey it is for — and none of them is made of its parts.",
    expectedUiState: "No Parts tab on an art listing.",
    expectedData: { partsTabOnArtListing: false },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-content-discovery-parts-database-seller-description-lists-parts": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Open /store/products/new and enter any title.",
      "Pick the category category-ace-dragon-sting-charge-zan, a Burst GT named-model leaf.",
      "Set the condition to Used.",
      "Wait for the template picker to fill the Description field.",
      "Read the filled description and confirm it contains a 'Parts:' line naming at least one real part.",
      "Now change the category to category-pokemon-set-151 — a real trading-card expansion-set leaf, which has no parts — and confirm the refilled description contains NO 'Parts:' line at all.",
      "Answer no if the second description shows an EMPTY 'Parts:' line.",
    ],
    expectedBehaviour:
      "A listing filed under a named model can state what the bey is made of, from the same data the model page renders. The second half is the half that matters: an unfilled slot resolves to an empty string, so a shared template would render an empty 'Parts:' bullet on every listing in the catalogue that is not a Beyblade. The line is REMOVED rather than emptied — absent data must read as absent, not as blank.",
    expectedUiState:
      "The Beyblade description carries a Parts line naming real parts. The trading-card description has no Parts line and no empty bullet.",
    expectedData: { partsLineOnModelLeaf: true, emptyPartsLineElsewhere: false },
    endResult:
      "Nothing is saved — the draft is abandoned without publishing, so no listing is created.",
  },
};
