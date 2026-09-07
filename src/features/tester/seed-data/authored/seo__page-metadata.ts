/*
 * WHY: Authored six-part procedures for the seo/page-metadata checklist page.
 * WHAT: 7 case(s), keyed by full checklist id.
 *
 * Metadata failures are all silent by construction — a missing canonical, a title
 * built from a slug and a 200 on a page that does not exist all render a page that
 * looks entirely normal. The procedures read the source rather than the screen.
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
  "checklist-seo-page-metadata-listing-pages-distinct-titles": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products and read the browser tab's title and the page's meta description.",
      "Open /auctions and read both.",
      "Open /pre-orders, /bundles and /categories and read each.",
      "Compare all five titles against one another.",
      "Compare all five descriptions.",
    ],
    expectedBehaviour:
      "Each listing page states what it lists. Five pages sharing one site-wide default makes them indistinguishable in a result list, and a shared description is the more common half of the failure because nothing on screen shows it.",
    expectedUiState:
      "Five distinct titles and five distinct descriptions, each naming its own section. Any repeat is a finding, named by the pages that share it.",
    expectedData: { distinctTitles: 5 },
    endResult: "Read-only.",
  },
  "checklist-seo-page-metadata-detail-page-title-from-record": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Open /products/product-beyblade-burst-valkyrie.",
      "Read the product's name as shown on the page.",
      "Read the browser tab's title.",
      "Compare the two.",
      "Read the meta description and check it draws on the product's own description.",
      "Repeat on a prize-draw detail page and read its title.",
    ],
    inputs: { productId: "product-beyblade-burst-valkyrie" },
    expectedBehaviour:
      "A detail page's title is the record's name. One listing type interpolated the raw slug instead, so its tab read a hyphenated identifier — which is legible enough to pass a glance and wrong in every search result.",
    expectedUiState:
      "The tab title contains the product's readable name, not its hyphenated id. The prize-draw page is checked separately because that is where the slug leak was.",
    endResult: "Read-only.",
  },
  "checklist-seo-page-metadata-detail-pages-have-canonical": {
    roles: ["guest"],
    startPage: "/classified/classified-tester-sandbox-1",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! so sandbox fixtures are visible.",
      "Open /classified/classified-tester-sandbox-1 and view the page source.",
      "Search the source for a canonical link element and read its href, or record that there is none.",
      "Do the same on /digital-codes/digitalcode-tester-sandbox-1.",
      "Do the same on /live/live-tester-sandbox-1.",
      "Do the same on an ordinary product page as a control.",
    ],
    expectedBehaviour:
      "Every listing type declares a canonical. Three types had their metadata builder called without the site URL, so it returned nothing for them and those pages shipped with none at all — while the standard product page, the one anybody would spot-check, was fine.",
    expectedUiState:
      "All four pages carry a canonical link element with an absolute URL. A page with none is the finding, named by listing type.",
    expectedData: { pagesWithoutCanonical: 0 },
    endResult: "Read-only.",
  },
  "checklist-seo-page-metadata-detail-canonical-uses-slug-not-id": {
    roles: ["guest"],
    startPage: "/classified/classified-tester-sandbox-1",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /classified/classified-tester-sandbox-1 and note the exact path in the address bar.",
      "View the source and read the canonical's path.",
      "Compare the two paths character for character.",
      "Copy the canonical's URL into a fresh tab and read what loads.",
    ],
    expectedBehaviour:
      "The canonical names the URL the route actually serves. A canonical built from the record's internal id while the route is keyed on its slug names an address that does not exist — so the page tells crawlers its real home is a 404.",
    expectedUiState:
      "The canonical's path equals the address bar's path, and opening it loads the same page. A canonical that 404s is the failure.",
    endResult: "Read-only.",
  },
  "checklist-seo-page-metadata-single-h1-per-page": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products and use the browser's element inspector to count top-level headings.",
      "Do the same on the homepage.",
      "Do the same on a product detail page.",
      "Do the same on a store page and on a blog post.",
      "Record the count for each.",
    ],
    expectedBehaviour:
      "One top-level heading per page states what the page is. Several compete to be that statement, and none makes it clear which describes the page.",
    expectedUiState:
      "Exactly one on each of the five pages. Any page with zero or with more than one is a finding, named with its count.",
    expectedData: { headingsPerPage: 1 },
    endResult: "Read-only.",
  },
  "checklist-seo-page-metadata-404-page-not-indexable": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open the network panel and navigate to a product path whose trailing segment is a nonsense word no listing uses.",
      "Read what the page shows.",
      "View the source and read every robots meta tag.",
      "Repeat with a nonsense store path and a nonsense auction path.",
      "Open a REAL product page and read its robots meta tags too.",
    ],
    expectedBehaviour:
      "A missing page renders the site's 404 view and marks itself NOINDEX. Judge the noindex, not the status code: Next streams the response, so the headers are already sent by the time the not-found is raised and the status can no longer be changed. It injects a noindex robots tag into the streamed HTML instead, and that is what actually keeps the URL out of the index. A 200 here is expected and is not the finding.",
    expectedUiState:
      "All three missing paths render the 404 view and their source carries a robots tag whose content is noindex. The real product page carries no noindex — check it, because a blanket noindex would satisfy the first half while quietly de-indexing the whole catalogue.",
    expectedData: { missingPageIsNoindex: true, realPageIsNoindex: false },
    endResult: "Read-only.",
  },
  "checklist-seo-page-metadata-title-length-reasonable": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open a product with a long name and read the full tab title including any site-name suffix.",
      "Count its characters.",
      "Check the product's own name is not the part being cut off by the suffix.",
      "Repeat on a blog post with a long headline.",
      "Repeat on a category page.",
    ],
    expectedBehaviour:
      "A title stays short enough to be shown whole, and where it cannot, the record's own name survives and the brand suffix is what gives way. A title truncated mid-word in the record's name is worse than one with no suffix.",
    expectedUiState:
      "Each title reads as a complete phrase with the record's name intact, roughly sixty characters or fewer. A title cut mid-word is the finding, quoted in full.",
    endResult: "Read-only.",
  },
};
