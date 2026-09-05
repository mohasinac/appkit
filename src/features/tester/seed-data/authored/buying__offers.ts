/*
 * WHY: Authored six-part procedures for the buying/offers checklist page.
 * WHAT: 66 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THIS PAGE IS NOT ONLY ABOUT OFFERS. Its label set spans the offer lifecycle,
 * the shared status-history primitive, the form-bar tier, validation across six
 * editors, and the bid-detail portals. They sit together because they landed in
 * one wave, and splitting them now would break every checklist id.
 *
 * 🛑 THE OFFER CHAIN IS THE SPINE. A counter creates a NEW offer document per
 * round, linked backwards and forwards and denormalised to the chain's root so a
 * row can say "Round 2" with no extra reads. `superseded` is a RENDER KEY, never a
 * status: a withdrawn offer carrying a supersededBy link reads neutral, one
 * without reads negative. Making it an eighth status would add a filter chip
 * matching zero stored rows.
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
  "checklist-buying-offers-make-offer": {
    roles: ["buyer", "seller"],
    startPage: "/products/product-beyblade-original-driger-v",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Open /products/product-beyblade-original-driger-v, listed at ₹1,799.",
      "Click 'Make Offer' and type 1450 as the amount and 'QA Offer make-offer' as the note.",
      "Submit and read the confirmation.",
      "Open /user/offers and find the offer.",
      "Sign out and sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store and read the notification list for a new-offer entry.",
    ],
    inputs: { productId: "product-beyblade-original-driger-v", listedPrice: 1799, offerAmount: 1450 },
    expectedBehaviour:
      "The offer is created against the product and its store, and the seller is notified. The notification's audience is a property of the EVENT rather than the person — the same account is a buyer elsewhere, so it must land in the store portal.",
    expectedUiState:
      "The offer appears in /user/offers at ₹1,450 against a listed ₹1,799. The seller's notification names the offer and opens the store's offers list rather than the buyer's.",
    endResult: "One pending offer exists; later cases read it.",
  },
  "checklist-buying-offers-seller-sees-and-can-act-on-offers": {
    roles: ["seller"],
    startPage: "/store/offers",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/offers and find the QA Offer make-offer entry.",
      "Read the row — product, offered amount, listed price, status and round.",
      "Open the row action menu and read every action offered.",
      "Use Counter, then cancel out of the form without submitting.",
      "Use Decline on a DIFFERENT pending offer and read what happens.",
      "Reload and read that offer's status.",
    ],
    expectedBehaviour:
      "The seller's list shows incoming offers with the context needed to decide, and Accept, Decline and Counter all act. The store keeps sole authority over its own pricing — this is the surface where that authority lives.",
    expectedUiState:
      "Rows show product, amounts, status and round. All three actions are present and act. The declined offer reads as declined after the reload.",
    endResult: "One offer is declined; QA Offer make-offer is untouched.",
  },
  "checklist-buying-offers-buyer-sees-offer-status-changes": {
    roles: ["buyer", "seller"],
    startPage: "/user/offers",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123! and open /user/offers, noting the QA offer's status.",
      "Sign out and sign in as tyson@beybladearena.in / TempPass123!.",
      "Counter that offer at 1600 with a note and submit.",
      "Sign back in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Open /user/offers and read the offer's status and amount.",
      "Read whether the seller's note is shown.",
      "Check the notification list for an offer-responded entry.",
    ],
    inputs: { counterAmount: 1600 },
    expectedBehaviour:
      "The buyer sees the seller's response and its note. A counter creates a new round rather than editing the original, so the buyer's list must show the current round rather than the amount they first offered.",
    expectedUiState:
      "The buyer's list shows the countered state at ₹1,600 with the seller's note, and a notification points back to the offers list.",
    endResult: "The offer is at round 2, countered by the seller.",
  },
  "checklist-buying-offers-offer-seller-can-read-before-acting": {
    roles: ["seller"],
    startPage: "/store/offers",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/offers and find a pending offer.",
      "WITHOUT using Accept, Decline or Counter, find a way to open its details.",
      "Read the buyer's note, the listed price, the offered amount and the round.",
      "Read any earlier rounds in the same negotiation.",
      "Return to the list and check the same is reachable from the row.",
    ],
    expectedBehaviour:
      "The seller reads the offer before deciding on it. A row of pure mutations lets a seller accept a price without seeing the note explaining it — the same acting-blind shape as the moderation queues.",
    expectedUiState:
      "A view panel opens showing the note, both prices, the round and any earlier rounds, before any action is taken.",
    endResult: "Read-only; decide nothing.",
  },
  "checklist-buying-offers-counter-offer-has-a-form": {
    roles: ["seller"],
    startPage: "/store/offers",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/offers and choose Counter on a pending offer.",
      "Read what opens.",
      "Check it asks for an amount rather than being a bare confirmation.",
      "Submit with the amount empty and read where the error appears.",
      "Type an amount and a note, submit, and reload.",
    ],
    expectedBehaviour:
      "Countering requires an amount — a counter is a new price, and a confirmation dialog with no field cannot express one. The note is optional; the amount is not.",
    expectedUiState:
      "A form opens with an amount field and an optional note. The empty submit marks the amount field. The submitted counter appears as a new round.",
    endResult: "One offer has been countered.",
  },
  "checklist-buying-offers-offer-accept-checkout-charges-agreed-price": {
    roles: ["buyer", "seller"],
    startPage: "/store/offers",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123! and Accept the QA offer on product-beyblade-original-driger-v.",
      "Sign out and sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Open /cart and click the 'Accepted Offers' tab.",
      "Read the line's price and compare it against the listing's ₹1,799.",
      "Proceed to checkout and read the amount at every step, including the payment step.",
      "Place the order with Cash on Delivery.",
      "Open the order and read the price recorded.",
    ],
    inputs: { listedPrice: 1799, agreedPrice: 1450 },
    expectedBehaviour:
      "The agreed price is charged, everywhere. The rule that decides a line's price knows about locked prices — but three hand-written copies of that expression elsewhere reproduced only the bundle branch and omitted the locked one, so the gateway captured the LIST price while the cart showed the agreed one. The two figures never appear on the same screen.",
    expectedUiState:
      "The cart line, every checkout step, the payment amount and the recorded order all read ₹1,450. Any surface showing ₹1,799 is the copied-rule failure.",
    expectedData: { chargedPrice: 1450 },
    endResult: "One order exists at the agreed price.",
  },
  "checklist-buying-offers-offer-flips-to-paid-after-order": {
    roles: ["buyer"],
    startPage: "/user/offers",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Open /user/offers and read the status of the offer just paid for.",
      "Open /cart and check the Accepted Offers tab no longer holds that line.",
      "Try to reach checkout for that offer again.",
      "Reload /user/offers and read the status.",
      "Check the order links back to the offer.",
    ],
    expectedBehaviour:
      "Completing the order flips the offer to paid and clears its cart line. That terminal status had no server-side writer at all for a long time, so an accepted offer stayed re-orderable indefinitely — the buyer could check out the same negotiated price repeatedly.",
    expectedUiState:
      "The offer reads paid after the reload and its line is gone from the Accepted Offers tab. It cannot be added to the cart again.",
    expectedData: { offerStatus: "paid" },
    endResult: "The offer is terminal and cannot be re-ordered.",
  },
  "checklist-buying-offers-offer-expired-accepted-cannot-checkout": {
    roles: ["buyer"],
    startPage: "/user/offers",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/offers and find an accepted offer past its checkout deadline.",
      "Read its status and any deadline shown.",
      "Open /cart and check the Accepted Offers tab for that line.",
      "Attempt to check out from that lane.",
      "Read the notification list for an expiry entry.",
    ],
    expectedBehaviour:
      "An accepted offer lapses at its checkout deadline and its cart line is cleared. Clearing matters beyond tidiness: a leftover line keeps the offer lane non-empty, and that lane outranks the standard one, so the buyer's entire cart stays blocked.",
    expectedUiState:
      "The offer reads expired, the Accepted Offers tab is empty of it, and checkout is refused or unavailable for it. The buyer has an expiry notification.",
    endResult:
      "Read-only. If no lapsed offer exists, answer null rather than waiting out a deadline.",
  },
  "checklist-buying-offers-offer-history-timeline-renders": {
    roles: ["buyer"],
    startPage: "/user/offers",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Open /user/offers and open an offer that has changed status at least twice.",
      "Read its timeline from the top.",
      "Check each entry names what changed, who changed it and when.",
      "Check phases the offer has not reached render as upcoming.",
      "Check no entry contains a name or an email address.",
    ],
    expectedBehaviour:
      "Offers write history through one status choke point, so every transition is recorded with an actor and a trigger. The wrapper renders a KNOWN phase sequence — made, countered, accepted, paid — so unreached phases appear as upcoming rather than being absent.",
    expectedUiState:
      "Entries name the change, an actor role and a timestamp, in order. Unreached phases show as upcoming. No entry carries a personal name or email.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-offers-offer-history-legacy-no-fabricated-date": {
    roles: ["buyer"],
    startPage: "/user/offers",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Open /user/offers and find an offer created before history recording existed — one that already reads expired or declined.",
      "Open it and read its timeline.",
      "Check a timeline renders at all rather than an empty panel.",
      "Read the date against the Expired step specifically.",
      "Check it is an em-dash rather than a plausible date.",
    ],
    expectedBehaviour:
      "An offer with no recorded history still renders its phases, derived from the scalar dates it does have. A phase with no date shows an em-dash — not the current time, and not a proxy field: the record's updated stamp means 'last write of any kind' and the expiry field is a DEADLINE, not the moment it lapsed.",
    expectedUiState:
      "The timeline renders. The Expired step shows an em-dash rather than a date. A plausible timestamp here is the fabrication failure and cannot be told from a real one later.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-offers-offer-chain-walks-three-rounds": {
    roles: ["buyer", "seller"],
    startPage: "/products/product-beyblade-metal-storm-pegasus",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123! and make an offer of 1000 on product-beyblade-metal-storm-pegasus, listed at ₹1,299.",
      "Sign in as tyson@beybladearena.in / TempPass123! and counter at 1200.",
      "Sign back in as the buyer and counter again at 1100.",
      "Open that offer's detail and read the whole negotiation.",
      "Check the rounds read oldest first as ONE story.",
      "Read how rounds 1 and 2 are labelled.",
      "Check neither reads as Withdrawn.",
    ],
    inputs: { listedPrice: 1299, round1: 1000, round2: 1200, round3: 1100 },
    expectedBehaviour:
      "Each round is its own document, linked both ways and denormalised to the chain root. Superseded is a RENDER KEY rather than a status: a withdrawn offer carrying a supersededBy link reads neutral because the buyer countered rather than walking away. Making it an eighth status would add a filter chip matching zero stored rows.",
    expectedUiState:
      "Three rounds render oldest first as one negotiation. Rounds 1 and 2 read Superseded, not Withdrawn. Round 3 is the live one at ₹1,100.",
    expectedData: { roundCount: 3 },
    endResult:
      "A three-round chain exists. Withdraw or decline it afterwards.",
  },
  "checklist-buying-offers-offer-detail-opens-on-fresh-data": {
    roles: ["seller"],
    startPage: "/store/offers",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123! in window A and open /store/offers.",
      "In window B, sign in as the buyer and counter one of those offers.",
      "In window A, WITHOUT reloading the list, open that offer's detail.",
      "Read the amount and status shown.",
      "Compare against what window B just submitted.",
      "Reload window A's list and open it again.",
    ],
    expectedBehaviour:
      "Opening a row fetches that offer rather than rendering whatever the list last cached. A detail served from a stale list shows the seller a superseded amount, and accepting from that view accepts a price that no longer stands.",
    expectedUiState:
      "The detail shows the countered amount even though the list behind it is stale. A detail matching the stale list rather than the record is the failure.",
    endResult: "Read-only; accept nothing.",
  },
  "checklist-buying-offers-admin-offer-cancel-requires-reason": {
    roles: ["admin", "buyer"],
    startPage: "/admin/offers",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin offers surface and open a pending offer's row menu.",
      "Choose Cancel and submit with the reason empty.",
      "Type 'Too short' and submit.",
      "Type 'QA Cancel — cancelled by the tester checklist for review.' and submit.",
      "RELOAD and read the offer's status and its history.",
      "Sign in as the buyer and read their notification for the reason.",
      "Open /cart and check no locked line remains for that offer.",
    ],
    inputs: { reason: "QA Cancel — cancelled by the tester checklist for review." },
    expectedBehaviour:
      "Cancel is a reasoned escalation: the reason is required, recorded in both the audit log and the offer's own history, and quoted to the buyer. The handler must remove the cart line FIRST — a leftover locked line keeps the buyer's offer lane non-empty, and that lane outranks the standard one, so their whole cart stays blocked.",
    expectedUiState:
      "Empty and short reasons are refused on the field. After the reload the offer is cancelled with the reason in its history. The buyer's notification quotes it and their cart holds no line for it.",
    endResult: "One offer is cancelled with its reason recorded.",
  },
  "checklist-buying-offers-admin-cannot-accept-or-counter": {
    roles: ["admin"],
    startPage: "/admin/offers",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin offers surface and open a pending offer's row menu.",
      "Read every action offered and write the list down.",
      "Check for Accept, Counter or Decline.",
      "Select several rows and read any bulk action bar that appears.",
      "Read whether a bulk cancel is offered.",
    ],
    expectedBehaviour:
      "Admin is a coordinator, not a participant: only View and Cancel. The store keeps sole authority over its own pricing. There is deliberately no bulk cancel — one shared reason across a heterogeneous selection is worse audit data than none, and a registry-backed control that reads as working while doing nothing is worse than an absent one.",
    expectedUiState:
      "The menu offers View and Cancel only. No Accept, Counter or Decline. No bulk cancel appears — and if one does, it must actually act rather than only clearing the selection.",
    expectedData: { adminActions: 2 },
    endResult: "Read-only; act on nothing.",
  },
  "checklist-buying-offers-store-still-accepts": {
    roles: ["seller"],
    startPage: "/store/offers",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/offers and open a pending offer's row menu.",
      "Read every action offered.",
      "Check Accept, Counter and Decline are all present.",
      "Use Accept on one and reload.",
      "Read the offer's status and check the buyer's cart gains a line for it.",
    ],
    expectedBehaviour:
      "Adding an admin surface must not have removed the store's own actions. The seller retains Accept, Counter and Decline — an admin coordinating a dispute is a different capability from the seller deciding their own price.",
    expectedUiState:
      "All three actions are present and Accept works. The accepted offer reads accepted and produces a cart line in the buyer's offer lane.",
    endResult: "One offer is accepted.",
  },
  "checklist-buying-offers-nav-item-invalid-href-inline": {
    roles: ["admin"],
    startPage: "/admin/navigation",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/navigation and create a nav item labelled 'QA Nav invalid-href'.",
      "Type /this-page-does-not-exist-qa as its destination and save.",
      "Read where any error appears.",
      "Type not a url as the destination and save, reading where the error appears.",
      "Type /about and save.",
      "Delete the item.",
    ],
    inputs: { badHref: "/this-page-does-not-exist-qa", goodHref: "/about" },
    expectedBehaviour:
      "A bad destination is refused ON THE FIELD rather than by a banner. A nav entry pointing at nothing is a dead link on every page that renders the nav, and a banner leaves the admin guessing which field caused it.",
    expectedUiState:
      "Both bad destinations produce an error attached to the destination field. /about is accepted. A generic banner, or a silent save of a dead link, are both failures.",
    endResult: "The item is deleted by the final step.",
  },
  "checklist-buying-offers-homepage-section-invalid-config-inline": {
    roles: ["admin"],
    startPage: "/admin",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the homepage sections editor and start a new section.",
      "Type malformed JSON into its config field and save.",
      "Read where the error appears.",
      "Set the order to -1 and save, reading where that error appears.",
      "Correct both and save.",
      "Delete the section.",
    ],
    inputs: { badOrder: -1 },
    expectedBehaviour:
      "Malformed config and a negative order are both refused inline on their own fields. A saved section with unparseable config renders as nothing on the public homepage — and because each section fails silently to nothing by design, that is invisible rather than loud.",
    expectedUiState:
      "Both errors attach to their fields. The corrected section saves. A section that saves with bad config is the failure, and its symptom is a missing homepage row.",
    endResult: "The section is deleted by the final step.",
  },
  "checklist-buying-offers-classified-keeps-meetup-city": {
    roles: ["seller"],
    startPage: "/store/classified",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open a classified listing's editor and note its meetup city.",
      "Change ONLY the price and save.",
      "RELOAD and read the meetup city.",
      "Change the city to Pune, save, RELOAD, and read it.",
      "Open the public page and read the city there.",
      "Restore the original values.",
    ],
    inputs: { city: "Pune" },
    expectedBehaviour:
      "The meetup city survives an unrelated edit and reaches the public page. A form that cannot name a field sends undefined for it, and undefined overwrites — which is how a type-specific field disappears on every save that never touched it.",
    expectedUiState:
      "After the price edit the city is unchanged. The changed city persists and appears publicly. A blank city after an unrelated edit is the failure.",
    endResult: "The listing is restored.",
  },
  "checklist-buying-offers-live-item-keeps-species-and-cites": {
    roles: ["seller"],
    startPage: "/store/live",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open a live listing's editor and note its species, transport method, permitted jurisdictions and any CITES reference.",
      "Change ONLY the price and save.",
      "RELOAD and read all four fields.",
      "Change the jurisdiction list to a single region, save, RELOAD, and read it.",
      "Open the public page and read the restrictions shown.",
      "Restore the original values.",
    ],
    expectedBehaviour:
      "All four survive an unrelated edit. The jurisdiction list matters most: it gates who may lawfully receive the animal or plant, so a list that saves empty silently REMOVES the restriction rather than failing loudly — a safety consequence rather than a formatting one.",
    expectedUiState:
      "After the price edit all four fields are intact, jurisdictions included. The public page states the restriction. An emptied jurisdiction list is the finding.",
    endResult: "The listing is restored.",
  },
  "checklist-buying-offers-digital-code-keeps-delivery-method": {
    roles: ["seller"],
    startPage: "/store/digital-codes",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open a digital-code listing's editor and note its delivery method and pool size.",
      "Change ONLY the price and save.",
      "RELOAD and read both.",
      "Change the delivery method, save, RELOAD, and read it.",
      "Open the public page and read the availability shown.",
      "Restore the original values.",
    ],
    expectedBehaviour:
      "The delivery method and pool size survive an unrelated edit, and the public availability follows the NESTED pool count rather than a separate stock figure — a listing with stock remaining and an empty pool must read as unavailable.",
    expectedUiState:
      "After the price edit both fields are intact. The changed method persists. Public availability reflects the pool.",
    endResult: "The listing is restored.",
  },
  "checklist-buying-offers-prize-draw-keeps-entry-price": {
    roles: ["seller"],
    startPage: "/store/prize-draws",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open a prize draw's editor and note its price per entry and maximum entries.",
      "Change ONLY the title and save.",
      "RELOAD and read both figures.",
      "Change the per-entry price, save, RELOAD, and read it.",
      "Open the public page and read the per-entry price offered.",
      "Restore the original values.",
    ],
    expectedBehaviour:
      "The per-entry price and entry cap survive an unrelated edit and reach the public purchase panel. A per-entry price that silently reverts is a pricing error on a page where the buyer is agreeing to that exact figure.",
    expectedUiState:
      "After the title edit both figures are intact. The changed price persists and shows publicly as a per-entry price.",
    endResult: "The draw is restored.",
  },
  "checklist-buying-offers-per-type-fields-survive-EDIT-too": {
    roles: ["seller"],
    startPage: "/store/classified",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open a classified listing's editor and write down its meetup city, contact method and negotiable flag.",
      "Change ONLY the TITLE and save.",
      "RELOAD and read all three type-specific values.",
      "Repeat on a live listing: change only its title and re-read its species and jurisdictions.",
      "Repeat on a digital-code listing: change only its title and re-read its delivery method and pool.",
      "Repeat on a prize draw: change only its title and re-read its per-entry price.",
    ],
    expectedBehaviour:
      "A create-time fix does not cover the update path. Where the create handler applies a transform the update handler does not repeat, the listing saves correctly and then loses its per-type block the first time anyone edits something unrelated — so this case edits the one field every type has in common and re-reads the fields only that type has.",
    expectedUiState:
      "After each title-only edit, every type-specific value is unchanged on all four listing types. A per-type block emptied by a title edit is the failure, and it is invisible without the reload.",
    expectedData: { typeFieldsLostOnEdit: 0 },
    endResult:
      "All four listings keep their type-specific fields. Restore any title that was changed.",
  },
  "checklist-buying-offers-notification-email-is-a-real-email": {
    roles: ["buyer"],
    startPage: "/user/settings",
    steps: [
      "Sign in as an account whose inbox you can open and confirm order emails are on.",
      "Place an order to trigger a confirmation notification.",
      "Open the inbox and wait up to five minutes.",
      "Read the email's structure — heading, lead line and any button.",
      "Compare it against the in-app notification's one-line message.",
      "Click the button and read where it lands.",
    ],
    expectedBehaviour:
      "The email renders a per-type template rather than wrapping the one-line message in a bare paragraph. For a long time not one caller supplied email HTML, so every type shipped the same unstyled sentence — the template is now filled in by the dispatcher rather than by each caller.",
    expectedUiState:
      "The email has a heading, a lead line and a button, styled rather than plain. Its button opens the right page on the live site. A single bare paragraph is the failure.",
    endResult: "One order and one email exist.",
  },
  "checklist-buying-offers-notification-click-lands-on-the-right-page": {
    roles: ["buyer", "seller"],
    startPage: "/user/notifications",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Open /user/notifications and click an ORDER notification, reading where it lands.",
      "Go back and click an OFFER notification, reading where it lands.",
      "Go back and click a BID notification, reading where it lands.",
      "Sign out and sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's notifications and click an offer-received entry.",
      "Read which portal it opens.",
    ],
    expectedBehaviour:
      "The destination is resolved from the related record's type and id, and the AUDIENCE from the event. Bids, offers and reviews have no per-record page in any role, so those resolve to their list — a real destination, where a fabricated per-record URL would 404. A seller's offer-received notification opens the store portal even though that account is also a buyer.",
    expectedUiState:
      "The order notification opens that order. Offer and bid notifications open their lists. The seller's entry opens /store/offers rather than /user/offers. Nothing 404s.",
    expectedData: { notFoundCount: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-offers-admin-can-filter-every-notification-type": {
    roles: ["admin"],
    startPage: "/admin/notifications",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/notifications and read every type filter offered.",
      "Write the list down and count it.",
      "Compare against the full notification type list the system uses.",
      "Select each filter and note any returning nothing.",
      "For each empty one, check the unfiltered list for rows of that type.",
      "Look specifically for offer-received and payment-review among the filters.",
    ],
    expectedBehaviour:
      "Every real type is filterable and no invented one is offered. The filters were built from a nine-value copy of a twenty-seven-value union — eighteen types were unfilterable, and the copy that was PUBLIC was the seed factory's guess, which invented four types no notification has ever had.",
    expectedUiState:
      "The filter list matches the real union, including offer-received and payment-review. No filter names a type nothing produces. Each returns its own rows or is empty with none unfiltered either.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-buying-offers-admin-can-allowlist-every-type-per-channel": {
    roles: ["admin"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the notifications tab of Site Settings and read every type listed.",
      "Count them against the real type list.",
      "Find offer-received and allow-list it for email, then save.",
      "Find payment-review and do the same.",
      "RELOAD and check both settings held.",
      "Restore both to their original states.",
    ],
    expectedBehaviour:
      "Every type can be allow-listed per channel. Two types could not be configured for ANY channel because the allow-list was built from the short copy — so their emails were unreachable by configuration entirely.",
    expectedUiState:
      "Both types appear and can be allow-listed for email, and both settings survive the reload. A type absent from this tab cannot be configured at all.",
    endResult: "Both settings are restored.",
  },
  "checklist-buying-offers-notification-optout-is-honoured-for-emi-and-payment": {
    roles: ["buyer"],
    startPage: "/user/settings",
    steps: [
      "Sign in as an account whose inbox you can open.",
      "Open /user/settings, go to Notifications, and turn email OFF for order updates.",
      "Save and reload to confirm it held.",
      "Trigger an EMI-installment or payment-review notification for that account.",
      "Open /user/notifications and confirm the in-app entry arrived.",
      "Open the inbox and wait five minutes.",
      "Turn the setting back on.",
    ],
    expectedBehaviour:
      "The opt-out suppresses email and nothing else. It depends on a COMPLETE map from type to preference key — three types were missing, so the key was undefined, the opt-out check never ran, and mail kept arriving while the toggle read as honoured. EMI and payment-review were two of the three.",
    expectedUiState:
      "The in-app notification arrives. NO email arrives for it. An email arriving with the toggle off is the exact failure, and it is invisible from the settings page.",
    expectedData: { emailsReceived: 0 },
    endResult: "The preference is restored.",
  },
  "checklist-buying-offers-ticket-resolution-timestamp-stamped": {
    roles: ["admin"],
    startPage: "/admin/support",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin support tickets surface and open an open ticket.",
      "Note the current time.",
      "Resolve it with a closing message.",
      "RELOAD and read the resolved timestamp shown.",
      "Compare it against when the action was taken.",
      "Read the ticket's history and check the transition names an actor.",
    ],
    expectedBehaviour:
      "Resolving stamps a real timestamp at the moment of the action, recorded through the ticket's own status choke point with an actor. A status change that records no time leaves nothing to measure response times against.",
    expectedUiState:
      "The resolved timestamp matches when the action was taken, and the history entry names the acting admin. A missing timestamp, or the record's generic updated stamp reused as one, are both failures.",
    endResult: "One ticket is resolved.",
  },
  "checklist-buying-offers-payout-utr-actually-saves": {
    roles: ["admin"],
    startPage: "/admin/payouts",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/payouts and open a pending payout.",
      "Mark it paid, typing QAUTR118427 as the transaction reference.",
      "Read the confirmation.",
      "RELOAD the payout and read the reference.",
      "Open its history and check the transition is recorded with the actor.",
      "Check /admin/audit-log holds an entry for the payout being marked paid.",
    ],
    inputs: { utr: "QAUTR118427" },
    expectedBehaviour:
      "The reference is stored with the status change, recorded in the payout's history and in the audit log. Marking a payout paid is one of the instrumented privileged actions — a status that moves while the reference is dropped leaves no way to reconcile the transfer.",
    expectedUiState:
      "After the reload the payout reads paid and holds QAUTR118427. Its history names the actor and the audit log carries a matching entry.",
    expectedData: { utr: "QAUTR118427" },
    endResult: "One payout is marked paid with its reference.",
  },
  "checklist-buying-offers-store-approval-makes-it-public": {
    roles: ["admin", "guest"],
    startPage: "/admin/stores",
    steps: [
      "Open /stores in a private window and confirm store-blader-bazaar is NOT listed.",
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/stores, find that pending store, and approve it.",
      "RELOAD and read its status.",
      "Open /stores in the private window and look for it.",
      "Open its own store page and check it renders.",
      "Set it back to pending and confirm it disappears from /stores.",
    ],
    inputs: { storeId: "store-blader-bazaar" },
    expectedBehaviour:
      "Approval flips BOTH the store's own status and its public flag. Public visibility checks read the store's status, so flipping only the user's seller status leaves the seller with a working dashboard and a store nothing public can see.",
    expectedUiState:
      "The store appears on /stores after approval and its page renders. Reverting removes it. A store approved in the admin but absent from /stores is the half-flip failure.",
    endResult: "The store is returned to pending.",
  },
  "checklist-buying-offers-store-timeline-shows-who-suspended": {
    roles: ["admin"],
    startPage: "/admin/stores",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/stores and find store-vintage-vault-co, which is suspended.",
      "Open its detail and read its status history.",
      "Check the suspension entry names who did it, when, and the reason.",
      "Suspend a different store with a reason, then reload and read its history.",
      "Restore that store's original status and check the history keeps BOTH transitions.",
    ],
    inputs: { storeId: "store-vintage-vault-co" },
    expectedBehaviour:
      "Store status changes are recorded through the repository's own status writer, so who, when and why are all captured. Restoring the status appends a second entry rather than replacing the first — a history that only shows the current state is not a history.",
    expectedUiState:
      "The suspension entry names an actor, a timestamp and a reason. After restoring, both transitions are listed in order.",
    endResult: "The second store is back to its original status, with both entries recorded.",
  },
  "checklist-buying-offers-payout-failure-reasons-survive-retries": {
    roles: ["admin"],
    startPage: "/admin/payouts",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/payouts and find a payout that has failed more than once.",
      "Open its history and read every entry.",
      "Check BOTH failure reasons are present rather than only the most recent.",
      "Check the pending-to-processing transitions are also recorded.",
      "Count the entries against the number of attempts.",
    ],
    expectedBehaviour:
      "Batch payout writes thread a RUNNING copy of the record rather than the original snapshot. Diffing the last write against the first snapshot loses everything in between — a pending, processing, failed sequence would record only the final state and the dispatch attempt would vanish.",
    expectedUiState:
      "Every attempt appears with its own reason, oldest first, including the intermediate processing transitions. Only the latest reason showing is the snapshot-diff failure.",
    endResult:
      "Read-only. If no twice-failed payout exists, answer null rather than forcing a failure.",
  },
  "checklist-buying-offers-bid-timeline-explains-forfeited": {
    roles: ["buyer"],
    startPage: "/user/bids",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/bids and find a forfeited bid.",
      "Open its detail and read its history.",
      "Check an entry explains WHY it was forfeited rather than only that it was.",
      "Read whether the entry names the deadline that passed.",
      "Check the bid's status reads forfeited rather than simply lost.",
    ],
    expectedBehaviour:
      "A forfeited bid records the reason. Bid history is written through batch mutators that accept either a bare reference or a reference-plus-data pair — deliberately widened rather than made mandatory, because forcing a read per losing bid would push a large auction's settlement over the read budget.",
    expectedUiState:
      "The history explains the forfeiture and names the missed deadline. A bare status with no explanation leaves the buyer unable to tell a forfeit from an ordinary loss.",
    endResult:
      "Read-only. If no forfeited bid exists, answer null.",
  },
  "checklist-buying-offers-catalogue-rejection-reason-survives": {
    roles: ["admin"],
    startPage: "/admin/catalogue-approvals",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the catalogue approvals surface and reject a submission with 'QA Rejection one — photos unclear.'.",
      "Have the owner resubmit it, or find one already rejected twice.",
      "Reject it again with 'QA Rejection two — still unclear.'.",
      "Open its history and read every entry.",
      "Check BOTH reasons are present.",
      "Check the owner can read both.",
    ],
    inputs: { reason1: "QA Rejection one — photos unclear.", reason2: "QA Rejection two — still unclear." },
    expectedBehaviour:
      "Each rejection appends its own entry. Catalogue status changes had no single write path at all — five scattered updates moved the field — so the funnel had to be built before history could be recorded, and a second rejection overwriting the first is what that absence produced.",
    expectedUiState:
      "Both reasons appear in order in the history and both are visible to the owner. Only the latest surviving is the failure.",
    endResult: "The submission carries both rejection reasons.",
  },
  "checklist-buying-offers-history-absent-renders-empty-not-invented": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open a record created before history recording existed — an old order, store or payout.",
      "Open its history block.",
      "Read what is shown.",
      "Check it states there is no recorded history rather than showing a date.",
      "Check no step carries the record's created or updated timestamp presented as a transition.",
    ],
    expectedBehaviour:
      "A record with no recorded history says so. Deriving a transition from the record's created or updated stamp invents an event that never happened, and a fabricated timestamp cannot be told from a real one afterwards.",
    expectedUiState:
      "The block reads as having no recorded history, or renders the phases with em-dashes. It does not present the record's own timestamps as transitions.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-offers-history-carries-no-pii": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open an order with several history entries and read every one.",
      "Look for a name, an email address or a phone number.",
      "Open the browser's View Source and search the page for an email address.",
      "Repeat on an offer, a payout and a store.",
      "Check every actor is shown as an identifier rather than a person's name.",
    ],
    expectedBehaviour:
      "History carries no personal data, enforced in the primitive rather than by convention. The encryption pass is a flat top-level loop that never descends into arrays — a name nested inside a history entry would be stored in PLAINTEXT and never decrypted on the way out. Orders were safe only by luck; offers were not.",
    expectedUiState:
      "No entry on any of the four records contains a name, email or phone, in the rendered view or the source. Actors are identifiers.",
    expectedData: { piiInHistory: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-offers-form-errors-wait-for-first-submit": {
    roles: ["buyer"],
    startPage: "/user/addresses/new",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/addresses/new and read the page WITHOUT typing anything.",
      "Look for any error list and any red field.",
      "Click into the city field and back out without typing, then read the page.",
      "Press Save with everything empty.",
      "Read what appears and count the errors.",
    ],
    expectedBehaviour:
      "The summary appears only after a submit attempt. Eleven views call validation from a mount effect and the summary was deliberately un-gated by touch state — together those made every schema-driven form open by listing every empty required field, accusing the user before they had typed anything. The gate belongs on the DISPLAY: removing the mount validation would stop the list updating as fields are fixed.",
    expectedUiState:
      "No summary and no red fields before Save. Touching and leaving the city field marks that ONE field, without opening the summary. After Save the summary lists every failing field.",
    expectedData: { errorsBeforeSubmit: 0 },
    endResult: "Nothing is saved.",
  },
  "checklist-buying-offers-form-errors-stay-live-after-first-submit": {
    roles: ["buyer"],
    startPage: "/user/addresses/new",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/addresses/new and press Save with everything empty.",
      "Read the error count in the summary.",
      "Fill the name field and read the count again without clicking anything.",
      "Fill the street, then the city, reading the count after each.",
      "Fill the remaining fields and check the summary disappears.",
    ],
    expectedBehaviour:
      "Once a submit has been attempted the summary tracks every keystroke. The COUNT has to be part of the summary's own label — the panel is only republished when that label changes, and a static label would freeze its contents at the original count while the user fixes fields.",
    expectedUiState:
      "The count falls by one per field filled — 'Fix 6 issues' becomes 'Fix 5 issues' — and each fixed field leaves the list. A count frozen until Save is pressed again is the failure.",
    endResult: "Nothing is saved.",
  },
  "checklist-buying-offers-form-mobile-bar-pinned": {
    roles: ["buyer"],
    startPage: "/user/addresses/new",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Resize the browser to 390 pixels wide and open /user/addresses/new.",
      "Look at the bottom of the screen for Save and Cancel.",
      "Count the fixed bars stacked at the bottom.",
      "Scroll the form to its end and check the last field is not hidden behind them.",
      "Tap into a field so the keyboard opens and read where the bar sits.",
    ],
    inputs: { mobileWidth: 390 },
    expectedBehaviour:
      "The form's action row joins the measured bottom tier above the tab bar, so both are visible and neither has to know the other's height. With a keyboard open it becomes three tiers, and everything above reads all three.",
    expectedUiState:
      "Save and Cancel sit above the tab bar with no overlap, exactly two bars without the keyboard. The last form field is reachable. With the keyboard open nothing floats over it.",
    expectedData: { bottomBarCount: 2 },
    endResult: "Nothing is saved; restore the window width.",
  },
  "checklist-buying-offers-form-mobile-error-sheet": {
    roles: ["buyer"],
    startPage: "/user/addresses/new",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Resize to 390 pixels wide and open /user/addresses/new.",
      "Press Save with everything empty.",
      "Read the label on the sheet control at the bottom.",
      "Open the sheet and read the issues listed.",
      "Close the sheet, fill one field, and read the label again.",
      "Press Save again and check the sheet REOPENS.",
    ],
    inputs: { mobileWidth: 390 },
    expectedBehaviour:
      "The sheet's label carries the issue count, which is what pushes updated contents through. Reopening on a second failed Save is driven by a COUNTER rather than a boolean — a boolean stays true and reopens the sheet the user just closed on every re-render.",
    expectedUiState:
      "The control reads 'Fix N issues' and the number falls as fields are filled. Closing it keeps it closed through ordinary typing, and a second Save reopens it.",
    endResult: "Nothing is saved; restore the window width.",
  },
  "checklist-buying-offers-form-bar-restores-listing-bulk-bar": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products and tick two rows so the bulk action bar appears.",
      "Read the bar and its count.",
      "Open a row's editor in a drawer over the listing.",
      "Read what the bottom bar shows now.",
      "Close the drawer WITHOUT saving.",
      "Read the bottom bar again and check the bulk bar and its count are back.",
    ],
    expectedBehaviour:
      "The bar is one shared instance and its claim is a STACK, not last-writer-wins. Each claimant claims on mount and releases on unmount, only the top may publish, and regaining the top republishes automatically. Releasing blanks the bar only when the stack empties — clearing on every release would flash an empty bar between the drawer closing and the listing republishing.",
    expectedUiState:
      "The drawer's form bar replaces the bulk bar while open. On close the bulk bar returns with its original count, without an empty flash in between.",
    endResult: "Clear the selection; nothing is saved.",
  },
  "checklist-buying-offers-form-bar-absent-inside-a-modal": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products and open a form inside a MODAL rather than a page.",
      "Read the modal's own footer buttons.",
      "Look at the bottom of the SCREEN for a second action bar.",
      "Resize to 390 pixels and look again.",
      "Close the modal and check no orphaned bar remains.",
    ],
    inputs: { mobileWidth: 390 },
    expectedBehaviour:
      "A form inside a modal or drawer suppresses its own bar. An overlay owns its footer, and a viewport-fixed bar would render BEHIND the backdrop, below the dialog it belongs to. Neither overlay leaves a detectable DOM trace at the form's position, so the overlay has to declare itself.",
    expectedUiState:
      "The modal has its own footer and there is no second bar at the bottom of the screen, at either width. Closing leaves nothing behind.",
    expectedData: { screenBottomBars: 0 },
    endResult: "Close without saving; restore the window width.",
  },
  "checklist-buying-offers-address-routes-normalised": {
    roles: ["buyer"],
    startPage: "/user/addresses",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/addresses and create an address, noting the URL of the create form.",
      "Open an existing address's edit page and note its URL.",
      "Try the older URL shapes for both create and edit directly in the address bar.",
      "Read where each lands.",
      "Check any old URL either resolves or redirects to the current one.",
      "Delete the created address.",
    ],
    expectedBehaviour:
      "Both the current and the previous URL shapes resolve. These URLs live in bookmarks and in guides, so a 404 breaks a link that was correct when it was written — and the editor page must open with its form ALREADY showing rather than as a blank page.",
    expectedUiState:
      "Create and edit both work at their current URLs. Old shapes resolve or redirect rather than 404ing. Each editor opens with the form visible.",
    endResult: "The created address is deleted.",
  },
  "checklist-buying-offers-custom-role-rejects-fake-permissions": {
    roles: ["admin"],
    startPage: "/admin/team",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the roles surface and create a role named 'QA Role fake-perms'.",
      "Using browser DevTools, add a permission string this system does not define to the submitted payload.",
      "Save and read what happens.",
      "RELOAD and read the role's permissions.",
      "Check the invented permission is absent.",
      "Delete the role.",
    ],
    inputs: { roleName: "QA Role fake-perms" },
    expectedBehaviour:
      "Permissions are validated against the defined set server-side. An undefined permission stored on a role is a grant nothing checks — it reads as configured in the UI while granting nothing, or worse, matching a future permission name by accident.",
    expectedUiState:
      "The save is refused, or the invented permission is stripped and absent after the reload. A role storing an undefined permission is the failure.",
    endResult: "The role is deleted.",
  },
  "checklist-buying-offers-custom-role-edit-does-not-rewrite-creator": {
    roles: ["admin"],
    startPage: "/admin/team",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the roles surface and create a role named 'QA Role creator', noting who it records as creator.",
      "Edit the role, changing only its permission list, and save.",
      "RELOAD and read the creator field.",
      "Compare it against what was recorded at creation.",
      "Delete the role.",
    ],
    inputs: { roleName: "QA Role creator" },
    expectedBehaviour:
      "The creator is set once and never rewritten. An update handler that re-derives created-by from the current session rewrites provenance on every edit — so the last person to touch a role appears to have made it, and the audit trail is silently wrong.",
    expectedUiState:
      "After the edit and reload the creator is unchanged. A creator matching the editing admin is the failure.",
    endResult: "The role is deleted.",
  },
  "checklist-buying-offers-custom-role-rejects-empty": {
    roles: ["admin"],
    startPage: "/admin/team",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the roles surface and start creating a role.",
      "Leave the name empty and save.",
      "Read where any error appears.",
      "Type only spaces as the name and save, reading what happens.",
      "Type a real name and save, then delete the role.",
    ],
    expectedBehaviour:
      "A nameless role is refused on the field. Whitespace-only must be refused too — trimming before validating is what separates a real check from one that passes a name nothing can display.",
    expectedUiState:
      "Both the empty and whitespace-only names produce an error on the name field. A disabled button that says nothing is the failure — the admin cannot tell it from a broken page.",
    endResult: "The role is deleted.",
  },
  "checklist-buying-offers-bid-row-opens-in-all-three-portals": {
    roles: ["buyer", "seller", "admin"],
    startPage: "/user/bids",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! and open /user/bids.",
      "Click a bid row and read what opens.",
      "Sign out and sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's bids listing and click a row, reading what opens.",
      "Sign out and sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/bids and click a row, reading what opens.",
      "Check all three open something rather than being inert.",
    ],
    expectedBehaviour:
      "A bid can be opened in every portal. A row that can be seen and never opened is a dead end, and this listing family had several — the fix was a shared detail component rather than three separate ones.",
    expectedUiState:
      "All three portals open a bid detail. An inert row in any of them is the finding, named by portal.",
    endResult: "Read-only; close without acting.",
  },
  "checklist-buying-offers-bid-detail-hides-bidder-from-buyer": {
    roles: ["buyer", "seller", "admin"],
    startPage: "/user/bids",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! and open a bid detail from /user/bids.",
      "Read every name and identifier shown, and search the page source for a bidder name.",
      "Sign in as tyson@beybladearena.in / TempPass123! and open the same bid from the store's listing.",
      "Read what identities are shown there.",
      "Sign in as admin@letitrip.in / TempPass123! and open the same bid from /admin/bids.",
      "Read what identities are shown there.",
      "Compare all three.",
    ],
    expectedBehaviour:
      "One viewer argument decides what each portal reveals, in one place. The buyer's own view must not name other bidders — a competitor's identity is not theirs to see — while the seller and admin views may, because moderating a dispute requires it.",
    expectedUiState:
      "The buyer's view shows their own bid with other bidders masked or absent, in the source as well as on screen. The seller and admin views may show more. A real name in the buyer's view is a leak.",
    expectedData: { otherBidderNamesInBuyerView: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-offers-admin-bid-view-before-cancel": {
    roles: ["admin"],
    startPage: "/admin/bids",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/bids and open a row's action menu.",
      "Read every action and the order they appear in.",
      "Check View appears before Cancel.",
      "Choose View and read the bid's detail.",
      "Return and read whether Cancel opens a confirmation naming what it will do.",
      "Cancel out of that dialog.",
    ],
    expectedBehaviour:
      "View precedes Cancel in the menu, so reading is the path of least resistance. A menu of pure mutations lets an admin cancel a bid they never read, and cancelling a bid changes the standing price of a live auction.",
    expectedUiState:
      "View is present and listed before Cancel. Cancel opens a confirmation naming the consequence rather than a generic prompt. Dismissing leaves the bid untouched.",
    endResult: "Nothing is cancelled.",
  },
  "checklist-buying-offers-bid-row-keyboard-reachable": {
    roles: ["buyer", "guest"],
    startPage: "/user/bids",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! and open /user/bids.",
      "Press Tab repeatedly and check each bid row receives focus with a visible ring.",
      "Press Enter on a focused row and check it opens.",
      "Open a public auction's bid history in a private window.",
      "Press Tab through it and check whether the history ROWS take focus.",
      "Check they do not, while any real controls still do.",
    ],
    expectedBehaviour:
      "The buyer's own bid rows are interactive and must be keyboard reachable with a visible focus ring. Public bid-history rows are NOT interactive — they open nothing — so making them focusable adds tab stops that lead nowhere, which is worse than skipping them.",
    expectedUiState:
      "Dashboard bid rows take focus and open on Enter. Public bid-history rows do not take focus, while genuine controls near them still do.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-offers-listing-template-edit-page-works": {
    roles: ["seller"],
    startPage: "/store/listing-templates",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/listing-templates and create one named 'QA Template edit-page'.",
      "Open its edit page directly by URL.",
      "Check it renders the form rather than a 404.",
      "Change a field, save, RELOAD, and read it back.",
      "Delete the template from that page and confirm it is gone.",
    ],
    inputs: { name: "QA Template edit-page" },
    expectedBehaviour:
      "The edit page exists, loads, saves and deletes. A nav entry or a row link pointing at a route that was never built is a dead link — and there are two template features in this codebase, one superseded by the other, so confirming which page is reachable matters as much as whether it renders.",
    expectedUiState:
      "The edit URL renders the populated form. The change survives the reload and the delete removes it. A 404 is the failure.",
    endResult: "The template is deleted.",
  },
  "checklist-buying-offers-listing-template-not-editable-across-stores": {
    roles: ["seller"],
    startPage: "/store/listing-templates",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123! and create a template, copying its edit URL.",
      "Sign out and sign in as tester@letitrip.in / TempPass123!, a different store's owner.",
      "Paste that edit URL and read what happens.",
      "Check whether the template's contents are shown at any point.",
      "Attempt to save from that page.",
      "Sign back in as tyson and confirm the template is unchanged, then delete it.",
    ],
    expectedBehaviour:
      "Ownership is enforced server-side on read AND on write. Hiding the route from the other seller's navigation is not a control — the URL is guessable, and a page that renders the contents before refusing the save has already leaked them.",
    expectedUiState:
      "The other seller is refused before any content renders. No template fields are shown. Any save attempt is refused. The template is unchanged.",
    endResult: "The template is deleted.",
  },
  "checklist-buying-offers-payout-method-rejects-blank-bank-details": {
    roles: ["seller"],
    startPage: "/store/payouts",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the payout methods surface and add a BANK method.",
      "Leave the account number, IFSC and holder name empty and save.",
      "Read where the errors appear.",
      "Fill only the account number and save, reading what happens.",
      "Fill all three and save.",
      "Delete the method.",
    ],
    expectedBehaviour:
      "A bank method requires all three fields, each marked on its own field. A payout method missing its account number is one a real transfer will fail on later — and the failure surfaces at payout time, long after the seller believed they had configured it.",
    expectedUiState:
      "The empty save marks all three fields individually rather than showing one banner. The partial save marks the two still missing. The complete one is accepted.",
    endResult: "The method is deleted.",
  },
  "checklist-buying-offers-payout-method-rejects-bad-ifsc": {
    roles: ["seller"],
    startPage: "/store/payouts",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the payout methods surface and add a bank method.",
      "Type ABC123 as the IFSC and save, reading where the error appears.",
      "Type 12345678901 as the IFSC and save, reading what happens.",
      "Type a correctly-shaped IFSC and save.",
      "RELOAD and read how the stored details are displayed.",
      "Delete the method.",
    ],
    inputs: { badIfsc1: "ABC123", badIfsc2: "12345678901" },
    expectedBehaviour:
      "The IFSC is validated by FORMAT rather than by length. A length-only rule accepts any eleven characters — the same class of check that once treated 'abcdef' as a valid six-digit postal code.",
    expectedUiState:
      "Both malformed codes are refused on the IFSC field before any request. The correctly-shaped one is accepted and displays MASKED after the reload rather than in full.",
    endResult: "The method is deleted.",
  },
  "checklist-buying-offers-shipping-config-rejects-rateless-rule": {
    roles: ["seller"],
    startPage: "/store/shipping",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the shipping settings and add a FLAT rule with no rate.",
      "Save and read where the error appears.",
      "Type -50 as the rate and save, reading what happens.",
      "Type 0 and save, reading whether it is accepted.",
      "Type 99 and save.",
      "Delete the rule.",
    ],
    inputs: { negativeRate: -50, zeroRate: 0, validRate: 99 },
    expectedBehaviour:
      "A flat rule without a rate cannot price anything, and a negative rate would pay the buyer to order. Zero is legitimate — that is free shipping — so the rule is 'a number, not negative' rather than 'greater than zero', and conflating the two blocks a real configuration.",
    expectedUiState:
      "The rateless and negative saves are refused on the rate field. Zero is ACCEPTED as free shipping. 99 is accepted. Refusing zero is a finding.",
    endResult: "The rule is deleted.",
  },
  "checklist-buying-offers-grouped-listing-count-not-caller-settable": {
    roles: ["seller"],
    startPage: "/store/grouped-listings",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/grouped-listings and create a group with two members.",
      "Save, RELOAD, and read the member count shown.",
      "Add a third member, save, RELOAD, and read the count.",
      "Using DevTools, submit a member count that disagrees with the member list.",
      "RELOAD and read the count.",
      "Delete the group.",
    ],
    expectedBehaviour:
      "The count is DERIVED from the member list and never accepted from a caller. A caller-supplied count that disagrees with the array is the mirror-drift trap — and this count is what the visibility rule reads, so a wrong one hides or shows a group incorrectly.",
    expectedUiState:
      "The count matches the member list after every save, including after the forced mismatch. A stored count that disagrees with the members is the failure.",
    expectedData: { countMatchesMembers: true },
    endResult: "The group is deleted.",
  },
  "checklist-buying-offers-store-feature-new-actually-creates": {
    roles: ["seller"],
    startPage: "/store/features",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store features surface and note how many exist.",
      "Open the create page directly by URL.",
      "Check it renders the form rather than a blank page.",
      "Fill it in with 'QA Feature actually-creates' and save.",
      "RELOAD the list and count again.",
      "Delete the feature.",
    ],
    inputs: { name: "QA Feature actually-creates" },
    expectedBehaviour:
      "The create page exists and actually creates. A page reached by URL must open with its form already showing — a blank page you have to click into is the shape these editor routes had before they were wired.",
    expectedUiState:
      "The create URL renders a populated form. After saving the list count is one higher and survives a reload. A success message with no new row is the failure.",
    endResult: "The feature is deleted.",
  },
  "checklist-buying-offers-store-feature-edit-page-exists": {
    roles: ["seller"],
    startPage: "/store/features",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store features surface and create one named 'QA Feature edit-page'.",
      "Open its edit page directly by URL.",
      "Check it renders the populated form rather than a 404.",
      "Change a field, save, RELOAD, and read it back.",
      "Copy the URL, open it in a new tab, and check it opens the same record.",
      "Delete the feature.",
    ],
    inputs: { name: "QA Feature edit-page" },
    expectedBehaviour:
      "The feature has its own edit page, not only a drawer. That is the whole reason these pages exist: a drawer cannot be bookmarked, shared with a colleague, or reopened after a crash.",
    expectedUiState:
      "The edit URL renders the populated form and survives a reload and a fresh tab. A 404, or a page that opens empty, are both failures.",
    endResult: "The feature is deleted.",
  },
  "checklist-buying-offers-feature-editor-validates": {
    roles: ["seller"],
    startPage: "/store/features",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the feature editor and save with every field empty.",
      "Read whether errors appear or the Save button is simply disabled.",
      "Type only spaces in the name and save.",
      "Read what happens.",
      "Fill the form correctly and save, then delete the feature.",
    ],
    expectedBehaviour:
      "The editor reports what is wrong rather than disabling Save. A disabled button says nothing — the user cannot tell it from a broken page, and they have no way to learn which field is at fault.",
    expectedUiState:
      "Save is enabled and pressing it puts errors on the offending fields. Whitespace-only is refused. A permanently disabled button with no explanation is the failure.",
    endResult: "The feature is deleted.",
  },
  "checklist-buying-offers-store-category-rejects-empty": {
    roles: ["seller"],
    startPage: "/store/categories",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the storefront categories surface and start creating one.",
      "Leave the label empty and save.",
      "Read where any error appears.",
      "Type only spaces and save, reading what happens.",
      "Type a real label and save, then delete it.",
    ],
    expectedBehaviour:
      "A category with no label is refused on the field. A nameless category renders as a blank entry in every picker that offers it, and nothing downstream can display or select it meaningfully.",
    expectedUiState:
      "Empty and whitespace-only labels both produce a field error. A real label is accepted. A silently created blank category is the failure.",
    endResult: "The category is deleted.",
  },
  "checklist-buying-offers-blog-editor-sections-not-steps": {
    roles: ["admin"],
    startPage: "/admin/blog",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the blog editor for a new post.",
      "Read how the form is presented — sections or numbered steps.",
      "Try to reach the media area WITHOUT filling the title first.",
      "Expand every section and check each renders its fields.",
      "Check no section is gated behind completing another.",
    ],
    expectedBehaviour:
      "The editor shows every field at once in collapsible sections. A wizard that blocks step two until step one validates prevents an author from filling fields in their own order — and there is no reason a blog post's media must wait on its title.",
    expectedUiState:
      "All sections are present and expandable immediately, with no step gating. A numbered wizard blocking progress is the failure.",
    endResult: "Leave without saving.",
  },
  "checklist-buying-offers-blog-existing-post-slug-is-valid": {
    roles: ["admin"],
    startPage: "/admin/blog",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/blog and open an EXISTING published post's editor.",
      "Read the Slug field and any error attached to it.",
      "Check no error appears before anything is typed.",
      "Open two more existing posts and read the same.",
      "Save one without changing anything and check it still saves.",
    ],
    expectedBehaviour:
      "An existing post's stored slug validates against the editor's own rule. Where the two disagree, every existing post opens showing an error on a field the author never touched — and the summary then accuses them of a mistake made by whatever wrote the slug.",
    expectedUiState:
      "No slug error on any existing post before typing. A no-op save succeeds. An error on an untouched field is the failure, and it will appear on every post rather than one.",
    endResult: "Nothing is changed.",
  },
  "checklist-buying-offers-blog-new-post-url-matches-existing": {
    roles: ["admin", "guest"],
    startPage: "/admin/blog",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /blog and note the URL shape of an existing post.",
      "Create a new post titled 'QA Blog url-shape' and publish it.",
      "Open it from /blog and read its URL.",
      "Compare the two URL shapes segment by segment.",
      "Check for a doubled prefix segment in the new one.",
      "Delete the post.",
    ],
    inputs: { title: "QA Blog url-shape" },
    expectedBehaviour:
      "A new post's public URL has the same shape as an existing one. Where the slug generator adds a prefix the route already supplies, the URL gains a doubled segment — the page still resolves, so the only symptom is a URL that looks wrong and does not match anything already indexed.",
    expectedUiState:
      "Both URLs have the same number of segments and the same prefix pattern. A doubled prefix segment in the new post's URL is the failure.",
    endResult: "The post is deleted.",
  },
  "checklist-buying-offers-blog-readtime-updates-on-edit": {
    roles: ["admin", "guest"],
    startPage: "/admin/blog",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open an existing post's editor and note its read-time estimate.",
      "Read its body length roughly.",
      "Add several paragraphs to the body and save.",
      "RELOAD and read the read-time estimate.",
      "Open the post publicly and read the estimate there.",
      "Restore the original body.",
    ],
    expectedBehaviour:
      "The read-time is recomputed from the body on every save, not only at creation. Deriving it once freezes the estimate at the original length, so a post that doubles in size still claims its first estimate — a create-time transform the update path does not repeat.",
    expectedUiState:
      "The estimate rises after the body grows, in both the editor and the public post. An unchanged estimate is the failure.",
    endResult: "The post's body is restored.",
  },
  "checklist-buying-offers-blog-error-summary-jumps-to-section": {
    roles: ["admin"],
    startPage: "/admin/blog",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open an existing post's editor and clear its title.",
      "Collapse the section containing the title.",
      "Save and read the error summary.",
      "Check the entry names the section it belongs to.",
      "Click the entry and read where the page lands.",
      "Check the section expanded and the title field is focused and marked.",
    ],
    expectedBehaviour:
      "Clicking a summary entry expands the owning section and lands ON the field, focused. Landing on the section heading leaves the author hunting, and an error inside a collapsed section is otherwise unreachable — they are told something is wrong and cannot see what.",
    expectedUiState:
      "The entry is tagged with its section. Clicking it expands that section with the title field focused and marked. Landing on the heading is the failure.",
    endResult: "Restore the title without saving the empty one.",
  },
  "checklist-buying-offers-blog-media-survives-collapse": {
    roles: ["admin"],
    startPage: "/admin/blog",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open a post's editor and start uploading public/test-media/sample-video.mp4 in the Media section.",
      "While the upload is still running, collapse the Media section.",
      "Wait a few seconds, then expand it again.",
      "Read whether the upload completed or was cancelled.",
      "Save and RELOAD, then read whether the media is attached.",
      "Remove the media and restore the post.",
    ],
    inputs: { file: "public/test-media/sample-video.mp4" },
    expectedBehaviour:
      "Collapsing a section hides it without unmounting its work. A section that unmounts on collapse cancels the in-flight upload and discards the progress — and because collapsing feels like a purely visual action, the author has no reason to expect it.",
    expectedUiState:
      "The upload continues while collapsed and is complete on expanding. After the save and reload the media is attached. A cancelled upload is the failure.",
    endResult: "The post is restored to its original media.",
  },
  "checklist-buying-offers-event-editor-sections-not-steps": {
    roles: ["admin"],
    startPage: "/admin/events/new",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/events/new and read how the form is presented.",
      "Check Details, Media, Settings and Raffle are all present as sections.",
      "Expand each and confirm its fields render.",
      "Try to reach the Raffle section without completing Details.",
      "Check no section is gated behind another.",
    ],
    expectedBehaviour:
      "All four areas are reachable at once as collapsible sections. A step wizard here forces an ordering the author did not choose, and the raffle settings often determine what the details should say.",
    expectedUiState:
      "Details, Media, Settings and Raffle are all present and expandable immediately, with no gating between them.",
    endResult: "Leave without saving.",
  },
};
