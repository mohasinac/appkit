/*
 * WHY: Authored six-part procedures for the buying/cart checklist page.
 * WHAT: 71 case(s), keyed by full checklist id. The largest page in the catalogue.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THREE RULES RUN THROUGH ALMOST EVERY CASE HERE.
 *
 * LANES. A cart holds three kinds of line with three different obligations, and
 * only the highest-ranked non-empty lane may be checked out. The lane is DERIVED
 * from each line, never stored — a mirror field would drift the first time a write
 * path forgot it. Totals, coupons, select-all and the OTP threshold are all scoped
 * to a lane, and the cart prices whichever tab is OPEN while gating on the active
 * one, so a blocked tab must show its own figure and say why it cannot be paid.
 *
 * THE QUANTITY INVARIANT. A bundle line's quantity is COPIES of the whole
 * selection; a group line's quantity is pinned at 1 and each member carries its
 * own. That pinning is what lets one price rule keep returning a unit price that
 * every existing call site multiplies by the line quantity — so never render both
 * a line-level and a per-member stepper.
 *
 * PER-STORE FEES. Add-ons are per store, keyed on the same id the cart splits
 * orders by. Accumulating a cart-wide flag inside the per-group loop bills it once
 * per seller; applying it once outside bills less than the orders record.
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
  "checklist-buying-cart-update-qty": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-valkyrie (₹999) to the cart and open /cart.",
      "Read the line total, the seller subtotal and the summary total.",
      "Set the quantity stepper on that line to 3.",
      "Read all three figures again.",
      "RELOAD and read the quantity and the figures.",
    ],
    inputs: { productId: "product-beyblade-burst-valkyrie", quantity: 3, unitPrice: 999 },
    expectedBehaviour:
      "The quantity is written to the cart document and every derived figure recomputes from it. The line price is a UNIT price that the quantity multiplies — a rule the cart, the checkout preview and the order-creation paths all share, so all three agree by construction.",
    expectedUiState:
      "The line reads 3 × ₹999.00 = ₹2,997.00, and the seller subtotal and summary total move with it. After the reload the quantity is still 3.",
    expectedData: { cartLineQuantity: 3, lineTotal: 2997 },
    endResult: "The cart holds three copies. Empty it afterwards.",
  },
  "checklist-buying-cart-remove-item": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Add three different products to the cart and open /cart.",
      "Note which item is in the MIDDLE position.",
      "Remove that item.",
      "Read which items remain and in what order.",
      "RELOAD and read them again, and read the header badge.",
    ],
    expectedBehaviour:
      "Remove acts on the line it belongs to. A remove keyed on array position deletes the wrong line once the list has shifted, and both survivors still look like valid rows — which is why the middle item is the one removed.",
    expectedUiState:
      "The two remaining items are the first and third, in that order, and the badge reads 2. After the reload the same two remain.",
    expectedData: { remainingItems: 2 },
    endResult: "Two items remain. Empty the cart afterwards.",
  },
  "checklist-buying-cart-remove-all-confirmation": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Add two products to the cart and open /cart.",
      "Click 'Remove all'.",
      "Read the dialog that opens WITHOUT confirming.",
      "Check it names what will be cleared rather than asking a generic question.",
      "Cancel the dialog and confirm the cart is unchanged.",
    ],
    expectedBehaviour:
      "Clearing a cart is destructive and irreversible, so it carries a confirmation naming the action. Every danger-kind action holds its confirmation copy in the shared registry — an action defined inline bypasses that, and executes immediately with no warning.",
    expectedUiState:
      "A dialog reading in the shape of 'Clear your cart?' opens before anything is removed. Cancelling leaves both items present.",
    endResult: "The cart still holds both items.",
  },
  "checklist-buying-cart-remove-all-stays-empty": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Add two products to the cart and open /cart.",
      "Use 'Remove all' and confirm it.",
      "Read the cart immediately.",
      "Wait sixty seconds without touching anything and read it again.",
      "RELOAD and read it once more.",
      "Open /cart in a second tab and read it there.",
    ],
    expectedBehaviour:
      "The clear is written to the cart document, so it holds. Items reappearing after a moment mean the clear was local while a cached copy re-hydrated over it — the cart is one document written with a whole-object set, so a stale copy losing that race restores what was removed.",
    expectedUiState:
      "The cart is empty immediately, still empty after sixty seconds, after a reload, and in a second tab. Items returning at any point is the failure.",
    expectedData: { itemCount: 0 },
    endResult: "The cart is empty.",
  },
  "checklist-buying-cart-remove-all-badge-zero": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Add three products to the cart and read the header badge.",
      "Open /cart and use 'Remove all', confirming it.",
      "Read the header badge immediately, without reloading.",
      "Navigate to /products and read the badge.",
      "RELOAD and read it again.",
    ],
    expectedBehaviour:
      "The badge is derived from the same cart the page reads, so clearing updates both. A badge holding its own count independently keeps a leftover number that no page can explain — and the header persists across navigation, so it never re-mounts to correct itself.",
    expectedUiState:
      "The badge reads 0 or disappears immediately, stays that way on /products, and is still correct after a reload. A leftover count is the failure.",
    expectedData: { badgeCount: 0 },
    endResult: "The cart is empty and the badge agrees.",
  },
  "checklist-buying-cart-remove-all-keeps-won-auction": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!, whose cart holds a won auction.",
      "Add two ordinary products to the cart.",
      "Open /cart and note the Won Auctions tab holds a line.",
      "Use 'Remove all' from the Cart tab and confirm it.",
      "Read what the confirmation or the resulting message says about the won auction.",
      "Open the Won Auctions tab and check the line is still there.",
    ],
    expectedBehaviour:
      "A won-auction line is LOCKED and cannot be removed — settlement is its only writer, and the buyer has already committed to that purchase. 'Remove all' therefore clears the ordinary lines and says so, rather than silently doing less than its label promises.",
    expectedUiState:
      "The ordinary items are gone, the won-auction line remains, and the interface states that it was kept. Silently keeping it with no explanation is a failure, and removing it is a worse one.",
    expectedData: { wonAuctionLinesRemaining: 1 },
    endResult: "The won-auction line is intact.",
  },
  "checklist-buying-cart-cart-empty-state": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as karthik.new@gmail.com / TempPass123! with an empty cart.",
      "Open /cart and read the page.",
      "Check it offers a route back into browsing rather than only stating the cart is empty.",
      "Follow that link and read where it lands.",
      "Return and check no summary panel, coupon field or checkout button is rendered over the empty state.",
      "RELOAD and confirm the empty state is still shown.",
    ],
    expectedBehaviour:
      "An empty cart shows a named empty state with a way onward. Controls that cannot act on anything are not rendered over it — a checkout button on an empty cart is a control whose only possible outcome is a refusal.",
    expectedUiState:
      "A readable message and a working link to browse. No checkout button, coupon field or summary panel. A bare white area is the failure.",
    endResult: "The cart is empty.",
  },
  "checklist-buying-cart-cart-persists-across-session": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Add two products to the cart and note their titles and quantities.",
      "RELOAD /cart and read the contents.",
      "Sign out.",
      "Sign back in as the same account and open /cart.",
      "Read the contents and quantities.",
      "Open /cart in a different browser signed in as the same account.",
    ],
    expectedBehaviour:
      "The cart is a server document keyed on the user's id, so it survives a reload, a sign-out and a different browser. A cart held only in browser storage is per-device and disappears at the moment a buyer switches from phone to laptop to pay.",
    expectedUiState:
      "Both items with their quantities are present after the reload, after signing back in, and in the second browser.",
    endResult: "The cart holds both items. Empty it afterwards.",
  },
  "checklist-buying-cart-cart-guest-to-login-merge": {
    roles: ["guest", "buyer"],
    startPage: "/products",
    steps: [
      "Sign in as karthik.new@gmail.com / TempPass123!, add one product, and sign out.",
      "In the same window, add two DIFFERENT products as a guest and note their titles.",
      "Add one of the account's existing products as a guest as well.",
      "Open /cart as a guest and confirm the three guest items.",
      "Sign in as karthik.new@gmail.com / TempPass123!.",
      "Open /cart and read every line and quantity.",
      "Check the duplicated product appears ONCE with a sensible quantity.",
    ],
    expectedBehaviour:
      "The guest cart merges into the account's rather than replacing it or being discarded. A product present in both must resolve to one line — the merge rebuilds lines from products, which is also why a grouped line cannot survive a guest cart and is not offered to one.",
    expectedUiState:
      "All the guest items and the account's original item are present. The product added in both states appears exactly once. A cart that lost either side is the failure.",
    expectedData: { duplicateProductLines: 0 },
    endResult: "The merged cart holds each product once. Empty it afterwards.",
  },
  "checklist-buying-cart-cart-price-revalidated": {
    roles: ["buyer", "seller"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and add product-beyblade-burst-valkyrie (₹999) to the cart.",
      "Note the price shown in the cart.",
      "Sign out and sign in as tyson@beybladearena.in / TempPass123!.",
      "Change that product's price to 1199 and save.",
      "Sign back in as the buyer and open /cart.",
      "Read the line price and the total.",
      "Go to checkout and read the amount at every step.",
      "Restore the product's original price.",
    ],
    inputs: { priceBefore: 999, priceAfter: 1199 },
    expectedBehaviour:
      "The price is re-read from the product rather than trusted from the cart snapshot. A cart that charges the price captured at add time lets a buyer hold an old price indefinitely — and the reverse, a price rise the buyer is not shown before paying, is worse.",
    expectedUiState:
      "The cart and every checkout step read ₹1,199.00, and the change is visible before payment rather than appearing only on the order. A cart still showing ₹999.00 at the payment step is the failure.",
    expectedData: { chargedPrice: 1199 },
    endResult: "The product's price is restored; do not place the order.",
  },
  "checklist-buying-cart-cart-checkout-button-visible": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and add a product.",
      "Open /cart at 1280 pixels wide and find the checkout control without scrolling past the summary.",
      "Resize to 390 pixels and find it again.",
      "Scroll to the bottom of the cart at 390 pixels and check it is still reachable.",
      "Check it is not hidden behind the bottom tab bar.",
      "Click it and confirm it reaches checkout.",
    ],
    inputs: { desktopWidth: 1280, mobileWidth: 390 },
    expectedBehaviour:
      "The checkout control is reachable at both widths. On mobile it lives in the measured bottom tier above the tab bar, so neither has to know the other's height — a bar that hides by transform rather than by collapsing leaves its height behind and pushes this control off screen.",
    expectedUiState:
      "The control is visible and clickable at both widths, above the tab bar on mobile, and reaches checkout.",
    endResult: "Leave checkout without ordering; empty the cart.",
  },
  "checklist-buying-cart-apply-coupon": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399, Beyblade Arena) to the cart.",
      "Open /cart and look for a coupon input anywhere on the page.",
      "Open the 'How coupons work' panel and read its rules.",
      "Go to /checkout and complete the address and add-ons steps.",
      "Type ARENA25 in the coupon field and click Apply.",
      "Read the discount and the recalculated total.",
    ],
    inputs: { coupon: "ARENA25", itemPrice: 1399 },
    expectedBehaviour:
      "Codes are entered at CHECKOUT only — the cart explains the rules and takes no codes. One place to type a coupon means one place for it to be wrong, and the cart panel is explanatory rather than a second entry point.",
    expectedUiState:
      "No coupon input on /cart, only the explanatory panel. At checkout ARENA25 applies with its discount and the total falls accordingly.",
    endResult: "Remove the coupon and empty the cart afterwards.",
  },
  "checklist-buying-cart-remove-coupon": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Add product-beyblade-burst-regalia-genesis (₹1,399) to the cart and reach the checkout coupon step.",
      "Apply ARENA25 and note the discount amount and the total.",
      "Remove the coupon.",
      "Read the total immediately.",
      "Check it rose by exactly the discount amount.",
      "RELOAD and confirm the coupon is gone and the total holds.",
    ],
    inputs: { coupon: "ARENA25" },
    expectedBehaviour:
      "Removing a coupon recomputes the total by exactly the amount it was giving. A removal that clears the row without recomputing, or that clears the whole stack, are the two failures — and the arithmetic is what separates them from a correct removal.",
    expectedUiState:
      "The coupon leaves the applied list and the total rises by precisely its discount. After the reload it is still absent.",
    endResult: "The cart is emptied afterwards.",
  },
  "checklist-buying-cart-cart-added-toast-totals": {
    roles: ["buyer"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! with an empty cart.",
      "Open /products/product-beyblade-burst-valkyrie and click 'Add to Cart'.",
      "Read the toast that appears — the item named, the item count and any total.",
      "Compare the count and total against the header badge.",
      "Add a second, different product and read the toast again.",
      "Open /cart and compare the toast's figures against the cart page.",
    ],
    expectedBehaviour:
      "The toast names what was added and reports the cart's updated state, and those figures come from the same cart the badge and the page read. Three sources disagreeing is how a buyer ends up trusting none of them.",
    expectedUiState:
      "The toast names the item and shows an updated count and total that match the badge and the cart page. A toast reporting a stale count is the failure.",
    endResult: "Two items are in the cart. Empty it afterwards.",
  },
  "checklist-buying-cart-cart-badge-matches-cart-page": {
    roles: ["buyer"],
    startPage: "/products",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! with an empty cart.",
      "Add three different products from the grid, reading the badge after each.",
      "Open /cart and count the lines and the total quantity.",
      "Compare against the badge.",
      "Change one line's quantity to 2 and read the badge.",
      "Remove a line and read the badge.",
      "RELOAD and compare once more.",
    ],
    expectedBehaviour:
      "The badge and the cart page read one document, so they cannot disagree. The badge counting lines while the page counts units, or the reverse, is a real ambiguity — whichever it counts, it must count consistently through adds, quantity changes and removals.",
    expectedUiState:
      "The badge tracks the cart through every operation and matches the page after the reload. Record whether it counts lines or units — a badge that switches between the two is the failure.",
    endResult: "Empty the cart afterwards.",
  },
  "checklist-buying-cart-bottom-nav-cart-not-wishlist": {
    roles: ["buyer"],
    startPage: "/",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! with items in the cart.",
      "Resize the browser to 390 pixels wide and open /.",
      "Read every tab in the bottom navigation bar.",
      "Check a Cart tab is present with a live item-count badge.",
      "Check Wishlist is NOT one of the tabs.",
      "Add an item and check the Cart tab's badge updates.",
      "Count the bottom bars present.",
    ],
    inputs: { mobileWidth: 390 },
    expectedBehaviour:
      "The bottom bar carries Cart with a live badge and not Wishlist — the cart is the path to a purchase and the badge is the signal that matters. Exactly one bottom bar may be mounted per route: it is the sole publisher of the tab-bar height, so two means two bars on the same pixels and a height nobody owns.",
    expectedUiState:
      "A Cart tab with a badge that tracks the cart. No Wishlist tab. Exactly one bottom bar.",
    expectedData: { bottomNavCount: 1 },
    endResult: "Restore the window width; empty the cart.",
  },
  "checklist-buying-cart-cart-mobile-no-overflow": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and add items from two different sellers.",
      "Resize the browser to 390 pixels wide and open /cart.",
      "Look at each item card's right edge against the seller card containing it.",
      "Try to scroll the page sideways.",
      "Resize to 320 pixels and look again.",
      "Check every thumbnail, title and price stays inside its card.",
    ],
    inputs: { widths: "390, 320" },
    expectedBehaviour:
      "Item rows stay inside their seller card. A bare checkbox in a flex row is the classic cause here: its wrapper claims the full row width, its sibling shrinks toward zero, and a fixed-width thumbnail then overflows past a card that has no clipping — which is exactly what 'cart cards floating outside the screen' looks like.",
    expectedUiState:
      "Nothing overflows its card at either width and the page does not scroll sideways. A thumbnail pushed past the card's edge is the failure.",
    endResult: "Restore the window width; empty the cart.",
  },
  "checklist-buying-cart-cart-seller-group-contains-items": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and add items from two different sellers.",
      "Resize the browser to 360 pixels wide and open /cart.",
      "Look at each seller's rounded card and the rows inside it.",
      "Check every row sits fully within its card's border with visible separation between rows.",
      "Check the seller name and any per-seller fee lines are inside the same card.",
      "Scroll the whole cart and check no row escapes its card.",
    ],
    inputs: { viewportWidth: 360 },
    expectedBehaviour:
      "Each seller's card visually contains its own rows, because the store is the unit the cart splits orders by — a row that appears outside its card misrepresents which seller it belongs to, and that is the key coupons, shipping, add-ons and payouts all hang off.",
    expectedUiState:
      "At 360 pixels every row, the seller name and the per-seller fee lines sit inside the rounded card, with rows separated from one another. A row overflowing its card is the failure.",
    endResult: "Restore the window width; empty the cart.",
  },
  "checklist-buying-cart-group-picker-opens": {
    roles: ["guest"],
    startPage: "/products/product-tester-standard-1",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! so sandbox content is visible.",
      "Open /products/product-tester-standard-1 and find the 'Part of' strip.",
      "Read what the strip names and what controls it offers.",
      "Click the 'Pick items' control.",
      "Read what opens and whether every member is listed.",
      "Check each member shows a thumbnail, a title, a unit price and a quantity control.",
    ],
    expectedBehaviour:
      "A product belonging to a group offers a picker from its own page. A group is pick-as-you-wish — unlike a bundle, which is all-or-nothing — so the picker exists to let the buyer choose members and quantities before adding anything.",
    expectedUiState:
      "The strip names the group and its control opens a picker listing every member with thumbnail, title, unit price and a stepper. A strip with no way into the picker is the failure.",
    endResult: "Close the picker without adding.",
  },
  "checklist-buying-cart-group-picker-running-total": {
    roles: ["buyer"],
    startPage: "/products/product-tester-standard-1",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /products/product-tester-standard-1 and open the group picker.",
      "Read the running total shown.",
      "Raise one member's quantity by one and read the total again.",
      "Check it rose by exactly that member's unit price.",
      "Lower another member to zero and read the total and the item count.",
      "Check the count reflects the members still selected.",
    ],
    expectedBehaviour:
      "The running total recomputes immediately from the selected members and their quantities. It is the figure the buyer decides on, and it must match what the cart line will cost — the line's price is derived from the members by the repository at every write, so no caller can set it independently.",
    expectedUiState:
      "The total updates on every change, moving by exactly the affected member's unit price, and the item count follows the selection. A total that lags or that ignores quantity is the failure.",
    endResult: "Close the picker without adding.",
  },
  "checklist-buying-cart-group-picker-stock-cap": {
    roles: ["buyer"],
    startPage: "/products/product-tester-standard-1",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open the group picker and find a member with limited stock.",
      "Read its available stock.",
      "Raise its quantity repeatedly until the control stops.",
      "Compare the quantity reached against the stated stock.",
      "Check the control is disabled at the cap rather than silently ignoring presses.",
    ],
    expectedBehaviour:
      "Each member's stepper stops at that member's own stock. The cap is per member rather than per line, because a group line's members are independent products with independent inventory.",
    expectedUiState:
      "The quantity stops at the stated stock and the increase control becomes visibly disabled at that point. A control that accepts presses and does nothing is the failure — the buyer cannot tell it from an unresponsive page.",
    endResult: "Close the picker without adding.",
  },
  "checklist-buying-cart-group-picker-blocked-member": {
    roles: ["buyer"],
    startPage: "/products/product-tester-standard-1",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open the group picker and find product-tester-group-soldout among the members.",
      "Read what is shown in place of its quantity stepper.",
      "Check a reason is stated rather than the row being blank or absent.",
      "Try to include it in the selection.",
      "Read whether the running total counts it.",
    ],
    inputs: { blockedMember: "product-tester-group-soldout" },
    expectedBehaviour:
      "A member that cannot be bought shows WHY in place of its stepper. Hiding it entirely would misrepresent the group's contents, and showing an inert stepper would let the buyer build a selection that the server then refuses.",
    expectedUiState:
      "The sold-out member is listed with a reason chip instead of a stepper, cannot be selected, and does not contribute to the running total. A blank cell where the stepper would be is the failure.",
    endResult: "Close the picker without adding.",
  },
  "checklist-buying-cart-group-picker-one-line": {
    roles: ["buyer"],
    startPage: "/products/product-tester-standard-1",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open the group picker and select TWO members with quantities.",
      "Note the running total.",
      "Add the selection to the cart.",
      "Open /cart and count the lines that appeared.",
      "Read the line's price and compare it against the running total.",
    ],
    expectedBehaviour:
      "A multi-member selection becomes ONE cart line carrying its members, not one line per product. The line's price is derived from the members by the repository at every write of that member list, so no caller can set it — which is why the cart's subtotals stayed correct with no changes of their own.",
    expectedUiState:
      "Exactly one new line appears, priced at the picker's running total. Two separate lines is the failure.",
    expectedData: { newCartLines: 1 },
    endResult: "The cart holds one grouped line; later cases read it.",
  },
  "checklist-buying-cart-group-picker-single-member-plain-line": {
    roles: ["buyer"],
    startPage: "/products/product-tester-standard-1",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! with an empty cart.",
      "Open the group picker and select exactly ONE member with quantity 2.",
      "Add the selection to the cart.",
      "Open /cart and read the line.",
      "Check it has an ordinary line-level quantity stepper.",
      "Check it does not expand to a member list.",
    ],
    expectedBehaviour:
      "A one-member selection becomes an ordinary product line, because one item at quantity N is already exactly what a normal line means. Wrapping it as a group line would give it the pinned quantity and per-member steppers for no benefit.",
    expectedUiState:
      "The line looks like any other product line, with a working line-level stepper reading 2, and no member expansion.",
    endResult: "Empty the cart afterwards.",
  },
  "checklist-buying-cart-group-picker-cross-store": {
    roles: ["buyer"],
    startPage: "/products/product-tester-crossstore-a",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /products/product-tester-crossstore-a, whose group spans two sellers.",
      "Open its group picker.",
      "Read whether quantity controls are offered.",
      "Read whether an add control is offered.",
      "Read what the picker says about why.",
      "Using DevTools, attempt to submit a cross-store selection anyway.",
    ],
    inputs: { productId: "product-tester-crossstore-a" },
    expectedBehaviour:
      "A cross-store group renders READ-ONLY, and the server refuses such a selection again. The store id is the order-splitting key and the key per-store shipping, coupons, add-ons and payouts hang off — a line spanning sellers would produce an order belonging to one seller containing another's products, with no notification, no shipping resolution and no payout for the second.",
    expectedUiState:
      "No quantity column and no add control, with a stated reason. The forced submission is refused server-side rather than accepted.",
    expectedData: { addControlPresent: false },
    endResult:
      "Nothing is added. The fixtures exist in this banned shape precisely so both refusals are testable.",
  },
  "checklist-buying-cart-group-picker-guest": {
    roles: ["guest"],
    startPage: "/products/product-tester-standard-1",
    steps: [
      "Open /products/product-tester-standard-1 in a private window with no session.",
      "Open the group picker.",
      "Select two members and use the add control.",
      "Read what happens.",
      "Check a sign-in prompt appears rather than the selection being silently lost.",
      "Sign in from that prompt and read whether the selection survived.",
    ],
    expectedBehaviour:
      "A signed-out visitor is prompted to sign in. A guest cart is keyed by product and quantity only and is rebuilt from products on merge, so a grouped line could not survive that merge — which is why the picker asks for sign-in rather than accepting a selection it would then lose.",
    expectedUiState:
      "A sign-in prompt opens. The selection is not silently discarded without explanation. Record whether it survives the sign-in.",
    endResult: "Nothing is added as a guest.",
  },
  "checklist-buying-cart-group-line-expands-in-cart": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! with a grouped line in the cart.",
      "Open /cart and find the grouped line.",
      "Expand it.",
      "Read every member listed — thumbnail, title, unit price and quantity.",
      "Add up the members and compare against the line total.",
      "Collapse and re-expand it.",
    ],
    expectedBehaviour:
      "The line expands to show what it contains. A grouped line that renders as one opaque row hides which products the buyer is actually buying, and the member list is read through a helper that falls back to the legacy id array so carts written before members existed behave identically.",
    expectedUiState:
      "Every member is listed with its thumbnail, title, unit price and per-copy quantity, and they sum to the line total. A line that cannot be expanded is the failure.",
    endResult: "The cart still holds the grouped line.",
  },
  "checklist-buying-cart-group-line-no-line-level-stepper": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! with a grouped line in the cart.",
      "Open /cart and look at the grouped line's header row.",
      "Check there is no line-level quantity stepper on it.",
      "Expand the line and check each MEMBER has its own stepper.",
      "Using DevTools, attempt to submit a quantity change against the line itself.",
      "RELOAD and read the line's quantity.",
    ],
    expectedBehaviour:
      "A group line's quantity is pinned at 1 and only its members carry quantities. That pinning is what lets the shared price rule keep returning a UNIT price which every existing call site multiplies by the line quantity — so a line-level stepper would double-count. The repository refuses a quantity change on a group line, making the rule structural rather than a UI convention.",
    expectedUiState:
      "No stepper on the line header, one per member when expanded. The forced quantity change is refused and the line is still quantity 1 after the reload.",
    expectedData: { lineQuantity: 1 },
    endResult: "The grouped line is unchanged.",
  },
  "checklist-buying-cart-group-line-member-edit-recalculates": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! with a grouped line in the cart.",
      "Open /cart, expand the grouped line, and note the line total, the seller subtotal and the summary total.",
      "Raise one member's quantity by one.",
      "Read all three figures again.",
      "Check each rose by exactly that member's unit price.",
      "RELOAD and confirm the change held.",
    ],
    expectedBehaviour:
      "A member quantity change recomputes the line and everything above it. The whole member array is submitted rather than a delta — the cart is one document written with a whole-object set, so per-member requests would race on a double click and lose one of them.",
    expectedUiState:
      "The line total, the seller subtotal and the summary total all rise by exactly the member's unit price, and the change survives the reload.",
    endResult: "The grouped line carries the raised quantity.",
  },
  "checklist-buying-cart-group-line-remove-member": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! with a grouped line holding two members.",
      "Open /cart and expand the line.",
      "Remove ONE member.",
      "Read the remaining member and the line total.",
      "Check the line is still present rather than having been removed entirely.",
      "Remove the LAST member and read what happens to the line.",
      "RELOAD and confirm.",
    ],
    expectedBehaviour:
      "Removing one member leaves the line with the rest; removing the last removes the line, enforced in the repository rather than by the UI. A line with an empty member list would price at zero and be indistinguishable from a free item.",
    expectedUiState:
      "After the first removal the line remains with one member and a reduced total. After the second the line is gone. Both hold after the reload.",
    endResult: "The grouped line is removed.",
  },
  "checklist-buying-cart-group-line-link-target": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Add a grouped selection and a bundle to the cart.",
      "Open /cart and click the grouped line's title.",
      "Read where it lands.",
      "Go back and click the bundle line's title.",
      "Read where that lands.",
      "Expand the grouped line and click a member's title, reading where it lands.",
    ],
    expectedBehaviour:
      "Every title in the cart links somewhere real. A group, a bundle and a member are three different destinations — the group's own page, the bundle's page, and the member product — and a line that links to a route built from the wrong id 404s.",
    expectedUiState:
      "All three links open real pages: the group page, the bundle page and the member's product page. Any 404 is the failure, named by which link produced it.",
    expectedData: { notFoundCount: 0 },
    endResult: "Empty the cart afterwards.",
  },
  "checklist-buying-cart-bundle-copies-stepper": {
    roles: ["buyer"],
    startPage: "/bundles/bundle-tester-sandbox",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /bundles/bundle-tester-sandbox and find the copies stepper.",
      "Read the price shown at one copy.",
      "Raise the copies to 2 and read the price.",
      "Check both 'Buy now' and 'Add to cart' are present.",
      "Use 'Add to cart' and read whether the browser stayed on the bundle page.",
      "Open /cart and read the line.",
    ],
    inputs: { bundleId: "bundle-tester-sandbox", copies: 2, bundlePrice: 199 },
    expectedBehaviour:
      "A bundle is all-or-nothing, so its stepper counts COPIES of the whole selection rather than members. Add to cart stays on the page — a buyer adding two copies may want a third — while Buy now proceeds to checkout.",
    expectedUiState:
      "The price doubles to ₹398.00 at two copies. Both controls are present. Add to cart keeps the buyer on the bundle page and the cart gains one line at two copies.",
    expectedData: { copies: 2, lineTotal: 398 },
    endResult: "The cart holds a bundle line at two copies.",
  },
  "checklist-buying-cart-bundle-line-in-cart": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! with a bundle line in the cart.",
      "Open /cart and expand the bundle line.",
      "Read its members and check they are READ-ONLY — no per-member steppers.",
      "Read the line-level copies stepper.",
      "Raise the copies by one and read the line total.",
      "Check it rose by the bundle price rather than by the members' summed price.",
      "RELOAD and confirm.",
    ],
    inputs: { bundlePrice: 199, memberTotal: 348 },
    expectedBehaviour:
      "A bundle's members are fixed and its copies vary — the exact inverse of a group line. The price rule's bundle branch must be evaluated BEFORE its members branch: a bundle line carries members too, and summing them would charge the undiscounted total and throw away the discount that is the entire point of a bundle.",
    expectedUiState:
      "Members are listed without steppers, the copies stepper is on the line, and raising it adds ₹199.00 per copy rather than ₹348.00. A total rising by the members' sum is the branch-order failure.",
    expectedData: { pricePerCopy: 199 },
    endResult: "Empty the cart afterwards.",
  },
  "checklist-buying-cart-bundle-cross-store-rejected": {
    roles: ["seller"],
    startPage: "/store/bundles",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's bundles surface and start creating one.",
      "Add a member from this store and one from a different store.",
      "Save and read the message.",
      "Check the message names the offending member or store.",
      "Remove the foreign member and save again.",
      "Repeat the attempt from the admin bundle editor.",
    ],
    expectedBehaviour:
      "A cross-store bundle is refused at SAVE time in all four bundle write paths — admin and store, create and update. Save-time rather than add-to-cart-time is deliberate: bundles already in the database keep working and checkout is untouched, while the hole stops being reachable.",
    expectedUiState:
      "The save is refused with a message naming which member or store is the problem, not a generic error. The same refusal appears from the admin editor.",
    endResult: "No cross-store bundle is created.",
  },
  "checklist-buying-cart-grouped-listing-page-picker": {
    roles: ["buyer"],
    startPage: "/products/product-tester-standard-1",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /products/product-tester-standard-1 and find the 'Part of' strip.",
      "Follow the link to the group's own public page.",
      "Read the page — its title, description and member list.",
      "Find the picker on that page and open it.",
      "Compare it against the picker on the product page.",
      "Select members and add them, then check the cart line matches.",
    ],
    expectedBehaviour:
      "A grouped listing has its own public page carrying the same picker, so the group is reachable and shareable in its own right rather than only as a strip on a member's page.",
    expectedUiState:
      "The group page renders with its members and the same picker. Adding from it produces the same single grouped cart line as adding from the product page.",
    endResult: "Empty the cart afterwards.",
  },
  "checklist-buying-cart-group-lane-gate": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!, whose cart holds an unpaid won auction.",
      "Open /cart and confirm the Won Auctions tab holds a line.",
      "Open a group's picker, select two members, and try to add them.",
      "Read what happens and any message shown.",
      "Try adding an ordinary product as well.",
      "Try adding a bundle.",
      "Read whether all four entry points behave the same way.",
    ],
    expectedBehaviour:
      "While a higher-ranked lane is pending, nothing new may be added. That gate lived inline in ONE of the four ways a line is created, so bundle adds and the direct cart route bypassed it entirely and a buyer with an unpaid win could keep shopping. All four entry points now call it.",
    expectedUiState:
      "Every add attempt — group, ordinary product, bundle and any other route — is refused with the same explanation naming the pending win. One route succeeding while the others refuse is the failure.",
    expectedData: { addsPermitted: 0 },
    endResult: "Nothing new is added.",
  },
  "checklist-buying-cart-group-checkout-order-rows": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! with a grouped line of two members in the cart.",
      "Complete checkout with Cash on Delivery.",
      "Open the order and count the item rows.",
      "Check there is one row per MEMBER.",
      "Check all of them share a single group identifier and title.",
      "Read the receipt view and check the members are collapsed back into one line.",
      "Check each row carries its own tax code.",
    ],
    expectedBehaviour:
      "A grouped line becomes N order rows sharing a group identifier — per-product tax codes are a GST invoice requirement and cancellation quantities are per product, so the members cannot be collapsed in storage. The receipt collapses them for display, and its fallback keeps older collapsed bundle orders rendering unchanged with no migration.",
    expectedUiState:
      "The order holds one row per member, all sharing a group id and title, each with its own tax code. The receipt shows them as one line.",
    expectedData: { orderRowsPerMember: 1 },
    endResult: "One order exists from a grouped line.",
  },
  "checklist-buying-cart-group-checkout-stock": {
    roles: ["buyer", "seller"],
    startPage: "/cart",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123! and note the stock of two group members.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and build a grouped line with member A at quantity 2 and member B at quantity 1.",
      "If the line supports copies, set them to 2; otherwise note the line quantity is 1.",
      "Complete checkout with Cash on Delivery.",
      "Sign back in as the seller and read both members' stock.",
      "Compare the decrement against per-copy quantity times copies.",
    ],
    expectedBehaviour:
      "Each member decrements by its per-copy quantity multiplied by the number of copies. That is the quantity invariant applied to inventory — demand for a product is the line quantity times the member quantity, and dropping either factor under-decrements and oversells.",
    expectedUiState:
      "Member A's stock falls by 2 per copy and member B's by 1 per copy. A decrement of one per member regardless of quantity is the failure.",
    endResult: "One order exists; stock is decremented correctly.",
  },
  "checklist-buying-cart-checkout-lanes-auction-blocks-others": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!, whose cart holds an unpaid won auction, an accepted offer and ordinary items.",
      "Open /cart and read the three tabs.",
      "Open the Cart tab and read its checkout button's state.",
      "Open the Accepted Offers tab and read its checkout button's state.",
      "Open the Won Auctions tab and read its checkout button's state.",
      "Read the explanation shown on each disabled button.",
    ],
    expectedBehaviour:
      "The lanes rank auction above offer above standard, and only the highest non-empty lane may be checked out. The lane is derived from each line rather than stored — a mirror field would drift the first time a write path forgot it.",
    expectedUiState:
      "Won Auctions is payable; the Offers and Cart tabs both show disabled checkout with an explanation naming the pending win. A payable Cart tab while a win is unpaid is the failure.",
    endResult: "Read-only; check out nothing.",
  },
  "checklist-buying-cart-checkout-lanes-offer-blocks-standard-only": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123! with an accepted offer and ordinary items, and NO won auction.",
      "Open /cart and read the tabs present.",
      "Read the Accepted Offers tab's checkout button state.",
      "Read the Cart tab's checkout button state and its explanation.",
      "Check the Won Auctions tab is absent or empty.",
      "Compare against the auction case's behaviour.",
    ],
    expectedBehaviour:
      "With no auction pending the offer lane is the highest non-empty one, so it is payable and only the standard lane is blocked. The gate is relative to what is in the cart rather than a fixed hierarchy of disabled tabs.",
    expectedUiState:
      "Accepted Offers is payable and the Cart tab is disabled with an explanation naming the pending offer. A disabled Offers tab here would mean the ranking is being applied absolutely rather than against the cart's contents.",
    endResult: "Read-only; check out nothing.",
  },
  "checklist-buying-cart-auction-win-countdown-visible": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! with a won auction in the cart.",
      "Open /cart and switch to the Won Auctions tab.",
      "Find the countdown beside the payment-required note.",
      "Read the time remaining.",
      "Wait ten seconds without touching anything and read it again.",
      "RELOAD and check the countdown continues rather than restarting.",
    ],
    expectedBehaviour:
      "The countdown runs against the win's stored checkout deadline, so a reload continues it. A countdown restarting on every visit would let the window appear to reset indefinitely — and the deadline is what the forfeiture sweep acts on.",
    expectedUiState:
      "A countdown showing days, hours, minutes and seconds sits beside the payment-required note, its seconds figure lower after ten seconds, continuing from where it was after the reload.",
    endResult: "Read-only; pay nothing.",
  },
  "checklist-buying-cart-auction-win-forfeits-after-deadline": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! with a won auction whose deadline has passed.",
      "Open /cart and read the Won Auctions tab.",
      "Check the line is gone.",
      "Open /user/bids and read that bid's status.",
      "Open the notification list and read the forfeiture entry.",
      "Check the Cart tab's checkout is now enabled again.",
    ],
    expectedBehaviour:
      "An unpaid win past its deadline is forfeited, the locked line cleared and the buyer notified. Clearing the line is what unblocks the rest of the cart — a leftover locked line keeps the auction lane non-empty and that lane outranks the others, so the buyer's whole cart stays blocked indefinitely.",
    expectedUiState:
      "The Won Auctions tab is empty, the bid reads forfeited, a notification exists, and the Cart tab is payable again.",
    endResult:
      "Read-only. The deadline is set by settlement rather than seed data, so if no lapsed win exists answer null rather than waiting.",
  },
  "checklist-buying-cart-checkout-lanes-totals-scoped": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! with items in all three lanes.",
      "Open /cart on the Cart tab and read the summary total.",
      "Add up the ordinary items yourself and compare.",
      "Switch to the Accepted Offers tab and read its total.",
      "Switch to the Won Auctions tab and read its total.",
      "Check no tab's total includes another lane's items.",
      "Check each total names which lane it covers.",
    ],
    expectedBehaviour:
      "Each tab's total covers only its own lane. A blended total spanning lanes is a figure the buyer can never be charged — and because the cart prices whichever tab is OPEN, including a blocked one, each total has to name its lane or a buyer reads a number for a lane they cannot pay.",
    expectedUiState:
      "Each tab's total matches its own items and is labelled with its lane. A total spanning lanes is the failure.",
    endResult: "Read-only; check out nothing.",
  },
  "checklist-buying-cart-checkout-lanes-checkout-page-matches-tab": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! with items in more than one lane.",
      "Open /cart on the Won Auctions tab and note its items and total.",
      "Click its checkout control.",
      "Read the checkout page's items and total.",
      "Check they match the tab rather than the whole cart.",
      "Go back, switch to a blocked tab, and try its checkout control.",
      "Read what happens.",
    ],
    expectedBehaviour:
      "Checkout opens the lane it was entered from and shows only that lane's items. The lane in the URL is ADVISORY — it is validated and used to explain a mismatch, never fed to the pricing, because placement refuses anything but the active lane and a URL-supplied lane would otherwise render a payable-looking total for a lane the order will be refused on.",
    expectedUiState:
      "Checkout from the Won Auctions tab shows only those items and that total. The blocked tab's control is disabled or refuses with an explanation rather than opening a checkout that will fail.",
    endResult: "Leave checkout without ordering.",
  },
  "checklist-buying-cart-cart-mobile-bar-lane-scoped": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! with items in more than one lane.",
      "Open /cart at 1280 pixels and note each tab's desktop summary total.",
      "Resize to 390 pixels and open /cart.",
      "On each tab, read the bottom bar's total and the lane it names.",
      "Compare each against the desktop figure for the same tab.",
      "Check both name the same lane.",
    ],
    inputs: { desktopWidth: 1280, mobileWidth: 390 },
    expectedBehaviour:
      "The mobile bar and the desktop summary read the same lane-scoped figure. The mobile bar was left reading the cross-lane total after the desktop panel was converted — so on a phone a buyer could sit on the Offers tab and read a blended total spanning three lanes.",
    expectedUiState:
      "On every tab the mobile total equals the desktop total and both name the same lane. A mobile figure larger than the desktop one is the cross-lane failure.",
    endResult: "Restore the window width; check out nothing.",
  },
  "checklist-buying-cart-cart-mobile-bar-lane-gated": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! with an unpaid won auction and ordinary items.",
      "Resize to 390 pixels and open /cart.",
      "Switch to the Cart tab, which is not currently payable.",
      "Read the bottom bar's checkout button state.",
      "Read any explanation shown on it.",
      "Switch to the Won Auctions tab and read the button state there.",
    ],
    inputs: { mobileWidth: 390 },
    expectedBehaviour:
      "The mobile checkout button is gated by the same lane rule as the desktop one and states why. The mobile bar ignored the block entirely — so a phone user could tap into a checkout the desktop button correctly refused.",
    expectedUiState:
      "On the Cart tab the button is disabled with an explanation naming the pending win. On the Won Auctions tab it is enabled. An enabled button on a blocked tab is the failure.",
    endResult: "Restore the window width; check out nothing.",
  },
  "checklist-buying-cart-cart-mobile-checkout-carries-lane": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! with a payable non-standard lane.",
      "Resize to 390 pixels and open /cart.",
      "Switch to the Won Auctions or Accepted Offers tab.",
      "Tap the bottom bar's Checkout button.",
      "Read the URL and the checkout page's items.",
      "Check they match the lane the tap came from.",
    ],
    inputs: { mobileWidth: 390 },
    expectedBehaviour:
      "The mobile control carries its lane through to checkout. It pushed a lane-less checkout URL, so a tap from the Won Auctions tab landed on the standard lane's checkout — showing the wrong items after the buyer had chosen a tab.",
    expectedUiState:
      "The checkout page shows the same items as the tab the tap came from, and the URL names that lane.",
    endResult: "Restore the window width; leave checkout without ordering.",
  },
  "checklist-buying-cart-cart-select-all-lane-scoped": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! with items in more than one lane.",
      "Open /cart on the Cart tab and read the 'Select all' control's count.",
      "Compare it against the number of items on that tab only.",
      "Switch to another tab and read the count there.",
      "Use 'Select all' on the Cart tab, then use 'Remove all'.",
      "Check the won-auction line was not removed.",
    ],
    expectedBehaviour:
      "Select-all counts and acts on the current tab only, and remove-all never touches a locked line. Both counted every lane after the desktop summary was scoped — so 'Select all (N)' reported a number the visible tab could not account for, and remove-all deleted lines the lane model defines as non-removable.",
    expectedUiState:
      "The count matches the current tab's items on every tab. Remove-all clears only that tab's removable lines and leaves the won auction.",
    expectedData: { wonAuctionLinesRemaining: 1 },
    endResult: "The won-auction line is intact.",
  },
  "checklist-buying-cart-cart-breakdown-expand-mobile": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! with items from two sellers.",
      "Resize to 390 pixels and open /cart.",
      "Find the total row in the bottom bar and its up-arrow control.",
      "Tap it and read what opens and where it sits relative to the bar.",
      "Read every fee line in the panel.",
      "Tap again to close it and check the bar returns to its normal height.",
    ],
    inputs: { mobileWidth: 390 },
    expectedBehaviour:
      "The breakdown opens ABOVE the bar rather than pushing the page. The panel and the bar are both children of the measured bottom tier, so opening it grows the tier and everything above reflows — a panel that collapses by transform instead would leave its height behind when closed.",
    expectedUiState:
      "The arrow opens a panel above the bar showing the fee lines, and closing it returns the tier to its original height with no leftover gap.",
    endResult: "Restore the window width.",
  },
  "checklist-buying-cart-cart-breakdown-expand-desktop": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! with items from two sellers.",
      "Open /cart at 1280 pixels and find 'Show details' in the Summary panel.",
      "Click it and read the breakdown that expands.",
      "Write down every fee line and amount.",
      "Resize to 390 pixels, open the mobile breakdown, and write down the same.",
      "Compare the two lists line by line.",
    ],
    inputs: { desktopWidth: 1280, mobileWidth: 390 },
    expectedBehaviour:
      "Both surfaces render one shared breakdown component, so their lines and amounts are identical by construction. Two copies would drift the first time a fee changed, and the buyer would see different figures depending on their device.",
    expectedUiState:
      "The desktop breakdown expands below the subtotal with the same lines and amounts as the mobile panel. Any difference is the finding.",
    endResult: "Restore the window width.",
  },
  "checklist-buying-cart-cart-breakdown-aggregate-only": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! with items from two sellers, ticking an add-on on each.",
      "Open /cart and expand the breakdown.",
      "Read every line and count how many lines each fee type produces.",
      "Check each fee type appears ONCE with a qualifier naming the number of stores.",
      "Scroll to each seller card and read its own fee lines.",
      "Check the per-store detail lives on the cards rather than in the panel.",
    ],
    expectedBehaviour:
      "The breakdown is aggregate only — one line per fee type with a store-count qualifier — while per-store detail lives on each seller card. Repeating the per-store rows in the panel would make it a second, competing place to read the same numbers.",
    expectedUiState:
      "Each fee type appears once in the panel, qualified by store count. The seller cards carry their own fee lines. Duplicated per-store rows in the panel is the failure.",
    endResult: "Empty the cart afterwards.",
  },
  "checklist-buying-cart-cart-breakdown-checked-items-only": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! with several items selected.",
      "Open /cart and expand the breakdown, noting the item count and every fee line.",
      "Deselect one item and read the breakdown again.",
      "Check the item count fell and the affected fee lines changed.",
      "Deselect ALL items and read the breakdown and the checkout control.",
      "Reselect one and check the figures return.",
    ],
    expectedBehaviour:
      "The breakdown covers the selected items only, since those are what will be charged. With nothing selected there is nothing to price — and a fully-zeroed but truthy preview reads as a confident total of zero, so the state has to be distinguished rather than rendered as a number.",
    expectedUiState:
      "Deselecting lowers the count and the affected lines. With nothing selected the breakdown reports that nothing is selected rather than showing ₹0.00, and checkout is unavailable.",
    endResult: "Reselect the items; empty the cart afterwards.",
  },
  "checklist-buying-cart-cart-breakdown-no-coupon-on-locked-lanes": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! with items in the auction and offer lanes.",
      "Open /cart on the Cart tab and expand the breakdown, noting whether a coupon line can appear.",
      "Switch to the Won Auctions tab and expand the breakdown.",
      "Read whether any coupon-discount line is present.",
      "Switch to the Accepted Offers tab and read the same.",
      "Check each locked lane explains why coupons do not apply.",
    ],
    expectedBehaviour:
      "The locked lanes show no coupon line because the price was already agreed — by a winning bid or an accepted offer. Rendering a coupon row that can only ever read zero invites the buyer to hunt for a code that cannot work.",
    expectedUiState:
      "Neither locked lane's breakdown carries a coupon line, and each states why. A zero-value coupon row is the failure.",
    endResult: "Read-only; check out nothing.",
  },
  "checklist-buying-cart-cart-guest-breakdown-fallback": {
    roles: ["guest"],
    startPage: "/cart",
    steps: [
      "Open /products in a private window with no session and add two items from different sellers.",
      "Open /cart and read the summary area.",
      "Check subtotals are shown per seller.",
      "Read what is shown in place of shipping and fee lines.",
      "Check a sign-in note explains why they are absent.",
      "Check no confident total including fees is presented.",
    ],
    expectedBehaviour:
      "Shipping and fees depend on a delivery address, which a guest has not given, so they are omitted with an explanation rather than guessed. Presenting a total that omits fees without saying so understates what the buyer will pay.",
    expectedUiState:
      "Per-seller subtotals appear with a note in the shape of 'Sign in to see shipping & fees'. No fee lines and no final total presented as complete.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-cart-cart-store-card-fee-lines": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! with items from two sellers.",
      "Open /cart and read each seller card's fee lines below its items.",
      "Note each seller's shipping and any add-on fees.",
      "Add the per-seller fee lines together.",
      "Expand the aggregate breakdown and compare each fee type's total against your sum.",
      "Check the two reconcile exactly.",
    ],
    expectedBehaviour:
      "Per-seller fee lines and the aggregate breakdown are two views of one computation, so they reconcile to the paisa. Where they are computed separately the buyer is shown two different answers to the same question and has no way to tell which they will be charged.",
    expectedUiState:
      "Each card shows its own shipping and add-on fees, and their sum equals the corresponding aggregate line. Any gap is a finding rather than a rounding artefact.",
    expectedData: { feesReconcile: true },
    endResult: "Empty the cart afterwards.",
  },
  "checklist-buying-cart-cart-addons-per-store": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! with items from TWO sellers.",
      "Open /cart and tick 'WhatsApp order updates' on ONE seller's card only.",
      "Read that seller's fee lines and the aggregate breakdown.",
      "Check the fee is charged once at ₹10.00, not ₹20.00.",
      "Check the other seller's card shows no such fee.",
      "Tick it on the second seller too and check the aggregate reads ₹20.00.",
    ],
    inputs: { whatsappFee: 10 },
    expectedBehaviour:
      "Add-ons are per store, keyed on the same id the cart splits orders by. A cart-wide flag accumulated inside the per-group loop bills it once per seller — one tick, ₹10 times the number of stores — while a sibling payment path applied it once for the whole cart, so the gateway collected less than the orders recorded as owed.",
    expectedUiState:
      "One tick charges ₹10.00 on that seller only. Two ticks charge ₹20.00 total. One tick charging ₹20.00 on a two-seller cart is the loop failure.",
    expectedData: { whatsappFeeOneStore: 10 },
    endResult: "Untick both; empty the cart.",
  },
  "checklist-buying-cart-cart-addons-deselected-store-excluded": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! with items from two sellers.",
      "Tick an add-on on the first seller's card.",
      "Deselect ALL of that seller's items.",
      "Read that seller's add-on checkboxes and any explanation.",
      "Read the aggregate breakdown and check the fee is gone.",
      "Reselect one of that seller's items and check the checkboxes are usable again.",
    ],
    expectedBehaviour:
      "A store with nothing selected forms no order group, so its add-ons are structurally unreachable rather than needing a flag to suppress them. The controls are disabled with an explanation rather than silently ignored, so the buyer is not left ticking something that will never be charged.",
    expectedUiState:
      "The deselected seller's add-on checkboxes are disabled with a stated reason and its fee leaves the breakdown. Reselecting restores both.",
    endResult: "Empty the cart afterwards.",
  },
  "checklist-buying-cart-cart-addons-persist-to-checkout": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! with items from two sellers.",
      "Tick gift wrap on the first seller and WhatsApp updates on the second.",
      "Note which add-on belongs to which seller.",
      "Proceed to checkout and open the add-ons step.",
      "Read each seller's add-ons there.",
      "Check each is ticked against the SAME seller as in the cart.",
      "Read the fee lines and check they match the cart's.",
    ],
    expectedBehaviour:
      "Selections live on the cart document keyed by store, so checkout reads them rather than being told. The old request-body flags were deleted rather than kept alongside — two sources of truth for one charge is the drift itself.",
    expectedUiState:
      "Checkout shows gift wrap against the first seller and WhatsApp updates against the second, with the same fees as the cart. Add-ons attached to the wrong seller is the failure.",
    endResult: "Untick both; leave checkout without ordering.",
  },
  "checklist-buying-cart-cart-addons-editable-at-checkout": {
    roles: ["buyer"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Use 'Buy now' on a product so checkout is reached without visiting the cart.",
      "Open the add-ons step and read the controls offered.",
      "Tick an add-on and read the fee appear.",
      "Untick it and read the fee disappear.",
      "Check the seller list comes from the cart rather than only appearing after the pricing request completes.",
    ],
    expectedBehaviour:
      "Add-ons are editable at checkout because Buy now skips the cart entirely — a buyer who never saw the cart page must still be able to choose them. The step's seller list is derived from the CART rather than from the pricing response, so the controls exist before that request returns and do not vanish if it fails.",
    expectedUiState:
      "The add-ons step renders its per-seller controls immediately, and ticking or unticking changes the fee. Controls that appear only after the pricing request lands, or vanish when it fails, are the failure.",
    endResult: "Leave checkout without ordering.",
  },
  "checklist-buying-cart-cart-addons-hidden-when-disabled": {
    roles: ["admin", "buyer"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123! and open Site Settings → Fees.",
      "Note which add-ons are enabled, then disable gift wrap and save.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and open /cart with items from two sellers.",
      "Read each seller card's add-on checkboxes.",
      "Check no gift-wrap checkbox appears on any card.",
      "Go to checkout and check it is absent there too.",
      "Re-enable it in Site Settings and confirm it returns.",
    ],
    expectedBehaviour:
      "A disabled add-on does not render. The three add-on flags default to enabled, but an undefined value still means disabled everywhere — so a client-side fallback that treats undefined as enabled would give the buyer a checkbox that bills nothing.",
    expectedUiState:
      "With gift wrap disabled its checkbox is absent from every seller card and from checkout. Re-enabling restores it. A checkbox present that charges ₹0.00 is the failure.",
    endResult: "The add-on is re-enabled.",
  },
  "checklist-buying-cart-cart-addons-order-record": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! with items from two sellers.",
      "Tick gift wrap on the FIRST seller only and note the fee.",
      "Complete checkout with Cash on Delivery.",
      "Open /user/orders and open BOTH resulting orders.",
      "Read each order's fee lines.",
      "Check only the first seller's order carries the gift-wrap fee.",
      "Check the second order carries none.",
    ],
    expectedBehaviour:
      "The add-on is recorded on the order of the seller it was ticked for. The cart splits into one order per store, so the fee has to land on the right one — a fee on both orders is the per-group accumulation bug persisted into the record, where it is no longer recoverable.",
    expectedUiState:
      "The first seller's order shows the gift-wrap fee and the second shows none. The fee on both orders is the failure.",
    expectedData: { ordersWithAddon: 1 },
    endResult: "Two orders exist, one carrying the add-on.",
  },
  "checklist-buying-cart-order-addon-icons-visible": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/orders and open an order that included add-ons.",
      "Look for icon chips naming each add-on taken.",
      "Read each chip's label and check it names the add-on.",
      "Check the chips are readable against their background.",
      "Switch to dark mode and read them again.",
    ],
    expectedBehaviour:
      "Add-ons taken on an order are shown as labelled chips, so the buyer can see what they paid for without reading the fee lines. A chip is an inline element, so it takes a status tint with matching ink — both halves invert together, and a fixed white ink would be invisible in exactly one theme.",
    expectedUiState:
      "One chip per add-on taken, each labelled and readable in both themes. An icon with no label, or a chip whose text is invisible in one theme, are both findings.",
    endResult: "Read-only; return the site to light mode.",
  },
  "checklist-buying-cart-order-gift-message-visible-to-seller": {
    roles: ["buyer", "seller"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and add an item from Beyblade Arena.",
      "Tick gift wrap and type 'QA Gift message — happy birthday from the tester checklist.' as the message.",
      "Complete checkout with Cash on Delivery.",
      "Open the order and check the message is shown to the buyer.",
      "Sign out and sign in as tyson@beybladearena.in / TempPass123!.",
      "Open that order in /store/orders and read the gift message.",
      "Check the FULL text is shown rather than a truncation.",
    ],
    inputs: { giftMessage: "QA Gift message — happy birthday from the tester checklist." },
    expectedBehaviour:
      "The seller sees the complete gift message, because they are the one who has to write it on the parcel. A truncated message produces a card with half a sentence on it, and the buyer has no way to know it was cut.",
    expectedUiState:
      "Both the buyer's and the seller's views show the message in full, word for word. A truncation or an ellipsis on the seller's view is the failure.",
    endResult: "One order exists carrying a gift message.",
  },
  "checklist-buying-cart-order-addons-queryable": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/orders and look for a filter on add-ons.",
      "Filter to orders that took gift wrap and read the rows.",
      "Open one and confirm it carries that add-on.",
      "Filter to a different add-on and read those rows.",
      "Check the two result sets differ.",
      "Clear the filter and confirm the full list returns.",
    ],
    expectedBehaviour:
      "Add-ons taken are stored on the order in a form the list can filter on, so an admin can find every gift-wrap order — which is an operational need at packing time rather than a reporting nicety.",
    expectedUiState:
      "Each add-on filter returns orders that carry it and the two sets differ. A filter returning everything, or nothing while such orders demonstrably exist, are both findings.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-buying-cart-order-coupon-shown-all-lanes": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/orders and open a STANDARD order that had a coupon applied.",
      "Read the discount lines shown.",
      "Open an order that came from a won auction and read its discount area.",
      "Open one that came from an accepted offer and read the same.",
      "Check each lane's order shows whatever coupon it actually carried.",
      "Check an order with no coupon shows no empty discount row.",
    ],
    expectedBehaviour:
      "An order renders its own discount record whichever lane produced it. That record is the authoritative list — the two single-coupon scalar fields survive only for older orders, and rendering from those instead shows the first coupon and silently drops the rest.",
    expectedUiState:
      "Each order shows the coupons it carried, one line each, in every lane. An order with none shows no empty row. A multi-coupon order showing only one is the scalar-field failure.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-cart-platform-fee-capped": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123! and read the configured platform fee percentage and maximum.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and add a low-value item.",
      "Open /cart, expand the breakdown, and read the platform fee.",
      "Add high-value items until the uncapped percentage would exceed the maximum.",
      "Read the platform fee again.",
      "Check it stopped at the configured maximum rather than continuing to scale.",
    ],
    expectedBehaviour:
      "The buyer's platform fee is capped before tax is applied to it, since tax is levied on the commission actually charged. The seller-side deduction is deliberately UNCAPPED — that is a separate commercial decision, and making the two match would be the wrong fix for the asymmetry.",
    expectedUiState:
      "The fee rises with the cart until the maximum and then stops. A fee that keeps scaling is the failure.",
    endResult: "Empty the cart afterwards.",
  },
  "checklist-buying-cart-platform-fee-all-methods": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and add an item.",
      "Go to checkout and select Cash on Delivery, then read the platform fee.",
      "Select UPI or cash manual payment and read the fee.",
      "Select the online gateway if enabled and read the fee.",
      "Compare all three figures.",
      "Check the fee is present on every method.",
    ],
    expectedBehaviour:
      "The platform fee is charged on every payment method. It was gateway-only for a long time, so cash and COD buyers never paid it — which is a revenue gap rather than a display bug, and invisible unless the methods are compared.",
    expectedUiState:
      "The same platform fee appears under all three methods. A method showing no fee is the failure, named by method.",
    endResult: "Leave checkout without ordering.",
  },
  "checklist-buying-cart-platform-fee-charged-once": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and add items from THREE different sellers.",
      "Open /cart and expand the breakdown.",
      "Read the platform fee line and any store-count qualifier on it.",
      "Compare it against the fee on a single-seller cart.",
      "Check it was not multiplied by three.",
      "Go to checkout and read the fee at the payment step.",
    ],
    expectedBehaviour:
      "The platform fee is charged once per CHECKOUT, not per seller — it is a fee on the transaction rather than on each order the transaction produces. It is then split pro-rata across the resulting orders, which is the next case.",
    expectedUiState:
      "The three-seller cart shows one platform fee, the same as a single-seller cart of comparable value. Three times the fee is the per-group accumulation failure.",
    endResult: "Empty the cart afterwards.",
  },
  "checklist-buying-cart-platform-fee-sums-across-orders": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and add items from two sellers.",
      "Note the platform fee shown at checkout.",
      "Complete checkout with Cash on Delivery.",
      "Open both resulting orders in /user/orders.",
      "Read each order's recorded platform fee.",
      "Add the two together and compare against the checkout figure.",
    ],
    expectedBehaviour:
      "The single fee is allocated pro-rata across the orders the cart produces, with the last group absorbing the rounding remainder — so the per-order values sum to exactly what was charged. Anything else means the platform absorbed or overcharged the difference.",
    expectedUiState:
      "The two orders' platform fees sum to the checkout figure exactly, to the paisa. A gap in either direction is the failure.",
    expectedData: { feesReconcile: true },
    endResult: "Two orders exist with reconciling fees.",
  },
  "checklist-buying-cart-cart-checkout-order-totals-agree": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and add items from two sellers, ticking one add-on.",
      "Open /cart, expand the breakdown, and write down every figure.",
      "Add up the per-seller card fee lines and write that down.",
      "Go to checkout and write down the summary at the payment step.",
      "Complete the order with Cash on Delivery.",
      "Open both orders and add their totals together.",
      "Compare all four figures.",
    ],
    expectedBehaviour:
      "Four surfaces price one cart and all four must agree: the cart breakdown, the per-seller card lines, the checkout summary and the orders. They share one set of fee helpers precisely so they cannot drift — a fee re-derived inline at any one of them is how they diverge, and the buyer only ever sees two at a time.",
    expectedUiState:
      "All four figures are identical to the paisa. Any disagreement is the finding, named by which pair diverged.",
    expectedData: { totalsReconcile: true },
    endResult:
      "Two orders exist. This is the case that catches a re-derived fee anywhere in the chain.",
  },
  "checklist-buying-cart-addons-follow-cart-not-checkout-request": {
    roles: ["buyer"],
    startPage: "/cart",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! with items from two sellers.",
      "Tick gift wrap on the first seller only and note the fee.",
      "Go to checkout WITHOUT changing anything.",
      "Open browser DevTools and inspect the pricing and order requests.",
      "Check no add-on flags are present in the request bodies.",
      "Complete the order and read the fees recorded.",
      "Check they match the cart's per-store checkboxes exactly.",
    ],
    expectedBehaviour:
      "Add-on fees follow the cart document's per-store selections, never a request body. The old request flags were DELETED rather than kept alongside — two sources of truth for one charge is the drift itself, and a request body is client-controlled where the cart document is not.",
    expectedUiState:
      "No add-on flags appear in the request bodies. The recorded fees match the cart's checkboxes. A body carrying add-on flags is the finding even if the totals happen to agree today.",
    endResult: "Two orders exist with fees matching the cart.",
  },
};
