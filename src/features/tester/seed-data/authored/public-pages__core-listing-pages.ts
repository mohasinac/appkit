/*
 * WHY: Authored six-part procedures for the public-pages/core-listing-pages page.
 * WHAT: 16 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * These are the pages a crawler and a first-time visitor hit, so several cases
 * end by reading the page SOURCE rather than the rendered view — a canonical tag,
 * an embedded data payload and a leaked field are all invisible on screen.
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
  "checklist-public-pages-core-listing-pages-homepage-loads": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at a desktop width of 1280 pixels.",
      "Scroll to the bottom, reading every section heading and checking each has content beneath it.",
      "Write down any heading whose section is empty.",
      "Resize the window to 390 pixels wide and reload /.",
      "Scroll to the bottom again, reading the same sections.",
      "Try to scroll the page sideways.",
    ],
    inputs: { desktopWidth: 1280, mobileWidth: 390 },
    expectedBehaviour:
      "The homepage composes around 26 independently-fetched sections, each wrapped in its own boundary. A section that throws renders as nothing and is reported server-side rather than replacing the whole page — so the page surviving is not by itself proof that every section worked.",
    expectedUiState:
      "At both widths the page renders end to end with no 'Something went wrong'. Every heading has content under it — a heading followed by an empty rail means that section's data fetch returned nothing, which is a different failure from the section being absent. Nothing scrolls sideways at 390px.",
    expectedData: { emptySectionCount: 0 },
    endResult:
      "Read-only; nothing persists. Note each empty section by name in the comment — 'the homepage loads' is true even when four sections are silently blank.",
  },
  "checklist-public-pages-core-listing-pages-whatsapp-community-link-real": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / on a device or emulator with WhatsApp installed.",
      "Find the 'Join the Community' button and read the URL it points at.",
      "Tap it and read what WhatsApp shows.",
      "Open /contact and find its WhatsApp link.",
      "Read that URL and compare it with the first.",
    ],
    expectedBehaviour:
      "The invite code resolves to a real group. A placeholder that is not a valid invite code still produces a link-shaped URL and a button that responds — WhatsApp simply reports that the group cannot be found, which reads as WhatsApp's problem rather than the site's.",
    expectedUiState:
      "WhatsApp offers to join an actual named group rather than showing 'invalid link' or 'group not found'. The Contact page's link carries the same invite code as the homepage button — two different codes means one of them is stale.",
    endResult:
      "Do not actually join the group. Read-only; nothing persists.",
  },
  "checklist-public-pages-core-listing-pages-about-us-in-main-nav": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at a desktop width.",
      "Read every item in the main top navigation.",
      "Click 'About Us' in that navigation and read where it lands.",
      "Resize to 390 pixels wide, open the mobile navigation, and read its items.",
    ],
    expectedBehaviour:
      "About Us is a top-level navigation item, not footer-only. A page reachable only from the footer is a page most visitors never find.",
    expectedUiState:
      "'About Us' appears in the main top navigation and lands on /about with content. It is present in the mobile navigation too — a desktop-only nav item is missing for most of the traffic.",
    expectedData: { aboutHref: "/about" },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-core-listing-pages-about-team-real-founder": {
    roles: ["guest"],
    startPage: "/about",
    steps: [
      "Open /about in a private window with no session.",
      "Scroll to the \"Who's Behind LetItRip\" section.",
      "Read the founder card's name and role.",
      "Click the 'GitHub ↗' link on that card.",
      "Read the profile it opens.",
    ],
    expectedBehaviour:
      "The team section is admin-editable content, and the founder card holds a real person with a working profile link. A fictional placeholder name renders identically to a real one, so only reading it catches this.",
    expectedUiState:
      "The founder card shows a real name — not a seeded persona like 'Mock User' or a franchise character — and its 'GitHub ↗' link opens that person's actual GitHub profile rather than a 404 or the GitHub homepage.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-core-listing-pages-about-values-expanded": {
    roles: ["guest"],
    startPage: "/about",
    steps: [
      "Open /about in a private window with no session.",
      "Scroll to the 'Our Values' section.",
      "Count the values listed.",
      "Read each one for a second, smaller paragraph beneath its heading.",
      "Find the 'How we hold ourselves to this →' link and click it.",
      "Read the address bar.",
    ],
    inputs: { expectedValueCount: 6 },
    expectedBehaviour:
      "The section carries six values, each with a subtitle paragraph, and links onward to the Ethics page — where the commitments are actually detailed. Values with no onward link are a statement with nothing behind it.",
    expectedUiState:
      "Six values are shown, not three. Each has a second smaller paragraph under its heading rather than a heading alone. The link is present and lands on /ethics.",
    expectedData: { valueCount: 6, ethicsHref: "/ethics" },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-core-listing-pages-developer-page-loads": {
    roles: ["guest"],
    startPage: "/developer",
    steps: [
      "Open / in a private window and scroll to the footer's Support column.",
      "Find the Developer link, positioned next to About Us.",
      "Click it and read the address bar.",
      "Read the developer's name on the page.",
      "Click the 'GitHub ↗' link and read the profile it opens.",
    ],
    expectedBehaviour:
      "The page exists, is reachable from the footer beside About Us, and names a real person with a working profile link — the same three requirements as the founder card, on a page of its own.",
    expectedUiState:
      "The footer's Support column holds a Developer link next to About Us. It lands on /developer with real content. The name is a real developer's, and 'GitHub ↗' opens their actual profile.",
    expectedData: { developerHref: "/developer" },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-core-listing-pages-products-listing-page": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products in a private window with no session.",
      "Read the total result count and the availability tab bar.",
      "Read every listing-type chip offered above the grid.",
      "Read every card title on the first page, looking for anything containing 'Tester' or 'Test'.",
      "Tick the Auctions chip and read the result count and the sort dropdown.",
      "Tick Pre-Orders as well and read the sort dropdown again.",
    ],
    expectedBehaviour:
      "/products spans every listing type, so its type chips are a multi-select covering all nine — auctions, pre-orders, prize draws, art and stickers were unreachable from the main catalogue while only four chips were offered. The sort dropdown narrows to the options valid for every selected type, because a sort valid for one type alone would either no-op or fail the query for the others.",
    expectedUiState:
      "Nine type chips are offered, ticking more than one is possible, and the Available / Sold & Ended / All tabs are present with Available selected. No card title contains 'Tester' or 'Test' for a signed-out visitor. With Auctions and Pre-Orders both ticked the sort dropdown offers only sorts that apply to both.",
    expectedData: { listingTypeChipCount: 9 },
    endResult:
      "Read-only; nothing persists. Four chips instead of nine is the specific regression this case exists for.",
  },
  "checklist-public-pages-core-listing-pages-auctions-listing-page": {
    roles: ["guest"],
    startPage: "/auctions",
    steps: [
      "Open /auctions in a private window with no session.",
      "Read the availability tab bar and note which tab is selected and what the middle one is called.",
      "Read every card and check whether any shows an ended countdown.",
      "Read the sort dropdown's default selection.",
      "Click the middle availability tab and read the cards.",
    ],
    expectedBehaviour:
      "The default view shows auctions that are still live, and the middle tab is labelled for auctions specifically. An auction's end date is an inequality, which is why it is the one availability clause that carries its own sort field — pairing an inequality with an unrelated sort demands a composite index nobody declares, and the query then fails silently into an empty page.",
    expectedUiState:
      "The tabs read Available / Ended / All, not 'Sold & Ended' — the label is derived per type. Available is selected and no card on it shows an ended countdown. The Ended tab shows the closed auctions, including the reserve-not-met one.",
    expectedData: { middleTabLabel: "Ended" },
    endResult:
      "Read-only; nothing persists. An empty Available tab with rows under All means the date filter failed rather than that nothing is live.",
  },
  "checklist-public-pages-core-listing-pages-preorders-listing-page": {
    roles: ["guest"],
    startPage: "/pre-orders",
    steps: [
      "Open /pre-orders in a private window with no session.",
      "Read the sort dropdown's default selection.",
      "Read the delivery dates on the cards from the top down.",
      "Read the availability tabs and note the middle tab's label.",
      "Click the middle tab and read the cards.",
    ],
    expectedBehaviour:
      "Pre-orders open sorted by earliest delivery first, which is the ordering a buyer waiting on stock cares about. Store tabs for the same type once carried a drifted local copy of this sort array and opened newest-first instead, for the same data.",
    expectedUiState:
      "The sort dropdown shows earliest-delivery-first as the selection, and the dates on the cards ascend down the page. The middle availability tab reads 'Sold' rather than 'Ended'. The sold-out fixture appears under it, not under Available.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-core-listing-pages-bundles-listing-page": {
    roles: ["guest"],
    startPage: "/bundles",
    steps: [
      "Open /bundles in a private window with no session.",
      "Read each bundle card's price and its discount badge.",
      "Open bundle-tester-sandbox and read its price and its members.",
      "Add up the members' individual prices and compare with the bundle price.",
      "Read the page for anything containing 'Tester' or 'Test' while signed out.",
    ],
    inputs: { bundlePrice: 199, memberTotal: 348 },
    expectedBehaviour:
      "A bundle is a category row with a locked price, deliberately below the sum of its members, and the discount badge is computed from the two. Its members are mirrored onto the bundle for index-friendly reads, and a reader that trusts only the mirror shows an empty bundle whenever a write path forgot to update it.",
    expectedUiState:
      "Each card shows a price and a discount percentage. The sandbox bundle shows ₹199 against a members' total of ₹348. Its detail page lists both members with titles and images rather than reading '0 items'. No sandbox bundle is visible to a signed-out visitor.",
    expectedData: { sandboxBundleVisibleToGuest: false },
    endResult:
      "Read-only; nothing persists. A bundle rendering as empty is the mirror-drift failure, not a missing bundle.",
  },
  "checklist-public-pages-core-listing-pages-categories-index": {
    roles: ["guest"],
    startPage: "/categories",
    steps: [
      "Open /categories in a private window with no session.",
      "Read every category card — its name, image and item count.",
      "Note whether both root categories are present.",
      "Click into one root category and read its page.",
      "Go back and click a tier-3 category and read its page.",
    ],
    expectedBehaviour:
      "The index renders the category forest — two roots across four tiers — and every card links to a page that resolves. Products carry their full ancestor chain, so a category page matches on its own id alone and needs no descendant expansion.",
    expectedUiState:
      "Both roots, Spinning Tops and Living Collectibles, are present. Every card shows a name and a count rather than a bare name. Both the root and the tier-3 page render with products rather than an empty grid.",
    expectedData: { rootCategoryCount: 2 },
    endResult:
      "Read-only; nothing persists. A root category page rendering blank with no error is the specific failure worth watching for — the query that produces it is wrapped in a catch that returns nothing.",
  },
  "checklist-public-pages-core-listing-pages-brands-index-detail": {
    roles: ["guest"],
    startPage: "/brands",
    steps: [
      "Open /brands in a private window with no session and read every brand card.",
      "Open /brands/brand-beyblade.",
      "Read the hero banner, the brand name and the 'About this brand' panel.",
      "Read the panel for a website, a country and a founding year.",
      "Read the product grid beneath and check the products belong to that brand.",
    ],
    inputs: { brandId: "brand-beyblade" },
    expectedBehaviour:
      "Brands are category rows discriminated by type, not a separate collection. A brand page matches its products by DISPLAY NAME rather than by slug, so the brand's name and the brand string on every product must agree exactly — renaming a brand silently orphans its whole catalogue.",
    expectedUiState:
      "The hero banner renders — it is driven by the cover image, which the admin editor labels 'Cover Image'. The 'About this brand' panel shows website, country and founding year rather than being absent. The grid holds Beyblade products rather than being empty.",
    endResult:
      "Read-only; nothing persists. An empty grid on a brand with seeded products means the name and the product brand strings have drifted apart.",
  },
  "checklist-public-pages-core-listing-pages-category-item-counts-accurate": {
    roles: ["guest"],
    startPage: "/categories",
    steps: [
      "Open /categories in a private window with no session.",
      "Write down the item count shown on three different category cards.",
      "Open the first of those categories and count the products actually listed, paging to the end.",
      "Repeat for the second and third.",
      "Note any card whose count is zero.",
    ],
    expectedBehaviour:
      "A card's count is what the category page actually contains. A count that fails to compute must read as unknown, never as zero — a count map that returns undefined for an option is treated as 'unknown' and shown, while a zero hides the tab or card entirely, so a transient error would hide a category holding real stock.",
    expectedUiState:
      "All three counts match the number of products on their pages. No card shows zero while its page holds products. A card showing a count and an empty page is the inverse failure and equally wrong.",
    expectedData: { mismatchCount: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-core-listing-pages-parent-category-includes-children": {
    roles: ["guest"],
    startPage: "/categories/category-beyblade-burst",
    steps: [
      "Open /categories/category-beyblade-burst in a private window and read its product count.",
      "Write down the titles on the first page.",
      "Open a child category of Burst — category-burst-tops — and write down its titles.",
      "Go back to the parent and check whether the child's titles appear there too.",
      "Open the root, /categories/category-spinning-tops, and read its count and titles.",
    ],
    inputs: { parentCategory: "category-beyblade-burst", childCategory: "category-burst-tops" },
    expectedBehaviour:
      "Every product carries its full ancestor chain, so a parent page matches on its own id and picks up everything filed beneath it. This is why descendant expansion must NOT be reintroduced: the expansion list for a root exceeds the 30-value cap on the query it feeds, the query throws, and the caller's catch turns that into a blank page with no error anywhere.",
    expectedUiState:
      "The parent page includes the child category's products, and its count reflects them. The root page includes products from every tier below it and is not empty.",
    expectedData: { rootPageEmpty: false },
    endResult:
      "Read-only; nothing persists. A blank root category page with populated children is exactly the cap-exceeded failure.",
  },
  "checklist-public-pages-core-listing-pages-category-brand-related-sections": {
    roles: ["guest"],
    startPage: "/categories/category-beyblade-burst",
    steps: [
      "Open /categories/category-beyblade-burst in a private window with no session.",
      "Scroll to the 'Related Categories' section and read the cards.",
      "Check whether Beyblade Burst itself is among them.",
      "Open /brands/brand-beyblade and scroll to 'Related Brands'.",
      "Read those cards and check whether Beyblade itself is among them.",
    ],
    expectedBehaviour:
      "Each page offers siblings sharing its root, with the current page filtered out. A self-link reads as a working suggestion and goes nowhere new, which is the same defect the policy pages' related-links list has.",
    expectedUiState:
      "'Related Categories' lists other categories under the same root and does not include Beyblade Burst. 'Related Brands' lists other brands and does not include Beyblade. Each card carries a name and an image rather than an empty tile.",
    expectedData: { selfLinkCount: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-public-pages-core-listing-pages-category-brand-highlights-faq-grouped-listings": {
    roles: ["guest"],
    startPage: "/categories/category-beyblade-burst",
    steps: [
      "Open /categories/category-beyblade-burst in a private window with no session.",
      "Read the area immediately below the hero for a highlights list and an FAQ accordion.",
      "Expand one FAQ entry and read its answer.",
      "Scroll further and look for a grouped-listings carousel.",
      "Open /brands/brand-beyblade and read the same three areas, plus the 'About this brand' panel.",
    ],
    expectedBehaviour:
      "Highlights and FAQs are editorial fields on the category row, rendered by one shared section on both category and brand pages. The section renders nothing at all when both arrays are empty, which is why a row with no editorial content shows no empty heading. The grouped-listings carousel is fed by its own collection scoped to the category or brand.",
    expectedUiState:
      "Highlights appear as short bullets and the FAQ accordion expands to real answers. The grouped-listings carousel shows cards with titles and images. The brand page shows all of that plus website, country and founding year. An empty heading with nothing under it is a fail; the section absent entirely is correct when there is no content.",
    endResult: "Read-only; nothing persists.",
  },
};
