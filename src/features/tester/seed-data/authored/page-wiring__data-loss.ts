/*
 * WHY: Authored six-part procedures for the page-wiring/data-loss page.
 * WHAT: 4 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 EVERY CASE HERE ENDS IN A RELOAD, and that is not padding. All four bugs
 * these cases exist for returned HTTP 200 with a success message and wrote
 * nothing, or wrote the wrong thing. The screen after saving looked correct in
 * every one of them; only the reload told the truth.
 *
 * 🛑 SLOTS 1-5 ARE ALREADY BOOKED IN THE SEED (corrected 2026-09-29), so the
 * first case could not start: it told the tester to pull slot 3, and slot 3 is
 * taken by 'Arjun M'. `maxPullsPerUser` is 1 on this lottery, so a pull is also
 * a once-per-persona-per-run action and a poor fixture for a case about
 * surviving an edit. The seeded bookings ARE the fixture; no pull is needed.
 *
 * 🛑 AND NONE OF THE FIVE BOOKERS IS A REAL ACCOUNT. user-ravi-k,
 * user-priya-s, user-arjun-m, user-sneha-p and user-vikram-r appear in
 * events-seed-data.ts (as lotteryConfig.slots[].bookedByUserId) and in
 * lottery-entries-seed-data.ts, and NONE of them exists in users-seed-data.ts.
 * So nobody can sign in as the person who booked slot 3, and any step asking
 * for that is unperformable. The buyer-side check is done from the public page
 * instead, which needs no account. Recorded in OUTOFSCOPE: dangling seed FKs
 * are data, and repairing them is not a case edit.
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
  "checklist-page-wiring-data-loss-lottery-edit-preserves-bookings": {
    roles: ["admin", "guest"],
    startPage: "/admin/lotteries",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123! and open /lottery/event-pokemon-number-draw-july-2026.",
      "Read the slot grid and write down slots 1 to 5 — all five are booked in the seed — recording each slot number, the buyer name shown against it and its lottery number.",
      "Open /admin/lotteries and open the editor for that lottery.",
      "Rename slot number 7 to 'QA Slot lottery-edit-preserves-bookings'. Slot 7 is 'Alakazam Base Set Holo' and is NOT booked — renaming an unbooked slot is the whole point.",
      "Save.",
      "Reload the editor and read slots 1 to 5 against what was written down, then read slot 7.",
      "Read the price on each of slots 1 to 5 as well — slot 1 is 5000, slot 3 is 2500 — and confirm none has become 0.",
      "Sign out and open /lottery/event-pokemon-number-draw-july-2026 to read the same five slots as a visitor sees them.",
    ],
    inputs: {
      bookedSlots: "1, 2, 3, 4, 5",
      renamedSlot: 7,
      newName: "QA Slot lottery-edit-preserves-bookings",
      slot1Price: 5000,
      slot3Price: 2500,
    },
    expectedBehaviour:
      "The write shape cannot express booking state at all, so an admin editing prize names cannot touch attendance. Bookings are re-attached from the stored config and matched by slot NUMBER, never by array position — deleting a slot shifts every later index, and an index-wise merge hands slot 7's buyer the prize that was slot 8's.",
    expectedUiState:
      "After the save and reload, all five booked slots are still booked, carrying the same buyer names and the same lottery numbers. Slot 7 carries its new name. Every price is unchanged — a grid of zeros is the same defect's twin, caused by seeding the editor from the public projection, which strips price and weight. The public page shows the same five slots still taken.",
    expectedData: { bookedSlotsAfterSave: 5, slotsPricedZero: 0 },
    endResult:
      "The pull survives the admin edit. The editor once sent isBooked:false for every slot into a passthrough route, so the first save of a live lottery marked every purchased slot available again and erased the buyers — with a success message and no error anywhere.",
  },
  "checklist-page-wiring-data-loss-lottery-booked-slot-cannot-be-deleted": {
    roles: ["admin"],
    startPage: "/admin/lotteries",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/lotteries and open the editor for event-pokemon-number-draw-july-2026.",
      "Find slot number 3, which the seed ships already booked by 'Arjun M' — no earlier case has to run for this to be true.",
      "Remove that slot from the list.",
      "Save.",
      "Read the error message.",
      "Reload the editor and read slot 3.",
    ],
    inputs: { bookedSlot: 3 },
    expectedBehaviour:
      "Removing a slot somebody has pulled is refused as a CONFLICT, not as a validation error. The request is well formed and the admin is not confused — the world changed under them, and the correct next action is to reopen the pull rather than fix a field.",
    expectedUiState:
      "The save fails and the message names the slot number that blocked it, so the admin knows which one to deal with. It does not read as a form error attached to a field, and it is not a generic 'Something went wrong'.",
    expectedData: { slot3StillPresent: true },
    endResult:
      "Slot 3 is still there and still booked after the reload. A save that succeeds and quietly drops the slot is the failure.",
  },
  "checklist-page-wiring-data-loss-admin-grouped-listing-title-actually-saves": {
    roles: ["admin"],
    startPage: "/admin/grouped-listings",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/grouped-listings, find group-beyblade-original-lineage, and write down its exact title.",
      "Open /admin/grouped-listings/group-beyblade-original-lineage/edit.",
      "Replace the title with 'QA Group admin-grouped-listing-title-actually-saves'.",
      "Save and read the confirmation.",
      "RELOAD the page.",
      "Read the title.",
      "Set the title back to what it was and save.",
    ],
    inputs: {
      group: "group-beyblade-original-lineage",
      newTitle: "QA Group admin-grouped-listing-title-actually-saves",
    },
    expectedBehaviour:
      "The admin PATCH accepts every field the editor can send, not just productIds. A Zod object schema STRIPS unknown keys rather than rejecting them, so a schema listing only productIds turned a title change into a perfectly normal 200 that wrote nothing at all. Verified fixed on 2026-09-29 — the admin route now parses the same strict schema as the seller route, so a pass here is the expected result. It is kept because the failure was invisible without a reload and would return the moment the two schemas diverge again.",
    expectedUiState:
      "After the reload the title is the new one. A save confirmation followed by the OLD title after reload is the exact failure — and without the reload the screen looks identical either way, because the form is still showing what was typed.",
    expectedData: { titlePersisted: true },
    endResult:
      "The title is restored to its original value by the final step, so other cases that read this group by name still work.",
  },
  "checklist-page-wiring-data-loss-store-address-landmark-survives-edit": {
    roles: ["seller"],
    startPage: "/store/addresses",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/addresses and create a pickup address from the drawer: name 'QA Address landmark-survives', street '8 Test Lane', city 'Indore', state 'Madhya Pradesh', pincode 452010, landmark 'Opposite the stadium gate'.",
      "Save and reload the page, then read the address's landmark.",
      "Open /store/addresses/{id}/edit for that address.",
      "Change the street to '9 Test Lane' and leave everything else alone.",
      "Save.",
      "RELOAD the page and read the landmark.",
    ],
    inputs: {
      name: "QA Address landmark-survives",
      landmark: "Opposite the stadium gate",
      streetBefore: "8 Test Lane",
      streetAfter: "9 Test Lane",
    },
    expectedBehaviour:
      "The edit form carries every field the route accepts. A form missing one field does not leave it alone — it sends undefined, and undefined overwrites. The landmark was dropped on every single edit for exactly that reason.",
    expectedUiState:
      "After the reload the street reads '9 Test Lane' AND the landmark still reads 'Opposite the stadium gate'. A blank landmark after an unrelated edit is the failure, and it is invisible until the reload.",
    expectedData: { landmark: "Opposite the stadium gate" },
    endResult:
      "Delete the address afterwards. What this case really asks of any authoring form is: what does the stored record hold that the form cannot name?",
  },
};
