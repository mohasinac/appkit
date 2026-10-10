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
 * 🛑 Two fixtures pinned on 2026-09-29. Exactly ONE named carousel is seeded
 * — carousel-hero-default, 'Homepage Hero', status active — so 'the first
 * carousel' is that one, and its status toggles between exactly two values,
 * active and draft. The 'Edit carousel' control lives on the DETAIL page
 * /admin/carousels/{id}, not on the list, which only links to each row.
 *
 * Verified before asserting: /admin/events/new really does derive its type list
 * from ALL_EVENT_TYPES now, so Lottery is in the picker and the first case
 * should pass. Its own file still carries the note about the local copy that
 * omitted it, which is why lottery events could once only come from the seeder.
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
      "Open /lottery/{the new event id} and pull slot 1.",
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
      "Open /admin/carousels and read the list — one carousel is seeded, 'Homepage Hero', with status active.",
      "Open /admin/carousels/carousel-hero-default and find its 'Edit carousel' control. It is on this detail page, not on the list.",
      "Change the name to 'QA Carousel can-be-renamed' and the status from active to draft.",
      "Save.",
      "RELOAD /admin/carousels and read the name and status in the row.",
      "Set the name back to 'Homepage Hero' and the status back to active, then reload once more to confirm.",
    ],
    inputs: {
      carousel: "carousel-hero-default",
      originalName: "Homepage Hero",
      newName: "QA Carousel can-be-renamed",
      statusBefore: "active",
      statusAfter: "draft",
    },
    expectedBehaviour:
      "A named carousel can be edited after creation. The group editor was create-only, so a carousel's name was fixed for its entire life with no path to change it — and /admin/carousels rendered the flat slide editor rather than a list of named carousels at all.",
    expectedUiState:
      "The list page shows named carousels, not a bare slide editor. 'Edit carousel' exists on the detail page, opens with the current values, and after saving and reloading the list row reads 'QA Carousel can-be-renamed' with status draft. Status has exactly two values here — active and draft — so a picker offering more is itself worth noting.",
    expectedData: { editControlPresent: true },
    endResult:
      "The name reads 'Homepage Hero' and the status is active again. Other cases read this carousel by that seeded name, and it is the only one there is.",
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
      coverImage: "/test-media/sample-image.png",
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
      "Signed out, open /.",
      "Click every link in the public header navigation in turn, reading each destination and going back.",
      "Open the sidebar support links and click each one, reading each destination.",
      "Scroll to the footer and click every link in every column, reading each destination.",
      "Write down any link that lands on a not-found page, an empty shell, or back on the homepage.",
    ],
    expectedBehaviour:
      "Every public-facing link resolves to a real page with content. The nav audit only ever checked the three portal sidebars, so not one of these 62 hrefs was covered by anything — a rename anywhere in the public surface rotted silently.",
    expectedUiState:
      "All 62 destinations render real content. None shows a 404, none renders chrome with an empty body, and none silently redirects back to / — a redirect to the homepage looks like a working link and is not one.",
    expectedData: { brokenLinkCount: 0, linksChecked: 62 },
    endResult:
      "Read-only; nothing persists. Record every broken href in the comment, not just the first — one report naming all of them is worth more than a verdict.",
  },
};
