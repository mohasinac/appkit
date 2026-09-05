/*
 * WHY: Authored six-part procedures for the seo/sitemap-and-robots checklist page.
 * WHAT: 6 case(s), keyed by full checklist id.
 *
 * Two of these are the ones that would have caught the de-indexing directly: a
 * sitemap whose URLs all redirect, and a robots.txt naming a different host from
 * the pages. Neither errors, neither is visible in a browser, and both are one
 * request away from being provable.
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
  "checklist-seo-sitemap-and-robots-sitemap-loads-and-parses": {
    roles: ["guest"],
    startPage: "/sitemap.xml",
    steps: [
      "Open /sitemap.xml directly in the browser.",
      "Read the status shown in the network panel.",
      "Read whether the browser rendered it as XML or as raw text with a parse error.",
      "Count the URL entries, or read the count the browser reports.",
      "Scan the entries for the main sections — products, categories, brands, stores, blog, events.",
    ],
    expectedBehaviour:
      "The sitemap is served as valid XML with a real inventory of public URLs. A sitemap that 404s or fails to parse is silently ignored by every crawler, and there is no report anywhere that says so.",
    expectedUiState:
      "The document renders as XML with no parse error, returns 200, and holds well over a hundred entries covering each public section. A handful of entries, or only the homepage, is the finding.",
    endResult: "Read-only.",
  },
  "checklist-seo-sitemap-and-robots-sitemap-urls-do-not-redirect": {
    roles: ["guest"],
    startPage: "/sitemap.xml",
    steps: [
      "Open /sitemap.xml and copy the first entry's URL exactly as written.",
      "Paste it into a fresh tab with the network panel open.",
      "Read the first response's status code before any redirect is followed.",
      "Repeat with one entry from each section — a product, a category, a store, a blog post.",
      "Note the host each entry uses and compare it against the host they land on.",
    ],
    expectedBehaviour:
      "A sitemap entry resolves directly. Every one of them redirecting means the sitemap names one host while the pages canonicalise to another — the exact shape that removed this site from search results, and it produces no error at any layer.",
    expectedUiState:
      "Each sampled URL returns 200 on its first response, with no redirect step in the network panel. Any redirect is the finding, reported with the host it came from and the host it went to.",
    expectedData: { redirectingSitemapUrls: 0 },
    endResult: "Read-only.",
  },
  "checklist-seo-sitemap-and-robots-robots-loads-and-allows": {
    roles: ["guest"],
    startPage: "/robots.txt",
    steps: [
      "Open /robots.txt directly and read the whole file.",
      "Read every Disallow line.",
      "Check no rule disallows the site root for all user agents.",
      "Read the Host line, if present, and note the hostname.",
      "Compare that hostname against the address bar and against the sitemap's entries.",
    ],
    expectedBehaviour:
      "robots.txt loads, permits the public site and names the same host as everything else. A sustained failure on this file is worse than a wrong rule inside it — a crawler that cannot fetch robots.txt stops crawling the whole host, and the file was among the routes taken down by a past module-load failure.",
    expectedUiState:
      "The file returns 200 with readable content, has no blanket disallow, and its host matches the sitemap's. A different host here is the same two-owners failure seen from another angle.",
    endResult: "Read-only.",
  },
  "checklist-seo-sitemap-and-robots-robots-sitemap-line-correct": {
    roles: ["guest"],
    startPage: "/robots.txt",
    steps: [
      "Open /robots.txt and find the Sitemap: line.",
      "Copy the URL it names exactly.",
      "Open it in a fresh tab with the network panel open.",
      "Read the status of the first response.",
      "Check it is the same sitemap /sitemap.xml serves.",
    ],
    expectedBehaviour:
      "The Sitemap: line names a URL that loads on its first request. A line pointing at a redirecting or missing host means the sitemap is never read, while both files individually look fine.",
    expectedUiState:
      "The named URL returns 200 directly and serves the sitemap. A redirect or a 404 is the finding.",
    endResult: "Read-only.",
  },
  "checklist-seo-sitemap-and-robots-sitemap-excludes-private-routes": {
    roles: ["guest"],
    startPage: "/sitemap.xml",
    steps: [
      "Open /sitemap.xml and use the browser's find to search for '/admin'.",
      "Search for '/store/' and for '/user/'.",
      "Search for '/checkout' and for '/cart'.",
      "Search for '/auth/'.",
      "Record any match, with the full URL.",
    ],
    expectedBehaviour:
      "Only pages a signed-out visitor can actually read belong in the sitemap. A dashboard or checkout route there spends crawl budget on a redirect or an empty shell, and the shell is what gets indexed if anything is.",
    expectedUiState:
      "None of those searches matches. Every match is a finding, listed with its URL.",
    expectedData: { privateRoutesInSitemap: 0 },
    endResult: "Read-only.",
  },
  "checklist-seo-sitemap-and-robots-sitemap-excludes-test-data": {
    roles: ["guest"],
    startPage: "/sitemap.xml",
    steps: [
      "Open /sitemap.xml and search for 'tester-sandbox'.",
      "Search for 'tester-qa'.",
      "Search for 'test-' as a looser check.",
      "Record any match with its full URL.",
      "Open one matched URL, if any, and read what it serves.",
    ],
    expectedBehaviour:
      "Sandbox fixtures are wiped and re-seeded on every tester run, so a sitemap entry for one is a URL that repeatedly disappears. Test data is filtered out of every public read for the same reason it must be filtered here.",
    expectedUiState:
      "No sandbox id appears in the sitemap. A match is a finding, and if the URL currently loads that makes it worse rather than better — it means sandbox content is publicly indexable.",
    expectedData: { sandboxUrlsInSitemap: 0 },
    endResult: "Read-only.",
  },
};
