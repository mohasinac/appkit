/*
 * WHY: Authored six-part procedures for the seo/og-images checklist page.
 * WHAT: 5 case(s), keyed by full checklist id.
 *
 * A social card is rendered server-side and never appears in the page a visitor
 * sees, so every failure here is invisible until somebody shares a link. The brand
 * card's image reader named a field the record does not have — always undefined,
 * always omitted, and the card still rendered.
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
  "checklist-seo-og-images-og-image-renders-homepage": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open the homepage and view the page source.",
      "Find the og:image tag and copy its URL.",
      "Open that URL in a fresh tab.",
      "Read what renders — a real image, an error, or a blank frame.",
      "Read the response status and content type in the network panel.",
    ],
    expectedBehaviour:
      "The social image URL serves a real image. It is generated rather than a static file, so a failure inside the generator returns an error or an empty frame that nothing on the site would ever reveal.",
    expectedUiState:
      "The URL returns 200 with an image content type and renders a card carrying the site's branding. A blank frame or an error page is the finding.",
    endResult: "Read-only.",
  },
  "checklist-seo-og-images-og-image-product": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Open /products/product-beyblade-burst-valkyrie and note the product's title and main photo.",
      "View the source, find the og:image tag and copy its URL.",
      "Open that URL in a fresh tab.",
      "Read the title rendered on the card and compare it against the product's.",
      "Check the product's own photo appears on the card rather than a generic placeholder.",
    ],
    inputs: { productId: "product-beyblade-burst-valkyrie" },
    expectedBehaviour:
      "A product's card is built from that product. A card that renders correctly but with the site's default artwork is the more likely failure — it looks deliberate, and only comparing it against the product reveals that the record was never read.",
    expectedUiState:
      "The card shows the product's own title and its own photo. A generic card is the finding.",
    endResult: "Read-only.",
  },
  "checklist-seo-og-images-og-image-brand-logo-present": {
    roles: ["guest"],
    startPage: "/brands/brand-takara-tomy",
    steps: [
      "Open /brands/brand-takara-tomy and note the cover image shown in its hero.",
      "View the source, find the og:image tag and copy its URL.",
      "Open that URL in a fresh tab.",
      "Read whether the brand's image is on the card or the slot is empty.",
      "Repeat with /brands/brand-beyblade.",
    ],
    inputs: { brandId: "brand-takara-tomy" },
    expectedBehaviour:
      "The card reads the same cover image the brand page's hero uses. It previously read a field that does not exist on a brand record at all, so the value was always undefined and the image was silently omitted — the card still rendered, just without it.",
    expectedUiState:
      "The brand's cover image is on the card for both brands. An empty image slot with the rest of the card intact is exactly the failure this case exists for.",
    endResult: "Read-only.",
  },
  "checklist-seo-og-images-og-tags-present-and-absolute": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Open /products/product-beyblade-burst-valkyrie and view the source.",
      "List every og: and twitter: tag present.",
      "Check og:title, og:description, og:image and og:url are all there.",
      "Read og:image's and og:url's values and check both are absolute URLs.",
      "Check their host matches the canonical's host.",
      "Repeat on a store page and a blog post.",
    ],
    expectedBehaviour:
      "Social tags are present and their URLs are absolute on the canonical host. A relative social image URL is not fetchable by the service rendering the preview — it has no page context to resolve it against — so the card falls back to nothing.",
    expectedUiState:
      "All four tags present on all three pages, with absolute URLs on the canonical host. A relative URL, or one on a different host, is the finding.",
    endResult: "Read-only.",
  },
  "checklist-seo-og-images-og-image-missing-media-fallback": {
    roles: ["guest"],
    startPage: "/classified/classified-tester-sandbox-1",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Find a listing with no photo of its own, or note that the sandbox classified has none.",
      "Open its detail page and view the source.",
      "Copy the og:image URL and open it in a fresh tab.",
      "Read what renders.",
    ],
    expectedBehaviour:
      "A record with no image still produces a readable card, falling back to the site's own artwork rather than to a broken image. A card generator that assumes an image exists throws, and the shared link then has no preview at all.",
    expectedUiState:
      "The card renders with the listing's title over the site's default artwork. A broken image, an error page or a 500 are all findings.",
    endResult: "Read-only.",
  },
};
