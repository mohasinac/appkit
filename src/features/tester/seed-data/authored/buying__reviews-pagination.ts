/*
 * WHY: Authored six-part procedures for the buying/reviews-pagination page.
 * WHAT: 14 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THESE REVIEWS PAGINATE INSIDE A TAB, so their state deliberately does NOT go
 * in the URL — the product page's own tab and filter state owns that space. That
 * makes the usual "reload and check the URL" assertion wrong here, and it is why
 * several cases check that page 2 holds DIFFERENT rows rather than checking a
 * query parameter. Identical rows on both pages is what a pager that moves a
 * label without moving the query looks like.
 *
 * A filter or sort whose field is not marked sortable or filterable is dropped
 * silently, so the control changes and nothing moves.
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
  "checklist-buying-reviews-pagination-detail-tab-paginates": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Open /products/product-beyblade-burst-valkyrie in a private window.",
      "Open the reviews tab and count the reviews shown.",
      "Read the total review count stated on the page.",
      "Look for a pagination control and read what it offers.",
      "Click through to the last page and count the reviews on it.",
      "Add up the per-page counts and compare against the stated total.",
    ],
    expectedBehaviour:
      "The tab shows a bounded page of reviews with a pager, rather than every review at once. The per-page counts must sum to the stated total — a total computed from a different query than the rows is how a pager offers a page that returns nothing.",
    expectedUiState:
      "A pager is present when the review count exceeds one page. The pages' counts sum to the stated total. A pager offering more pages than the total supports is the failure, and the last page will be empty.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-reviews-pagination-detail-tab-newest-first": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Open /products/product-beyblade-burst-valkyrie in a private window.",
      "Open the reviews tab without changing any control.",
      "Read the date on every review down the page.",
      "Check the dates descend from top to bottom.",
      "Read the sort control and check its selection matches what is shown.",
      "Go to page 2 and check its dates are all older than page 1's oldest.",
    ],
    expectedBehaviour:
      "The default is newest first, and the sort control shows that as its selection. Where the server's default and the control's default are computed separately the first paint shows one order while the control claims another — and because the client caches the server's data indefinitely, the disagreement never resolves itself.",
    expectedUiState:
      "Dates descend down page 1, the sort control reads newest-first, and page 2's newest date is older than page 1's oldest. An order that does not match the control's stated selection is the failure.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-reviews-pagination-detail-tab-page-2-differs": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Open /products/product-beyblade-burst-valkyrie in a private window.",
      "Open the reviews tab and write down every review title on page 1.",
      "Click to page 2.",
      "Write down every review title on page 2.",
      "Compare the two lists.",
      "Return to page 1 and check it shows its original titles again.",
    ],
    expectedBehaviour:
      "Page 2 fetches the next slice. A pager that updates its own label without moving the query renders the same rows under a different number — which looks like working pagination until the titles are actually compared.",
    expectedUiState:
      "No title appears on both pages. Returning to page 1 restores its original set. Identical titles on both pages is the exact failure this case exists for.",
    expectedData: { overlappingTitles: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-reviews-pagination-detail-tab-url-unchanged": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Open /products/product-beyblade-burst-valkyrie in a private window and read the URL.",
      "Open the reviews tab and read the URL again.",
      "Click to page 2 and read the URL.",
      "Apply a rating filter and read the URL.",
      "Reload the page and read which tab and which page of reviews are shown.",
    ],
    expectedBehaviour:
      "Review pagination is tab-local and deliberately stays out of the URL — the product page's own tab and filter state owns that space, and pushing a review page number into it would put a second owner in the same place. So a reload returning to page 1 is CORRECT here rather than a bug.",
    expectedUiState:
      "The URL does not gain a review page or rating parameter. After the reload the reviews tab opens at page 1 with no filter. A review page number appearing in the URL is the finding, not its absence.",
    endResult:
      "Read-only; nothing persists. This is the one listing in the app where losing state on reload is the intended behaviour.",
  },
  "checklist-buying-reviews-pagination-detail-tab-sort": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Open /products/product-beyblade-burst-valkyrie in a private window and open the reviews tab.",
      "Read the sort control's options and write them down.",
      "Write down the review titles in the default order.",
      "Select each other sort option in turn, writing down the resulting order each time.",
      "Compare each against the default.",
      "Write down any option that leaves the order unchanged.",
    ],
    expectedBehaviour:
      "Every sort option reorders the reviews. An option whose field is not marked sortable is dropped before the query runs, so the control's selection changes and nothing moves — and a list that happens to already be in that order makes the failure invisible unless the titles are compared.",
    expectedUiState:
      "Each option produces a visibly different order from the default. An option that changes nothing is the finding, named specifically.",
    expectedData: { inertSortOptions: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-reviews-pagination-detail-tab-rating-filter": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Open /products/product-beyblade-burst-valkyrie in a private window and open the reviews tab.",
      "Note the unfiltered review count.",
      "Filter to 5-star reviews and read the count and every review's rating.",
      "Filter to 1-star and read the count and ratings.",
      "Filter to a rating no review has and read what is shown.",
      "Clear the filter and check the original count returns.",
    ],
    expectedBehaviour:
      "The rating filter narrows to exactly that rating. A filter value with no matching reviews returns an empty state rather than the unfiltered list — a filter that silently shows everything when it matches nothing is indistinguishable from one that is not filtering at all.",
    expectedUiState:
      "Each rating filter returns only reviews of that rating and a lower count. A rating with no reviews shows a named empty state, not every review. Clearing restores the original count.",
    expectedData: { emptyRatingShowsAll: false },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-reviews-pagination-detail-tab-summary-stable": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Open /products/product-beyblade-burst-valkyrie in a private window and open the reviews tab.",
      "Read the rating summary — the average, the total count and any per-star breakdown.",
      "Filter to 5-star reviews and read the summary again.",
      "Go to page 2 and read the summary again.",
      "Change the sort and read the summary again.",
      "Compare all four readings.",
    ],
    expectedBehaviour:
      "The summary describes the whole review set and does not follow the filter, the page or the sort. A summary recomputed from the visible rows reads 5.0 out of 5 the moment a 5-star filter is applied — which is a true statement about the rows on screen and a false one about the product.",
    expectedUiState:
      "The average, total and breakdown are identical in all four readings. A summary that changes with the filter is the failure, and it is the one that misrepresents the product.",
    expectedData: { summaryChangesWithFilter: false },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-reviews-pagination-detail-tab-filters-all-work": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Open /products/product-beyblade-burst-valkyrie in a private window and open the reviews tab.",
      "Read every filter control offered and write the list down.",
      "Note the unfiltered count.",
      "Apply each filter in turn and read the resulting count and rows.",
      "Write down any filter that leaves the count unchanged.",
      "Apply two filters together and check the result is narrower than either alone.",
    ],
    expectedBehaviour:
      "Every filter offered actually narrows. A filter can render, count toward a filter badge and change nothing — that happens when it emits a field the query allowlist does not carry, or one the document does not have, and neither failure raises anything.",
    expectedUiState:
      "Each filter visibly reduces the count and its rows respect it. Two together are narrower than either. A filter leaving the count identical is the finding, named specifically.",
    expectedData: { inertFilters: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-reviews-pagination-date-range-sort-options": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Open /products/product-beyblade-burst-valkyrie in a private window and open the reviews tab.",
      "Read whether a date-range filter is offered.",
      "Set a range covering only the oldest reviews and read the count and dates.",
      "Set a range covering only the newest and read the count and dates.",
      "Set a range in which no review falls and read what is shown.",
      "Combine a date range with a sort and check both apply together.",
    ],
    expectedBehaviour:
      "A date range filters on the review's published date and combines with the sort. A date field that is filterable but lacks a value parser is the classic silent failure here: the range is sent as a plain string, the stored value is a timestamp, and the comparison matches NOTHING while raising no error.",
    expectedUiState:
      "Each range returns reviews whose dates fall inside it. An empty range shows an empty state rather than everything. A range that returns ZERO reviews when reviews demonstrably fall inside it is the parser failure.",
    expectedData: { rangeReturnsZeroIncorrectly: false },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-reviews-pagination-other-listing-types-paginate": {
    roles: ["guest"],
    startPage: "/auctions/auction-beyblade-x-shark-edge",
    steps: [
      "Open /auctions/auction-beyblade-x-shark-edge in a private window and open its reviews tab.",
      "Check a pager and the same filter and sort controls are present.",
      "Open /pre-orders/preorder-beyblade-x-bx-08-wave and check the same.",
      "Open /prize-draws/prizedraw-beyblade-mystery-box and check the same.",
      "Open /classified/classified-beyblade-stadium-set and check the same.",
      "Write down any listing type whose reviews tab lacks a control the others have.",
    ],
    expectedBehaviour:
      "Every listing type's detail page renders the same reviews component with the same controls. A type missing the pager or the filters has a local copy of the tab rather than the shared one, and a local copy drifts the first time the shared one changes.",
    expectedUiState:
      "All four types show the same pager, filter and sort controls in their reviews tabs. A type missing one is the finding, named by type and by control.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-reviews-pagination-auction-store-reviews-paginated": {
    roles: ["guest"],
    startPage: "/stores/store-beyblade-arena",
    steps: [
      "Open /stores/store-beyblade-arena in a private window and open its reviews tab.",
      "Count the reviews shown and read the stated total.",
      "Check a pager is present and click to page 2.",
      "Write down the titles on both pages and compare.",
      "Check the store's aggregate rating does not change between pages.",
      "Apply a rating filter and check the aggregate still does not change.",
    ],
    expectedBehaviour:
      "Store reviews paginate like product reviews, and the store's aggregate rating describes every review rather than the visible page. The same summary-stability rule applies here as on a product — an aggregate that follows the filter misrepresents the store.",
    expectedUiState:
      "A pager is present, page 2 holds different titles, and the aggregate is identical across pages and under a filter.",
    expectedData: { overlappingTitles: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-reviews-pagination-store-reviews-tab-url-state": {
    roles: ["guest"],
    startPage: "/stores/store-beyblade-arena",
    steps: [
      "Open /stores/store-beyblade-arena in a private window and read the URL.",
      "Open the reviews tab and read the URL again.",
      "Click to page 2 and read the URL.",
      "Copy the URL, open it in a new tab, and read which tab and page load.",
      "Press the browser back button and read where it lands.",
    ],
    expectedBehaviour:
      "A store's TAB is a real route with its own URL — that is what makes each tab bookmarkable — while the review page number within it stays tab-local, exactly as on a product page. So the URL names the reviews tab and not the review page.",
    expectedUiState:
      "The URL changes to name the reviews tab and the copied URL opens on that tab. The review page number is not in the URL, so the copy opens at page 1. Back returns to the previous tab in one press.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-buying-reviews-pagination-reviews-index-unchanged": {
    roles: ["guest"],
    startPage: "/reviews",
    steps: [
      "Open /reviews in a private window and read the page.",
      "Read the controls it offers — search, filters, sort, pagination.",
      "Apply a filter and read the URL.",
      "Click to page 2 and read the URL.",
      "Copy the URL, open it in a new tab, and check the same filter and page load.",
      "Reload and check the state survives.",
    ],
    expectedBehaviour:
      "The standalone reviews index is an ordinary listing page, so its state DOES live in the URL — unlike the tab-embedded versions. The two behave differently on purpose: a standalone listing is shareable, a tab-local pager would be a second owner of the page's URL state.",
    expectedUiState:
      "Filters, sort and page all appear in the URL, the copied URL reproduces them, and a reload preserves them. State lost on reload is a failure here, where on a product's reviews tab it is correct.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-buying-reviews-pagination-empty-state": {
    roles: ["guest"],
    startPage: "/products/product-tester-standard-3",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! so sandbox content is visible.",
      "Open a product that has no reviews and open its reviews tab.",
      "Read what is shown.",
      "Check whether a pager, filters or a sort control are rendered over the empty list.",
      "Read the rating summary and check it reads as no reviews rather than zero out of five.",
      "Apply a filter that matches nothing on a product that DOES have reviews and compare the two empty states.",
    ],
    expectedBehaviour:
      "A product with no reviews shows a named empty state, and controls that cannot act on anything are not rendered over it. The two empty states are different facts — 'no reviews yet' invites the buyer to write one, 'no reviews match this filter' invites them to clear it — and one message cannot say both.",
    expectedUiState:
      "The no-reviews product shows a message inviting a review, with no pager. The filtered-to-nothing case shows a message about the filter. A rating summary reading '0 out of 5' where there are no reviews is the failure — that is a rating, and no rating exists.",
    endResult: "Read-only; nothing persists.",
  },
};
