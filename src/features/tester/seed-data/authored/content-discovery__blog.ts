/*
 * WHY: Authored six-part procedures for the content-discovery/blog page.
 * WHAT: 5 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * Blog posts have no gallery field, so extra images live inline in the content
 * HTML — a case looking for a separate image array is looking for something the
 * document has never had.
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
  "checklist-content-discovery-blog-blog-listing": {
    roles: ["guest"],
    startPage: "/blog",
    steps: [
      "Open /blog in a private window with no session.",
      "Read every card — title, excerpt, cover image, category and read time.",
      "Note whether any card names a draft or archived post.",
      "Use the category filter, selecting each value in turn, and read the results.",
      "Page to the end of the list.",
    ],
    expectedBehaviour:
      "The listing shows published posts only. The seed holds 17 published, 2 draft and 1 archived, so a listing showing 20 is not filtering by status at all — and status filtering is the kind of guard that gets dropped when a route stops sending a parameter the query only applied when asked.",
    expectedUiState:
      "Every card carries a title, an excerpt, a rendered cover image and a category. No draft or archived post appears. Each category filter value returns rows or a named empty state.",
    expectedData: { draftPostsVisible: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-content-discovery-blog-read-post": {
    roles: ["guest"],
    startPage: "/blog",
    steps: [
      "Open /blog in a private window and click the first post.",
      "Read the title, author, publish date and read time.",
      "Read the whole article body, checking the paragraphs and any inline images render.",
      "Read the address bar and note whether the URL uses the post's slug.",
      "Reload the page.",
    ],
    expectedBehaviour:
      "A post renders its stored HTML content, including the images embedded inline within it. The route is keyed on slug, so the URL is stable and shareable.",
    expectedUiState:
      "Title, author, date and read time are shown. The body renders as formatted prose with its inline images displayed — not as raw HTML tags shown as visible text, and not as a wall of markup. The URL carries the post's slug.",
    endResult: "Read-only; nothing persists. The reload shows the same article.",
  },
  "checklist-content-discovery-blog-blog-cover-image-display": {
    roles: ["guest"],
    startPage: "/blog",
    steps: [
      "Open /blog in a private window and look at every card's cover image.",
      "Hard-reload with Ctrl+Shift+R and look again.",
      "Open one post and look at its cover image at the top of the article.",
      "Note whether the same image appears on the card and on the post.",
      "Look for any broken-image glyph or grey placeholder tile.",
    ],
    expectedBehaviour:
      "Cover images are served through the media proxy, which is what applies the watermark and keeps the storage bucket private. An image stored as a raw bucket URL bypasses that entirely and is the pattern to watch for.",
    expectedUiState:
      "Every card shows its cover image, on both loads. The post's hero image matches its card's. No broken-image glyph and no grey placeholder square anywhere.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-content-discovery-blog-blog-youtube-embed": {
    roles: ["guest"],
    startPage: "/blog",
    steps: [
      "Open /blog/selling-tips-letitrip in a private window — '10 Tips to Sell Faster on LetItRip' is the ONLY seeded post carrying a youtubeId, so searching the listing for a video indicator finds nothing and a tester would answer null on a path that works.",
      "Scroll to the embedded video.",
      "Click play and watch for a few seconds.",
      "Read any error text shown in or near the player.",
    ],
    expectedBehaviour:
      "A YouTube id on a post renders as a privacy-preserving embed. The failure worth naming is the one the product-detail pages had: a YouTube URL handed to a native video element, which cannot play a watch-page URL and says so in the player's own words.",
    expectedUiState:
      "The embedded player renders and plays on click. What must not appear is 'No video with supported format and MIME type found', an empty black box, or a bare link where a player should be.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-content-discovery-blog-blog-related-posts-sections": {
    roles: ["guest"],
    startPage: "/blog",
    steps: [
      "Open /blog in a private window and open any post.",
      "Scroll below the article body.",
      "Read the heading of each related section and the cards inside it.",
      "Check whether the post currently open appears in any of them.",
      "Click a card in each section and confirm it opens that post.",
    ],
    expectedBehaviour:
      "Three separate signals are rendered below the article — same category, shared tags, and same author — each as its own section. A section with a heading and an empty rail should not render at all; showing the heading anyway advertises content that is not there.",
    expectedUiState:
      "Three headed sections appear: Related Posts, 'You might also like', and a same-author section. Each holds at least one card with a real title and image. The current post appears in none of them, and every card opens the post it names.",
    expectedData: { selfLinkCount: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-content-discovery-blog-blog-search-filters-the-list": {
    roles: ["guest"],
    startPage: "/blog",
    steps: [
      "Open /blog in a private window with no session and count the posts listed.",
      "Type beyblade into the search box ('Search posts...') and commit the search.",
      "Read the count and confirm it is SMALLER than the unfiltered count, and that every remaining card is relevant.",
      "Clear the box, type zzzznope, and commit.",
      "Read the result — an empty state, not the full list.",
      "RELOAD the page while zzzznope is still in the URL and read the FIRST PAINT, before anything settles.",
      "Clear the search and confirm the original count returns.",
    ],
    inputs: { realQuery: "beyblade", nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "The blog listing filters server-side and the filtered result survives a reload. The nonsense control is the whole case: a real term returns plausible cards whether or not the query reached the server, so only zzzznope distinguishes filtering from returning everything. The reload matters separately — the SSR view and the API are two implementations of one query, and when the view ignored `q` the client hook's initialData froze the UNFILTERED list permanently, because a public listing hook sets staleTime Infinity once it is given SSR data. A page that shows the right rows only after a moment is that bug, not a slow render.",
    expectedUiState:
      "'beyblade' returns fewer cards than the unfiltered list. 'zzzznope' returns a named empty state and zero cards, on first paint as well as after hydration. Clearing restores the original count.",
    expectedData: { nonsenseResultCount: 0 },
    endResult:
      "Read-only; nothing persists beyond the URL. A full list under zzzznope is the failure, and it is the same shape whether the query never left the browser or the SSR view dropped it.",
  },
};
