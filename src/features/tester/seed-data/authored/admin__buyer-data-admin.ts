/*
 * WHY: Authored six-part procedures for the admin/buyer-data-admin page.
 * WHAT: 12 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THIS PAGE IS BUYER DATA, so two questions run through every case: can the
 * admin READ a row before acting on it, and is more PII exposed than the task
 * needs. Several of these listings were dead ends — a row you could see and never
 * open — and two of them are dead ends for a legitimate reason: their list query
 * returns a per-user summary only, so the honest fix was to route to the owning
 * user rather than widen the payload.
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
  "checklist-admin-buyer-data-admin-carts-admin-view": {
    roles: ["admin"],
    startPage: "/admin/carts",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin carts listing and read every column.",
      "Check each row identifies whose cart it is and how many items it holds.",
      "Read whether guest carts are distinguishable from signed-in ones.",
      "Use every filter and sort offered, confirming each changes the rows.",
      "Search zzzznope and read the count.",
    ],
    inputs: { nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "The list identifies each cart and its size. A cart document is keyed on the user id for signed-in buyers and on a session id for guests, so both kinds appear and the row has to say which it is — an unattributed row is a cart nobody can act on.",
    expectedUiState:
      "Rows show an owner and an item count. Guest carts are marked as such rather than showing a blank owner. Filters and sorts change the rows and 'zzzznope' returns none.",
    expectedData: { nonsenseResultCount: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-buyer-data-admin-carts-admin-row-opens-items": {
    roles: ["admin"],
    startPage: "/admin/carts",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin carts listing and find a row whose item count is greater than one.",
      "Click the row and read what opens.",
      "Read whether the individual ITEMS are listed — titles, quantities, prices.",
      "Read the row action menu and check it offers a view rather than only mutations.",
      "Close and try opening a different row the same way.",
    ],
    expectedBehaviour:
      "A row opens to show the cart's items. The list already computes the item count from the items array and then discards it, so the data needed to render the detail is present at list time — this is a UI wiring gap rather than a missing query, and the fix is a detail view rather than a wider payload.",
    expectedUiState:
      "Clicking a row opens a detail showing each item with its title, quantity and price. A row that offers only actions, or does nothing on click, is the dead-end failure this page family exists to close.",
    endResult: "Read-only; close without acting.",
  },
  "checklist-admin-buyer-data-admin-wishlists-admin-view": {
    roles: ["admin"],
    startPage: "/admin/wishlists",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin wishlists listing and read every column.",
      "Check each row names the owning user and the number of items.",
      "Read whether the item titles themselves are shown in the list.",
      "Use every filter and sort offered.",
      "Search zzzznope and read the count.",
    ],
    inputs: { nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "One wishlist exists per user, so the list is one row per owner with a count. The list query deliberately returns a per-user SUMMARY rather than every item — widening it to carry each wishlist's contents would load unbounded data on a page that only needs counts.",
    expectedUiState:
      "Rows name the owner and the item count. Item titles are not expected in the list itself. Filters change the rows and 'zzzznope' returns none.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-buyer-data-admin-wishlists-history-admin-row-opens-user": {
    roles: ["admin"],
    startPage: "/admin/wishlists",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin wishlists listing and click a row.",
      "Read where it lands.",
      "Check whether it opens the owning USER rather than a wishlist detail.",
      "Go back, open the admin history listing, and click a row there.",
      "Read where that lands.",
      "From the user page reached, check the wishlist or history is readable in context.",
    ],
    expectedBehaviour:
      "These two rows route to the owning user rather than to a per-record detail, and that is the correct answer rather than a shortcut: their list queries return only a per-user summary, so a detail view would have to fetch separately, and the user page is where the rest of that person's data already is.",
    expectedUiState:
      "Both rows open the owning user's admin page. Neither is inert. From there the wishlist or history contents are reachable. A row that does nothing at all is the failure; a row routing to the user is a pass.",
    endResult: "Read-only; close without acting.",
  },
  "checklist-admin-buyer-data-admin-history-admin-view": {
    roles: ["admin"],
    startPage: "/admin/history",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin browsing-history listing and read every column.",
      "Check each row names the owning user and the number of entries.",
      "Read the highest entry count in the list.",
      "Use every filter and sort offered.",
      "Search zzzznope and read the count.",
    ],
    inputs: { nonsenseQuery: "zzzznope", historyCap: 50 },
    expectedBehaviour:
      "History is one document per user, capped at fifty entries with the oldest silently evicted. So no row should report more than fifty — a higher count means the cap is not being applied on write and the document grows without bound.",
    expectedUiState:
      "Rows name the owner and an entry count, and no count exceeds fifty. Filters change the rows and 'zzzznope' returns none.",
    expectedData: { maxEntryCount: 50 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-buyer-data-admin-notifications-admin-view": {
    roles: ["admin"],
    startPage: "/admin/notifications",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin notifications listing and read every column.",
      "Read every type filter offered and select each, noting any that returns nothing.",
      "For each empty filter, check the unfiltered list for rows of that type.",
      "Open a row's view action and read the full body and payload.",
      "Read whether the recipient is identified.",
      "Search zzzznope and read the count.",
    ],
    inputs: { nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "Every type chip names a value notifications actually carry. The type union is a single runtime list, and for a long time the filters were built from a nine-value copy while twenty-seven types existed — eighteen were unfilterable and two could not be allow-listed for any channel at all.",
    expectedUiState:
      "Every type filter returns its own rows or is empty with none unfiltered either. A row opens to show the full body and payload rather than only the title. 'zzzznope' returns none.",
    expectedData: { nonsenseResultCount: 0 },
    endResult:
      "Read-only. A chip empty while matching rows sit unfiltered is the finding, named by type.",
  },
  "checklist-admin-buyer-data-admin-reviews-admin-view": {
    roles: ["admin"],
    startPage: "/admin/reviews",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/reviews and read every column, including any review images.",
      "Check each image tile renders rather than showing a placeholder icon.",
      "Read the search box's placeholder for how it matches.",
      "Type a reviewer's FULL name and read the results.",
      "Type only the first half and read the results.",
      "Search zzzznope and read the count.",
      "Open a review and read its full body, rating and any seller response.",
    ],
    inputs: { nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "Reviewer names are PII-encrypted at rest, so they match exactly through a blind index and a partial cannot match — by design rather than omission, which is why the box must SAY so. Review images are stored as plain URL strings; a renderer expecting objects reads undefined off each and falls back to a placeholder, which makes every review photo vanish at once.",
    expectedUiState:
      "Image tiles render real photos rather than placeholder icons. The full name returns rows, the partial returns none, and the box states that matching is exact. 'zzzznope' returns none.",
    expectedData: { partialMatchCount: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-buyer-data-admin-store-addresses-admin": {
    roles: ["admin"],
    startPage: "/admin/addresses",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin addresses listing and read every column.",
      "Read whether store pickup addresses and buyer delivery addresses are distinguishable.",
      "Use any owner-type filter and confirm it separates the two.",
      "Read how names and phone numbers are displayed.",
      "Read the sort dropdown's default and check it is one of the offered options.",
      "Search zzzznope and read the count.",
    ],
    inputs: { nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "Both kinds live in one collection discriminated by owner type, so the list must show which is which. Names, phones and street lines are PII-encrypted at rest — how much this list decrypts and displays is worth recording rather than assuming. A default sort that is not among the offered options opens the dropdown with nothing selected, which this listing family has done before.",
    expectedUiState:
      "Rows identify their owner type and an owner-type filter separates them. The sort default is one of the options. 'zzzznope' returns none. Record exactly how much of each name and phone is shown.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-buyer-data-admin-store-addresses-admin-row-opens-detail": {
    roles: ["admin"],
    startPage: "/admin/addresses",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin addresses listing and click a store-owned row.",
      "Read what opens and whether every field is shown, including the landmark.",
      "Go back and click a buyer-owned row.",
      "Read what opens there.",
      "Check the row action menu offers a view rather than only mutations.",
    ],
    expectedBehaviour:
      "A row opens to its full detail for both owner types. The landmark is the field worth naming: a form that cannot express it sends undefined and overwrites, so a detail view that never shows it hides whether the value survived.",
    expectedUiState:
      "Both kinds open to a detail showing every stored field, landmark included. A view affordance exists alongside any actions. A row offering only Delete is a dead end.",
    endResult: "Read-only; close without acting.",
  },
  "checklist-admin-buyer-data-admin-addresses-crud-admin": {
    roles: ["admin"],
    startPage: "/admin/addresses",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin addresses listing and create one: 'QA Address admin-crud', '13 Test Lane', Indore, Madhya Pradesh, 452010, landmark 'Beside the arena'.",
      "Save, RELOAD, and read every field including the landmark.",
      "Edit ONLY the street to '14 Test Lane', save, RELOAD, and read every field again.",
      "Type abcdef into the postal code field and attempt to save.",
      "Read where the error appears.",
      "Delete the address and RELOAD to confirm.",
    ],
    inputs: {
      name: "QA Address admin-crud",
      streetBefore: "13 Test Lane",
      streetAfter: "14 Test Lane",
      landmark: "Beside the arena",
      badPostcode: "abcdef",
    },
    expectedBehaviour:
      "Create, edit and delete persist and an edit to one field leaves the rest alone. The postal code is validated by FORMAT rather than by length: a length-only rule accepts 'abcdef' as a valid six-character Indian PIN code, and one admin route did exactly that.",
    expectedUiState:
      "After each reload every value holds, including the landmark after the street edit. 'abcdef' is rejected on the postal code field before any request is sent, not returned as a server error with nothing marked.",
    endResult: "The address is deleted by the final step.",
  },
  "checklist-admin-buyer-data-admin-stores-admin-view": {
    roles: ["admin"],
    startPage: "/admin/stores",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/stores and read every column and status chip.",
      "Select each status chip in turn and read the rows returned.",
      "Note whether the pending and suspended chips return anything.",
      "Open a verified store's editor, change ONE unrelated field such as its description, and save.",
      "RELOAD and read whether it is still verified, still featured, and whether its capabilities are unchanged.",
      "Restore the description.",
    ],
    expectedBehaviour:
      "🛑 This is the highest-severity case on the page. The list serializer once omitted the verified, featured, capabilities and notes fields, so the editor seeded them as undefined and the save handler sent those defaults back unconditionally — saving ANY unrelated field silently un-verified the store and reset its capabilities. The seed carries a pending and a suspended store precisely so those chips are not permanently empty.",
    expectedUiState:
      "Every status chip returns rows or is genuinely empty. After the description save and reload the store is STILL verified, still featured, and its capabilities are unchanged. A store that quietly lost its verified badge is the failure, and the save reported success.",
    expectedData: { verifiedPreserved: true },
    endResult:
      "The description is restored and the store's flags are as they were. Re-read every flag after the reload, not just the one that was edited.",
  },
  "checklist-admin-buyer-data-admin-admin-store-detail-page": {
    roles: ["admin"],
    startPage: "/admin/stores",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/stores and open a store's detail panel from the list.",
      "Write down every field label it shows.",
      "Note the store id and close the panel.",
      "Open that store's standalone admin detail page directly by URL.",
      "Write down every field label and compare the two lists.",
      "Reload the standalone page and confirm it loads the same store.",
      "Read whether the store's WhatsApp access token appears anywhere on either surface.",
    ],
    expectedBehaviour:
      "The panel and the page render from one shared content component, so their fields match by construction. The store document's WhatsApp token is decrypted on every read, so any surface that does not deliberately project it is handling plaintext — an admin page is allowed to show more than a public one, but not the raw credential.",
    expectedUiState:
      "Both surfaces show the same fields and the standalone page survives a reload. The access token is masked or absent on both. A field in one and not the other means a second copy of the content component has appeared.",
    expectedData: { rawTokenShown: 0 },
    endResult: "Read-only; nothing persists.",
  },
};
