/*
 * WHY: Authored six-part procedures for the admin/classifieds-digitalcodes-live page.
 * WHAT: 3 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THESE ARE MODERATION CASES, so each ends on the PUBLIC page. An approval that
 * updates a dashboard row and never reaches the public listing is the same defect
 * as a rejection that leaves the item live — both look correct from the admin's
 * seat, and only the public view can tell them apart.
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
  "checklist-admin-classifieds-digitalcodes-live-classified-create-moderate": {
    roles: ["admin", "seller", "guest"],
    startPage: "/admin/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123! and create a classified titled 'QA Classified admin-moderate' at 900, city Pune.",
      "Sign out and sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin listing that holds classifieds and find it.",
      "Read every status chip offered and select each in turn, noting which returns this listing.",
      "Change its status to a non-published one and save.",
      "Open the listing's public URL in a private window and read what is shown.",
      "Restore it to published, then sign back in as tyson and delete it.",
    ],
    inputs: { title: "QA Classified admin-moderate", price: 900, city: "Pune" },
    expectedBehaviour:
      "An admin status change reaches the public read path. Every status chip must also name a value the documents actually hold — a chip whose id is a display label rather than the stored value matches nothing forever and returns an empty list with no error.",
    expectedUiState:
      "The listing is findable under its own status chip. After the status change the public URL no longer renders it as a live listing — a public page still showing it is the failure, and the admin row will look correct either way.",
    endResult:
      "The listing is restored to published and then deleted. A chip returning nothing while the unfiltered list holds rows of that status is a separate finding worth naming.",
  },
  "checklist-admin-classifieds-digitalcodes-live-digitalcode-create-moderate": {
    roles: ["admin", "seller", "guest"],
    startPage: "/admin/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123! and create a digital-code listing titled 'QA Digital Code admin-moderate' at 350 with three codes.",
      "Sign out and sign in as admin@letitrip.in / TempPass123!.",
      "Find it in the admin listing and open its detail.",
      "Read whether the actual CODE STRINGS are visible to the admin.",
      "Change its status to a non-published one and save.",
      "Open the public URL in a private window and read what is shown.",
      "Restore it, then sign back in as tyson and delete it.",
    ],
    inputs: { title: "QA Digital Code admin-moderate", price: 350, codeCount: 3 },
    expectedBehaviour:
      "Moderation works the same for this type, and the code pool is the thing worth watching: an unsold code is inventory a buyer will pay for, so it must not be readable from a list view. Availability here reads the nested pool count rather than a stock figure.",
    expectedUiState:
      "The listing is findable and its status change takes effect publicly. Unsold code strings are not displayed in the admin list; if the detail view shows them, record exactly where — that is a finding rather than a pass.",
    endResult:
      "The listing is restored and deleted. Note whether an admin can read unredeemed codes at all.",
  },
  "checklist-admin-classifieds-digitalcodes-live-live-create-moderate": {
    roles: ["admin", "seller", "guest"],
    startPage: "/admin/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123! and create a live listing titled 'QA Live Item admin-moderate' at 3000, species Dog, jurisdictions Maharashtra only, with public/test-media/sample-video.mp4 attached.",
      "Sign out and sign in as admin@letitrip.in / TempPass123!.",
      "Find it in the admin listing and open its detail.",
      "Read whether the species, jurisdiction list and video are all shown to the moderator.",
      "Change its status to a non-published one and save.",
      "Open the public URL in a private window and read what is shown.",
      "Restore it, then sign back in as tyson and delete it.",
    ],
    inputs: {
      title: "QA Live Item admin-moderate",
      price: 3000,
      species: "Dog",
      jurisdictions: "Maharashtra",
    },
    expectedBehaviour:
      "A live listing is the one type where moderation has a duty beyond commerce — the jurisdiction list decides who may lawfully receive the animal or plant, and the mandatory video is what the moderator judges the listing on. Both must be visible in the admin view or the moderator is deciding blind.",
    expectedUiState:
      "The admin detail shows the species line, the jurisdiction list AND the video. The status change takes effect on the public page. A moderation row offering approve and reject without showing the video is the acting-blind failure this page family exists to catch.",
    endResult:
      "The listing is restored and deleted. Record specifically whether the video was viewable from the moderation surface.",
  },
};
