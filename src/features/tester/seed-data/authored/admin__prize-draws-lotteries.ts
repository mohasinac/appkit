/*
 * WHY: Authored six-part procedures for the admin/prize-draws-lotteries page.
 * WHAT: 5 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THIS IS THE PAGE WHERE A SAVE ONCE DESTROYED BUYERS. The lottery editor sent
 * a booked flag of false for every slot into a passthrough route, so the first
 * save of a live lottery marked every purchased slot available again and erased
 * who had bought them — with a success message and no error anywhere. The write
 * shape now cannot express booking state at all, and two cases here exist to keep
 * it that way.
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
  "checklist-admin-prize-draws-lotteries-prizedraw-create": {
    roles: ["admin", "guest"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Create a prize draw titled 'QA Prize Draw admin-create' at 80 per entry, 25 entries, instant-reveal mode.",
      "Define at least two prizes with names and save.",
      "RELOAD the editor and read the mode, the per-entry price, the entry count and the prizes.",
      "Open the public page in a private window and read the purchase panel's wording.",
      "Read whether the panel describes buying an ENTRY rather than buying the prize.",
    ],
    inputs: { title: "QA Prize Draw admin-create", pricePerEntry: 80, entryCount: 25 },
    expectedBehaviour:
      "A prize draw is created with a per-entry price, an entry pool and a reveal mode. The public wording is part of the case rather than a copy preference: a panel reading 'Buy now' beside a price misrepresents what the money buys, which is a consumer claim.",
    expectedUiState:
      "After the reload every field holds, including both prizes. The public panel names an entry and its per-entry price. A panel presenting the prize as the thing being purchased is the failure.",
    endResult: "Leave the draw in place — the next three cases read it.",
  },
  "checklist-admin-prize-draws-lotteries-prizedraw-reveal-winner": {
    roles: ["admin", "buyer"],
    startPage: "/admin/products",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and buy one entry in 'QA Prize Draw admin-create' with Cash on Delivery.",
      "Read what the order page shows immediately after payment.",
      "Sign out and sign in as admin@letitrip.in / TempPass123!.",
      "Open the draw's admin view and read the entries and any reveal control.",
      "Trigger the reveal if the mode requires it, and read the assigned prize.",
      "Sign back in as the buyer and read the prize on their order.",
      "Compare the prize the admin sees against the one the buyer sees.",
    ],
    inputs: { entries: 1, pricePerEntry: 80 },
    expectedBehaviour:
      "The prize is drawn once with real randomness and then stored. Drawing per render would show a different prize on every load — which is why both sides are read and compared rather than either being trusted alone.",
    expectedUiState:
      "The buyer's order names one prize and the admin's view names the same one. Reloading either side shows the same prize. A prize that changes on reload was never persisted.",
    endResult:
      "One entry is sold and revealed. The admin and buyer views agreeing is the assertion.",
  },
  "checklist-admin-prize-draws-lotteries-prizedraw-lock-on-reveal": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the editor for 'QA Prize Draw admin-create', now that a prize has been revealed.",
      "Attempt to change the prize list — rename a prize or remove one — and save.",
      "Read what happens.",
      "Attempt to change the per-entry price and save, then read what happens.",
      "RELOAD and read whether the revealed entry still names the same prize.",
    ],
    expectedBehaviour:
      "Once a prize has been revealed the draw's prize definitions lock. Editing them afterwards would rewrite what a buyer has already been told they won, and the buyer's own record is the one that binds.",
    expectedUiState:
      "The prize edit is refused, or the fields are visibly locked. After the reload the revealed entry still names the prize the buyer was shown. A silently accepted prize rename is the failure, and it is invisible unless the buyer's side is re-read.",
    endResult:
      "The revealed prize is unchanged. Delete the draw afterwards.",
  },
  "checklist-admin-prize-draws-lotteries-prizedraw-scam-guard": {
    roles: ["admin", "buyer"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open a prize draw's admin view and read what the reveal mechanism is described as.",
      "Read whether the admin can choose WHO wins a specific prize.",
      "Read whether the admin can see, before revealing, which prize an entry will draw.",
      "Trigger a reveal and read whether the outcome was predictable from anything on screen beforehand.",
      "Open the public page and read whether the odds or prize pool are disclosed to buyers.",
    ],
    expectedBehaviour:
      "The draw is not steerable. Prizes are assigned by cryptographic randomness at reveal, so an admin cannot pick a winner and cannot see the outcome in advance — a prize draw an operator can steer is a rigged one, whatever else the page does correctly.",
    expectedUiState:
      "No control assigns a specific prize to a specific entry or buyer. Nothing on the admin screen discloses an entry's outcome before it is revealed. The public page states the prize pool so buyers know what they are entering.",
    endResult:
      "Read-only apart from any reveal performed. Report exactly what an admin CAN influence — that is the substance of this case.",
  },
  "checklist-admin-prize-draws-lotteries-prizedraw-entries-view": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open a prize draw's entries view and read every column.",
      "Check each row shows enough to identify the entry without opening it.",
      "Read whether buyer identities are shown in full or masked.",
      "Read the row actions offered and check at least one lets you VIEW the entry.",
      "Use any filter or search offered and confirm it changes the rows.",
      "Search zzzznope and confirm zero results.",
    ],
    inputs: { nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "An admin can read entries before acting on them. A row offering only mutations lets an admin act on a record they were never able to read, which is the dead-end shape this whole page family exists to close — and the nonsense query is what proves any search present is filtering rather than decorating.",
    expectedUiState:
      "Rows identify their entries and offer a view affordance, not only actions. Filters change the rows and 'zzzznope' returns none. Buyer identities are shown as the admin needs them but are not more exposed than the moderation task requires.",
    expectedData: { nonsenseResultCount: 0 },
    endResult:
      "Read-only. Delete 'QA Prize Draw admin-create' as the last action of this page.",
  },
};
