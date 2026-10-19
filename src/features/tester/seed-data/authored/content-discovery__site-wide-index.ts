/*
 * WHY: Authored six-part procedures for the site-wide search index cases
 *      added 2026-10-19 to the content-discovery/search page.
 * WHAT: 17 case(s), keyed by full checklist id.
 *
 * 🛑 EVERY CASE CARRIES A CONTROL. A search box that has stopped filtering
 * returns plausible rows for any real term and looks identical to one that
 * works — "zzzznope" returning zero is the only kind of assertion here that
 * cannot pass by accident. That is this directory's standing rule and it is
 * why the control is a STEP, not a footnote.
 *
 * 🛑 Several of these check the NETWORK PANEL rather than the page, and that
 * is deliberate. "Zero Firestore reads per keystroke" and "a guest issues no
 * authenticated request" are the two claims the whole design rests on, and
 * neither is visible on screen — a page that fetches per keystroke looks
 * exactly like one that does not.
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
  "checklist-content-discovery-search-search-finds-every-type": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window with no session.",
      "Click the header search and type dranzer.",
      "Press Enter.",
      "Read the URL in the address bar.",
      "Count how many distinct section headings the results page shows.",
      "Go back, type zzzznope, and press Enter.",
      "Read what the page says.",
    ],
    inputs: { query: "dranzer", control: "zzzznope" },
    expectedBehaviour:
      "Submitting navigates to the cross-resource results page and searches every indexed type at once, rather than redirecting to one browse route chosen by the type dropdown.",
    expectedUiState:
      "The URL is /search?q=dranzer, not /products?q=dranzer. Results appear under several headings (for example Products, Categories, Parts, Articles), each with its own 'See all … →' link. For zzzznope the page says nothing matched and shows ZERO result rows — that control is the only assertion here that cannot pass by accident.",
    endResult: "Read-only; nothing persists.",
  },

  "checklist-content-discovery-search-search-finds-a-part": {
    roles: ["guest"],
    startPage: "/search",
    steps: [
      "Open /search?q=Rubber Flat in a private window.",
      "Read every result row and note which section each sits under.",
      "Change the query to RF and search again.",
      "Compare the two result sets.",
      "Click the part row and read the page it lands on.",
    ],
    inputs: { byName: "Rubber Flat", byCode: "RF" },
    expectedBehaviour:
      "Parts are searchable by full name and by code. Before this they had no search tokens at all — all 752 were reachable only by drilling /parts into a classification and then a code.",
    expectedUiState:
      "Both queries return the part under a Parts heading, and the row shows its classification on a second line underneath the name. Clicking it lands on a real /parts/<classification>/<code> page, not a 404.",
    endResult: "Read-only; nothing persists.",
  },

  "checklist-content-discovery-search-search-ambiguous-part-code": {
    roles: ["guest"],
    startPage: "/search",
    steps: [
      "Open /search?q=105 in a private window.",
      "Count the rows under the Parts heading.",
      "Read the second line of each row and write down the classification it names.",
      "Click two different rows in turn and write down the URL each lands on.",
    ],
    inputs: { query: "105" },
    expectedBehaviour:
      "A bare code is ambiguous across generations — 105 is a Metal Fight spin-track height while a bare number in Burst is a disc — so the engine must return all of them rather than picking one.",
    expectedUiState:
      "SEVERAL rows, each naming a DIFFERENT classification, each linking to a different /parts/<classification>/105 URL. Exactly one row is the FAILURE: it means something chose a winner for the user.",
    endResult: "Read-only; nothing persists.",
  },

  "checklist-content-discovery-search-search-midword": {
    roles: ["guest"],
    startPage: "/search",
    steps: [
      "Open /search?q=ariza in a private window.",
      "Read the result rows.",
      "Change the query to zzzz and search again.",
      "Read what the page says.",
    ],
    inputs: { midword: "ariza", control: "zzzz" },
    expectedBehaviour:
      "The browser scans the whole index, so a fragment from the MIDDLE of a word matches. The Firestore path structurally cannot do this — its tokens are word-prefix only.",
    expectedUiState:
      "'ariza' returns Charizard rows. 'zzzz' returns nothing — without that control a matcher returning everything for any fragment would also pass the first half.",
    endResult: "Read-only; nothing persists.",
  },

  "checklist-content-discovery-search-search-typo": {
    roles: ["guest"],
    startPage: "/search",
    steps: [
      "Open /search?q=dragon g in a private window.",
      "Read the result rows.",
      "Search again for Pegasis (note the spelling: 'sis', not 'sus').",
      "Read the result rows.",
    ],
    inputs: { typo1: "dragon g", typo2: "Pegasis" },
    expectedBehaviour:
      "Misspellings are expanded at INDEX time from a crawl of a counterfeit seller's real titles, on the measured insight that an evasion spelling is the same string a genuine buyer mistypes.",
    expectedUiState:
      "'dragon g' returns Dragoon G. 'Pegasis' returns Storm Pegasus. Neither returns an empty state.",
    endResult: "Read-only; nothing persists.",
  },

  "checklist-content-discovery-search-search-normalised-away": {
    roles: ["guest"],
    startPage: "/search",
    steps: [
      "Open /search?q=!!! in a private window.",
      "Read the message on the page word for word.",
      "Count the result rows.",
      "Now search zzzznope and read that message too.",
      "Compare the two messages.",
    ],
    inputs: { punctuation: "!!!", nonsense: "zzzznope" },
    expectedBehaviour:
      "A query that normalises to no searchable words must return NOTHING, never everything. The inverse of this bug shipped on /api/products once: a punctuation-only query produced no filter clause and returned the entire published catalogue as search results.",
    expectedUiState:
      "'!!!' says the search had no searchable words in it. 'zzzznope' says nothing matched. The two messages are DIFFERENT — one means we could not form a query, the other means we ran one and found none. Any rows at all for '!!!' is the failure.",
    endResult: "Read-only; nothing persists.",
  },

  "checklist-content-discovery-search-search-zero-reads": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window and open DevTools → Network.",
      "Clear the network log.",
      "Click into the header search and type d.",
      "Wait for suggestions to appear, then type r, a, n, z, e, r one character at a time.",
      "Read the network log and count the requests made after the first one.",
    ],
    inputs: { query: "dranzer" },
    expectedBehaviour:
      "The index is fetched ONCE per page session and searched locally thereafter. Before this, every keystroke was a request to /api/search/suggestions, which was four parallel Firestore reads.",
    expectedUiState:
      "The log shows ONE large .json fetch from firebasestorage (a few hundred KB) on the first focus or keystroke, and NOTHING further as you keep typing. A request per character is the failure even though the suggestions look identical either way.",
    endResult: "Read-only; nothing persists.",
  },

  "checklist-content-discovery-search-search-no-prices": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window with no session.",
      "Click the header search and type dranzer.",
      "Read every suggestion row, including the small second line.",
      "Press Enter and read every row on the results page.",
      "Search the rendered page for the ₹ character.",
    ],
    inputs: { query: "dranzer" },
    expectedBehaviour:
      "Prices are hidden from signed-out visitors so the catalogue cannot be read at scale without an account. The suggestion subtitle used to be the product's price, served from a route cached PUBLIC for 60 seconds — a live leak on every page of the site.",
    expectedUiState:
      "Suggestion subtitles show the brand and category, e.g. 'Takara-Tomy · Attack Rings'. No ₹ appears anywhere in the dropdown or in the results, signed out.",
    endResult: "Read-only; nothing persists.",
  },

  "checklist-content-discovery-search-search-no-sandbox": {
    roles: ["guest"],
    startPage: "/search",
    steps: [
      "Open /search?q=sandbox in a private window with no session.",
      "Read every result row.",
      "Search again for tester and read every row.",
      "Note any row whose title or detail names a tester or sandbox fixture.",
    ],
    inputs: { query1: "sandbox", query2: "tester" },
    expectedBehaviour:
      "The index is ONE shared file every browser downloads, with no per-viewer filter anywhere after it is built — so a test-data row in it is published to the world for that version's whole lifetime, and an immutable object cannot be recalled.",
    expectedUiState:
      "No row seeded as test data appears. Finding even one is a disclosure, not a cosmetic issue.",
    endResult: "Read-only; nothing persists.",
  },

  "checklist-content-discovery-search-search-freshness": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Create and PUBLISH a listing with a distinctive title, e.g. Freshness Probe Dranzer.",
      "Write down the time.",
      "Open /search in a private window and search that exact title.",
      "If it is absent, wait and retry every few minutes for up to 20 minutes.",
      "Once it appears, go back and UNPUBLISH the listing.",
      "Search the same title again, retrying for up to 20 minutes.",
    ],
    inputs: { title: "Freshness Probe Dranzer" },
    expectedBehaviour:
      "A content write marks the index stale and the scheduled job rebuilds within about 15 minutes. An unpublished listing still has a fresh updatedAt, so the incremental pass re-reads it, sees it fail the published filter, and removes it.",
    expectedUiState:
      "The listing becomes findable within ~15 minutes of publishing and disappears within ~15 minutes of unpublishing. A row that NEVER appears and a row that never LEAVES are both failures, and both mean the rebuild has stopped — note which one you saw.",
    endResult:
      "Delete the probe listing afterwards. Its absence from search within ~15 minutes is itself the final check.",
  },

  "checklist-content-discovery-search-search-facet-counts": {
    roles: ["guest"],
    startPage: "/search",
    steps: [
      "Open /search?q=beyblade in a private window.",
      "Find the facet chips above the results and write down each chip's label and number.",
      "Count the result rows actually shown for one type and compare it with that chip's number.",
      "Click one chip.",
      "Read the result rows again, and read the other chips' numbers again.",
      "Click the same chip a second time to clear it.",
    ],
    inputs: { query: "beyblade" },
    expectedBehaviour:
      "Facet counts are computed over the hits the current query produced, in memory. The Firestore path cannot afford this — it is one aggregation query per facet value, each needing its own composite index, and it returns no count at all when an index is missing.",
    expectedUiState:
      "Chips show a number each. Clicking one narrows the results AND lowers the other chips' numbers to match. Clicking again restores both. A chip that does not change the results, or a number that disagrees with the rows you can count, is the failure.",
    endResult: "Read-only; the selection is not persisted and is gone on reload.",
  },

  "checklist-content-discovery-search-search-guest-no-private": {
    roles: ["guest"],
    startPage: "/search",
    steps: [
      "Open a private window with no session and open DevTools → Network.",
      "Clear the network log.",
      "Go to /search?q=order.",
      "Read every request in the log.",
      "Look specifically for any request whose path contains /api/search/scoped.",
      "Read the page for any section headed 'Your …' or 'Admin'.",
    ],
    inputs: { query: "order" },
    expectedBehaviour:
      "A signed-out visitor must make NO authenticated request at all — not a 401, not an empty 200. The client gate, the route's auth requirement and the empty source list are three independent gates, because the expensive failure is not a guest seeing an error, it is a guest silently receiving someone's data.",
    expectedUiState:
      "No /api/search/scoped request appears in the log in any form. No account or admin section renders on the page. A 401 in the log is still a FAIL — it means the request was issued.",
    endResult: "Read-only; nothing persists.",
  },

  "checklist-content-discovery-search-search-buyer-isolation": {
    roles: ["buyer"],
    startPage: "/search",
    steps: [
      "Sign in as one buyer.",
      "From an admin session in another browser, find a DIFFERENT buyer's order and note a distinctive word from its product title.",
      "Back in the first buyer's session, search that word on /search.",
      "Read every row, including any under 'Your orders'.",
      "Now open /api/search/scoped?q=<that word> directly in the same signed-in session.",
      "Read the raw JSON response end to end.",
    ],
    expectedBehaviour:
      "Every scoped source carries an owner clause built from the verified session, so the QUERY itself cannot return another viewer's rows. The API half of this check is the half that matters.",
    expectedUiState:
      "Neither the page nor the JSON contains the other buyer's order. A page that hides the row while the endpoint returns it is precisely the failure this case exists for, and only the second half can see it.",
    endResult: "Read-only; nothing persists.",
  },

  "checklist-content-discovery-search-search-seller-own-store": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Signed in as a seller, create a listing with a distinctive title and leave it as a DRAFT.",
      "Go to /search and search that title.",
      "Read which section the row appears under.",
      "Note a draft title belonging to a DIFFERENT store (ask an admin for one).",
      "Search that second title and read every row.",
    ],
    inputs: { ownDraft: "Isolation Probe Draft" },
    expectedBehaviour:
      "A seller's own drafts are returned by the scoped tier. Published listings are deduped away because the public index already has them, so what survives in that section is exactly the drafts — which is why it is labelled as such.",
    expectedUiState:
      "Your own draft appears under 'Your listings (incl. drafts)'. The other store's draft returns nothing at all.",
    endResult: "Delete the probe draft afterwards.",
  },

  "checklist-content-discovery-search-search-listing-boxes-still-filter": {
    roles: ["guest", "seller", "admin"],
    startPage: "/stores",
    steps: [
      "Open /stores and type a real store name into the page's own search box.",
      "Confirm the list narrows, then type zzzznope and confirm it empties.",
      "Sign in as a seller, open /store/orders, and repeat both searches there.",
      "Check the pager still works and the filter-drawer badge still shows the right count.",
      "Sign in as an admin, open /admin/users, and repeat both searches there.",
    ],
    inputs: { control: "zzzznope" },
    expectedBehaviour:
      "The per-collection boxes are a DIFFERENT system from site-wide search — they filter one table, carry URL state and feed real pagination — and nothing in the index work touches them. This case exists because that is a promise, and a promise with no check is a hope.",
    expectedUiState:
      "All three boxes narrow on a real term and return zero on the control. Pagination still pages, and the filter-drawer badge still counts only drawer filters.",
    endResult: "Read-only; the URL carries the query but nothing persists server-side.",
  },

  "checklist-content-discovery-search-search-support-ticket-two-words": {
    roles: ["admin"],
    startPage: "/admin/support-tickets",
    steps: [
      "Open /admin/support-tickets and read several ticket subjects.",
      "Pick TWO words that appear together in exactly one subject, where the longer word also appears in others.",
      "Type just the longer word into the search box and count the rows.",
      "Now type both words and count the rows again.",
      "Compare the two counts.",
    ],
    expectedBehaviour:
      "Both words must narrow the result. Before this the second word was discarded entirely — only the longest term reached the query — so a two-word search returned everything matching the longer word while looking like it was working.",
    expectedUiState:
      "The two-word search returns FEWER rows than the one-word search, and every row it returns contains both words. Identical counts mean the second word is still being thrown away.",
    endResult: "Read-only; nothing persists.",
  },

  "checklist-content-discovery-search-search-parts-page-has-a-box": {
    roles: ["guest"],
    startPage: "/parts",
    steps: [
      "Open /parts in a private window.",
      "Look above the grid of classifications for a search input.",
      "Type RF and read the rows that appear.",
      "Read the second line of each row.",
      "Clear it and type zzzznope.",
      "Scroll down and confirm the classification grid is still present.",
    ],
    inputs: { query: "RF", control: "zzzznope" },
    expectedBehaviour:
      "Before this the page was browse-only: 752 parts reachable only by clicking a classification and then a code, with no search input anywhere on the surface.",
    expectedUiState:
      "A search box sits above the grid. 'RF' returns the part with its classification on a second line; 'zzzznope' says no part matches. The classification grid is still there underneath — the box adds a way in, it does not replace browsing.",
    endResult: "Read-only; nothing persists.",
  },
};
