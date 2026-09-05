/*
 * WHY: Authored six-part procedures for the page-wiring/reachability page.
 * WHAT: 5 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * Every case here is the same shape: something was fully built and had no way in.
 * A page with no nav entry and a nav entry with no page are the two halves of one
 * defect, and both ship as "half done" without anything failing.
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
  "checklist-page-wiring-reachability-lottery-can-be-created-without-seeding": {
    roles: ["admin", "buyer"],
    startPage: "/admin/events/new",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/events/new and read every option in the event type picker.",
      "Select Lottery as the type.",
      "Type 'QA Event lottery-created-without-seeding' as the title, set a start date of today and an end date one week out, and save.",
      "Open /admin/lotteries and open the new event's slot editor.",
      "Add three slots numbered 1, 2 and 3, give each a name, and save.",
      "Sign out and sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open the new lottery's public page and pull slot 1.",
    ],
    inputs: { eventTitle: "QA Event lottery-created-without-seeding", slotCount: 3, pulledSlot: 1 },
    expectedBehaviour:
      "A lottery can be built entirely through the UI. The event and its slots are edited in different places on purpose — the slot editor has no fields for title, dates, status or media, so a lottery created there alone would have no dates, and the draw window is measured from them.",
    expectedUiState:
      "Lottery appears in the event type picker, which is where it was missing entirely. The event saves, its slot editor accepts three slots, and the public page renders them as a pullable grid. Slot 1 becomes booked after the pull.",
    expectedData: { lotteryInTypePicker: true },
    endResult:
      "A working lottery exists that no seed script created. Delete the event afterwards. Until this was fixed, lottery events could only come from the seeder.",
  },
  "checklist-page-wiring-reachability-carousel-can-be-renamed": {
    roles: ["admin"],
    startPage: "/admin/carousels",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/carousels and read the list.",
      "Open the first carousel and look for an 'Edit carousel' control.",
      "Change its name to 'QA Carousel can-be-renamed' and change its status.",
      "Save.",
      "RELOAD /admin/carousels and read the name and status.",
      "Set both back to their original values.",
    ],
    inputs: { newName: "QA Carousel can-be-renamed" },
    expectedBehaviour:
      "A named carousel can be edited after creation. The group editor was create-only, so a carousel's name was fixed for its entire life with no path to change it — and /admin/carousels rendered the flat slide editor rather than a list of named carousels at all.",
    expectedUiState:
      "The list page shows named carousels, not a bare slide editor. 'Edit carousel' exists, opens with the current values, and after saving and reloading the new name and status are shown.",
    expectedData: { editControlPresent: true },
    endResult:
      "The name and status are restored by the final step. Other cases read this carousel by its seeded name.",
  },
  "checklist-page-wiring-reachability-grouped-listing-members-editable-from-its-own-page": {
    roles: ["seller"],
    startPage: "/store/grouped-listings/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/grouped-listings/new.",
      "Read the form and look for a product picker, a minimum-active-members field and a cover-image field.",
      "Type 'QA Group members-editable' as the title.",
      "Add product-beyblade-burst-valkyrie and product-beyblade-x-wizard-arrow as members.",
      "Set minimum active members to 2 and attach public/test-media/sample-image.png as the cover image.",
      "Save.",
      "RELOAD the group's page and read its members, minimum and cover image.",
    ],
    inputs: {
      title: "QA Group members-editable",
      member1: "product-beyblade-burst-valkyrie",
      member2: "product-beyblade-x-wizard-arrow",
      minActiveMembers: 2,
      coverImage: "public/test-media/sample-image.png",
    },
    expectedBehaviour:
      "Members are chosen while the group is being created, in the same form. productIds was hardcoded to an empty array, so a group could only ever be created empty and populated from somewhere else — and neither the minimum-active-members nor the cover-image field had an input anywhere in the app.",
    expectedUiState:
      "All three controls are present on the create form. After saving and reloading, the group holds both products, a minimum of 2, and the uploaded cover image. A group that saves with zero members is the failure.",
    expectedData: { memberCount: 2, minActiveMembers: 2 },
    endResult:
      "Delete the group afterwards so it does not accumulate across runs.",
  },
  "checklist-page-wiring-reachability-public-nav-and-footer-resolve": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window with no session.",
      "Click every link in the public header navigation in turn, reading each destination and going back.",
      "Open the sidebar support links and click each one, reading each destination.",
      "Scroll to the footer and click every link in every column, reading each destination.",
      "Write down any link that lands on a not-found page, an empty shell, or back on the homepage.",
    ],
    expectedBehaviour:
      "Every public-facing link resolves to a real page with content. The nav audit only ever checked the three portal sidebars, so not one of these 55 hrefs was covered by anything — a rename anywhere in the public surface rotted silently.",
    expectedUiState:
      "All 55 destinations render real content. None shows a 404, none renders chrome with an empty body, and none silently redirects back to / — a redirect to the homepage looks like a working link and is not one.",
    expectedData: { brokenLinkCount: 0 },
    endResult:
      "Read-only; nothing persists. Record every broken href in the comment, not just the first — one report naming all of them is worth more than a verdict.",
  },
  "checklist-page-wiring-reachability-user-tester-hub-reachable-from-user-sidebar": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!, which carries the tester flag.",
      "Open /user and read the sidebar.",
      "Find the Testing group and click Tester Hub.",
      "Read where it lands.",
      "Sign out and sign in as rehan.sheikh@gmail.com / TempPass123!, which does not carry the flag.",
      "Open /user and read the sidebar for a Testing group.",
    ],
    inputs: { testerAccount: "tester@letitrip.in", nonTesterAccount: "rehan.sheikh@gmail.com" },
    expectedBehaviour:
      "The Testing group is injected at runtime for accounts carrying the tester flag and is empty for everyone else. An empty group must not render as a heading with nothing under it.",
    expectedUiState:
      "The tester sees a Testing group containing Tester Hub, and clicking it opens /user/tester with the checklist. The non-tester sees no Testing group at all — not a heading with no children, and not a link that leads to a 'Testers only' warning.",
    expectedData: { testingGroupVisibleForNonTester: false },
    endResult:
      "Read-only; nothing persists. Checking both accounts is the case — a group that renders for everybody would pass the first half alone.",
  },
};
