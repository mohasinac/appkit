/*
 * WHY: Authored six-part procedures for the design-ux/sticky-cta-bar page.
 * WHAT: 17 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THIS BAR IS ONE INSTANCE SHARED BY ~25 CALL SITES, and the claim on it is a
 * STACK, not last-writer-wins. That is why the per-listing-type cases matter: the
 * bar a page publishes is the bar every other surface would have published, and
 * a type whose capabilities were never wired publishes the default one.
 *
 * The absence cases — ended auction, closed prize draw, non-listing page — are
 * the ones a happy-path sweep skips, and they are where a wrong bar does real
 * damage: a Buy Now on a lot that has already sold.
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
  "checklist-design-ux-sticky-cta-bar-desktop-hidden-at-top": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-original-dranzer-s",
    steps: [
      "Open /products/product-beyblade-original-dranzer-s in a private window at 1280 pixels wide.",
      "Without scrolling, look at the bottom of the viewport.",
      "Read the purchase panel in the page's own content.",
      "Scroll down 100 pixels and look at the bottom again.",
    ],
    inputs: { viewportWidth: 1280 },
    expectedBehaviour:
      "At the top of the page the real purchase panel is on screen, so a sticky duplicate of it would be redundant chrome covering content. The bar earns its place only once the original has scrolled away.",
    expectedUiState:
      "No sticky bar at the bottom of the viewport before scrolling, and none after 100 pixels. The in-page purchase panel is visible and usable.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-sticky-cta-bar-desktop-appears-on-scroll": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-original-dranzer-s",
    steps: [
      "Open /products/product-beyblade-original-dranzer-s in a private window at 1280 pixels wide.",
      "Scroll down slowly and note the point at which the sticky bar appears.",
      "Read what the bar contains — the price, the title, the actions.",
      "Compare its actions against the in-page purchase panel's actions.",
    ],
    inputs: { viewportWidth: 1280, revealScrollPx: 400 },
    expectedBehaviour:
      "The bar appears around 400 pixels of scroll and carries the same actions as the panel it stands in for. Offering fewer actions than the panel makes the bar a downgrade the user has to scroll back up to escape.",
    expectedUiState:
      "The bar appears once past roughly 400 pixels, showing the price and the same purchase actions as the in-page panel. It does not appear and disappear repeatedly while scrolling steadily in one direction.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-sticky-cta-bar-desktop-hides-scrolling-back-up": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-original-dranzer-s",
    steps: [
      "Open /products/product-beyblade-original-dranzer-s in a private window at 1280 pixels wide.",
      "Scroll down until the sticky bar appears.",
      "Scroll back up to the very top of the page.",
      "Look at the bottom of the viewport.",
      "Scroll down and up again twice, watching the bar each time.",
    ],
    inputs: { viewportWidth: 1280 },
    expectedBehaviour:
      "Returning to the top hides the bar again, because the real panel is back on screen. The transition must be symmetric — a bar that appears on the way down and stays forever is a bar with one threshold instead of two.",
    expectedUiState:
      "The bar is gone at the top of the page and returns on the way down, repeatably. It does not flicker on and off around the threshold while scrolling steadily.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-sticky-cta-bar-desktop-buttons-work": {
    roles: ["buyer"],
    startPage: "/products/product-tester-standard-1",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /products/product-tester-standard-1 at 1280 pixels wide and scroll until the sticky bar appears.",
      "Click 'Add to Cart' in the STICKY BAR, not in the page panel.",
      "Watch the label while the request runs.",
      "Open /cart and read what is in it.",
      "Go back, scroll to the bar again, and click the wishlist control in the bar.",
    ],
    inputs: { productId: "product-tester-standard-1", quantity: 1 },
    expectedBehaviour:
      "The bar's controls are the real controls, not decorative copies — each performs the same action as its counterpart in the page panel and reflects its own loading state.",
    expectedUiState:
      "The label changes while the request runs and the cart badge increases. /cart holds 'Test Gadget — Standard Listing #1'. The wishlist control in the bar also acts rather than doing nothing.",
    endResult:
      "Empty the cart and the wishlist afterwards so later cases start clean.",
  },
  "checklist-design-ux-sticky-cta-bar-desktop-not-covering-footer": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-original-dranzer-s",
    steps: [
      "Open /products/product-beyblade-original-dranzer-s in a private window at 1280 pixels wide.",
      "Scroll all the way to the bottom of the page.",
      "Read the footer's last row — the copyright line and the bottom links.",
      "Check whether the sticky bar covers any of it.",
      "Try to click a link in that last footer row.",
    ],
    inputs: { viewportWidth: 1280 },
    expectedBehaviour:
      "The page reserves space for the bar at its END, on the element that actually sits last. Putting that reservation on the main content instead only gaps main-from-footer, leaving the footer's own final strip underneath the bar and unreadable.",
    expectedUiState:
      "The footer's copyright line and bottom links are fully visible above the bar and every link in that row is clickable. A footer whose last row is half-hidden is the exact failure.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-sticky-cta-bar-mobile-unchanged": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-original-dranzer-s",
    steps: [
      "Resize the browser window to 390 pixels wide and open the product page in a private window.",
      "Without scrolling, look at the bottom of the viewport.",
      "Scroll down and watch the bottom.",
      "Count the fixed bars stacked at the bottom and name each.",
      "Scroll to the footer and check nothing is hidden behind them.",
    ],
    inputs: { mobileWidth: 390 },
    expectedBehaviour:
      "On mobile the purchase bar is present from the start rather than scroll-revealed — the panel is below the fold immediately. It shares the bottom edge with the tab bar, and the two are measured as separate tiers so neither has to know the other's height.",
    expectedUiState:
      "The purchase bar is visible without scrolling, sitting above the bottom tab bar with no overlap. Exactly two fixed bars, not three, and not one on top of the other.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-sticky-cta-bar-auction-countdown-in-bar": {
    roles: ["guest"],
    startPage: "/auctions/auction-beyblade-x-shark-edge",
    steps: [
      "Open /auctions/auction-beyblade-x-shark-edge in a private window at 1280 pixels wide.",
      "Scroll until the sticky bar appears.",
      "Read the bar's contents — the current bid, the countdown and the action.",
      "Wait 3 seconds and read the countdown again.",
      "Check the bar offers bidding and not 'Add to Cart'.",
    ],
    expectedBehaviour:
      "An auction's bar carries the live countdown and a bidding action, because auctions are capability-blocked from the cart. A bar offering Add to Cart here means it is publishing the default rather than the type's own.",
    expectedUiState:
      "The bar shows the current bid and a ticking countdown whose seconds figure is lower after 3 seconds. Its action is 'Place a bid' or Buy Now — never 'Add to Cart'. A frozen countdown is a fail even though the number looks right.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-sticky-cta-bar-ended-auction-no-bar": {
    roles: ["guest"],
    startPage: "/auctions/auction-beyblade-burst-lord-spryzen-ended-unsold",
    steps: [
      "Open /auctions/auction-beyblade-burst-lord-spryzen-ended-unsold in a private window at 1280 pixels wide.",
      "Scroll down past 400 pixels.",
      "Look at the bottom of the viewport.",
      "Scroll to the bottom of the page and look again.",
      "Open /auctions/auction-beyblade-metal-diablo-nemesis, an ended-and-sold auction, and repeat.",
    ],
    expectedBehaviour:
      "An ended auction offers no purchase bar at all — there is nothing to bid on. This is the absence case a happy-path sweep skips, and the one where a wrong bar does real damage: a bid control on a lot that has already closed.",
    expectedUiState:
      "No sticky purchase bar appears on either ended auction at any scroll position. A bar that appears with a disabled control is better than an active one but is still a fail — the correct answer is no bar.",
    expectedData: { barPresent: false },
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-sticky-cta-bar-preorder-bar": {
    roles: ["guest"],
    startPage: "/pre-orders/preorder-beyblade-x-bx-08-wave",
    steps: [
      "Open /pre-orders/preorder-beyblade-x-bx-08-wave in a private window at 1280 pixels wide.",
      "Scroll until the sticky bar appears.",
      "Read its action label and any note about the deposit.",
      "Compare the label against the in-page purchase panel's.",
      "Open /pre-orders/preorder-beyblade-x-bx-11-sold-out and scroll the same way.",
    ],
    expectedBehaviour:
      "A pre-order's bar uses its own vocabulary — reserving against a deposit rather than buying outright — and a sold-out pre-order offers no purchase action. Generic 'Add to Cart' copy here misdescribes what the buyer is agreeing to.",
    expectedUiState:
      "The live pre-order's bar reads as a reservation and mentions the deposit rather than the full price alone, matching the in-page panel. The sold-out one shows no purchase bar, or one with no active purchase control.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-sticky-cta-bar-prize-draw-bar-label": {
    roles: ["guest"],
    startPage: "/prize-draws/prizedraw-beyblade-mystery-box",
    steps: [
      "Open /prize-draws/prizedraw-beyblade-mystery-box in a private window at 1280 pixels wide.",
      "Scroll until the sticky bar appears.",
      "Read its action label and its price.",
      "Check whether the price is described as an entry rather than as the item's price.",
      "Compare the label against the in-page purchase panel's.",
    ],
    expectedBehaviour:
      "A prize draw sells ENTRIES, not the prize, and the bar has to say so. A label reading 'Buy now' beside a price is a misrepresentation of what the money buys, which matters more here than anywhere else on this page.",
    expectedUiState:
      "The bar names an entry and its per-entry price, matching the in-page panel. It does not read as buying the prize outright.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-sticky-cta-bar-closed-prize-draw-no-bar": {
    roles: ["guest"],
    startPage: "/prize-draws/prizedraw-beyblade-metal-closed-revealed",
    steps: [
      "Open /prize-draws/prizedraw-beyblade-metal-closed-revealed in a private window at 1280 pixels wide.",
      "Scroll down past 400 pixels and look at the bottom of the viewport.",
      "Scroll to the bottom of the page and look again.",
      "Open /prize-draws/prizedraw-beyblade-x-vault-closed-pending-reveal and repeat.",
    ],
    expectedBehaviour:
      "A closed draw offers no entry bar. The second fixture is the important one: it is closed while stock REMAINS, so a bar driven by remaining quantity alone would still offer entries into a draw that has already closed.",
    expectedUiState:
      "Neither closed draw shows a purchase bar at any scroll position — including the one that still has entries left in stock.",
    expectedData: { barPresent: false },
    endResult:
      "Read-only; restore the window width afterwards. Checking only the sold-out fixture would pass while the closed-with-stock case is broken.",
  },
  "checklist-design-ux-sticky-cta-bar-classified-bar-no-cart": {
    roles: ["guest"],
    startPage: "/classified/classified-beyblade-stadium-set",
    steps: [
      "Open /classified/classified-beyblade-stadium-set in a private window at 1280 pixels wide.",
      "Scroll until the sticky bar appears.",
      "Read every control in the bar.",
      "Check for any 'Add to Cart' or 'Buy Now'.",
      "Open /classified/classified-beyblade-burst-collection-bengaluru and read its bar's controls.",
    ],
    expectedBehaviour:
      "Classifieds are capability-blocked from the cart entirely, so the bar offers the offer path — Make Offer or Request to Buy — and nothing else. The two fixtures use different actions, which is what proves the bar reads the listing rather than the type alone.",
    expectedUiState:
      "The first bar offers 'Make Offer', the second 'Request to Buy'. Neither shows 'Add to Cart' or 'Buy Now'. An empty bar is as much a failure as a wrong one.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-sticky-cta-bar-digital-code-bar": {
    roles: ["guest"],
    startPage: "/digital-codes/digitalcode-beyblade-x-app-starter-pack",
    steps: [
      "Open /digital-codes/digitalcode-beyblade-x-app-starter-pack in a private window at 1280 pixels wide.",
      "Scroll until the sticky bar appears and read its controls and price.",
      "Open /digital-codes/digitalcode-beyblade-burst-app-sold-out and scroll the same way.",
      "Open /digital-codes/digitalcode-beyblade-x-app-launch-codes-depleted and scroll the same way.",
      "Compare all three bars.",
    ],
    expectedBehaviour:
      "A digital code is cart-capable, so its bar offers purchase — but only while codes remain. The third fixture is the interesting one: its stock is non-zero while its code pool is empty, and availability for this type reads the NESTED pool count rather than the stock figure.",
    expectedUiState:
      "The available listing shows a working purchase bar. The sold-out one does not. The depleted-pool one does NOT either, despite showing stock — a purchase bar there means the availability check read the wrong field.",
    expectedData: { depletedPoolBarPresent: false },
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-sticky-cta-bar-live-item-bar": {
    roles: ["guest"],
    startPage: "/live/live-golden-retriever-puppy",
    steps: [
      "Open /live/live-golden-retriever-puppy in a private window at 1280 pixels wide.",
      "Scroll until the sticky bar appears and read its controls.",
      "Read whether it mentions any delivery or jurisdiction restriction.",
      "Open /live/live-bonsai-juniper-5yr-sold, a sold fixture, and scroll the same way.",
    ],
    expectedBehaviour:
      "A live item is cart-capable but gated on vendor verification and a jurisdiction check, so its bar has to carry that condition rather than presenting an unconditional purchase. The sold fixture offers no bar at all.",
    expectedUiState:
      "The available listing's bar offers a purchase path and references the delivery restriction rather than hiding it until checkout. The sold one shows no purchase bar.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-sticky-cta-bar-bar-not-overlapping-content": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Open /products/product-beyblade-burst-valkyrie in a private window at 1280 pixels wide.",
      "Scroll until the sticky bar appears.",
      "Scroll slowly to the bottom, watching what passes behind the bar.",
      "Stop where the reviews section ends and read its last row in full.",
      "Read the last row of each related-items carousel the same way.",
      "Resize to 390 pixels and repeat the scroll to the bottom.",
    ],
    inputs: { desktopWidth: 1280, mobileWidth: 390 },
    expectedBehaviour:
      "Everything above the bottom edge reads the measured tier height, so content ends above the bar rather than under it. Content is allowed to scroll BEHIND the bar in transit; what must not happen is content coming to rest underneath it with no way to see it.",
    expectedUiState:
      "At both widths the page's final content is fully readable above the bar. No review, card or footer row comes to rest partly hidden behind it.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-sticky-cta-bar-no-bar-on-non-listing-pages": {
    roles: ["guest"],
    startPage: "/about",
    steps: [
      "Open /about in a private window at 1280 pixels and scroll to the bottom, watching for a sticky bar.",
      "Open /blog and scroll to the bottom the same way.",
      "Open /faqs and scroll to the bottom.",
      "Open /contact and scroll to the bottom.",
      "Open /products, a listing INDEX rather than a detail page, and scroll to the bottom.",
    ],
    expectedBehaviour:
      "The purchase bar belongs to listing DETAIL pages only. The bar is a single shared instance claimed by whatever page is on top, so a page that claims it without releasing leaves it published on the next route — which is how a purchase bar ends up on an article.",
    expectedUiState:
      "No purchase bar on any of the five pages at any scroll position, including /products. Reaching them by clicking links rather than by typing URLs is what exercises the release, since a fresh load would hide a stale claim.",
    expectedData: { barPresent: false },
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-sticky-cta-bar-bar-with-keyboard-open": {
    roles: ["buyer"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! on a device or emulator with an on-screen keyboard, at 390 pixels wide.",
      "Open /products/product-beyblade-burst-valkyrie and scroll to the reviews section.",
      "Tap into a text field so the keyboard opens.",
      "Look at where the sticky bar and the bottom tab bar are now.",
      "Read the text field and check it is not hidden.",
      "Dismiss the keyboard and look at the bottom edge again.",
    ],
    inputs: { mobileWidth: 390 },
    expectedBehaviour:
      "The keyboard is the third tier at the bottom edge, published by its own writer, and everything above reads all three. The bar must not sit over the keyboard, and the field being typed into must not be hidden behind either.",
    expectedUiState:
      "With the keyboard open the field is visible and the fixed bars are either above the keyboard or hidden. Nothing floats over the keyboard itself. Dismissing it returns the bars to their normal position with no leftover gap.",
    endResult:
      "Read-only; restore the window width afterwards. A leftover gap after dismissal means the inset was not reset.",
  },
};
