/*
 * WHY: Authored six-part procedures for the buying/user-dashboard-extras page.
 * WHAT: 15 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 SIX CASES HERE ARE ABOUT THE ORDER TIMELINE, and they turn on two rules that
 * are easy to get backwards.
 *
 * A step with no recorded date renders an em-dash. Not the current time, and not
 * a proxy field — the record's last-updated value means "last write of any kind"
 * and an expiry date is a deadline, not an event. A fabricated timestamp cannot be
 * told from a real one afterwards, which makes it worse than a missing one.
 *
 * And money churn is deliberately NOT in the timeline. Only the final coupon and
 * add-on state is kept, on the order itself. A coupon that lapsed before the order
 * existed is not that order's history, and pricing noise would exhaust the
 * fifty-entry cap within days and bury the handful of transitions anyone reads.
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
  "checklist-buying-user-dashboard-extras-addresses-crud": {
    roles: ["buyer"],
    startPage: "/user/addresses",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/addresses and read the existing addresses.",
      "Create one: 'QA Address dashboard-extras', '15 Test Lane', Indore, Madhya Pradesh, 452010, landmark 'Opposite the arena'.",
      "Save, RELOAD, and read every field including the landmark.",
      "Edit ONLY the street to '16 Test Lane', save, RELOAD, and read every field again.",
      "Set it as the default, save, RELOAD, and check exactly one address is default.",
      "Delete it and RELOAD to confirm.",
    ],
    inputs: {
      name: "QA Address dashboard-extras",
      streetBefore: "15 Test Lane",
      streetAfter: "16 Test Lane",
      landmark: "Opposite the arena",
    },
    expectedBehaviour:
      "Create, edit, default-set and delete all persist, and an edit to one field leaves the rest alone. Setting a default must unset the previous one — two defaults is a state nothing downstream can resolve. The landmark is the field to watch: a form that cannot name it sends undefined, and undefined overwrites.",
    expectedUiState:
      "After each reload the address holds exactly what was typed, landmark included, and after the street edit the landmark is still there. Exactly one address is marked default.",
    expectedData: { defaultAddressCount: 1 },
    endResult: "The address is deleted by the final step.",
  },
  "checklist-buying-user-dashboard-extras-catalogue-crud": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open the personal catalogue surface and read the existing items.",
      "Create one titled 'QA Catalogue dashboard-extras' with a description and public/test-media/sample-image.png attached.",
      "Save, RELOAD, and read every field including the photo.",
      "Set it to public, save, and open /profile/user-yugi-muto in a private window.",
      "Find it under the Catalogue tab and open its own public page.",
      "Set it back to private and check it disappears from the public profile.",
      "Delete the item.",
    ],
    inputs: {
      title: "QA Catalogue dashboard-extras",
      image: "public/test-media/sample-image.png",
    },
    expectedBehaviour:
      "A personal catalogue item is a private photo record of something the buyer owns, optionally published. It is NOT a listing type — it lives in its own feature with its own id prefix, and its public visibility is a per-item choice rather than a consequence of creating it.",
    expectedUiState:
      "After the reload every field holds and the photo renders. Set public, the item appears on the owner's public profile Catalogue tab and has its own page. Set private, it disappears from the public profile.",
    endResult: "The item is deleted by the final step.",
  },
  "checklist-buying-user-dashboard-extras-settings-page": {
    roles: ["buyer"],
    startPage: "/user/settings",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/settings and read every tab in the strip.",
      "Open each tab and check it renders its fields rather than an empty panel.",
      "Note one distinctive value from each tab.",
      "Change one field on one tab and save.",
      "RELOAD and walk every tab, comparing each noted value.",
      "Restore the changed field.",
    ],
    expectedBehaviour:
      "Every tab renders, and saving one tab leaves the others untouched. A form that submits its whole object from state populated only by the tabs the user opened blanks the rest — and the save reports success either way, so only the reload shows it.",
    expectedUiState:
      "All tabs render fields. After the reload only the edited field differs and every other noted value is unchanged. A tab that opens empty, or a value silently reset, are both findings.",
    expectedData: { unintendedFieldChanges: 0 },
    endResult: "The changed field is restored.",
  },
  "checklist-buying-user-dashboard-extras-my-prize-draws": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open the buyer's prize-draws surface and read every row.",
      "Check each names the draw, the number of entries bought and the outcome.",
      "Find an entry in a REVEALED draw and read the prize it names.",
      "Find an entry in a draw that has not yet been drawn and read what it shows.",
      "Open one entry and check it reaches the draw or the order behind it.",
      "Compare a revealed prize against the same prize on the order page.",
    ],
    expectedBehaviour:
      "The list shows what was entered and what came of it. A pending draw and a revealed one are different states and must read differently — a pending entry shown as though it lost, or a revealed one shown as pending, are both wrong and neither errors.",
    expectedUiState:
      "Rows name the draw, the entry count and either the assigned prize or a pending state. The prize matches what the order page shows. Rows open something rather than being inert.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-user-dashboard-extras-my-digital-codes": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open the buyer's digital-codes surface and read every row.",
      "Check each names the listing it came from and shows its code or its delivery state.",
      "Find an auto-claim purchase and read whether its code is present.",
      "Find a manual-delivery purchase and read what it shows instead.",
      "Use any copy control and paste the result somewhere to compare it against what is displayed.",
      "Reload and check the codes are still there.",
    ],
    expectedBehaviour:
      "An auto-claim purchase shows its delivered code immediately; a manual-delivery one shows a pending state until the seller sends it. Any copy control must place exactly the displayed string on the clipboard — a truncated or differently-cased copy produces a redemption failure the buyer cannot explain.",
    expectedUiState:
      "Auto-claim rows show a real code that survives a reload. Manual rows show a pending state rather than an empty cell. The copied value matches the displayed one character for character.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-user-dashboard-extras-my-offers": {
    roles: ["buyer"],
    startPage: "/user/offers",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Open /user/offers and read every row — product, offered amount, listed price, status and round.",
      "Read every status filter offered and select each, noting any that returns nothing.",
      "For each empty filter, check the unfiltered list for rows of that status.",
      "Find an offer that was countered and read how its round is shown.",
      "Open one offer and read its detail.",
      "Check at least one row action is a view rather than only a mutation.",
    ],
    expectedBehaviour:
      "The list shows the negotiation state with enough context to act — the offered amount against the listed price is the whole point. A counter creates a NEW offer document per round, linked forwards and backwards and denormalised to the chain's root, so a row can say which round it is without extra reads.",
    expectedUiState:
      "Rows show product, amounts, status and round. Every status filter returns its own rows or is empty with none unfiltered either — the real statuses include countered and withdrawn, and a chip reading 'Rejected' against a stored 'Declined' matches nothing forever. A view affordance exists.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-buying-user-dashboard-extras-order-timeline-shows-real-events": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/orders and open an order that has moved through several statuses.",
      "Open its timeline and read every step in order.",
      "Read the date and time against each step.",
      "Check the steps the order has NOT reached are shown as upcoming rather than complete.",
      "Check any step with no recorded date shows an em-dash rather than a date.",
      "Compare one step's date against when that transition actually happened.",
    ],
    expectedBehaviour:
      "The timeline is built from the order's own recorded per-status dates. A step with no date renders an em-dash — never the current time, and never a proxy such as the record's last-updated value, which means 'last write of any kind' rather than when the step happened.",
    expectedUiState:
      "Reached steps carry real dates, unreached steps read as upcoming, and any missing date is an em-dash. Every step carrying a plausible date on a recently-placed order is the fabrication failure, and it is indistinguishable from correct data afterwards.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-user-dashboard-extras-order-partial-refund-in-timeline": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/orders and find an order that received a partial refund.",
      "Open its timeline and look for an entry describing the refund.",
      "Read whether the entry states the amount refunded.",
      "Check the entry is not phrased as an array or a count changing.",
      "Compare the refunded amount against the order's own refund total.",
    ],
    expectedBehaviour:
      "A partial refund changes no tracked status field, so a plain field-diff would leave no trace of it at all — the entry is contributed explicitly. Diffing the refunds collection instead was rejected because it renders as 'an array of one became an array of two', which is true and useless.",
    expectedUiState:
      "The timeline holds an entry naming the refund and its amount, in readable language. An entry describing a list growing, or no entry at all for a refund that demonstrably happened, are both failures.",
    endResult:
      "Read-only. If no partially-refunded order exists, answer null rather than creating one.",
  },
  "checklist-buying-user-dashboard-extras-order-auction-won-vs-bought-out": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/orders and switch to the Auction wins tab.",
      "Open an order that came from a WON auction and read what it says about how it was won.",
      "Read whether it shows the winning bid and the number of competing bids.",
      "Open an order that came from a BUY-NOW purchase on an auction and read the same.",
      "Compare the two — check they are described differently.",
      "Check the buy-now order's bid count is not assumed to be zero.",
    ],
    expectedBehaviour:
      "A settled win and a buyout are both auction orders but different provenance, and the order records which. A buyout is a REAL bid: it is placed as a bid, leaves the auction live, and the count it records is the competitive bids it beat — so a buyout order asserting zero bids by definition is wrong.",
    expectedUiState:
      "The won order names the winning bid and the competing bid count. The buy-now order is described as a buyout rather than as a win, and its bid count reflects the bids that existed rather than being fixed at zero.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-user-dashboard-extras-order-offer-shows-what-was-saved": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Open /user/orders and switch to the Offer wins tab.",
      "Open an order that came from an accepted offer.",
      "Read the price charged and the listing's original price.",
      "Check the order states what was saved rather than only the amount paid.",
      "Compare the charged price against the offer's agreed amount.",
    ],
    expectedBehaviour:
      "An offer order records the agreed price and the listed price it was negotiated down from. The charged figure must be the AGREED one — the rule that decides a line's price knows about locked prices, and three hand-written copies of that rule elsewhere omitted that branch, so the gateway captured the list price while the cart showed the agreed one.",
    expectedUiState:
      "The order shows the agreed price as charged, the original listed price, and the difference. A charged amount equal to the listing price is the copied-rule failure, and the two figures never appear on the same screen anywhere else.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-user-dashboard-extras-order-history-no-money-churn": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open an order that had coupons applied and add-ons selected.",
      "Open its timeline and read every entry.",
      "Look for entries describing coupons being applied or removed, or add-on fees changing.",
      "Count the entries in total.",
      "Read the order's own summary and check the final coupon and add-on state is shown there instead.",
    ],
    expectedBehaviour:
      "Pricing churn is deliberately absent from the timeline. Only the FINAL coupon and add-on state is kept, and it lives on the order itself — a coupon that lapsed before the order existed is not that order's history, and pricing noise would exhaust the fifty-entry cap within days and bury the handful of transitions anyone actually reads.",
    expectedUiState:
      "The timeline holds status transitions and refunds, and no entries about coupons being applied or removed. The order's summary shows the final applied discounts and add-ons. A timeline full of pricing entries is the failure.",
    expectedData: { pricingEntriesInTimeline: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-user-dashboard-extras-order-history-carries-no-personal-data": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open an order and open its timeline.",
      "Read every entry for a name, an email address or a phone number.",
      "Read how the actor of each change is identified.",
      "Open the browser's View Source and search the page for an email address.",
      "Check any actor shown is an identifier rather than a person's name.",
    ],
    expectedBehaviour:
      "History entries carry no personal data, and this is enforced where the entry is built rather than by convention. The encryption pass is a flat top-level loop that never descends into arrays — so a name or email nested inside a history entry would be stored in PLAINTEXT and never decrypted on the way out, which is why the primitive scrubs those fields itself.",
    expectedUiState:
      "No entry contains a name, email or phone. Actors are identifiers. Neither the rendered timeline nor the page source contains an email address.",
    expectedData: { piiInTimeline: 0 },
    endResult:
      "Read-only. A convention saying 'do not put PII in history' is one forgetful writer away from a plaintext leak, which is why this is checked rather than assumed.",
  },
  "checklist-buying-user-dashboard-extras-my-returns": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open the buyer's returns surface and read every row.",
      "Check each names the item, the order and the reason given.",
      "Read every status filter offered and select each.",
      "Open one return and read the full reason and any admin response.",
      "Check the returned order also appears under the ACTIVE scope on /user/orders.",
    ],
    expectedBehaviour:
      "Returns are a view over orders rather than a separate entity — a return is an order status. That is why a return-requested order sits under Active on the orders list: it is an open item awaiting action, and filing it under Closed removes it from the list the buyer checks.",
    expectedUiState:
      "Rows name the item, the order and the reason, and open to the full text. The same order appears under Active on /user/orders. A return-requested order under Closed is the finding.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-buying-user-dashboard-extras-my-reviews": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open the buyer's reviews surface and read every row.",
      "Check each names the product, the rating and the date.",
      "Check any review photos render rather than showing placeholder icons.",
      "Open one and check it can be edited.",
      "Read whether any seller response is shown alongside.",
      "Click a row and confirm it reaches the product or the review.",
    ],
    expectedBehaviour:
      "The buyer's own reviews are listed with their photos and any seller response. Review images are plain URL strings — a renderer expecting objects reads undefined off every one and falls back to a placeholder, which makes all the photos vanish at once rather than one being broken.",
    expectedUiState:
      "Rows name the product, rating and date, photos render, and any seller response is visible. Rows reach the product or the review. Placeholder icons in place of every photo is the string-versus-object failure.",
    expectedData: { placeholderPhotos: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-user-dashboard-extras-user-personal-listings-search-sort": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open the personal catalogue surface and note the unfiltered item count.",
      "Type a word from one item's title into the search box and read the results.",
      "Clear it, type zzzznope, and read the count.",
      "Read the sort dropdown's options and its default selection.",
      "Check the default is one of the offered options.",
      "Select each other option and check the order changes each time.",
    ],
    inputs: { nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "Search narrows and every sort option reorders. The nonsense query is the control that separates a filtering search from a decorative one — a real term returns plausible rows either way. A default sort that is not among the offered options opens the dropdown blank, which this listing family has done before.",
    expectedUiState:
      "The real term narrows the list; 'zzzznope' returns zero and an empty state rather than everything. The sort dropdown opens with one of its own options selected, and each option visibly reorders the items.",
    expectedData: { nonsenseResultCount: 0, inertSortOptions: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
};
