/*
 * WHY: Authored six-part procedures for the buying/bidding checklist page.
 * WHAT: 23 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THE SANDBOX AUCTIONS BELONG TO store-tester-sandbox, WHOSE OWNER IS
 * user-admin-letitrip — not user-tester-qa, who owns store-tester-qa-seller. A
 * seller-side step against auction-tester-sandbox-cycle-* therefore signs in as
 * admin@letitrip.in. Signing in as the wrong seller produces a 403 the tester
 * would reasonably report as a permissions bug.
 *
 * Bids live in the CASCADE tier, so a run wipes and re-seeds them. Cases that
 * depend on a starting price — the tiered-increment ones especially — are
 * therefore reliable at the START of a run and drift as later cases bid the price
 * up. Where order matters the case says so.
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
  "checklist-buying-bidding-auction-below-reserve-no-winner": {
    roles: ["buyer"],
    startPage: "/auctions/auction-beyblade-burst-lord-spryzen-ended-unsold",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /auctions/auction-beyblade-burst-lord-spryzen-ended-unsold.",
      "Read the status area and the purchase panel.",
      "Open /user/bids and look for a row naming this auction.",
    ],
    inputs: { currentBid: 1999 },
    expectedBehaviour:
      "The auction closed with its highest bid at ₹1,999, below the seller's reserve, so no winner is awarded. Settlement checks the reserve — for a long time it awarded the top bid unconditionally, which is exactly what this fixture exists to catch. This is also the one ended auction seeded with isSold false, so it proves the per-type branch is doing the work rather than the shared sold check.",
    expectedUiState:
      "The page shows an ended state naming the reserve — in the shape 'Ended — Reserve Not Met'. There is no 'You won' badge, no 'Pay now' link and no purchase control. It does not read simply 'Sold'.",
    expectedData: { winnerAwarded: false },
    endResult:
      "On reload the same ended-below-reserve state is shown and no order exists for it. A winner appearing here means the reserve was ignored.",
  },
  "checklist-buying-bidding-auction-win-unpaid-forfeit": {
    roles: ["buyer"],
    startPage: "/user/bids",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /user/bids and read the row for 'Test Auction — Already Won', noting its 'Pay now' link and the deadline beside it.",
      "Leave the win unpaid until the checkout deadline passes.",
      "Open /user/bids again.",
      "Open /cart and switch to the 'Won Auctions' tab.",
      "Open the notification bell.",
    ],
    inputs: { auctionId: "auction-tester-sandbox-won" },
    expectedBehaviour:
      "Once the checkout deadline passes, the expiry sweep marks the bid forfeited, clears the locked cart line and notifies the buyer. Clearing the line matters beyond tidiness: a leftover locked line keeps the buyer's auction lane non-empty, and that lane outranks the standard one, so their entire cart stays blocked.",
    expectedUiState:
      "The /user/bids row no longer offers 'Pay now' and reads as forfeited or expired. The Won Auctions tab in the cart is empty. A notification about the lapsed win is present.",
    expectedData: { payNowLinkPresent: false },
    endResult:
      "The forfeited state survives a reload and the cart is unblocked. The seller is NOT notified — nothing was sold.",
    needsReview: true,
    reviewNote:
      "The 48-hour checkout deadline is set by the settlement job, not by seed data, so tester-window.ts cannot shorten it and the case cannot run inside a session. It needs a won-auction fixture carrying an already-past checkoutDeadline — logged in tester/.tester-runs/fixture-requests.jsonl. Until that exists, answer null rather than waiting two days.",
  },
  "checklist-buying-bidding-bid-below-current-plus-increment-rejected": {
    roles: ["buyer"],
    startPage: "/auctions/auction-tester-sandbox-cycle-1",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /auctions/auction-tester-sandbox-cycle-1 and click 'Place a bid'.",
      "Select 'Custom' in the preset row.",
      "Type 15500 in the amount field.",
      "Click 'Place Bid'.",
      "Clear the field and type 14000.",
      "Click 'Place Bid'.",
    ],
    inputs: { currentBid: 15000, increment: 1000, tooSmall: 15500, tooLow: 14000 },
    expectedBehaviour:
      "₹15,500 clears the current bid but not the ₹1,000 increment, and ₹14,000 does not even clear the current bid. Both are refused, and with DIFFERENT messages — collapsing them into one generic error tells the bidder nothing about which rule they broke.",
    expectedUiState:
      "₹15,500 produces an inline error under the amount field naming the increment, in the shape 'Minimum increment is ₹1,000.00'. ₹14,000 produces a distinct inline error about exceeding the current winning bid. Both appear on the field itself, not as a toast, and neither submit silently does nothing.",
    expectedData: { bidsPlaced: 0 },
    endResult:
      "No bid was recorded: the current bid and bid count are unchanged after a reload.",
  },
  "checklist-buying-bidding-bid-count-increments-by-one": {
    roles: ["buyer"],
    startPage: "/auctions/auction-tester-sandbox-cycle-3",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /auctions/auction-tester-sandbox-cycle-3 and read the bid count.",
      "Click 'Place a bid', select 'Custom', type 24000, and click 'Place Bid'.",
      "Read the bid count and current bid.",
      "Sign out and sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Open /auctions/auction-tester-sandbox-cycle-3.",
      "Click 'Place a bid', select 'Custom', type 17000, and click 'Place Bid'.",
      "Read the bid count and current bid.",
      "Click 'Bid History'.",
    ],
    inputs: { proxyMax: 24000, challengerBid: 17000 },
    expectedBehaviour:
      "Each submitted bid adds exactly one row. A proxy auction is the case where a naive implementation double-counts: the challenger's bid plus the automatic counter-bid it triggers can both be recorded, so the count jumps by two for one user action.",
    expectedUiState:
      "After the first bid: '1 bid' and a current bid of ₹15,000.00 — the starting price, not ₹24,000, because a proxy maximum is not the visible price. After the second: '2 bids', NOT 3, and a current bid of ₹18,000.00 — the challenger's ₹17,000 plus one increment. Bid History shows the ₹17,000 row marked outbid.",
    expectedData: { bidCount: 2, currentBid: 18000 },
    endResult:
      "On reload: 2 bids and ₹18,000.00. A count of 3 means the proxy counter-bid was recorded as a separate user bid.",
  },
  "checklist-buying-bidding-bid-custom-need-not-be-exact-multiple": {
    roles: ["buyer"],
    startPage: "/auctions/auction-tester-sandbox-cycle-1",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /auctions/auction-tester-sandbox-cycle-1 and click 'Place a bid'.",
      "Select 'Custom' in the preset row.",
      "Type 15137 in the amount field.",
      "Read the helper text under the field.",
      "Click 'Place Bid'.",
    ],
    inputs: { bidAmount: 15137, increment: 1000 },
    expectedBehaviour:
      "The increment is a FLOOR, not a grid. ₹15,137 clears the ₹15,000 minimum and is accepted even though it is not a multiple of ₹1,000. Rejecting it would quietly force every bidder onto round numbers the rules never required.",
    expectedUiState:
      "The modal closes with a success state. No error mentioning multiples of the increment appears. The helper text says any amount at or above the minimum is allowed rather than implying a step. Current bid becomes ₹15,137.00 — not ₹15,000 and not ₹16,000.",
    expectedData: { currentBid: 15137 },
    endResult: "On reload the current bid still reads ₹15,137.00.",
  },
  "checklist-buying-bidding-bid-history": {
    roles: ["buyer"],
    startPage: "/user/bids",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /auctions/auction-tester-sandbox-cycle-1, click 'Place a bid', select the 'Minimum' preset at ₹15,000.00, and click 'Place Bid'.",
      "Open /user/bids.",
      "Read the rows from the top.",
      "Reload the page and read them again.",
    ],
    inputs: { bidAmount: 15000 },
    expectedBehaviour:
      "My Bids lists every auction this buyer has bid on, newest first, and each row is reachable — a row offering only status with no way to open the auction is a dead end.",
    expectedUiState:
      "The row for the sandbox auction is at the top, carrying its amount, the auction title and its current status. Clicking the row or its title opens the auction.",
    endResult:
      "After reload the same rows appear in the same order. An empty list here immediately after placing a bid means the bid was written without a buyer reference.",
  },
  "checklist-buying-bidding-bid-history-auction-detail-pagination": {
    roles: ["guest"],
    startPage: "/auctions/auction-beyblade-metal-lightning-l-drago",
    steps: [
      "Open /auctions/auction-beyblade-metal-lightning-l-drago.",
      "Click the 'Bid History' control to expand it.",
      "Read the amounts on the first page, top to bottom.",
      "Click the next-page control in the bid-history pagination.",
      "Read the amounts on the second page.",
    ],
    inputs: { seededBidCount: 13, rowsPerPage: 5 },
    expectedBehaviour:
      "Bid history is paginated newest-first, and paging fetches the next slice rather than re-rendering the same rows. 13 seeded bids at 5 per page make 3 pages.",
    expectedUiState:
      "Page 1 opens with the highest and most recent bid, ₹3,199.00, at the top. Page 2 shows five DIFFERENT amounts, lower than page 1's — identical rows on both pages means the page control moved a label and not the query. The pagination control is visible without scrolling past the whole list.",
    expectedData: { pageCount: 3 },
    endResult:
      "Pagination is not persisted; reopening the page starts at page 1, newest first.",
  },
  "checklist-buying-bidding-bid-history-shows-date-time-and-masked-name": {
    roles: ["buyer"],
    startPage: "/auctions/auction-beyblade-metal-lightning-l-drago",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!, an account that has not bid on this auction.",
      "Open /auctions/auction-beyblade-metal-lightning-l-drago.",
      "Click the 'Bid History' control to expand it.",
      "Read the bidder identity, amount and timestamp on every visible row.",
    ],
    expectedBehaviour:
      "Bidder names are masked on the way out of the server, not hidden in the renderer. The masking helper for bids once returned its input unchanged while being named as though it masked — every bidder's real name was in the public payload and nothing displayed it, so the leak was invisible from the screen. Displaying the masked name is what makes that checkable by eye.",
    expectedUiState:
      "Each row reads in the shape '₹3,199.00 · M*** U*** 1*** · 4 Sept, 17:06'. The name is genuinely masked — asterisks in the middle — and is not a full readable name, and not a placeholder like 'Bidder'. The timestamp carries both a date and a clock time, not a date alone.",
    endResult:
      "The same masked names and timestamps appear after reload. A real full name anywhere in these rows is a PII leak and fails the case outright.",
  },
  "checklist-buying-bidding-bid-increment-live-tier-change": {
    roles: ["buyer"],
    startPage: "/auctions/auction-beyblade-metal-lightning-l-drago",
    steps: [
      "In window A, sign in as rehan.sheikh@gmail.com / TempPass123! and open /auctions/auction-beyblade-metal-lightning-l-drago.",
      "Read the 'min increment' figure in window A and leave the page open without reloading.",
      "In window B, sign in as vivaan.kapoor@gmail.com / TempPass123! and open the same auction.",
      "In window B click 'Place a bid', select 'Custom', type 5001, and click 'Place Bid'.",
      "Switch back to window A and watch the 'min increment' figure for up to 10 seconds without reloading.",
    ],
    inputs: { startingBid: 3199, tierCrossingBid: 5001 },
    expectedBehaviour:
      "The increment is banded by price, and the band is recomputed from the live current bid pushed over SSE — not captured when the page first rendered. Crossing ₹5,000 moves the band from ₹200 to ₹500 for everyone already watching.",
    expectedUiState:
      "Window A starts at 'min increment ₹200.00' and becomes 'min increment ₹500.00' within about 10 seconds, with no reload. A figure that only changes when the tester refreshes means the SSE update carried the price but not the derived band.",
    expectedData: { incrementBefore: 200, incrementAfter: 500 },
    endResult:
      "Reloading window A confirms ₹500. Run this early in a session: bids are wiped and re-seeded per run, so L-Drago starts at ₹3,199, but a later case that bids it up moves it out of the ₹200 band and this case can no longer cross the boundary.",
  },
  "checklist-buying-bidding-bid-increment-override-floor-raising": {
    roles: ["buyer", "admin"],
    startPage: "/auctions/auction-tester-sandbox-cycle-1",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!, the owner of store-tester-sandbox.",
      "Open the seller editor for auction-tester-sandbox-cycle-1 and set 'Minimum Bid Increment' to 1, then save.",
      "Sign out and sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /auctions/auction-tester-sandbox-cycle-1, click 'Place a bid', select 'Custom', type 15001, and click 'Place Bid'.",
      "Clear the field, type 16000, and click 'Place Bid'.",
      "Sign out, sign in as admin@letitrip.in / TempPass123!, and set the same auction's 'Minimum Bid Increment' to 2000, then save.",
      "Sign out and sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open the auction, click 'Place a bid', select 'Custom', type 17000, and click 'Place Bid'.",
      "Clear the field, type 18000, and click 'Place Bid'.",
    ],
    inputs: { overrideBelowTier: 1, overrideAboveTier: 2000, tierIncrement: 1000 },
    expectedBehaviour:
      "The per-listing override can only RAISE the floor, never lower it. With the override at ₹1 the ₹1,000 tier still governs, so ₹15,001 is refused and ₹16,000 accepted. With the override at ₹2,000 the override governs, so ₹17,000 is refused and ₹18,000 accepted. A seller must not be able to undercut the platform's own increment band.",
    expectedUiState:
      "Both refusals are inline errors on the amount field naming the effective minimum — ₹1,000 in the first half, ₹2,000 in the second. Both accepted bids close the modal and raise the current bid.",
    expectedData: { effectiveIncrementFirstHalf: 1000, effectiveIncrementSecondHalf: 2000 },
    endResult:
      "The current bid reflects only the two accepted bids. Set the increment back to its seeded value afterwards. The store is store-tester-sandbox and its owner is admin@letitrip.in — signing in as tester@letitrip.in gives a 403 that reads like a permissions bug and is not one.",
  },
  "checklist-buying-bidding-bid-increment-tiered": {
    roles: ["buyer"],
    startPage: "/auctions/auction-beyblade-metal-lightning-l-drago",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /auctions/auction-beyblade-metal-lightning-l-drago.",
      "Read the 'min increment' figure beside the current bid of ₹3,199.00.",
      "Click 'Place a bid', select 'Custom', type 3200, and click 'Place Bid'.",
      "Clear the field, type 3399, and click 'Place Bid'.",
    ],
    inputs: { currentBid: 3199, tierIncrement: 200, tooSmall: 3200, exactTier: 3399 },
    expectedBehaviour:
      "At ₹3,199 the auction sits in the ₹1,000–₹5,000 band, whose increment is ₹200. ₹3,200 clears the current bid by ₹1 and is refused; ₹3,399 clears it by exactly ₹200 and is accepted, proving the boundary is inclusive.",
    expectedUiState:
      "₹3,200 produces an inline error on the amount field naming ₹200.00 — not a toast and not a silent no-op. ₹3,399 closes the modal and the current bid becomes ₹3,399.00.",
    expectedData: { currentBid: 3399 },
    endResult:
      "On reload the current bid reads ₹3,399.00. Run this before any case that bids L-Drago past ₹5,000, which would move it into the ₹500 band.",
  },
  "checklist-buying-bidding-bid-preset-follows-live-price": {
    roles: ["buyer"],
    startPage: "/auctions/auction-tester-sandbox-cycle-2",
    steps: [
      "In window A, sign in as rehan.sheikh@gmail.com / TempPass123! and open /auctions/auction-tester-sandbox-cycle-2.",
      "Click 'Place a bid' and select the 'Minimum' preset at ₹15,000.00, without clicking 'Place Bid'.",
      "In window B, sign in as vivaan.kapoor@gmail.com / TempPass123! and open the same auction.",
      "In window B click 'Place a bid', select 'Custom', type 16000, and click 'Place Bid'.",
      "Switch to window A and wait up to 10 seconds without clicking anything.",
      "Read the preset labels, the helper text and the number in the amount field.",
    ],
    inputs: { staleAmount: 15000, competingBid: 16000, newMinimum: 17000 },
    expectedBehaviour:
      "An open bid modal re-prices itself from the live feed. Otherwise the tester submits a figure that was valid when the modal opened, gets a rejection they cannot explain, and the real cause — someone else bid — is invisible.",
    expectedUiState:
      "Window A's amount field now reads 17000, the first preset reads 'Minimum / ₹17,000.00', and the helper text names the new minimum. The stale 15000 is gone from the field rather than sitting there next to updated labels.",
    expectedData: { refreshedMinimum: 17000 },
    endResult:
      "Nothing persists until submitted. Clicking 'Place Bid' with the refreshed amount succeeds; a modal still showing ₹15,000 would fail.",
  },
  "checklist-buying-bidding-bid-presets-are-increment-multiples": {
    roles: ["buyer"],
    startPage: "/auctions/auction-tester-sandbox-cycle-1",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /auctions/auction-tester-sandbox-cycle-1 and read the current bid and min increment.",
      "Click 'Place a bid'.",
      "Read the three preset buttons beside 'Custom'.",
    ],
    inputs: { currentBid: 15000, increment: 1000 },
    expectedBehaviour:
      "Presets are 1×, 5× and 10× the EFFECTIVE increment, computed from the minimum next bid. Deriving them from the raw multipliers instead would offer '+₹1', '+₹5' and '+₹10' on a ₹15,000 auction — every one of them below the minimum and therefore guaranteed to be rejected.",
    expectedUiState:
      "The row reads 'Minimum / ₹15,000.00', '+₹4,000.00 / ₹19,000.00', '+₹9,000.00 / ₹24,000.00', 'Custom'. On a zero-bid auction the first is labelled 'Minimum', not '+₹0'. No preset offers a one-, five- or ten-rupee step.",
    expectedData: { presetCount: 3 },
    endResult: "Read-only inspection of the modal; nothing is submitted and nothing persists.",
  },
  "checklist-buying-bidding-bid-succeeds-and-outbids-previous-winner": {
    roles: ["buyer"],
    startPage: "/auctions/auction-tester-sandbox-cycle-1",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /auctions/auction-tester-sandbox-cycle-1, click 'Place a bid', select the 'Minimum' preset at ₹15,000.00, and click 'Place Bid'.",
      "Read the current bid and bid count.",
      "Sign out and sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Open the same auction, click 'Place a bid', select 'Custom', type 16000, and click 'Place Bid'.",
      "Read the whole modal for error text before it closes.",
      "Click 'Bid History'.",
    ],
    inputs: { firstBid: 15000, secondBid: 16000 },
    expectedBehaviour:
      "The higher bid is written and the previous leader's row is flipped to outbid in the same batch. The batch write is the fragile part: it once resolved its Firestore module through a relative runtime require that broke only in production, so every bid failed with a module-not-found error while every local test passed.",
    expectedUiState:
      "Current bid ₹16,000.00 and '2 bids'. The ₹15,000 row in Bid History is marked outbid. No text containing a file path, 'Cannot find module', 'Require stack' or 'Batch write failed' appears anywhere in the modal or as a toast.",
    expectedData: { currentBid: 16000, bidCount: 2 },
    endResult: "On reload the current bid and count persist at ₹16,000.00 and 2 bids.",
  },
  "checklist-buying-bidding-first-bid-can-equal-starting-bid": {
    roles: ["buyer"],
    startPage: "/auctions/auction-tester-sandbox-cycle-1",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /auctions/auction-tester-sandbox-cycle-1 while it still shows 0 bids.",
      "Click 'Place a bid' and read the minimum shown in the modal.",
      "Select the 'Minimum' preset and click 'Place Bid'.",
      "Sign out and sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Open the same auction, click 'Place a bid', select 'Custom', type 15500, and click 'Place Bid'.",
    ],
    inputs: { startingBid: 15000, secondBid: 15500, increment: 1000 },
    expectedBehaviour:
      "The FIRST bid may equal the starting price exactly — there is nothing to outbid yet. Only from the second bid onwards does current-plus-increment apply, which is why ₹15,500 is then refused.",
    expectedUiState:
      "The modal's minimum equals the starting bid, ₹15,000.00, and its first preset is labelled 'Minimum' rather than '+₹0'. The first bid is accepted: 1 bid at ₹15,000.00. The second bidder's ₹15,500 draws an inline increment error.",
    expectedData: { currentBid: 15000, bidCount: 1 },
    endResult:
      "On reload: ₹15,000.00 and 1 bid. A refusal of the first bid for being 'not above the current bid' is the failure this case catches.",
  },
  "checklist-buying-bidding-first-bid-displays-at-starting-price": {
    roles: ["buyer"],
    startPage: "/auctions/auction-tester-sandbox-cycle-3",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /auctions/auction-tester-sandbox-cycle-3 while it still shows 0 bids.",
      "Click 'Place a bid', select 'Custom', type 24000, and click 'Place Bid'.",
      "Close the modal and read the current bid on the page.",
      "Sign out and sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Open the same auction, click 'Place a bid', select 'Custom', type 17000, and click 'Place Bid'.",
      "Read the current bid and who is leading.",
    ],
    inputs: { startingBid: 15000, proxyMax: 24000, challengerBid: 17000 },
    expectedBehaviour:
      "A custom amount is a proxy MAXIMUM, not the price. Bidding ₹24,000 into an empty auction shows ₹15,000 — the starting price — because there is no one to outbid. When a challenger bids ₹17,000 the proxy answers with exactly one increment above it, ₹18,000, and stops there rather than jumping to the maximum.",
    expectedUiState:
      "After the proxy bid the current bid reads ₹15,000.00, not ₹16,000 and not ₹24,000. After the challenger's bid it reads ₹18,000.00 and rehan.sheikh@gmail.com is still shown as leading. A visible ₹24,000 would publish the buyer's maximum to every competitor.",
    expectedData: { currentBidAfterProxy: 15000, currentBidAfterChallenge: 18000 },
    endResult: "On reload: ₹18,000.00 with the proxy bidder leading.",
  },
  "checklist-buying-bidding-outbid-notification": {
    roles: ["buyer"],
    startPage: "/auctions/auction-tester-sandbox-cycle-1",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /auctions/auction-tester-sandbox-cycle-1, click 'Place a bid', select the 'Minimum' preset at ₹15,000.00, and click 'Place Bid'.",
      "Sign out and sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Open the same auction, click 'Place a bid', select 'Custom', type 16000, and click 'Place Bid'.",
      "Sign out and sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open the notification bell in the header.",
      "Open /user/notifications.",
      "Click the outbid notification.",
    ],
    inputs: { firstBid: 15000, outbiddingBid: 16000 },
    expectedBehaviour:
      "Losing the lead notifies the bidder who lost it, and the notification links somewhere real — a bid has no per-record page in any role, so the correct destination is the bids list rather than a fabricated per-bid URL that would 404.",
    expectedUiState:
      "The bell shows an unread count and the list holds an outbid entry naming the sandbox auction. Clicking it lands on a real page, not a 404.",
    endResult:
      "The notification survives a reload of /user/notifications. No notification at all means the outbid hook never fired.",
  },
  "checklist-buying-bidding-outbid-notification-goes-to-outbid-user": {
    roles: ["buyer"],
    startPage: "/auctions/auction-tester-sandbox-cycle-1",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /auctions/auction-tester-sandbox-cycle-1, click 'Place a bid', select 'Custom', type 20000, and click 'Place Bid'.",
      "Sign out and sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Open the same auction, click 'Place a bid', select 'Custom', type 17000, and click 'Place Bid'.",
      "Open /user/notifications as vivaan.kapoor@gmail.com.",
      "Sign out and sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/notifications as rehan.sheikh@gmail.com.",
    ],
    inputs: { proxyMax: 20000, losingBid: 17000 },
    expectedBehaviour:
      "The notification goes to whoever LOST the lead. Here the challenger is outbid the instant they bid, by the standing proxy, so the challenger is notified and the proxy holder — who never lost the lead — is not. Notifying the leader instead, or notifying both, is the inversion this case catches.",
    expectedUiState:
      "vivaan.kapoor@gmail.com has a new outbid notification for the sandbox auction. rehan.sheikh@gmail.com has NO new outbid notification, only whatever was there before.",
    expectedData: { challengerNotified: true, leaderNotified: false },
    endResult:
      "Both inboxes still read that way after a reload. The leader receiving an outbid notice while still leading is a fail even though a notification did fire.",
  },
  "checklist-buying-bidding-place-bid": {
    roles: ["buyer"],
    startPage: "/auctions/auction-tester-sandbox-cycle-1",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /auctions/auction-tester-sandbox-cycle-1.",
      "Read the current bid and bid count.",
      "Click 'Place a bid'.",
      "Select the 'Minimum' preset at ₹15,000.00.",
      "Click 'Place Bid'.",
      "Open /user/bids.",
    ],
    inputs: { bidAmount: 15000 },
    expectedBehaviour:
      "The bid is written, the auction's current bid and count move, and the bid appears in the buyer's own list. All three must happen: a bid recorded against the auction but missing from /user/bids means the buyer reference was not stored.",
    expectedUiState:
      "The modal closes with a success state. The auction reads ₹15,000.00 and '1 bid'. No stack trace, file path or 'Cannot find module' text appears anywhere. /user/bids has a row for this auction.",
    expectedData: { currentBid: 15000, bidCount: 1 },
    endResult:
      "Reloading the auction still shows ₹15,000.00 and 1 bid, and the row is still on /user/bids.",
  },
  "checklist-buying-bidding-place-bid-live-other-viewer": {
    roles: ["buyer", "guest"],
    startPage: "/auctions/auction-tester-sandbox-cycle-2",
    steps: [
      "In window A, sign in as rehan.sheikh@gmail.com / TempPass123! and open /auctions/auction-tester-sandbox-cycle-2.",
      "In window B, open the same auction signed out, and read the current bid and bid count.",
      "In window A, click 'Place a bid', select the 'Minimum' preset at ₹15,000.00, and click 'Place Bid'.",
      "Switch to window B and watch for up to 10 seconds without reloading.",
    ],
    inputs: { bidAmount: 15000 },
    expectedBehaviour:
      "Bid updates are relayed over SSE from the server, which is why a signed-out viewer sees them at all — the underlying realtime node is not client-readable, so the browser never reads it directly.",
    expectedUiState:
      "Window B moves to 'Current bid ₹15,000.00' and '1 bid' within about 10 seconds, with no reload and no interaction. Figures that only change on refresh mean the stream is not connected.",
    expectedData: { currentBid: 15000, bidCount: 1 },
    endResult: "Reloading window B shows the same figures it had already updated to.",
  },
  "checklist-buying-bidding-place-bid-live-self": {
    roles: ["buyer"],
    startPage: "/auctions/auction-tester-sandbox-cycle-1",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /auctions/auction-tester-sandbox-cycle-1 and read the current bid and bid count.",
      "Click 'Place a bid', select the 'Minimum' preset, and click 'Place Bid'.",
      "Watch the page for 10 seconds without reloading it.",
    ],
    inputs: { bidAmount: 15000 },
    expectedBehaviour:
      "The bidder's own page updates in place from the same stream, so the figure they just moved is the figure they see. A page that requires a manual refresh after your own successful bid reads as though the bid failed.",
    expectedUiState:
      "The current bid and count both update without the tester refreshing. The page does not navigate, and no full-page loading state appears.",
    expectedData: { currentBid: 15000, bidCount: 1 },
    endResult: "On reload the same values persist.",
  },
  "checklist-buying-bidding-server-error-copy-is-never-raw": {
    roles: ["buyer", "admin"],
    startPage: "/auctions/auction-tester-sandbox-cycle-1",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /auctions/auction-tester-sandbox-cycle-1, click 'Place a bid', select 'Custom', type 15000, and click 'Place Bid'.",
      "Read every word of any error shown in the modal or as a toast.",
      "Repeat the bid a second time to force a rejection.",
      "Sign out and sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/maintenance/server-errors.",
    ],
    inputs: { bidAmount: 15000 },
    expectedBehaviour:
      "Any 5xx message is scrubbed before it reaches the browser and the real one is kept server-side for the error recorder. This modal is the exact place a Node module-not-found error, complete with a /var/task path and a full require stack, was once rendered to buyers inside 'Place your bid'.",
    expectedUiState:
      "Nothing containing '/var/task/', 'Require stack', 'Cannot find module' or any filesystem path appears in the modal, in a toast, or in the page body — only plain English. If an error did occur, /admin/maintenance/server-errors holds the full detail with a reference that matches what the user was shown.",
    endResult:
      "The admin error list keeps its entries across a reload. Readable user copy with nothing recorded server-side is only half a pass — the detail has to land somewhere.",
  },
  "checklist-buying-bidding-win-auction": {
    roles: ["buyer"],
    startPage: "/auctions/auction-tester-sandbox-won",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /auctions/auction-tester-sandbox-won.",
      "Open /user/bids and find the row for 'Test Auction — Already Won'.",
      "Click 'Pay now' on that row.",
      "Open /cart and switch to the 'Won Auctions' tab.",
      "Try to change the quantity and try to remove the line.",
      "Click through checkout, selecting the first saved address and Cash on Delivery, and place the order.",
      "Open /user/orders and switch to the 'Auction wins' tab.",
    ],
    inputs: { auctionId: "auction-tester-sandbox-won", winningBid: 15000, paymentMethod: "Cash on Delivery" },
    expectedBehaviour:
      "A win becomes a LOCKED cart line and is paid for through the ordinary checkout, which is the only flow that knows how to collect an address, take payment, split by store and produce a real order. Settlement used to write an order document directly in a shape no orders list could render and no checkout could accept, so a winner had no way to pay at all.",
    expectedUiState:
      "The /user/bids row shows a won badge and a working 'Pay now'. In the Won Auctions cart tab the line has no remove control and its quantity cannot be changed. After placing the order it appears under the 'Auction wins' tab of /user/orders with the item title and amount.",
    expectedData: { orderType: "auction" },
    endResult:
      "The order survives a reload under 'Auction wins'. The bid is back-linked to it, so the same win cannot be paid for twice.",
  },
};
