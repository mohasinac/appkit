/*
 * WHY: Authored six-part procedures for public-pages/newly-wired-browse-indexes.
 * WHAT: 8 cases, keyed by full checklist id.
 *
 * 🛑 SIX PAGES THAT WERE REACHABLE ONLY BY TYPING THE URL. /classified,
 * /digital-codes, /live, /lottery, /brands and /sellers each shipped with a real
 * page and a real ROUTES.PUBLIC constant and NO link from anywhere on the site,
 * so none has ever had a case (Root Cause #37). They were wired into the footer
 * on 2026-09-14; the first case is therefore about the LINK, not the page.
 *
 * Every one carries a guest dimension because a signed-out visitor is their
 * commonest caller, and because prices are gated for guests — a browse page that
 * breaks rather than gates is the failure mode to look for.
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
  "checklist-public-pages-newly-wired-browse-indexes-all-six-reachable-from-footer": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open the homepage and scroll to the footer.",
      "Read the Shop column and list every link in it.",
      "Click Classifieds and confirm where it lands.",
      "Go back and repeat for Digital Codes, Live Items, Lotteries, Brands and Verified Sellers.",
    ],
    expectedBehaviour:
      "A page with no inbound link is reachable only by someone who already knows the URL, and a crawler has nothing to follow to it. Wiring it into the footer is what makes it part of the site rather than an orphan.",
    expectedUiState:
      "All six appear in the footer Shop column and each opens its own page. Verified Sellers is labelled distinctly from Stores so the two do not read as the same destination.",
    expectedData: { footerLinksFound: 6 },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-public-pages-newly-wired-browse-indexes-classified-lists-only-classifieds": {
    roles: ["guest"],
    startPage: "/classified",
    steps: [
      "Open /classified.",
      "Read the badge on each of the first six cards.",
      "Open the first card and read the badge on its detail page.",
      "Note the URL the card led to.",
    ],
    expectedBehaviour:
      "A type-specific index lists exactly that type. A listing type is filtered through an alias map that is NOT compile-checked against the union, so an unmapped type has its filter silently dropped and the page returns everything (Root Cause #58).",
    expectedUiState:
      "Every card reads Classified. The detail page is at /classified/<slug>, not /products/<slug>.",
    expectedData: { foreignTypeCardsFound: 0 },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-public-pages-newly-wired-browse-indexes-digital-codes-lists-only-digital": {
    roles: ["guest"],
    startPage: "/digital-codes",
    steps: [
      "Open /digital-codes.",
      "Read the badge on each of the first six cards.",
      "Open the first card and confirm the URL it leads to.",
      "Read whether the detail page states how many codes remain.",
    ],
    expectedBehaviour:
      "Same alias-map exposure as the classifieds index, plus the availability count: a digital-code listing reports its remaining pool, and that number is derived from the pool rather than typed by the seller.",
    expectedUiState:
      "Every card reads Digital Code and each detail page is at /digital-codes/<slug>.",
    expectedData: { foreignTypeCardsFound: 0 },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-public-pages-newly-wired-browse-indexes-live-lists-only-live": {
    roles: ["guest"],
    startPage: "/live",
    steps: [
      "Open /live.",
      "Read the badge on every card shown.",
      "Open the first card and confirm the URL.",
      "Read whether the detail page shows the species and jurisdiction fields a live item carries.",
    ],
    expectedBehaviour:
      "The live index lists only live items. This type carries fields no other type has, so a card of another type here is visibly wrong on the detail page as well as on the badge.",
    expectedUiState:
      "Every card reads Live Item and each detail page is at /live/<slug>.",
    expectedData: { foreignTypeCardsFound: 0 },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-public-pages-newly-wired-browse-indexes-lottery-lists-active-lotteries": {
    roles: ["guest"],
    startPage: "/lottery",
    steps: [
      "Open /lottery.",
      "Count the lotteries listed and read the slot information on each.",
      "Open event-pokemon-number-draw-july-2026 from the list.",
      "Read how many slots it has and how many are taken.",
      "Go back and look for event-beyblade-slot-raffle-draft, which is a DRAFT.",
    ],
    inputs: {
      activeLottery: "event-pokemon-number-draw-july-2026",
      draftLottery: "event-beyblade-slot-raffle-draft",
    },
    expectedBehaviour:
      "The index lists ACTIVE lotteries. A draft is unfinished work and must not be public — and a slot count shown publicly must never expose a slot's price or weight, which are server-side fields.",
    expectedUiState:
      "The active lottery is listed with its slot counts. The draft one is absent.",
    expectedData: { draftLotteryListed: false },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-public-pages-newly-wired-browse-indexes-brands-tiles-open-their-brand": {
    roles: ["guest"],
    startPage: "/brands",
    steps: [
      "Open /brands and write down each brand's name and the product count on its tile.",
      "Open the first brand.",
      "Read the total the brand page reports.",
      "Read the brand name on two of its product cards.",
    ],
    expectedBehaviour:
      "A brand tile's count promises what its page lists. Products are matched to a brand by DISPLAY NAME rather than by id, so a brand whose name and whose products' brand strings have drifted apart lists nothing while still showing a count.",
    expectedUiState:
      "The tile count equals the brand page's total, and the products shown carry that brand's name.",
    expectedData: { tileCountMatchesPage: true },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-public-pages-newly-wired-browse-indexes-sellers-is-not-a-copy-of-stores": {
    roles: ["guest"],
    startPage: "/sellers",
    steps: [
      "Open /sellers and write down what each row shows.",
      "Open /stores in a second tab and write down what each card shows.",
      "Compare the two: what does one show that the other does not.",
      "Click through from each to a seller or store and note where you land.",
    ],
    expectedBehaviour:
      "These are two pages with two purposes — verified sellers, and shopfronts. If they are indistinguishable then one of them is a duplicate and the footer now has two links to the same thing, which is worse than the single unlinked page it replaced.",
    expectedUiState:
      "The two pages present different information. Each link lands somewhere coherent with the page it came from.",
    expectedData: { pagesAreDistinguishable: true },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-public-pages-newly-wired-browse-indexes-guest-can-browse-all-six": {
    roles: ["guest"],
    startPage: "/classified",
    steps: [
      "Open a private window with no session.",
      "Open each of /classified, /digital-codes, /live, /lottery, /brands and /sellers in turn.",
      "On each, confirm cards render and note what appears where a price would be.",
      "Open one listing detail page from a price-bearing index.",
      "Read the price area on that detail page.",
    ],
    expectedBehaviour:
      "Prices are hidden from signed-out visitors, and the listing itself is not. The gate replaces the amount with a prompt; it does not remove the row, blank the card or break the page — a card whose price row vanishes reads as a rendering fault and changes the row height.",
    expectedUiState:
      "All six pages render for a guest. Where a price would be, a sign-in prompt appears in its place rather than an empty gap or a broken layout.",
    expectedData: { pagesBrokenForGuest: 0 },
    endResult: "No session is created and nothing is changed.",
  },
};
