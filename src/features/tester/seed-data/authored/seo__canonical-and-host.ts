/*
 * WHY: Authored six-part procedures for the seo/canonical-and-host checklist page.
 * WHAT: 6 case(s), keyed by full checklist id.
 *
 * 🛑 THE CANONICAL HOST HAS EXACTLY ONE DEFINITION AND EVERYTHING DERIVES FROM IT.
 * When it had two — one hardcoded, one read from an environment variable, with a
 * comment claiming they were kept in sync — the sitemap advertised 182 URLs on a
 * host that redirected, the destination declared a canonical on a host present in
 * no sitemap, and the site fell out of search results with nothing erroring
 * anywhere. These cases are the read-side proof that there is still only one.
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
  "checklist-seo-canonical-and-host-apex-redirects-to-www": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open the site by typing the bare domain with no www prefix into the address bar.",
      "Open the browser's network panel before the page finishes loading.",
      "Read the status code of the FIRST response, before any redirect is followed.",
      "Read the address bar afterwards.",
      "Repeat with a deep path rather than the homepage.",
    ],
    expectedBehaviour:
      "The apex redirects to the www host permanently. A temporary redirect explicitly tells a search engine NOT to move the index entry, so the old address stays indexed while the new one is the only place content lives — which is how a site keeps two competing addresses for every page indefinitely.",
    expectedUiState:
      "The first response is a permanent redirect — a 301 or 308 — not a 307 or 302. The address bar ends on the www host, and the deep path is preserved rather than being dropped to the homepage.",
    expectedData: { redirectIsPermanent: true },
    endResult: "Read-only.",
  },
  "checklist-seo-canonical-and-host-locale-prefix-redirects-to-bare": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Type the products path with an /en prefix in front of it into the address bar.",
      "Watch the network panel and read the first response's status.",
      "Read where the address bar lands.",
      "Open the products page from the site's own navigation and read the address bar.",
      "Compare the two.",
    ],
    expectedBehaviour:
      "A locale-prefixed path resolves to the unprefixed one, and the site's own links use the unprefixed form so no internal navigation pays the redirect. Two spellings of every path is two addresses a crawler has to reconcile, and one of them is always the slower.",
    expectedUiState:
      "The prefixed path redirects and the address bar reads the bare path. The site's own navigation produces the bare path directly, with no redirect in the network panel.",
    endResult: "Read-only.",
  },
  "checklist-seo-canonical-and-host-canonical-matches-visited-host": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open the homepage on the www host and view the page source.",
      "Find the canonical link element and read its href.",
      "Compare its host against the host in the address bar.",
      "Open /products and read its canonical.",
      "Open /products/product-beyblade-burst-valkyrie and read its canonical.",
      "Open /sitemap.xml and read the host on the first entry.",
      "Compare all four hosts.",
    ],
    expectedBehaviour:
      "One definition of the host feeds page canonicals, social tags, structured data, robots and the sitemap. Two owners drifted the moment the deployment environment changed, and neither side errored — the sitemap simply advertised URLs that redirected while the destination pointed somewhere the sitemap never named.",
    expectedUiState:
      "The canonical on every page names the same host as the address bar and as the sitemap. Any page whose canonical names a different host is the finding, named by page.",
    expectedData: { distinctHosts: 1 },
    endResult: "Read-only.",
  },
  "checklist-seo-canonical-and-host-no-inherited-homepage-canonical": {
    roles: ["guest"],
    startPage: "/promotions",
    steps: [
      "Open /reviews and view the page source.",
      "Find the canonical link element, if there is one, and read its href.",
      "Check it is not the homepage's URL.",
      "Open /promotions and read its canonical the same way.",
      "Open two more pages that are unlikely to declare their own metadata and read theirs.",
    ],
    expectedBehaviour:
      "Metadata declared at the root is INHERITED by every page beneath it, so a static absolute canonical there makes every page that does not override it declare itself a duplicate of the homepage. A page either declares its own or has none.",
    expectedUiState:
      "No page other than the homepage carries the homepage's URL as its canonical. Every page whose canonical reads as the bare site root is a finding, listed by path.",
    expectedData: { pagesCanonicalisedToHomepage: 0 },
    endResult: "Read-only.",
  },
  "checklist-seo-canonical-and-host-tab-family-single-canonical": {
    roles: ["guest"],
    startPage: "/stores/store-beyblade-arena",
    steps: [
      "Open /stores/store-beyblade-arena and read its canonical from the page source.",
      "Open the store's About tab and read its canonical.",
      "Open two more of the store's tabs and read theirs.",
      "Compare all four canonicals.",
      "Read each tab's title and description as well.",
    ],
    inputs: { storeId: "store-beyblade-arena" },
    expectedBehaviour:
      "Tabs are views of ONE page, so they share one canonical — the store's own URL, which is the one the sitemap advertises. Four competing canonicals split the section into four addresses, none of which is the advertised one. Titles and descriptions genuinely differ per tab and must keep differing.",
    expectedUiState:
      "All four tabs declare the same canonical, and it is the store's base URL. Each tab still has its own title and description. Four different canonicals is the failure; four identical titles is a separate, smaller one.",
    expectedData: { distinctCanonicals: 1 },
    endResult: "Read-only.",
  },
  "checklist-seo-canonical-and-host-redirect-only-page-no-canonical": {
    roles: ["guest"],
    startPage: "/promotions",
    steps: [
      "Open the network panel and navigate to /promotions.",
      "Read whether the first response is a redirect.",
      "Read where it lands.",
      "View the source of the page it landed on and read its canonical.",
      "Check that canonical names the LANDING page rather than /promotions.",
    ],
    expectedBehaviour:
      "A redirect fires before any document is produced, so metadata declared on a redirecting page never reaches a browser at all — a crawler follows the redirect and reads the canonical of the page it lands on. Metadata there is code that reads as though it were doing something and is not.",
    expectedUiState:
      "The redirect resolves and the landing page's canonical names the landing page. A canonical naming the redirecting path is the failure.",
    endResult: "Read-only.",
  },
};
