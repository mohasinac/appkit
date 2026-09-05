/*
 * WHY: Authored six-part procedures for the public-pages/stores-sellers-directories page.
 * WHAT: 16 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 SEVERAL CASES HERE HINGE ON A DISTINCTION THAT IS EASY TO LOSE: a tab's URL
 * segment and a listing type are DIFFERENT id spaces. Tab bars key on the URL
 * segment, filter chips key on the listing type, and conflating them either
 * breaks live URLs or silently returns zero rows. That is why the store tab cases
 * name the tab by its visible label and the URL by its path, never interchangeably.
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
  "checklist-public-pages-stores-sellers-directories-store-directory": {
    roles: ["guest"],
    startPage: "/stores",
    steps: [
      "Open /stores in a private window with no session.",
      "Read every store card — name, logo, verified badge and any rating.",
      "Note whether any card names a tester sandbox store.",
      "Use the status filter if one is offered, selecting each value in turn and reading the results.",
      "Click into 'Beyblade Arena'.",
    ],
    expectedBehaviour:
      "The directory lists public stores through a projection that names every field it emits. Sandbox stores are filtered out for signed-out visitors in the application layer — never by a Firestore inequality, which would exclude every document lacking the flag, i.e. all the real ones, and return only test data.",
    expectedUiState:
      "Real stores are listed with names, logos and verified badges. No card names a sandbox store. Any status filter offered changes which stores appear — the seed carries a pending and a suspended store precisely so those chips are not permanently empty.",
    expectedData: { sandboxStoresVisibleToGuest: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-stores-sellers-directories-store-detail-tabs": {
    roles: ["guest"],
    startPage: "/stores/store-beyblade-arena",
    steps: [
      "Open /stores/store-beyblade-arena in a private window with no session.",
      "Read the store header and the tab bar.",
      "Click each tab in turn and read the URL and the content.",
      "Open the browser's View Source and search for accessToken, wabaId, catalogId, adminNotes and customCommissionRate.",
    ],
    inputs: { storeId: "store-beyblade-arena" },
    expectedBehaviour:
      "Each tab is a real route whose URL segment is stable and bookmarkable. The page is built from a store projection, not from the raw document — four pages once passed the whole document into a client component behind a cast that has no runtime effect, publishing a decrypted WhatsApp token into the page HTML.",
    expectedUiState:
      "Every tab navigates to its own URL and renders content. None of the five secret field names appears anywhere in the page source, including the data payload embedded at the bottom of the HTML.",
    expectedData: { secretFieldsInHtml: 0 },
    endResult:
      "Read-only; nothing persists. A hit on any of those names is a leak regardless of how the page renders.",
  },
  "checklist-public-pages-stores-sellers-directories-category-tabs-every-type-renders": {
    roles: ["guest"],
    startPage: "/categories/category-beyblade-burst",
    steps: [
      "Open /categories/category-beyblade-burst in a private window with no session.",
      "Read every tab offered and write the list down.",
      "Click each tab in turn and read what renders beneath it.",
      "Write down any tab that opens to a blank panel.",
    ],
    expectedBehaviour:
      "Every tab that is OFFERED has a render branch behind it. The tab array and the panel that renders each type are two lists, and when one grows and the other does not, the extra tabs are clickable and open to nothing.",
    expectedUiState:
      "Each tab opens to either real content or a named empty state. Not one opens to a blank panel with no message. A tab that is silently dropped from the panel switch is the failure, and it looks exactly like a slow load.",
    expectedData: { blankPanelCount: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-stores-sellers-directories-brand-tabs-every-type-offered": {
    roles: ["guest"],
    startPage: "/brands/brand-beyblade",
    steps: [
      "Open /categories/category-beyblade-burst in a private window and write down every tab it offers.",
      "Open /brands/brand-beyblade and write down every tab it offers.",
      "Compare the two lists, ignoring the Stores tab which categories have and brands do not.",
      "Look specifically for Classifieds, Digital Codes, Live Items and Art & Stickers on the brand page.",
    ],
    expectedBehaviour:
      "A brand page offers the same listing-type tabs as a category page minus Stores. The two components are deliberate near-duplicates with different scoping, and four types were silently missing from one of them while present in the other.",
    expectedUiState:
      "Apart from Stores, the two tab lists match. Classifieds, Digital Codes, Live Items and Art & Stickers are all present on the brand page rather than quietly absent.",
    endResult:
      "Read-only; nothing persists. A missing tab is invisible unless the two pages are compared side by side, which is why both lists are written down.",
  },
  "checklist-public-pages-stores-sellers-directories-category-brand-tab-counts-match": {
    roles: ["guest"],
    startPage: "/categories/category-beyblade-burst",
    steps: [
      "Open /categories/category-beyblade-burst in a private window.",
      "Write down the count badge on every tab.",
      "Open each tab in turn and count the items it actually shows, paging to the end.",
      "Compare each pair.",
      "Repeat on /brands/brand-beyblade.",
    ],
    expectedBehaviour:
      "Counts come from one derivation over the same tab array, so a badge cannot describe a tab that no longer exists or miss one that does. A count that fails must come back as unknown rather than zero — failing to zero would hide a tab holding real stock on a transient error.",
    expectedUiState:
      "Every badge matches the number of items in its tab. A badge of zero on a tab that has items, or a populated badge over an empty tab, are both failures.",
    expectedData: { mismatchedBadgeCount: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-stores-sellers-directories-empty-tabs-hidden": {
    roles: ["guest"],
    startPage: "/stores/store-tester-qa-seller",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! so sandbox content is visible.",
      "Open /stores/store-tester-qa-seller and write down every tab offered.",
      "Open each tab and note which are empty.",
      "Open /stores/store-beyblade-arena and write down its tabs.",
      "Compare the two stores' tab lists.",
    ],
    expectedBehaviour:
      "A tab is hidden when its count is genuinely zero, and shown when the count could not be computed. That distinction is the whole rule: a count map that does not cover an option returns undefined, which reads as unknown and keeps the tab — so an uncovered option is structurally unhideable while a covered one vanishes correctly.",
    expectedUiState:
      "Neither store shows a tab for a listing type it has none of. The two stores offer different tab sets, which is the proof that hiding is happening at all — identical tab bars on stores with different catalogues means nothing is being hidden.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-stores-sellers-directories-store-art-stickers-tab-shows-items": {
    roles: ["guest"],
    startPage: "/stores/store-beyblade-arena/art",
    steps: [
      "Open /stores/store-beyblade-arena/art in a private window with no session.",
      "Read the grid and every card title.",
      "Check whether the items are art prints and sticker sheets rather than ordinary products.",
      "Read the availability tabs and click the middle one.",
    ],
    expectedBehaviour:
      "Art and stickers are real listing types with their own filter value. Adding a type to the union and to the plugin registry is not enough — it must also be in the repository's filter-alias map, and a type missing there makes the alias return an empty string that is then dropped, so the query runs with NO listing-type filter and returns everything.",
    expectedUiState:
      "The grid holds art prints and sticker sheets — 'Dranzer Phoenix Rising — Fan Art Poster' and similar — and not ordinary Beyblade products. It is not an empty grid. The middle availability tab shows the sold-out art fixture.",
    expectedData: { ordinaryProductsInArtTab: 0 },
    endResult:
      "Read-only; nothing persists. A grid full of ordinary products is the dropped-filter failure; an empty grid is a different one.",
  },
  "checklist-public-pages-stores-sellers-directories-store-tab-counts-match-contents": {
    roles: ["guest"],
    startPage: "/stores/store-beyblade-arena",
    steps: [
      "Open /stores/store-beyblade-arena in a private window.",
      "Write down the count badge on each of Products, Auctions, Pre-Orders, Prize Draws, Classifieds, Digital Codes, Live Items and Art & Stickers.",
      "Open each of those tabs and count the items, paging to the end of each.",
      "Compare each pair and note any mismatch.",
    ],
    expectedBehaviour:
      "Each badge is computed from the same query its tab runs, under the same availability scope. A badge counted without the availability filter over-reports by every sold or ended row.",
    expectedUiState:
      "All eight badges match their tab contents. A badge that counts sold-out items the Available tab then hides is the most likely mismatch and is still a mismatch.",
    expectedData: { mismatchedBadgeCount: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-stores-sellers-directories-store-tab-sort-survives-reload": {
    roles: ["guest"],
    startPage: "/stores/store-beyblade-arena/auctions",
    steps: [
      "Open /stores/store-beyblade-arena/auctions in a private window.",
      "Read the sort dropdown's selection and the order of the cards.",
      "Change the sort to a different option.",
      "Read the new card order and the URL.",
      "Reload the page.",
      "Read the sort dropdown's selection and the card order again, before touching anything.",
    ],
    expectedBehaviour:
      "Sort lives in the URL, so the server's first paint and the dropdown agree. When the server renders a default the client does not share, the first paint shows one order and the dropdown claims another — and because the client caches the server's data indefinitely, the disagreement never resolves itself.",
    expectedUiState:
      "After the reload the dropdown shows the chosen sort AND the cards are in that order on first paint — not the default order that then re-sorts a moment later.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-public-pages-stores-sellers-directories-store-preorders-tab-default-sort": {
    roles: ["guest"],
    startPage: "/stores/store-beyblade-arena/pre-orders",
    steps: [
      "Open /pre-orders in a private window and read the sort dropdown's default selection.",
      "Open /stores/store-beyblade-arena/pre-orders and read its sort dropdown's default selection.",
      "Compare the two.",
      "Read the delivery dates on the store tab's cards from the top down.",
    ],
    expectedBehaviour:
      "Both surfaces derive their sort options and default from the listing type's own plugin, so they cannot disagree. Store tabs once carried local shadow copies of the sort array which had drifted in both labels and default, so the same data opened newest-first in one place and earliest-delivery-first in the other.",
    expectedUiState:
      "Both dropdowns show earliest-delivery-first. The store tab's dates ascend down the page. Two different defaults for the same listing type is the failure.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-stores-sellers-directories-store-classified-live-facets-filter": {
    roles: ["guest"],
    startPage: "/stores/store-beyblade-arena/classified",
    steps: [
      "Open /stores/store-beyblade-arena/classified in a private window and read the result count.",
      "Open the filters and select the city Mumbai, then apply.",
      "Read the result count and each card's city.",
      "Clear that, tick 'negotiable', apply, and read the count.",
      "Clear that, tick 'accepts shipping', apply, and read the count.",
      "Open the store's Live Items tab and repeat with the species, sex and jurisdiction facets.",
    ],
    inputs: { city: "Mumbai" },
    expectedBehaviour:
      "Per-type facets reach the query. A facet can render, count toward the filter badge and change nothing at all — that happens when it emits a field the query allowlist does not carry, or carries a field the document does not have, and neither failure raises anything.",
    expectedUiState:
      "Every facet visibly changes the result count and the cards shown. Selecting Mumbai leaves only Mumbai listings. A facet that leaves the count identical while the filter badge increments is the exact failure.",
    expectedData: { inertFacetCount: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-public-pages-stores-sellers-directories-store-tab-empty-state-not-error": {
    roles: ["guest"],
    startPage: "/stores/store-vintage-vault-co",
    steps: [
      "Open /stores/store-vintage-vault-co in a private window with no session.",
      "Open every tab offered and find one that is genuinely empty.",
      "Read exactly what is shown in that empty tab.",
      "Wait 10 seconds and read it again.",
      "Check for any error toast anywhere on the page.",
    ],
    expectedBehaviour:
      "An empty tab shows a named empty state. The two failure modes to separate are a spinner that never resolves — which is what a data fetch that neither succeeds nor reports failure looks like — and a missing-index error surfaced as a toast, which is a real backend fault dressed as a UI hiccup.",
    expectedUiState:
      "The empty tab shows a friendly message inside the normal layout. Not a blank white area, not a spinner still turning after 10 seconds, and no toast mentioning an index or a failed precondition.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-stores-sellers-directories-sellers-directory": {
    roles: ["guest"],
    startPage: "/sellers",
    steps: [
      "Open /sellers in a private window with no session.",
      "Read every seller card — name, avatar and any stats.",
      "Search the page source for an email address and for a phone number.",
      "Click into one seller and read where it lands.",
    ],
    expectedBehaviour:
      "The directory lists sellers with public-facing detail only. Email and phone are PII-encrypted at rest and have no place on a public directory in any form.",
    expectedUiState:
      "Cards render with names and avatars. Neither the rendered page nor its source contains an email address or a phone number. Each card links to a real seller page rather than a 404.",
    expectedData: { piiInSource: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-stores-sellers-directories-seller-detail-page": {
    roles: ["guest"],
    startPage: "/stores/store-tester-qa-seller",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! so sandbox content is visible.",
      "Open /stores/store-tester-qa-seller.",
      "Read the header, the tabs and the listings.",
      "Open the store's own listing-type dropdown, if it offers one, and select each option in turn.",
      "Note any option that returns nothing.",
    ],
    inputs: { storeId: "store-tester-qa-seller" },
    expectedBehaviour:
      "This store backs the tester programme and carries at least one fixture of every listing type — the art and stickers pair were added specifically so the type dropdown has real data on every option rather than several that silently return nothing.",
    expectedUiState:
      "The page renders with its header and tabs. Every option in the listing-type dropdown returns at least one item. An option that returns nothing means either the fixture is missing or that type is being dropped from the query.",
    expectedData: { emptyTypeOptionCount: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-stores-sellers-directories-scams-registry": {
    roles: ["guest"],
    startPage: "/scams",
    steps: [
      "Open /scams in a private window with no session.",
      "Read the list and the filters offered.",
      "Select each status filter value in turn and read the results.",
      "Open one scammer profile and read its fields.",
      "Search that page's source for any unmasked full phone number or email.",
    ],
    expectedBehaviour:
      "The registry lists reported profiles with filters whose values match the real stored status set. A filter chip whose value is not a real stored status returns zero rows forever with no error — the comparison is byte-exact, so a wrong word or wrong case is a permanently empty chip.",
    expectedUiState:
      "Every status filter value returns rows or a named empty state, and at least one returns rows. The profile page shows the report detail. Identifiers are masked rather than published in full.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-stores-sellers-directories-scam-related-profiles-sections": {
    roles: ["guest"],
    startPage: "/scams",
    steps: [
      "Open /scams in a private window and open a scammer profile that has cross-links.",
      "Find the 'Related Profiles' section and read its entries.",
      "Find the separately-labelled 'Similar Scam Reports' section and read its entries.",
      "Check that the two sections are distinct and separately headed.",
      "Check whether the current profile appears in either.",
    ],
    expectedBehaviour:
      "Same-identity cross-links and same-pattern matches are two different claims and must never be merged. 'Related Profiles' asserts these are the same person; 'Similar Scam Reports' asserts only that the reports share a scam type. Presenting the second as the first accuses someone of being a person they are not.",
    expectedUiState:
      "Two sections with distinct headings. Related Profiles holds only explicit cross-links; Similar Scam Reports holds same-type matches. Neither includes the profile currently open.",
    expectedData: { selfLinkCount: 0 },
    endResult:
      "Read-only; nothing persists. One merged section is the failure even if every entry in it is individually correct.",
  },
};
