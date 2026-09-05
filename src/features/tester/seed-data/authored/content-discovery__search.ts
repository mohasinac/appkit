/*
 * WHY: Authored six-part procedures for the content-discovery/search page.
 * WHAT: 20 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 EVERY SEARCH CASE HERE CARRIES A CONTROL, because a search box that has
 * stopped filtering returns plausible rows for any real term and looks identical
 * to one that works. "zzzznope" returning zero is what separates the two, and it
 * is the only assertion in this file that cannot pass by accident.
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
  "checklist-content-discovery-search-search-typeahead-differs": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window with no session.",
      "Click into the header search and type dranzer.",
      "Write down every suggestion offered.",
      "Clear the box and type dragoon.",
      "Write down every suggestion offered.",
      "Compare the two lists.",
    ],
    inputs: { query1: "dranzer", query2: "dragoon" },
    expectedBehaviour:
      "Suggestions are computed from the current query. Two different queries producing identical suggestions means the list is not query-driven at all — it is a fixed set of popular items wearing a typeahead's clothes.",
    expectedUiState:
      "'dranzer' suggests Dranzer items and 'dragoon' suggests Dragoon items. The two lists are visibly different. Identical lists are the failure even when both look plausible.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-content-discovery-search-search-typeahead-no-drafts": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window with no session.",
      "Click into the header search and type beyblade.",
      "Read every suggestion and note its title.",
      "Open each suggestion in turn and read the page it lands on.",
      "Note any that 404s or shows an unpublished listing.",
    ],
    inputs: { query: "beyblade" },
    expectedBehaviour:
      "Suggestions are filtered to published, publicly-visible listings. A status filter applied only when the caller explicitly asks for one is absent here, because a typeahead rarely asks — which is exactly how draft rows reach a public suggestion list.",
    expectedUiState:
      "Every suggestion opens a real published listing. None 404s, none opens a draft or archived listing, and none names a tester sandbox item for a signed-out visitor.",
    expectedData: { draftSuggestions: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-content-discovery-search-search-prefix-match": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products in a private window and read the total result count.",
      "Type dran in the search field and click 'Search'.",
      "Read the result count and every card title.",
      "Clear the field, type zzzznope, and click 'Search'.",
      "Read the result count.",
    ],
    inputs: { prefixQuery: "dran", nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "A prefix matches whole words that begin with it, so a partial term still finds the product. Search is tokenised on an edge-n-gram field for exactly this reason — an exact-equality search would need the buyer to type the full title.",
    expectedUiState:
      "'dran' returns Dranzer and Dran Sword items and a count lower than the unfiltered total. 'zzzznope' returns zero and an empty state, not the full catalogue.",
    expectedData: { nonsenseResultCount: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-content-discovery-search-search-both-words-required": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products in a private window.",
      "Type dranzer in the search field, click 'Search', and note the result count.",
      "Clear the field, type original, click 'Search', and note the count.",
      "Clear the field, type 'original dranzer', click 'Search', and note the count.",
      "Read the titles returned by the two-word query.",
    ],
    inputs: { word1: "dranzer", word2: "original", bothWords: "original dranzer" },
    expectedBehaviour:
      "Multiple words narrow rather than widen — every word must match. An OR search returns MORE results for two words than for one, which is the opposite of what a user typing a second word is asking for.",
    expectedUiState:
      "The two-word count is less than or equal to the smaller of the two single-word counts. Every returned title matches both words. A two-word count higher than either single-word count is the OR failure.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-content-discovery-search-search-plus-category-filter": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products in a private window.",
      "Type beyblade in the search field and click 'Search', then note the count.",
      "Open the filters, tick the Beyblade Burst category, and apply.",
      "Read the count, the URL and the card titles.",
      "Check the search field still holds the typed term.",
    ],
    inputs: { query: "beyblade", category: "Beyblade Burst" },
    expectedBehaviour:
      "A search term and a facet apply together as an AND. Applying a filter must not clear the query — resetting the page to filter-only is a silent widening the user did not ask for.",
    expectedUiState:
      "The URL carries both the search term and the category. The count is lower than the search-only count. Every card is a Burst item matching the term. The search field still shows 'beyblade'.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-content-discovery-search-search-keeps-sort": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products in a private window.",
      "Type beyblade in the search field and click 'Search'.",
      "Read the card order and note the sort dropdown's selection.",
      "Change the sort to price, low to high.",
      "Read the card order, the URL and the search field.",
      "Reload the page and read all three again.",
    ],
    inputs: { query: "beyblade", sort: "Price: low to high" },
    expectedBehaviour:
      "Changing the sort re-orders the current results and keeps the term. Both live in the URL, so a reload reproduces the same page — and the sort field must be one the query can actually sort on, since an unsortable field is dropped and the dropdown silently reorders nothing.",
    expectedUiState:
      "Prices ascend down the page and the search field still holds 'beyblade'. The URL carries both. After the reload the order and the term are unchanged. A dropdown selection that changes no order at all is the dropped-sort failure.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-content-discovery-search-search-keeps-facets": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products in a private window.",
      "Type beyblade in the search field and click 'Search', then note the count.",
      "Open the filters, set the price range minimum to 500 and maximum to 1500, and apply.",
      "Read the count and check every card's price is inside the range.",
      "Open the filters again, tick a tag, and apply. Read the count.",
      "Click the 'Sold & Ended' availability tab and read the count.",
    ],
    inputs: { query: "beyblade", priceMin: 500, priceMax: 1500 },
    expectedBehaviour:
      "Price, tag and availability all narrow alongside the term. A facet that renders and counts toward the badge while changing nothing is inert — that happens when it emits a field the query allowlist does not carry, and nothing raises.",
    expectedUiState:
      "Each facet visibly reduces the count and every card respects it. The availability tab changes which rows appear. A facet that leaves the count identical while the filter badge increments is the failure.",
    expectedData: { inertFacetCount: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-content-discovery-search-search-case-and-accents": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products in a private window.",
      "Type dranzer in the search field, click 'Search', and note the result count.",
      "Clear the field, type DRANZER, click 'Search', and note the count.",
      "Clear the field, type Dranzer, click 'Search', and note the count.",
      "Compare all three counts.",
    ],
    inputs: { lower: "dranzer", upper: "DRANZER", mixed: "Dranzer" },
    expectedBehaviour:
      "The query is normalised before matching, so case makes no difference. The search field is a normalised token array precisely so a buyer's capitalisation is not a search term.",
    expectedUiState:
      "All three queries return the same count and the same titles. A different count for the uppercase form means normalisation is applied when the record is written but not when the query is read.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-content-discovery-search-search-single-char-narrows": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products in a private window and note the unfiltered result count.",
      "Type d in the search field and click 'Search'.",
      "Read the count and the card titles.",
      "Clear the field, type z, and click 'Search'.",
      "Read the count.",
    ],
    inputs: { query1: "d", query2: "z" },
    expectedBehaviour:
      "A one-character query is still a query. Ignoring short terms as noise means the box appears to accept input and returns the whole catalogue, which reads as 'nothing matched your filter' being impossible.",
    expectedUiState:
      "'d' returns fewer rows than the unfiltered count, and every title contains a word starting with d. 'z' returns a different, smaller set. Either query returning the full unfiltered count is the failure.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-content-discovery-search-search-faqs": {
    roles: ["guest"],
    startPage: "/faqs",
    steps: [
      "Open /faqs in a private window and note how many questions are listed.",
      "Type shipping in the search box.",
      "Read the questions that remain.",
      "Clear the box and type zzzznope.",
      "Read what is shown.",
      "Clear the box and check the full list returns.",
    ],
    inputs: { query: "shipping", nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "The FAQ list filters client-side against the loaded questions. This page renders admin-managed FAQs from the database rather than a static translation file, so the search operates on real content.",
    expectedUiState:
      "'shipping' leaves only shipping-related questions. 'zzzznope' shows a named empty state, not every question. Clearing restores the full list.",
    expectedData: { nonsenseResultCount: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-content-discovery-search-search-faq-category-page": {
    roles: ["guest"],
    startPage: "/faqs",
    steps: [
      "Open /faqs in a private window and read the category list.",
      "Open the Shipping category page.",
      "Read the questions listed and expand one to read its answer.",
      "Read the address bar.",
      "Open a second category page and read its questions.",
    ],
    expectedBehaviour:
      "Each category has its own page, keyed on the category's slug, rendering only its questions. Two category pages showing the same questions means the slug is not reaching the query.",
    expectedUiState:
      "The Shipping page lists shipping questions and an expanded answer renders as formatted text, not as raw HTML shown as visible characters. The second category shows a different set.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-content-discovery-search-search-scams-listing": {
    roles: ["guest"],
    startPage: "/scams",
    steps: [
      "Open /scams in a private window with no session.",
      "Read the profiles listed and note how many there are.",
      "Read each profile's status.",
      "Open one profile and read its detail.",
    ],
    expectedBehaviour:
      "The public registry lists verified profiles. Status values shown must be ones the documents actually hold — the canonical field-name constants and the feature's own type file have disagreed before, one of them missing a real status the other had.",
    expectedUiState:
      "Profiles are listed with their statuses and each opens a real detail page. The list is not empty and is not the full unfiltered set including removed profiles.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-content-discovery-search-search-scam-partial-and-upi": {
    roles: ["admin"],
    startPage: "/admin/scammers",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/scammers and note the total row count.",
      "Type Vikram in the search box and read the results.",
      "Clear the box and type a UPI id belonging to one of the listed profiles.",
      "Read the results.",
      "Clear the box and type zzzznope, then read the results.",
    ],
    inputs: { partialName: "Vikram", nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "The admin search matches a partial name and also matches on identifier fields such as a UPI id, so a report can be found by whatever the reporter had. Both are needed: a name-only search cannot find a profile reported by payment handle alone.",
    expectedUiState:
      "'Vikram' returns the Vikram Mehta profile. The UPI id returns its own profile. 'zzzznope' returns zero rows rather than the full list.",
    expectedData: { nonsenseResultCount: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-content-discovery-search-search-store-event-blog-review": {
    roles: ["guest"],
    startPage: "/stores",
    steps: [
      "Open /stores in a private window, search for arena, and read the results.",
      "Open /events, search for beyblade, and read the results.",
      "Open /blog, search for beyblade, and read the results.",
      "Open a product page's reviews section, search for a word from a visible review, and read the results.",
      "Repeat all four searches with zzzznope and read each result count.",
    ],
    inputs: { storeQuery: "arena", contentQuery: "beyblade", nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "Every listing surface's search box filters its own collection. Each is a separate wiring — a search that renders on all four and works on three is the normal shape of this defect.",
    expectedUiState:
      "Each real query returns matching rows. Each nonsense query returns zero on all four surfaces. A surface where the nonsense query returns everything has a search box that decorates rather than filters.",
    expectedData: { surfacesWhereNonsenseReturnsAll: 0 },
    endResult:
      "Read-only; nothing persists. Name each failing surface in the comment rather than answering for the group.",
  },
  "checklist-content-discovery-search-search-admin-exact-match": {
    roles: ["admin"],
    startPage: "/admin/reviews",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/reviews and read a reviewer's full name from any row.",
      "Read the search box's placeholder or helper text.",
      "Type that full name into the search box and read the results.",
      "Clear the box, type only the first half of the same name, and read the results.",
      "Clear the box and type zzzznope, then read the results.",
    ],
    expectedBehaviour:
      "Reviewer names are PII-encrypted at rest, so they can only be matched exactly through a blind index — a partial match is not possible, by design rather than by omission. The box must SAY so, because a partial search returning nothing otherwise reads as a broken search.",
    expectedUiState:
      "The full name returns its rows. The partial name returns none. The box states that it is an exact match, in its placeholder or a note beside it — without that, this behaviour is indistinguishable from a bug.",
    expectedData: { partialMatchCount: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-content-discovery-search-search-admin-degraded-sort": {
    roles: ["admin"],
    startPage: "/admin/payouts",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/payouts and note the sort dropdown's selection and the row order.",
      "Type a seller name into the search box and submit it.",
      "Read the rows and look for any notice about sorting.",
      "Clear the search and read the row order again.",
    ],
    expectedBehaviour:
      "Search and sort cannot both be pushed into the query here, so while searching the results come back unsorted and the page says so. An unexplained order change reads as the sort control being broken.",
    expectedUiState:
      "With a search active a visible notice states that results are not sorted while searching. Clearing the search restores the sorted order. A silently reordered list with no notice is the failure.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-content-discovery-search-search-admin-team-filter-chip": {
    roles: ["admin"],
    startPage: "/admin/team",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/team and note how many employees are listed.",
      "Click one filter chip and read the resulting rows.",
      "Clear it, click a different chip, and read the rows.",
      "Apply two chips together and read the rows.",
      "Clear everything and check the original list returns.",
    ],
    expectedBehaviour:
      "Applying a filter chip narrows the list and still returns employees. A filter builder that CONCATENATES its clauses instead of joining them produces one malformed clause that matches nothing, so any chip empties the whole list — and the unit test for this route asserted against the correct behaviour rather than the real one, so it passed for as long as the bug existed.",
    expectedUiState:
      "Every chip returns at least one employee, and two chips together return a subset rather than nothing. A chip that empties the list entirely is the exact failure.",
    expectedData: { emptyChipCount: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-content-discovery-search-search-no-empty-toolbar-gap": {
    roles: ["admin"],
    startPage: "/admin/team",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open several admin listing pages in turn and look at each toolbar.",
      "Note any toolbar with a visible empty gap where a control would sit.",
      "Resize to 390 pixels wide and look at the same toolbars.",
    ],
    expectedBehaviour:
      "A listing whose search box was removed reflows its toolbar rather than leaving the space reserved. A collapsed control must collapse its layout too — hiding it by transform leaves its height and width behind.",
    expectedUiState:
      "No toolbar shows an empty gap at either width. Remaining controls sit adjacent to one another rather than spaced around an invisible element.",
    endResult: "Read-only; nothing persists. Restore the window width afterwards.",
  },
  "checklist-content-discovery-search-search-nonsense-term-returns-nothing": {
    roles: ["guest", "admin"],
    startPage: "/products",
    steps: [
      "Open /products in a private window, type zzzznope, click 'Search', and read the count.",
      "Open /stores, search zzzznope, and read the count.",
      "Open /blog, search zzzznope, and read the count.",
      "Open /faqs, search zzzznope, and read what is shown.",
      "Sign in as admin@letitrip.in / TempPass123! and repeat on /admin/products, /admin/orders and /admin/users.",
      "Write down every surface that returned more than zero.",
    ],
    inputs: { nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "This is the control for every other search case in the checklist. A search box that has stopped filtering returns plausible rows for any real term and is indistinguishable from a working one — only a term that cannot match anything tells them apart.",
    expectedUiState:
      "Every surface returns zero results and a named empty state. Any surface returning its full unfiltered list has a search box that is not filtering, whatever it does for real terms.",
    expectedData: { surfacesReturningRows: 0 },
    endResult:
      "Read-only; nothing persists. List every failing surface — this one case invalidates the search cases on any surface it names.",
  },
  "checklist-content-discovery-search-search-finds-older-records": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products and sort by oldest first.",
      "Read the title of the oldest listing.",
      "Search for a distinctive word from that title.",
      "Read whether that listing is returned.",
      "Repeat with the newest listing's title as a comparison.",
    ],
    expectedBehaviour:
      "Search is backed by a normalised token field written on save. Records created before that field existed have no tokens, so they are unfindable — the fix is a backfill, and this case is what detects whether one is needed.",
    expectedUiState:
      "Both the oldest and the newest listing are returned by a word from their own titles. The newest being findable while the oldest is not is the signature of missing tokens on older rows, not of a broken search.",
    expectedData: { oldRecordFound: true },
    endResult:
      "Read-only; nothing persists. Testing only recent records would pass this case while the backfill gap remains.",
  },
};
