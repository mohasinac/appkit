/*
 * WHY: Authored six-part procedures for the buying/product-detail checklist page.
 * WHAT: 23 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * Upload steps cite the committed fixtures in public/test-media/, whose bytes are
 * asserted against the same detector /api/media/finalize uses. "Any short clip
 * under 50 MB" is not a test — two runs of it are two different tests.
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
  "checklist-buying-product-detail-auction-detail": {
    roles: ["guest"],
    startPage: "/auctions/auction-tester-sandbox-cycle-1",
    steps: [
      "Open /auctions/auction-tester-sandbox-cycle-1.",
      "Read the countdown beside the 'Place a bid' button.",
      "Wait 3 seconds without touching anything.",
      "Read the countdown again.",
    ],
    expectedBehaviour:
      "The page renders a live auction whose countdown ticks client-side against the stored end date. Auction listings offer bidding, never Add to Cart — the capability is per listing type, not a styling choice.",
    expectedUiState:
      "The heading names the sandbox auction. A countdown in the shape '47m 06s' or 'Xd Xh Xm Xs' sits next to 'Place a bid', and its seconds figure is lower after the 3-second wait — a frozen countdown is a fail even though the number looks plausible. Current bid ₹15,000.00 and a minimum increment of ₹1,000.00 are shown. There is a 'Place a bid' button and no 'Add to Cart' button anywhere on the page.",
    expectedData: { currentBid: 15000, minIncrement: 1000 },
    endResult:
      "Nothing persists — bid state and end time are read from the server on each load. The seconds figure moving is the whole check.",
  },
  "checklist-buying-product-detail-bundle-purchase": {
    roles: ["buyer"],
    startPage: "/bundles/bundle-tester-sandbox",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /bundles/bundle-tester-sandbox.",
      "Click 'Buy now'.",
      "On the checkout address step, select the first saved address, or add one named 'QA Address bundle-purchase' if none exists.",
      "Continue to the payment step and choose Cash on Delivery.",
      "Place the order.",
      "Open /user/orders and open the order just created.",
    ],
    inputs: { bundleId: "bundle-tester-sandbox", bundlePrice: 199, paymentMethod: "Cash on Delivery" },
    expectedBehaviour:
      "The bundle is charged at its own locked price of ₹199, not the ₹348 sum of its two members, and the receipt collapses the members back into one line. A bundle is all-or-nothing: the buyer never chose which parts to include, so presenting them as separate purchasable lines would misrepresent what was bought.",
    expectedUiState:
      "The order detail page shows ONE line reading 'Test Bundle' at ₹199.00. It does not show 'Test Gadget — Standard Listing #1' and 'Test Collectible — Standard Listing #2' as two rows, and the total is not ₹348. A 'What's included' expander beneath the line is fine — that is detail, not a second line.",
    expectedData: { orderLineCount: 1, lineTotal: 199 },
    endResult:
      "Reloading the order still shows the single 'Test Bundle' line at ₹199.00. A total of ₹348 means the bundle discount was thrown away at checkout.",
  },
  "checklist-buying-product-detail-classified-buy-request-pinned-to-price": {
    roles: ["buyer"],
    startPage: "/classified/classified-beyblade-burst-collection-bengaluru",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /classified/classified-beyblade-burst-collection-bengaluru.",
      "Click 'Request to Buy'.",
      "Read the amount field in the form that opens and try to type 3000 over it.",
      "Open browser DevTools, remove the field's readonly/disabled attribute, set its value to 3000, and submit the form.",
      "Open /user/offers.",
    ],
    inputs: { listedPrice: 4500, forcedAmount: 3000 },
    expectedBehaviour:
      "The amount is pinned to the listed ₹4,500 in the UI and re-checked on the server, so forcing a lower value past the disabled attribute is refused rather than accepted. A field that is only read-only in the browser is not a rule, it is a suggestion — which is why this case bypasses it deliberately.",
    expectedUiState:
      "The amount field is pre-filled 4500 and refuses typing. After the DevTools-forced submit an error appears in the shape of 'This seller is not taking lower offers', and no success confirmation is shown. /user/offers lists no offer at ₹3,000 for this listing.",
    expectedData: { offersCreatedAtForcedAmount: 0 },
    endResult:
      "No offer exists at ₹3,000. Reloading the listing still shows 'Request to Buy' pinned at ₹4,500. A created ₹3,000 offer means the server trusted the client.",
  },
  "checklist-buying-product-detail-classified-full-price-offer-accepted": {
    roles: ["buyer"],
    startPage: "/classified/classified-beyblade-stadium-set",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /classified/classified-beyblade-stadium-set.",
      "Click 'Make Offer'.",
      "Type 1200 in the offer amount field — exactly the listed price.",
      "Submit the offer.",
      "Open /user/offers.",
    ],
    inputs: { listedPrice: 1200, offerAmount: 1200 },
    expectedBehaviour:
      "On a classified, an offer AT the listed price is valid, because the offer is the purchase path — there is no Add to Cart to redirect the buyer to. The same amount on a standard /products listing would be refused with 'use Add to Cart instead', and importing that rule here is the bug this case guards.",
    expectedUiState:
      "The form closes with a success confirmation such as 'Offer sent'. No error reading 'use Add to Cart instead' and none reading 'Offer must be below the listed price'. /user/offers lists a pending offer at ₹1,200 against 'Used Beyblade Stadium Set — Local Pickup Only'.",
    expectedData: { offerAmount: 1200, offerStatus: "pending" },
    endResult:
      "The ₹1,200 offer persists and is visible in /user/offers after a reload.",
  },
  "checklist-buying-product-detail-classified-offer-is-the-purchase-path": {
    roles: ["guest"],
    startPage: "/classified/classified-beyblade-stadium-set",
    steps: [
      "Open /classified/classified-beyblade-stadium-set.",
      "Read the purchase panel and the note beneath its button.",
      "Open /classified/classified-beyblade-burst-collection-bengaluru.",
      "Read the purchase panel and the note beneath its button.",
      "Open /classified/classified-beyblade-x-starter-pune.",
      "Read the purchase panel.",
    ],
    expectedBehaviour:
      "Every classified offers exactly one purchase action — 'Make Offer' where the seller negotiates, 'Request to Buy' where they do not — and never a cart path, because a classified is capability-blocked from the cart entirely.",
    expectedUiState:
      "classified-beyblade-stadium-set reads 'Make Offer' with a note in the shape of 'Offer what you think it's worth — the seller can accept, decline or counter.' classified-beyblade-burst-collection-bengaluru reads 'Request to Buy' with a note about the seller confirming. None of the three shows 'Add to Cart' or 'Buy Now', and none shows an empty purchase panel — a blank panel is as much a failure as a wrong button.",
    endResult: "Nothing persists — read-only for a guest.",
  },
  "checklist-buying-product-detail-digitalcode-delivery": {
    roles: ["buyer"],
    startPage: "/digital-codes/digitalcode-tester-sandbox-1",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /digital-codes/digitalcode-tester-sandbox-1.",
      "Click 'Buy Now'.",
      "On the checkout address step, select the first saved address.",
      "Continue to the payment step and choose Cash on Delivery.",
      "Place the order.",
      "Open /user/orders and open the order just created.",
      "Reload the order page.",
    ],
    inputs: { productId: "digitalcode-tester-sandbox-1", price: 99, paymentMethod: "Cash on Delivery" },
    expectedBehaviour:
      "This fixture is auto-claim, so the code is allocated and delivered as soon as the order is confirmed, with no seller action in between. The pool's remaining count drops by one.",
    expectedUiState:
      "The order page shows a digital-code panel containing an actual code string that can be selected and copied. It does not read 'Pending delivery' or 'Waiting for seller' — for an auto-claim listing those states mean the delivery never fired.",
    expectedData: { codeDelivered: true },
    endResult:
      "Reloading the order still shows the same delivered code. A code that appears once and is blank after reload was never persisted against the order.",
  },
  "checklist-buying-product-detail-grouped-listings-carousel-on-detail": {
    roles: ["guest"],
    startPage: "/products/product-tester-standard-1",
    steps: [
      "Open /products/product-tester-standard-1.",
      "Scroll past the description tab and past the 'More in this category' and 'More by' carousels.",
      "Read the heading of the themed carousel below them.",
      "Click the first card in that carousel.",
    ],
    expectedBehaviour:
      "The grouped-listings carousel is a distinct section from the four related-items carousels — it is fed by the groupedListings collection, not by category/brand/tag/store similarity — and each card links to its own detail page.",
    expectedUiState:
      "A carousel with a theme heading (the group's own name, e.g. 'From the same set') sits below the related-items sections. Every card shows a real title and a rendered image tile, not a placeholder or a spinner. Clicking the first card lands on that product's detail page — /products/product-tester-standard-2 or similar — not back on the current page.",
    endResult: "Nothing persists — read-only navigation.",
  },
  "checklist-buying-product-detail-image-gallery": {
    roles: ["guest"],
    startPage: "/auctions/auction-tester-sandbox-cycle-1",
    steps: [
      "Open /auctions/auction-tester-sandbox-cycle-1.",
      "Look at every thumbnail in the strip below the main image.",
      "Hard-reload with Ctrl+Shift+R and look at the strip again.",
      "Hard-reload twice more, looking at the strip each time.",
      "Click the main gallery image.",
      "Click the rotate (R) control in the lightbox toolbar.",
      "Click the zoom-in (+) control in the lightbox toolbar.",
      "Close the lightbox.",
    ],
    expectedBehaviour:
      "Every thumbnail resolves its image on every load, and the lightbox's rotate and zoom transforms apply to the displayed image. Three reloads are the point: an intermittently-blank tile is the failure, and one load cannot distinguish it from a working one.",
    expectedUiState:
      "On all four loads every thumbnail shows a picture — no broken-image glyph, no grey square, no zero-height tile. The lightbox opens with a toolbar carrying +, − and R. Rotate turns the image 90°; zoom-in visibly enlarges it. Closing returns to the auction page with the gallery intact.",
    endResult: "Nothing persists — no user state changes.",
  },
  "checklist-buying-product-detail-image-gallery-thumbnails-not-blank": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Open /products/product-beyblade-burst-valkyrie.",
      "Look at the strip of small thumbnail buttons below the main image.",
      "Click the second thumbnail button.",
      "Click the third thumbnail button.",
    ],
    expectedBehaviour:
      "Each thumbnail button renders its own image at its own size and swapping the selection changes the main image. A thumbnail collapsing to a 0×0 box inside its button — which is what an unsized fill-image child does — reads as an empty bordered square and is the specific failure here.",
    expectedUiState:
      "Three thumbnail buttons, each showing a distinct photo rather than an empty outline or grey box, and each the same size as its neighbours. The selected one carries a highlight. Clicking the second changes the main image; clicking the third changes it again to a different picture.",
    expectedData: { thumbnailCount: 3 },
    endResult: "Nothing persists — no state changes.",
  },
  "checklist-buying-product-detail-live-item-detail": {
    roles: ["guest"],
    startPage: "/live/live-tester-sandbox-1",
    steps: [
      "Open /live/live-tester-sandbox-1.",
      "Read the heading, the species line, the price and the delivery restrictions.",
      "Look at the gallery thumbnail strip.",
    ],
    expectedBehaviour:
      "A live listing renders its species-specific fields — species, breed, sex, age and the jurisdiction restrictions — which no other listing type carries, and offers a cart path once those restrictions are satisfied.",
    expectedUiState:
      "Heading 'Test Live Item — Golden Retriever Puppy'. A species line in the shape 'Dog (Golden Retriever) · male · 6mo'. Price ₹1,500.00. Delivery restrictions are stated rather than blank. The thumbnail strip carries a 'View video' entry alongside 'View image 1'. An 'Add to Cart' button is present.",
    expectedData: { price: 1500 },
    endResult: "Nothing persists — read-only for a guest.",
  },
  "checklist-buying-product-detail-live-item-video-mandatory": {
    roles: ["seller"],
    startPage: "/store/live/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/live/new.",
      "Type 'QA Live Item video-mandatory' in the title field.",
      "Type Dog in the species field and 1500 in the price field.",
      "Fill every other required field, leaving the Video field empty.",
      "Submit the form.",
      "Attach public/test-media/sample-video.mp4 to the Video field.",
      "Submit the form again.",
      "Open the public detail page for the listing just created.",
      "Click the 'View video' thumbnail in the gallery strip.",
      "Click play in the lightbox.",
    ],
    inputs: {
      title: "QA Live Item video-mandatory",
      species: "Dog",
      price: 1500,
      videoFile: "public/test-media/sample-video.mp4",
    },
    expectedBehaviour:
      "A live listing cannot be saved without a video — a buyer purchasing an animal or plant needs to see it move. The first submit is refused; the second succeeds. On the public page the poster frame carries the site watermark, because the media proxy stamps images even when the video itself is streamed raw.",
    expectedUiState:
      "First submit: an inline error on or beside the Video field in the shape of 'A video is required for live items', and the form stays open with the typed values intact. Second submit: it saves and lands on the listing. The public page shows a 'View video' thumbnail with a visible watermark on its poster, and the video plays in the lightbox rather than showing 'No video with supported format'.",
    endResult:
      "The new listing exists with its video attached and survives a reload. Delete it afterwards so it does not accumulate in the seller's catalogue across runs.",
  },
  "checklist-buying-product-detail-preorder-detail": {
    roles: ["guest"],
    startPage: "/pre-orders/preorder-tester-sandbox-1",
    steps: [
      "Open /pre-orders/preorder-tester-sandbox-1.",
      "Read the heading, the price, the status badge and the delivery line.",
      "Read the note beside the 'Reserve Now' button.",
    ],
    expectedBehaviour:
      "A pre-order shows an estimated delivery date and takes a deposit rather than the full price, which is what distinguishes it from a standard listing that happens to be out of stock.",
    expectedUiState:
      "Heading 'Test Pre-order — Reserve Me!'. Price ₹299.00. An 'Estimated delivery:' label with an actual date beside it, not an empty value or the word 'undefined'. A 'Reserve Now' button with a note naming the 25% deposit of ₹74.75. Status badge 'In Production'.",
    expectedData: { price: 299, depositAmount: 74.75 },
    endResult: "Nothing persists — read-only for a guest.",
  },
  "checklist-buying-product-detail-prizedraw-buy-reveal": {
    roles: ["buyer"],
    startPage: "/prize-draws/prizedraw-tester-sandbox-1",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /prize-draws/prizedraw-tester-sandbox-1.",
      "Click 'Buy now'.",
      "On the checkout address step, select the first saved address.",
      "Continue to the payment step and choose Cash on Delivery.",
      "Place the order for 1 entry at ₹50.",
      "Open /user/orders and open the order just created.",
      "Reload the page.",
    ],
    inputs: { productId: "prizedraw-tester-sandbox-1", entries: 1, pricePerEntry: 50 },
    expectedBehaviour:
      "This fixture is instant-reveal, so the prize is drawn and assigned at confirmation rather than held until a scheduled close. The draw's remaining entry count drops by one.",
    expectedUiState:
      "The order page names the prize assigned to this entry. It does not show a pending spinner or a 'draw not yet closed' message — those belong to prizedraw-beyblade-scheduled-demo, not to this fixture, and seeing them here means the mode was ignored.",
    expectedData: { entriesPurchased: 1, revealed: true },
    endResult:
      "Reloading the order shows the same prize. A prize that changes on reload was never persisted and was being drawn per render.",
  },
  "checklist-buying-product-detail-product-group-set-widget": {
    roles: ["guest"],
    startPage: "/products/product-tester-standard-1",
    steps: [
      "Open /products/product-tester-standard-1.",
      "Scroll to the 'Part of / Parts in this group' panel.",
      "Click its expand control.",
      "Read the member list.",
      "Click 'View whole group'.",
      "Close what opens, then open /products/product-tester-standard-2 and expand the same panel.",
      "Open /products/group-tester-sandbox-bundle and expand the same panel.",
    ],
    expectedBehaviour:
      "The group panel appears on the parent and on both children, because membership is symmetric — a child knows its groupId and the parent knows its child slugs. A panel that renders only on the parent means the children's side of the link was never written.",
    expectedUiState:
      "The panel is present on all three pages. Its expand control renders as a real triangle or chevron glyph, not a literal character like '▸' rendered at font-fallback size and not a missing box. Expanded, it lists 'Test Gadget — Standard Listing #1' and 'Test Collectible — Standard Listing #2' with image tiles. 'View whole group' opens a modal or drawer showing both members.",
    expectedData: { groupMemberCount: 2 },
    endResult: "Nothing persists — read-only panel.",
  },
  "checklist-buying-product-detail-related-listings-sections": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Open /products/product-beyblade-burst-valkyrie.",
      "Scroll past the description tab to the carousels below the main content.",
      "Read each carousel heading and look at the cards inside it.",
    ],
    expectedBehaviour:
      "Four independent related-items signals are rendered — same category, same brand, shared tags, same store — each capped and each filtered for items that are still available, so an ended auction or a sold-out listing does not appear as a suggestion.",
    expectedUiState:
      "Four carousel sections, in the shape 'More in this category', 'More by Beyblade', 'You might also like' and 'More from Beyblade Arena'. Each holds at least one card carrying a real title, a rendered image tile and a price. A heading with an empty rail beneath it is a fail — the section should not render at all rather than render empty.",
    expectedData: { carouselCount: 4 },
    endResult: "Nothing persists — read-only page.",
  },
  "checklist-buying-product-detail-seed-images-are-labelled-tiles": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products.",
      "Look at every card in the first two rows of the grid.",
      "Read the text rendered on each card's image tile.",
    ],
    expectedBehaviour:
      "Seed imagery is generated as labelled tiles carrying each item's own name, so a wrong image is visible as wrong text rather than being indistinguishable from every other placeholder.",
    expectedUiState:
      "Each card's tile shows that card's own product name as text on a distinct colour. No card shows a broken-image glyph or alt-text fallback. No two adjacent cards show the same blank grey square, which is what an unresolved image looks like when it fails silently.",
    endResult: "Nothing persists — images are served on each page load.",
  },
  "checklist-buying-product-detail-standard-detail": {
    roles: ["guest"],
    startPage: "/products/product-tester-standard-1",
    steps: [
      "Open /products/product-tester-standard-1.",
      "Read the heading, price, stock badge and description.",
      "Read the category and brand links below the heading.",
      "Read the seller line at the bottom of the info panel.",
    ],
    expectedBehaviour:
      "A standard listing renders every panel a buyer needs to decide, and the purchase actions are present but inert for a signed-out visitor rather than absent — a missing button reads as a broken page, a disabled one reads as a prompt to sign in.",
    expectedUiState:
      "Heading 'Test Gadget — Standard Listing #1'. Price ₹199.00. Stock badge in the shape '✓ In Stock — only 10 left'. 'Buy Now', 'Add to Cart' and 'Add to Wishlist' are visible and disabled. Category links 'Test Gadgets' and 'Tester Sandbox' and brand link 'TestBrand' appear below the heading. A description paragraph is present. 'Sold by Tester Sandbox Store' with a 'Visit Store →' link is shown.",
    expectedData: { price: 199, stockQuantity: 10 },
    endResult: "Nothing persists — read-only for a guest.",
  },
  "checklist-buying-product-detail-tester-fixtures-hidden-from-the-public": {
    roles: ["guest", "buyer"],
    startPage: "/products",
    steps: [
      "Open a private/incognito window with no session and open /products.",
      "Read every card title on the grid and every card's URL slug, looking for the word 'Tester' or 'tester'.",
      "Page through the grid to the end, reading titles the same way.",
      "In a normal window, sign in as tester@letitrip.in / TempPass123!.",
      "Open /products and read the card titles again.",
    ],
    expectedBehaviour:
      "Sandbox rows are filtered out of every public read in the application layer, not by a Firestore query — an inequality on isTestData would exclude every document that lacks the field, which is all the real content, and the page would show ONLY test data. Signed in as a tester, the same page includes them.",
    expectedUiState:
      "Private window: not one card title contains 'Tester' and not one slug contains 'tester', on any page of the grid. Signed in as the tester: sandbox items such as 'Test Gadget — Standard Listing #1' are present.",
    endResult:
      "Nothing persists — the rule is applied per request. Reading only the first page is not enough; a leak on page three is still a leak.",
  },
  "checklist-buying-product-detail-unreachable-image-degrades-to-placeholder": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /api/media/ext?url=https%3A%2F%2Fexample.invalid%2Fx.png in a browser tab and look at what renders.",
      "Open DevTools, reload the tab, and read the response status and headers for that request.",
    ],
    // .invalid is reserved by RFC 2606 and can never resolve. This URL is the INPUT
    // to the placeholder path, not media anyone renders — seedPhoto() would defeat
    // the case by supplying one that works.
    // audit-seed-media-host-ok: deliberately unreachable upstream, the case's input
    inputs: { upstreamUrl: "https://example.invalid/x.png" },
    expectedBehaviour:
      "An upstream image that cannot be fetched degrades to a served placeholder rather than a 502, so a single dead third-party host cannot punch broken tiles through a whole grid. The placeholder is cached briefly, not for the long TTL a real image gets, so recovery is quick once the host returns.",
    expectedUiState:
      "The tab renders an SVG tile reading 'Image unavailable' — not the browser's broken-image glyph and not an error body. DevTools shows a 2xx with Content-Type image/svg+xml, an X-Media-Placeholder: 1 header, and a Cache-Control whose max-age is around 60 rather than the month-long immutable value real media carries.",
    expectedData: { placeholderHeader: "X-Media-Placeholder: 1" },
    endResult:
      "Nothing persists. This case reads a URL directly because no seeded listing points at a dead host — and deliberately none does, since a permanently-broken tile in the catalogue would fail the seed-images-are-labelled-tiles case next to it.",
  },
  "checklist-buying-product-detail-video-lightbox-fullscreen-sizing": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-burst-spryzen-video-demo",
    steps: [
      "Resize the browser window to 375 × 667.",
      "Open /products/product-beyblade-burst-spryzen-video-demo.",
      "Click the 'View video' thumbnail to open the lightbox.",
      "Look at the height of the video area.",
      "Click the expand / maximise button in the lightbox top bar.",
      "Press Escape.",
      "Resize the browser to 1280 × 800 and open the same page again.",
      "Click the 'View video' thumbnail and then the expand button.",
    ],
    inputs: { mobileWidth: 375, mobileHeight: 667, desktopWidth: 1280, desktopHeight: 800 },
    expectedBehaviour:
      "The expand control calls the native Fullscreen API — it used to be an exact duplicate of the zoom-reset button and did nothing of the kind. The video area also carries an explicit minimum size, so a source that fails to resolve still occupies a real box instead of collapsing to the browser's default 300×150.",
    expectedUiState:
      "At 375 wide the video area is clearly taller than a 150px default, and at 1280 it is larger again. Clicking expand enters real fullscreen — browser chrome disappears — and the button's glyph changes to a shrink icon. Escape exits and the glyph reverts, with the video still in the lightbox rather than the lightbox having closed.",
    endResult: "Nothing persists — no state changes.",
  },
  "checklist-buying-product-detail-video-playback": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-original-dragoon-f-video-demo",
    steps: [
      "Open /products/product-beyblade-original-dragoon-f-video-demo.",
      "Click the 'View video' thumbnail, the third button in the strip.",
      "Click the play badge on the video slide to open theater mode.",
      "Click the rotate (R) button in the lightbox toolbar.",
      "Click the zoom-in (+) button in the lightbox toolbar.",
      "Close the lightbox.",
    ],
    expectedBehaviour:
      "A raw-file video renders as a native <video> element and plays. This fixture points at the committed public/test-media/sample-video.mp4 rather than an external bucket, because the host it used to use started returning 403 for every file and the case then failed for a reason that was not a bug.",
    expectedUiState:
      "The strip carries a 'View video' button with a play badge over its poster. Clicking it puts the video in the main gallery area; the lightbox shows it playing or paused and ready. The toolbar has +, − and R, and both rotate and zoom visibly transform the video, not just the images.",
    endResult: "Nothing persists — no state changes.",
  },
  "checklist-buying-product-detail-video-playback-youtube": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-metal-dark-bull-video-demo",
    steps: [
      "Open /products/product-beyblade-metal-dark-bull-video-demo.",
      "Click the 'View video' thumbnail in the strip.",
      "Click play on the video slide.",
    ],
    expectedBehaviour:
      "A YouTube-sourced video is embedded as a youtube-nocookie.com iframe, because a native <video> element cannot play a YouTube watch-page URL. The upload field has always offered a YouTube tab; for a long time nothing on the render side knew what to do with what it stored.",
    expectedUiState:
      "The slide shows an embedded YouTube player and it plays on click. What must not appear is 'No video with supported format and MIME type found', which is exactly what a raw <video src> pointed at a watch URL produces.",
    endResult: "Nothing persists — no state changes.",
  },
  "checklist-buying-product-detail-video-real-file-upload": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products and click Edit on 'Beyblade Burst B-01 Valkyrie'.",
      "Scroll to the Video field and select the 'Upload' tab rather than 'YouTube' or 'External URL'.",
      "Upload public/test-media/sample-video.mp4.",
      "Wait for the upload to finish and look at the preview panel.",
      "Save the product and open /products/product-beyblade-burst-valkyrie in a new tab.",
      "Click the 'View video' thumbnail in the gallery strip.",
      "Go back to the editor, remove the video, upload public/test-media/sample-video.mp4 again, and save.",
      "Remove the video once more and save, so the product ends as it started.",
    ],
    inputs: { productId: "product-beyblade-burst-valkyrie", videoFile: "public/test-media/sample-video.mp4" },
    expectedBehaviour:
      "Bytes go straight from the browser to storage through a signed URL and never through an API route, so a 4.5 MB request cap never applies. A poster frame is captured on upload, and replacing the video removes the previous object rather than orphaning it.",
    expectedUiState:
      "The editor preview shows a still poster frame after upload, not an empty box. The public page gains a 'View video' thumbnail that plays in the lightbox. Removing and re-uploading produces no 'Failed to delete' toast and no duplicate thumbnail.",
    endResult:
      "The final step removes the video, so product-beyblade-burst-valkyrie is left exactly as seeded — other cases read this product and a leftover video changes its gallery from 3 thumbnails to 4.",
  },
};
