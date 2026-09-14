/*
 * WHY: Authored six-part procedures for the public-pages/help-scams-guides-subpages page.
 * WHAT: 14 case(s), keyed by full checklist id.
 *
 * Eleven public routes the second sweep found with no case naming them anywhere.
 * They were missed the first time because the first sweep only walked the
 * dashboard trees — which is the reason to record the method here: the gap was in
 * the MEASUREMENT, not in the writing, and a narrower sweep than the rule it feeds
 * reports a smaller backlog than exists.
 *
 * 🛑 `/seller-guide` AND `/store/guide` ARE DIFFERENT ROUTE FAMILIES. The first is
 * public marketing a prospective seller reads before signing up; the second is the
 * signed-in seller's manual. An existing case covering the dashboard guides looked
 * like coverage of both and is coverage of neither.
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
  "checklist-public-pages-help-scams-guides-subpages-help-subpages-load": {
    roles: ["guest"],
    startPage: "/help",
    steps: [
      "Open /help signed out.",
      "Open /help/account, /help/auctions, /help/orders and /help/shopping in turn.",
      "Read each one's status in the network panel and the content it renders.",
      "Record any that 404s or renders an empty shell.",
      "Return to /help and check each of the four is linked from it.",
    ],
    expectedBehaviour:
      "All four load with real content and are reachable from the parent. A sub-page that exists but is linked from nowhere is unreachable to anyone who did not type the URL — which is every visitor.",
    expectedUiState:
      "Four pages returning 200 with readable content, all four linked from /help. A 404, an empty shell, or a page with no inbound link is a finding, named.",
    expectedData: { helpSubpagesNotFound: 0 },
    endResult: "Read-only.",
  },
  "checklist-public-pages-help-scams-guides-subpages-help-subpages-linked-both-ways": {
    roles: ["guest"],
    startPage: "/help",
    steps: [
      "Open /help and note every link into a help sub-page.",
      "Follow one and look for a way back to /help from it.",
      "Use it and check the browser lands on /help.",
      "Repeat on the other three sub-pages.",
      "Check the site's own navigation or footer also offers a route into help.",
    ],
    expectedBehaviour:
      "Help navigates in both directions. A visitor who arrives on a sub-page from a search result has no context and no route onward unless the page carries one — and help is precisely where somebody arrives already stuck.",
    expectedUiState:
      "Every sub-page offers a working route back to /help, and /help links forward to all four. A dead-end sub-page is the finding.",
    endResult: "Read-only.",
  },
  "checklist-public-pages-help-scams-guides-subpages-help-subpage-content-matches-title": {
    roles: ["guest"],
    startPage: "/help",
    steps: [
      "Open /help/auctions and read its content.",
      "Open /help/orders and read its content.",
      "Compare the two.",
      "Open /help/account and /help/shopping and read those.",
      "Check none of the four repeats the parent page's text verbatim.",
      "Check each answers questions about its own topic.",
    ],
    expectedBehaviour:
      "Each sub-page is about its own subject. Four routes rendering one shared body is a page family that was scaffolded and never filled — it loads, it links, and it answers nothing.",
    expectedUiState:
      "Four distinct bodies, each on its own topic. Two or more sharing text is the finding, named by which pages.",
    endResult: "Read-only.",
  },
  "checklist-public-pages-help-scams-guides-subpages-scams-types-page-loads": {
    roles: ["guest"],
    startPage: "/scams/types",
    steps: [
      "Open /scams/types and list every scam category it names.",
      "Count them.",
      "Open /scams/report and read the categories its own type field offers.",
      "Compare the two lists.",
      "Record any category on one and not the other.",
    ],
    expectedBehaviour:
      "The types page and the report form name the same categories. A page listing fewer teaches a reporter a vocabulary the form will not accept; a form offering more means categories nobody has explained. Either way the reporter picks the wrong one, and the registry's own filters then never surface their report.",
    expectedUiState:
      "The two lists match. Any category present on one side only is the finding, named with which side it was missing from.",
    expectedData: { categoriesOnlyOnOneSide: 0 },
    endResult: "Read-only.",
  },
  "checklist-public-pages-help-scams-guides-subpages-scams-faqs-page-loads": {
    roles: ["guest"],
    startPage: "/scams/faqs",
    steps: [
      "Open /scams/faqs and count the questions listed.",
      "Expand three of them and read the answers.",
      "Check each answer is real prose rather than placeholder text.",
      "Check the page states how to report a scam and links to the report form.",
      "Read the console for errors.",
    ],
    expectedBehaviour:
      "The page carries real questions with real answers and routes onward to reporting. Somebody reading a scams FAQ is usually mid-incident, so the route to the report form is the most load-bearing link on the page.",
    expectedUiState:
      "Several questions with substantive answers, a working link to /scams/report, and a clean console. An empty accordion is the finding.",
    endResult: "Read-only.",
  },
  "checklist-public-pages-help-scams-guides-subpages-scams-report-form-submits": {
    roles: ["guest", "buyer"],
    startPage: "/scams/report",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /scams/report and fill every required field, using the description 'QA scam report probe — checklist case, please ignore.'",
      "Pick a scam type from the list offered.",
      "Submit the form.",
      "Read what is shown afterwards.",
      "Check the reporter is told what happens next rather than only that it was sent.",
    ],
    inputs: { description: "QA scam report probe — checklist case, please ignore." },
    expectedBehaviour:
      "The form submits and tells the reporter what follows. A bare confirmation leaves somebody who has just been defrauded with no idea whether anyone will look, how long it takes, or what they should do meanwhile.",
    expectedUiState:
      "A confirmation naming what happens next — review, timescale, or a reference. A bare 'Submitted' is a finding worth recording even though the submission worked.",
    endResult: "One QA scam report exists; remove it if the admin surface allows.",
  },
  "checklist-public-pages-help-scams-guides-subpages-scams-report-errors-inline": {
    roles: ["buyer"],
    startPage: "/scams/report",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /scams/report and submit it completely empty.",
      "Read where the errors appear.",
      "Check each error is on its own field rather than in a single banner.",
      "Fill one field and submit again, checking that field's error clears.",
      "Check no server-side message leaks internal detail such as a file path or a stack.",
    ],
    expectedBehaviour:
      "Errors land on the fields they belong to, and a server-side failure is translated into a human message rather than passed through. A raw server message reaching a form is how a module-load failure with a full stack trace once rendered inside a bidding dialog.",
    expectedUiState:
      "One inline error per empty required field, clearing as each is filled. A single banner is a finding; any file path, stack frame or internal identifier in a message is a more serious one.",
    endResult: "Nothing is submitted.",
  },
  "checklist-public-pages-help-scams-guides-subpages-scams-report-reaches-admin": {
    roles: ["buyer", "admin"],
    startPage: "/scams/report",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and submit a report with the description 'QA scam report routing probe — checklist case.'",
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Find that report in an admin surface.",
      "Open it and read the description and the reporter.",
      "Check it can be actioned — accepted, rejected or turned into a registry entry.",
      "Remove the QA report if the interface allows.",
    ],
    inputs: { description: "QA scam report routing probe — checklist case." },
    expectedBehaviour:
      "A submitted report reaches an admin who can act on it. A public form with no admin surface behind it is the worst half-built shape available — the reporter is told their report was received, and it goes nowhere.",
    expectedUiState:
      "The report is visible to the admin with its description and reporter, and offers an action. A form with nothing behind it is the finding.",
    endResult: "The QA report is removed if possible.",
  },
  "checklist-public-pages-help-scams-guides-subpages-scams-subpages-linked-from-registry": {
    roles: ["guest"],
    startPage: "/scams",
    steps: [
      "Open /scams signed out.",
      "Look for links to the types page, the FAQ page and the report form.",
      "Follow each and check it lands on the right page.",
      "Return each time.",
      "Record any of the three that is not linked from /scams.",
    ],
    expectedBehaviour:
      "The registry links to its own sub-pages. A visitor lands on /scams to check a name; if they recognise their own situation there, the report form has to be one click away rather than a URL they would have to guess.",
    expectedUiState:
      "All three linked and all three resolving. An unlinked sub-page is a finding, named.",
    expectedData: { unlinkedScamSubpages: 0 },
    endResult: "Read-only.",
  },
  "checklist-public-pages-help-scams-guides-subpages-public-seller-guide-loads": {
    roles: ["guest"],
    startPage: "/seller-guide",
    steps: [
      "Open /seller-guide signed out and read its content.",
      "Note whether it reads as marketing for prospective sellers or as a dashboard manual.",
      "Sign in as tyson@beybladearena.in / TempPass123! and open /store/guide.",
      "Read that content.",
      "Compare the two.",
      "Check neither is a copy of the other.",
    ],
    expectedBehaviour:
      "These are two different route families with two different audiences — a prospective seller who has not signed up, and a signed-in seller managing a store. An existing case covering the dashboard guides looked like coverage of both and was coverage of neither.",
    expectedUiState:
      "Two distinct bodies aimed at two audiences. The public one being a copy of the dashboard manual, or requiring a sign-in, are both findings.",
    endResult: "Read-only.",
  },
  "checklist-public-pages-help-scams-guides-subpages-public-seller-guide-subpages-load": {
    roles: ["guest"],
    startPage: "/seller-guide",
    steps: [
      "Open /seller-guide and look for links to its bundles and prize-draws pages.",
      "Open /seller-guide/bundles and read its content and status.",
      "Open /seller-guide/prize-draws and read the same.",
      "Check both are linked from the parent.",
      "Check each has a route back to /seller-guide.",
    ],
    expectedBehaviour:
      "Both sub-pages load and are reachable from the parent in both directions. They explain the two listing types a prospective seller is least likely to already understand, so an unlinked page is a page nobody reads.",
    expectedUiState:
      "Both return 200 with real content, are linked from /seller-guide, and link back. A 404 or an unlinked page is a finding.",
    endResult: "Read-only.",
  },
  "checklist-public-pages-help-scams-guides-subpages-public-seller-guide-matches-product": {
    roles: ["guest", "seller"],
    startPage: "/seller-guide",
    steps: [
      "Open /seller-guide/bundles and write down every claim it makes about how bundles work — pricing, membership, whether a buyer can pick.",
      "Sign in as tyson@beybladearena.in / TempPass123! and create a bundle, reading what the editor actually offers.",
      "Compare each claim against what the editor does.",
      "Open /seller-guide/prize-draws and write down its claims.",
      "Create a prize draw and compare in the same way.",
      "Record every claim the product does not keep.",
    ],
    expectedBehaviour:
      "The guide describes the product as it is. A bundle is all-or-nothing and a buyer cannot pick its members — a guide implying otherwise is describing a grouped listing, which is a different feature with a different page. A prospective seller signs up for whichever one the guide described.",
    expectedUiState:
      "Every claim on both pages is reproducible in the editor. Each unmet claim is a finding, quoted and paired with what actually happens.",
    endResult: "Any bundle or prize draw created for this case is deleted.",
  },
  "checklist-public-pages-help-scams-guides-subpages-seller-guide-reachable-signed-out": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open the homepage in a private window with no session.",
      "Find a route to the public seller guide without typing its URL — a navigation entry, a footer link, or a sell-with-us call to action.",
      "Follow it and check it lands on /seller-guide.",
      "Check no sign-in was demanded along the way.",
      "Check the guide's own call to action leads to the become-a-seller flow.",
    ],
    expectedBehaviour:
      "A signed-out visitor can find and read the guide, then act on it. Gating the pitch behind a sign-in inverts the funnel — the page exists to persuade somebody who has not signed up yet.",
    expectedUiState:
      "A discoverable route from the homepage, no sign-in demanded, and a call to action leading to the seller onboarding flow.",
    endResult: "Read-only.",
  },
  "checklist-public-pages-help-scams-guides-subpages-item-requests-new-form-opens": {
    roles: ["buyer"],
    startPage: "/item-requests/new",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /item-requests/new directly by URL.",
      "Check the form is already open rather than the page being blank.",
      "Fill it with the title 'QA Item Request Probe' and a description naming this checklist case.",
      "Submit it.",
      "Read where the browser lands and check the request appears in /item-requests.",
      "Reload and check it is still there, then remove it.",
    ],
    inputs: { title: "QA Item Request Probe" },
    expectedBehaviour:
      "An editor that is also a page opens with its form showing, and a submitted request appears in the list. Reloading is the check that separates a stored request from one that only ever existed in the browser.",
    expectedUiState:
      "The form is open on arrival, the request appears in /item-requests, and is still there after a reload. A blank page on arrival is the finding.",
    endResult: "The QA item request is removed.",
  },

  /* ── Added 2026-09-14 (F3d) ──────────────────────────────────────────────────
   * The blanket cases above cover the four help sub-pages AS A SET — they load,
   * they are linked both ways, their content differs from the parent's. These six
   * address each page on its own terms and against the feature it documents,
   * which is the half no "does it load" case reaches.
   */
  "checklist-public-pages-help-scams-guides-subpages-help-account-matches-product": {
    roles: ["buyer"],
    startPage: "/help/account",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /help/account and write down what it says about changing a password, changing an email, and closing an account.",
      "Open /user/settings and find the controls for each of those three.",
      "Compare what the help page describes against what the settings page actually offers.",
    ],
    expectedBehaviour:
      "Each of the three is described as the product actually implements it. Password change is a Firebase reset LINK sent to the account's inbox, not an in-page old/new password form — a help page describing an in-page form sends the user hunting for a control that does not exist.",
    expectedUiState:
      "For each of the three actions, either the settings page offers what the help page describes, or the difference is quoted from both. An action the help page names with no control anywhere is the strongest finding.",
    endResult: "Read-only — do not actually change the password or email. Nothing persists.",
  },
  "checklist-public-pages-help-scams-guides-subpages-help-auctions-matches-product": {
    roles: ["buyer"],
    startPage: "/help/auctions",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /help/auctions and write down what it tells a buyer about placing a bid, about being outbid, and about what happens if they lose.",
      "Open /auctions/auction-beyblade-original-dragoon-storm and read what the bid form states.",
      "Open /user/bids and read what it shows for a bid that is no longer winning.",
      "Compare all three claims.",
    ],
    expectedBehaviour:
      "The help page's account of bidding, being outbid and losing matches what the auction page and the bids list actually do — including whether a losing bidder is notified at all.",
    expectedUiState:
      "Each claim is matched against a real screen. Any claim with no corresponding behaviour is quoted verbatim.",
    endResult: "Place no bid. Nothing persists.",
  },
  "checklist-public-pages-help-scams-guides-subpages-help-orders-matches-product": {
    roles: ["buyer"],
    startPage: "/help/orders",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /help/orders and list every action it says a buyer can take on an order — cancelling, returning, tracking, downloading an invoice.",
      "Open /user/orders and open one order's detail page.",
      "List the actions actually offered there.",
      "Compare the two lists in both directions.",
    ],
    expectedBehaviour:
      "Every action the help page names is offered somewhere on a real order, and the order page offers nothing significant the help page omits. An action named in help but absent from the order page is the finding.",
    expectedUiState:
      "Both lists are written down. Each missing or extra action is named, with the order id it was checked against.",
    endResult: "Read-only — do not cancel or return anything. Nothing persists.",
  },
  "checklist-public-pages-help-scams-guides-subpages-help-shopping-matches-product": {
    roles: ["buyer"],
    startPage: "/help/shopping",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /help/shopping and write down what it says about carts, wishlists and coupons.",
      "Add product-beyblade-burst-valkyrie to the cart and open /cart.",
      "Open /wishlist.",
      "Check each claim the help page made against those two screens, including any coupon rule it states.",
    ],
    expectedBehaviour:
      "The help page's description of the cart, the wishlist and how coupons combine matches the product. The coupon rule is the one most likely to be stale: at most one seller coupon per store plus at most one platform-wide coupon.",
    expectedUiState:
      "Each claim is matched against the cart or wishlist screen. Any stale sentence is quoted, with what the screen actually did.",
    endResult: "Remove the cart line afterwards. Place no order.",
  },
  "checklist-public-pages-help-scams-guides-subpages-seller-guide-bundles-matches-product": {
    roles: ["seller"],
    startPage: "/seller-guide/bundles",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /seller-guide/bundles and write down every rule it states about what a bundle may contain and how it is priced.",
      "Open the seller bundle editor from /store and begin creating a bundle.",
      "Check each rule from the guide against what the editor allows or refuses.",
      "In particular, check whether the guide says anything about all members having to belong to one store.",
    ],
    expectedBehaviour:
      "Every rule in the guide is enforced by the editor, and the editor enforces no significant rule the guide fails to mention. A bundle's members must all belong to a single store — that is refused at save time — so a guide silent on it invites a seller to build a bundle that cannot be saved.",
    expectedUiState:
      "Each rule is matched against the editor's behaviour. A rule the guide states that the editor does not enforce, or a refusal the guide never warned about, is quoted.",
    endResult: "Do not save the bundle — abandon the editor. Nothing persists.",
  },
  "checklist-public-pages-help-scams-guides-subpages-seller-guide-prize-draws-matches-product": {
    roles: ["seller"],
    startPage: "/seller-guide/prize-draws",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /seller-guide/prize-draws and write down what it promises about entries, about how a winner is revealed, and about refunds if the draw does not fill.",
      "Open the prize-draw creation flow from /store and read the options actually offered.",
      "Open /prize-draws and pick a live draw to see what a buyer is shown.",
      "Compare all three promises against what you saw.",
    ],
    expectedBehaviour:
      "The entry mechanism, the reveal and the refund behaviour described in the guide are the ones the product implements. Refunds are the one that matters most: a seller who believes unfilled draws auto-refund, when they do not, has made a promise to buyers on the product's behalf.",
    expectedUiState:
      "Each of the three promises is matched against a real screen, and any that is unsupported is quoted verbatim from the guide.",
    endResult: "Do not create a draw — abandon the flow. Nothing persists.",
  },
};
