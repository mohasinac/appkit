/*
 * WHY: Authored six-part procedures for the admin/blog-faqs page.
 * WHAT: 3 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 A FAQ'S ANSWER IS NOT A STRING. The create path wraps a flat answer into a
 * text-plus-format object and writes the slug to a nested path; an update path
 * that spreads the body straight through writes a bare string into a field every
 * reader expects to be an object. That transform asymmetry is what the FAQ case
 * below is really testing, and it only shows after a reload.
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
  "checklist-admin-blog-faqs-blog-create-edit-publish": {
    roles: ["admin", "guest"],
    startPage: "/admin/blog",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin blog list and create a post titled 'QA Blog create-edit-publish' with an excerpt, a category, two tags and body content.",
      "Save it as a DRAFT and read the status shown.",
      "Open /blog in a private window and check the draft is NOT listed.",
      "Return to the admin editor, change the body, publish, and RELOAD the editor.",
      "Read every field to confirm only the body changed and the status is published.",
      "Open /blog in the private window and open the post.",
      "Delete the post and confirm it disappears from both the admin list and /blog.",
    ],
    inputs: { title: "QA Blog create-edit-publish" },
    expectedBehaviour:
      "Draft and published are genuinely different: a draft is invisible publicly. The slug is derived from the title at creation and is then immutable even though the title stays editable — that is the deliberate convention across this codebase, because recomputing it would break existing links.",
    expectedUiState:
      "The draft does not appear on /blog. After publishing it does, with the edited body. The editor's other fields are unchanged after the edit. The URL keeps its original slug after any title change.",
    endResult:
      "The post is deleted from both surfaces. A draft visible publicly is the most serious failure here.",
  },
  "checklist-admin-blog-faqs-blog-media-step-save": {
    roles: ["admin", "guest"],
    startPage: "/admin/blog",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin blog editor for an existing published post and note its current cover image.",
      "Upload public/test-media/sample-image.png as the cover image.",
      "Insert a second image into the body content itself.",
      "Save and RELOAD the editor, reading both the cover and the body.",
      "Open the post on /blog in a private window and read both images.",
      "Restore the original cover image and remove the inserted body image.",
    ],
    inputs: { coverImage: "public/test-media/sample-image.png" },
    expectedBehaviour:
      "The cover image and inline body images both persist and both render publicly. A blog post has NO gallery field — extra images live inside the body HTML — so a case looking for a separate image array is looking for something the document has never had. Newly uploaded media must also be finalised on update, not only on create, or the file is orphaned in temporary storage.",
    expectedUiState:
      "After the reload the cover and the inline image are both present in the editor, and both render on the public post. An image that previews during editing and is missing after the reload was never finalised.",
    endResult:
      "The post is restored to its original media. Record any image that vanished on reload — that is the orphaned-upload failure.",
  },
  "checklist-admin-blog-faqs-faq-create-edit-category": {
    roles: ["admin", "guest"],
    startPage: "/admin/faqs",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin FAQs list and create one: question 'QA FAQ create-edit-category?', answer 'Created by the tester checklist.', category Shipping.",
      "Save, RELOAD, and read the answer as it is displayed.",
      "Open /faqs in a private window and find the question under Shipping.",
      "Return to the admin editor, change ONLY the answer to 'Edited by the tester checklist.', and save.",
      "RELOAD the editor and read the answer, then open /faqs again and read it there.",
      "Change the category to Payments, save, reload, and check it moved category on /faqs.",
      "Delete the FAQ and confirm it disappears from both surfaces.",
    ],
    inputs: {
      question: "QA FAQ create-edit-category?",
      answerBefore: "Created by the tester checklist.",
      answerAfter: "Edited by the tester checklist.",
      categoryBefore: "Shipping",
      categoryAfter: "Payments",
    },
    expectedBehaviour:
      "The EDIT is the case. Creating a FAQ wraps the flat answer into an object and writes the slug to a nested path; an update that spreads the submitted body straight into storage writes a bare string into the field every reader expects to be an object. The admin form may still render it — the public page is where the wrong shape surfaces.",
    expectedUiState:
      "After the edit and reload the answer reads as prose in BOTH the admin editor and on /faqs. What must not appear is raw markup, an object rendered as text, or a blank answer on the public page while the admin form looks fine.",
    endResult:
      "The FAQ is deleted from both surfaces. Checking /faqs after the edit — not only the admin form — is what makes this case worth running.",
  },
};
