/*
 * WHY: Authored six-part procedures for the buying/wishlist-history page.
 * WHAT: 20 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THE TWO CAPS BEHAVE DIFFERENTLY ON PURPOSE. The wishlist is a HARD cap of 20
 * — the twenty-first add is refused with an error, because silently dropping an
 * item the buyer asked to save is worse than telling them the list is full. History
 * is a SOFT cap of 50 with silent oldest-first eviction, because nobody asked for
 * a browsing record and an error about it would be noise.
 *
 * Both are one document per user, keyed on the user's own id, and every mutation
 * runs in a transaction — two quick taps must not race into a duplicate.
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
  "checklist-buying-wishlist-history-add-wishlist-pdp": {
    roles: ["buyer"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /products/product-beyblade-burst-valkyrie and read the wishlist control's state.",
      "Click it and watch the control while the request runs.",
      "Read its state afterwards.",
      "Open /wishlist and find the item.",
      "Return to the product page and reload it, then read the control again.",
    ],
    inputs: { productId: "product-beyblade-burst-valkyrie" },
    expectedBehaviour:
      "The control adds the item and then reflects that it is saved. It must also reflect the saved state on a fresh load — a control that resets to unsaved on reload is reading nothing and will let the buyer add the same item twice.",
    expectedUiState:
      "The control changes to a saved state without a full page load, the item appears on /wishlist, and after the reload the control still reads as saved.",
    endResult:
      "The item is on the wishlist. Later cases in this page read it.",
  },
  "checklist-buying-wishlist-history-add-wishlist-card": {
    roles: ["buyer"],
    startPage: "/products",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /products and find a product card with a wishlist control.",
      "Click the wishlist control on the card WITHOUT opening the product.",
      "Read the control's state and check the page did not navigate.",
      "Click the card's body and check it opens that product.",
      "Go back and check the card's control still reads as saved.",
    ],
    expectedBehaviour:
      "The card's wishlist control acts in place and does not navigate. Clicking the card body still opens the product — merely wiring a control onto a card must not disable its navigation, which is a defect this codebase has had where a selection callback silently removed the link.",
    expectedUiState:
      "The control saves without navigating, and the card body still opens the product afterwards. A card that stops opening once it carries a control is the failure.",
    endResult: "A second item is on the wishlist.",
  },
  "checklist-buying-wishlist-history-remove-wishlist": {
    roles: ["buyer"],
    startPage: "/wishlist",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /wishlist and note how many items it holds.",
      "Remove one item and read what happens.",
      "RELOAD and count the items.",
      "Open that product's page and read its wishlist control.",
      "Remove an item from the product page instead and check /wishlist reflects it.",
    ],
    expectedBehaviour:
      "Removal persists and both surfaces agree, because both read the same single document. A removal that succeeds on one surface and leaves the other showing the item means one of them is holding its own copy.",
    expectedUiState:
      "The count falls by one and stays after the reload. The product page's control reads as unsaved. Removing from the product page removes it from /wishlist too.",
    endResult: "One item remains on the wishlist.",
  },
  "checklist-buying-wishlist-history-wishlist-persists-guest-to-login": {
    roles: ["guest", "buyer"],
    startPage: "/products",
    steps: [
      "Open /products in a private window with no session.",
      "Add two products to the wishlist as a guest and note their titles.",
      "Open /wishlist and confirm both are listed.",
      "Sign in as karthik.new@gmail.com / TempPass123! from that same window.",
      "Open /wishlist and read what is listed.",
      "Check both guest items are present alongside anything the account already had.",
      "Reload and confirm they persist.",
    ],
    expectedBehaviour:
      "A guest wishlist is merged into the account on sign-in rather than discarded. The buyer saved those items deliberately, so losing them at the moment they create an account is the worst possible time to lose them.",
    expectedUiState:
      "After signing in both guest items are on the account's wishlist, together with anything it already held, and they survive a reload. An emptied wishlist after sign-in is the failure.",
    endResult:
      "The account's wishlist holds the merged set. Remove the added items afterwards.",
  },
  "checklist-buying-wishlist-history-wishlist-idempotent-readd": {
    roles: ["buyer"],
    startPage: "/products/product-beyblade-x-wizard-arrow",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /products/product-beyblade-x-wizard-arrow and add it to the wishlist.",
      "Open /wishlist and count how many times it appears.",
      "Return to the product and click the wishlist control twice in quick succession.",
      "Open /wishlist and count again.",
      "Reload and count once more.",
    ],
    inputs: { productId: "product-beyblade-x-wizard-arrow" },
    expectedBehaviour:
      "Re-adding an item already saved is a no-op rather than a duplicate. Every mutation runs in a transaction precisely so two quick taps cannot race into two entries — a duplicate would also consume one of the twenty slots.",
    expectedUiState:
      "The item appears exactly once however many times the control is pressed. Two entries for one product is the failure, and it is easiest to produce with a double tap.",
    expectedData: { entriesForProduct: 1 },
    endResult: "The item is on the wishlist once.",
  },
  "checklist-buying-wishlist-history-wishlist-cap-enforced": {
    roles: ["buyer"],
    startPage: "/products",
    steps: [
      "Sign in as karthik.new@gmail.com / TempPass123!, an account with a near-empty wishlist.",
      "Open /products and add items to the wishlist until twenty are saved, counting as you go.",
      "Open /wishlist and confirm the count is twenty.",
      "Add a twenty-first item and read exactly what happens.",
      "Open /wishlist and count again.",
      "Remove one item, then add the refused item again and check it is accepted.",
    ],
    inputs: { cap: 20 },
    expectedBehaviour:
      "The wishlist is a HARD cap: the twenty-first add is refused with a readable error. Silently dropping an item the buyer explicitly asked to save is worse than telling them the list is full — which is the opposite choice from history, where eviction is silent on purpose.",
    expectedUiState:
      "The twentieth add succeeds. The twenty-first is refused with a message naming the limit, and the count stays at twenty. Freeing a slot lets the refused item in. A silent failure, or a list that grows to twenty-one, are both failures.",
    expectedData: { maxItems: 20 },
    endResult:
      "The wishlist is at or below twenty. Clear the added items afterwards.",
  },
  "checklist-buying-wishlist-history-wishlist-across-listing-types": {
    roles: ["buyer"],
    startPage: "/products",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Add a standard product to the wishlist.",
      "Open an auction and add it.",
      "Open a pre-order and add it.",
      "Open a prize draw, a classified, a digital code, a live item and an art print, adding each.",
      "Open /wishlist and read every entry.",
      "Check each shows the right type badge and links to the right detail route.",
    ],
    expectedBehaviour:
      "Every listing type can be saved and each entry links to its own detail route. Three types once had their detail route hardcoded to the standard product page, so a saved classified, digital code or live item opened the wrong page from every card and carousel in the app.",
    expectedUiState:
      "All eight entries are listed with the correct type badge, and each opens its own detail route rather than a /products URL. An auction entry opening /products is the wrong-route failure.",
    expectedData: { wrongDetailRoutes: 0 },
    endResult:
      "Eight items are saved. Remove them afterwards so the cap cases start clean.",
  },
  "checklist-buying-wishlist-history-wishlist-price-drop-accuracy": {
    roles: ["buyer", "seller"],
    startPage: "/wishlist",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and add product-beyblade-burst-valkyrie to the wishlist.",
      "Open /wishlist and read the price shown against it.",
      "Sign out and sign in as tyson@beybladearena.in / TempPass123!.",
      "Lower that product's price to 799 and save.",
      "Sign back in as the buyer and open /wishlist.",
      "Read the price shown and any price-drop indicator.",
      "Restore the product's original price.",
    ],
    inputs: { productId: "product-beyblade-burst-valkyrie", priceBefore: 999, priceAfter: 799 },
    expectedBehaviour:
      "The entry records the price at the time it was saved, so a drop can be computed against it. The CURRENT price must come from the product rather than the snapshot — a list rendering the saved price as if it were live tells the buyer an item costs what it used to.",
    expectedUiState:
      "The current price reads ₹799.00 and any drop indicator compares it against the ₹999.00 saved at add time. A list still showing ₹999.00 is reading the snapshot as live.",
    expectedData: { currentPrice: 799, priceAtAdd: 999 },
    endResult:
      "The product's price is restored. The wishlist should then show ₹999.00 again with no drop.",
  },
  "checklist-buying-wishlist-history-wishlist-sold-out-item": {
    roles: ["buyer"],
    startPage: "/wishlist",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-valtryek-v3-sold-out to the wishlist.",
      "Open /wishlist and read that entry.",
      "Check it is marked as unavailable rather than looking purchasable.",
      "Read whether an add-to-cart control is offered on it.",
      "Click the entry and check the product page also reads as out of stock.",
    ],
    inputs: { productId: "product-beyblade-burst-valtryek-v3-sold-out" },
    expectedBehaviour:
      "A saved item that has since sold out is marked as such and offers no purchase control. The wishlist is one of the few surfaces where an unavailable item legitimately remains visible — the buyer asked to watch it — so it must say so rather than being filtered away or shown as buyable.",
    expectedUiState:
      "The entry is present and marked unavailable, with no add-to-cart control. An entry offering purchase on a sold-out item is the failure; silently removing it from the list is a different one.",
    endResult: "Remove the entry afterwards.",
  },
  "checklist-buying-wishlist-history-wishlist-empty-state": {
    roles: ["buyer"],
    startPage: "/wishlist",
    steps: [
      "Sign in as karthik.new@gmail.com / TempPass123!.",
      "Open /wishlist and remove every item until none remain.",
      "Read what the page shows.",
      "Check it offers a way onward rather than only stating the list is empty.",
      "Follow that link and read where it lands.",
      "Reload /wishlist and confirm the empty state is still shown.",
    ],
    expectedBehaviour:
      "An empty wishlist shows a named empty state with a route back into browsing. A blank area reads as a broken page rather than an empty one, and this page is reachable from the header on every visit.",
    expectedUiState:
      "A readable message and a working link to browse. Not a bare white area and not a heading with nothing under it. The link lands on a real listing page.",
    endResult: "The wishlist is empty.",
  },
  "checklist-buying-wishlist-history-wishlist-add-to-cart-from-list": {
    roles: ["buyer"],
    startPage: "/wishlist",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-valkyrie to the wishlist and open /wishlist.",
      "Use the add-to-cart control on that entry.",
      "Watch the control while the request runs and read the cart badge.",
      "Open /cart and confirm the item is there at the right price.",
      "Return to /wishlist and read whether the item is still saved.",
    ],
    expectedBehaviour:
      "Adding to the cart from the wishlist does not remove it from the wishlist — those are two different intentions, and a buyer who adds one of several saved items has not stopped watching it. The price charged comes from the product, not from the saved snapshot.",
    expectedUiState:
      "The cart badge increases and /cart holds the item at its current price. The wishlist entry is still present afterwards. An entry that vanishes on add-to-cart is the failure.",
    endResult:
      "The item is in both the cart and the wishlist. Empty the cart afterwards.",
  },
  "checklist-buying-wishlist-history-wishlist-card-clickable": {
    roles: ["buyer"],
    startPage: "/wishlist",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! with at least two items saved.",
      "Open /wishlist and click an entry's image.",
      "Read where it lands and go back.",
      "Click the entry's title and read where it lands.",
      "Go back and click an empty part of the entry's body.",
      "Check every route reached is that item's own detail page.",
    ],
    expectedBehaviour:
      "The whole entry is a link to its item. A card that only responds on its title forces the buyer to aim, and a card that responds nowhere is a dead end — this list exists to get back to saved items.",
    expectedUiState:
      "Image, title and body all open the same product's detail page. An inert region on the card is the finding.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-wishlist-history-wishlist-heart-solid-red": {
    roles: ["buyer"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open a product NOT on the wishlist and look at its wishlist control.",
      "Note the glyph's shape and fill.",
      "Add it and look at the control again.",
      "Compare the saved and unsaved states — check they differ by more than colour alone.",
      "Switch to dark mode and read both states again.",
      "Check the glyph is a rendered icon rather than a text character.",
    ],
    expectedBehaviour:
      "Saved and unsaved are visually distinct in both themes, and the glyph is a real icon rather than a text character. A text character cannot be sized by any utility — it renders at the platform font's fallback size, which is exactly why one control in a row can look wrong beside its neighbours.",
    expectedUiState:
      "The unsaved state is an outline and the saved state is filled, distinguishable in both themes. The glyph is proportionate to its control. A heart character used as the icon, or a state difference carried by colour alone, are both findings.",
    endResult: "Remove the item afterwards.",
  },
  "checklist-buying-wishlist-history-wishlist-view-remove-buttons": {
    roles: ["buyer"],
    startPage: "/wishlist",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! with at least two items saved.",
      "Open /wishlist and read every control offered on an entry.",
      "Check both a view and a remove control are present.",
      "Use remove and read whether it asks for confirmation.",
      "Read the entry count immediately and after a RELOAD.",
      "Check the remove acted on the entry it was pressed on, not another.",
    ],
    expectedBehaviour:
      "Each entry offers both a way in and a way out. Remove acts on the entry it belongs to — a remove keyed on array position deletes the wrong one once the list has shifted, and both survivors still look like valid entries.",
    expectedUiState:
      "View and remove are both present. The removed entry is the one whose control was pressed, and the count is correct after the reload.",
    endResult: "One fewer item is saved.",
  },
  "checklist-buying-wishlist-history-wishlist-sync-item": {
    roles: ["buyer"],
    startPage: "/wishlist",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! in window A and open /wishlist.",
      "In window B, sign in as the same account and open a product not yet saved.",
      "Add it to the wishlist in window B.",
      "Return to window A and reload /wishlist.",
      "Read whether the new item is present.",
      "Remove it in window A, then reload window B's product page and read its control.",
    ],
    expectedBehaviour:
      "Both windows read one document, so a change in either is visible in the other after a reload. Whether it propagates without a reload is worth recording but is not the assertion — the wishlist is not a realtime surface.",
    expectedUiState:
      "After the reload each window reflects the other's change. Note whether anything updated without reloading. A change that never appears even after a reload means one window is holding a private copy.",
    endResult: "Both windows agree on the wishlist's contents.",
  },
  "checklist-buying-wishlist-history-wishlist-sync-all": {
    roles: ["buyer"],
    startPage: "/wishlist",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and open /wishlist.",
      "Look for a control that syncs or refreshes the whole list.",
      "Note the item count and each entry's price and availability.",
      "Use the sync control if one exists.",
      "Read whether prices and availability updated.",
      "Reload the page and compare against what the sync produced.",
    ],
    expectedBehaviour:
      "A sync refreshes each entry's live price and availability from its product rather than from the saved snapshot. If no such control exists, the page must already be reading live values on load — one of the two has to be true, and this case establishes which.",
    expectedUiState:
      "Prices and availability match the products' current values, either after the sync or already on load. Record which mechanism is in play. Values matching the saved snapshot rather than the product is the failure either way.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-wishlist-history-view-history": {
    roles: ["buyer"],
    startPage: "/user/history",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open three different product pages in sequence, noting their titles and the order.",
      "Open the browsing history page.",
      "Read the entries and their order.",
      "Check the most recently viewed is first.",
      "Check each entry shows a title, an image and a viewed time, and links to its product.",
    ],
    expectedBehaviour:
      "History records each view with a timestamp and shows the most recent first. Each entry carries a snapshot of the product's title and image so the list renders even if the product is later removed — which is why a deleted product leaves a readable entry whose link 404s rather than a blank row.",
    expectedUiState:
      "The three products appear newest first with titles, images and times, each linking to its product. An entry with no title or image is reading the live product rather than its snapshot.",
    endResult: "Three entries are recorded.",
  },
  "checklist-buying-wishlist-history-history-revisit-reorders": {
    roles: ["buyer"],
    startPage: "/user/history",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open the history page and note which product is third from the top.",
      "Open that product's page again.",
      "Return to the history page and read the order.",
      "Check that product is now first.",
      "Count the entries and check the product appears only once.",
    ],
    expectedBehaviour:
      "Revisiting a product moves its entry to the top rather than adding a second one. The existing entry for that product is removed and a fresh one inserted at the front — so the count is unchanged and the order reflects the newest visit.",
    expectedUiState:
      "The revisited product is first and appears exactly once. The total entry count is unchanged. Two entries for one product is the failure.",
    expectedData: { entriesForProduct: 1 },
    endResult: "History is reordered with no duplicates.",
  },
  "checklist-buying-wishlist-history-history-fifo-cap": {
    roles: ["buyer"],
    startPage: "/user/history",
    steps: [
      "Sign in as karthik.new@gmail.com / TempPass123!, an account with little history.",
      "Open the history page and note the entry count.",
      "Browse enough distinct product pages to exceed fifty entries in total, noting the FIRST product viewed.",
      "Open the history page and count the entries.",
      "Look for that first product in the list.",
      "Check no error or warning appeared while browsing.",
    ],
    inputs: { cap: 50 },
    expectedBehaviour:
      "History is a SOFT cap: at fifty entries the oldest is evicted silently. Nobody asked for a browsing record, so an error about it would be noise — which is the opposite choice from the wishlist, where the buyer explicitly asked to save something and a silent drop would be wrong.",
    expectedUiState:
      "The count never exceeds fifty. The earliest product viewed is gone from the list. No error or warning appeared at any point. A count above fifty means the cap is not applied on write and the document grows without bound.",
    expectedData: { maxEntries: 50 },
    endResult:
      "History holds at most fifty entries. The contrast with the wishlist's hard cap is the point.",
  },
  "checklist-buying-wishlist-history-history-guest-merge-on-login": {
    roles: ["guest", "buyer"],
    startPage: "/products",
    steps: [
      "Open a private window with no session and view three product pages, noting their titles.",
      "Open the history page as a guest and confirm the three are listed.",
      "Sign in as karthik.new@gmail.com / TempPass123! from that same window.",
      "Open the history page and read the entries.",
      "Check the three guest views are present alongside the account's existing history.",
      "Check no product appears twice and the total does not exceed fifty.",
      "Check the order is newest-first across both sets.",
    ],
    expectedBehaviour:
      "Guest history is mirrored locally and merged into the account on sign-in, de-duplicated by product with the newer view winning, and trimmed to fifty. All three of those steps matter: a merge without de-duplication produces two entries for a product seen in both states, and one without trimming pushes the document past its cap.",
    expectedUiState:
      "All three guest products are present, no product appears twice, the total is at most fifty, and the order is newest-first across the merged set.",
    expectedData: { maxEntries: 50, duplicateProducts: 0 },
    endResult: "The account's history holds the merged, de-duplicated set.",
  },
};
