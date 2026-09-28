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
 * reader expects to be an object.
 *
 * VERIFIED FIXED 2026-09-29 before asserting anything about it: the PATCH at
 * `src/app/api/admin/faqs/[id]/route.ts:53-57` destructures `answer` and `slug`
 * out and applies the same transform as POST. So that half of the FAQ case
 * should PASS, and a pass is the expected result rather than a surprise. It is
 * kept because the failure is invisible in the admin form and only shows on the
 * public page — exactly the kind that returns.
 *
 * 🛑 THE FAQ CATEGORY PICKER OFFERS VALUES `FAQCategory` DOES NOT HAVE.
 *
 * `AdminFaqEditorView`'s CATEGORY_OPTIONS is shipping / returns / payments /
 * auctions / pre-orders / general. The real union is orders_payment /
 * shipping_delivery / returns_refunds / product_information / account_security /
 * technical_support / general / scam_awareness. **Only `general` overlaps.**
 * The API types category as a bare `z.string().min(1)` and then casts
 * `as FAQCategory`, with a comment acknowledging it, so the wrong value is
 * persisted unvalidated — and `FAQPageContent` counts a FAQ only
 * `if (faq.category in categoryCounts)`, so an admin-created FAQ is in no
 * sidebar bucket and no category filter ever returns it. All 63 seeded FAQs use
 * the real values, which is why this has never shown up. Root Cause #33/#34's
 * shape. Recorded in OUTOFSCOPE; the case below now expects it.
 *
 * (CLAUDE.md's Seed Data Reference lists FAQ categories as
 * "Shipping/Returns/Payments/Auctions/Pre-orders" — it is describing this
 * picker, not the schema, and is wrong about the data.)
 *
 * 🛑 THE BLOG SLUG IS EDITABLE, and this file used to claim the opposite.
 * `updateBlogPostSchema` accepts `slug` and the editor's Content section has a
 * 'Slug' field. What is true is narrower: the slug is derived from the title at
 * creation and is never RECOMPUTED when the title changes. Those are different
 * claims and only the second one holds.
 *
 * Blog vocabulary, all closed enums: category is news | tips | guides | updates
 * | community; status is draft | published | archived. Editor sections are
 * Content, Media, 'SEO & Tags' and Publish.
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
      "Open /admin/blog/new and create a post titled 'QA Blog create-edit-publish' with an excerpt, category Guides, tags 'qa' and 'checklist', and body content in the rich-text editor. Write down the Slug the Content section shows.",
      "Save it as a DRAFT and read the status shown in the Publish section.",
      "Sign out and open /blog, confirming the draft is NOT listed and its slug URL does not render it.",
      "Sign back in, open the post from /admin/blog, change ONLY the body, set status to Published, save, and RELOAD the editor.",
      "Read every field to confirm only the body changed and the status is published.",
      "Change ONLY the Title to 'QA Blog renamed', save, RELOAD, and read the Slug field: it must still be the one written down in step 2.",
      "Sign out, open /blog and open the post at that original slug.",
      "Sign back in, delete the post, and confirm it disappears from /admin/blog and from /blog.",
    ],
    inputs: {
      title: "QA Blog create-edit-publish",
      titleAfter: "QA Blog renamed",
      category: "Guides",
      tags: "qa, checklist",
    },
    expectedBehaviour:
      "Draft and published are genuinely different: a draft is invisible publicly. The slug is derived from the title at creation and is never RECOMPUTED when the title changes, because recomputing it would break every existing link — it stays directly editable in the Slug field, which is the deliberate escape hatch rather than an oversight.",
    expectedUiState:
      "The draft appears nowhere on /blog and its URL does not render it. After publishing it does, carrying the edited body. After the title change every other field — including Slug — is untouched, and the post is still reachable at the original slug.",
    expectedData: { statusAfterPublish: "published", slugUnchangedAfterRename: true },
    endResult:
      "The post is deleted from /admin/blog and /blog. A draft visible publicly is the most serious failure here; a slug that silently followed the title is the second.",
  },
  "checklist-admin-blog-faqs-blog-media-step-save": {
    roles: ["admin", "guest"],
    startPage: "/admin/blog",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/blog, open blog-spot-genuine-takara-tomy-beyblade for editing, and write down its current Cover Image and YouTube Video ID from the Media section (the id may be empty — no seeded post sets one).",
      "Upload /test-media/sample-image.png as the Cover Image.",
      "Set the YouTube Video ID to dQw4w9WgXcQ.",
      "In the Content section's rich-text editor, insert /test-media/sample-image-2.png into the body itself.",
      "Save, then RELOAD the editor and read the cover, the YouTube id and the body image.",
      "Sign out, open the post on /blog, and read whether the cover, the video embed and the inline image all render.",
      "Sign back in and restore the Cover Image and YouTube Video ID written down in step 1, and remove the inserted body image.",
    ],
    inputs: {
      coverImage: "/test-media/sample-image.png",
      bodyImage: "/test-media/sample-image-2.png",
      youtubeId: "dQw4w9WgXcQ",
      post: "blog-spot-genuine-takara-tomy-beyblade",
    },
    expectedBehaviour:
      "The cover image, the YouTube id and inline body images all persist and all render publicly. Extra images belong INSIDE the body HTML: `BlogPostDocument` does declare `contentImages` and `additionalImages` arrays and the PATCH accepts them, but no renderer anywhere reads either one, no mounted editor exposes them (only `BlogPostForm`, which has no consumer), and no seeded post sets them — so a separate image array is not a path to anything visible. Newly uploaded media must also be finalised on update, not only on create, or the file is orphaned in temporary storage.",
    expectedUiState:
      "After the reload the cover, the YouTube id and the inline image are all present in the editor, and all three render on the public post. An image that previews while editing and is gone after the reload was never finalised — that is the orphaned-upload failure and is the thing this case is for.",
    expectedData: { coverPersisted: true, youtubeIdPersisted: true, bodyImagePersisted: true },
    endResult:
      "The post carries its original cover and YouTube id again and the inserted body image is gone. Record any image that vanished on reload, and whether it vanished in the editor, on the public post, or both.",
  },
  "checklist-admin-blog-faqs-faq-create-edit-category": {
    roles: ["admin", "guest"],
    startPage: "/admin/faqs",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/faqs/new and create one: question 'QA FAQ create-edit-category?', answer 'Created by the tester checklist.', and pick Shipping from the Category select.",
      "Save, RELOAD the editor, and read the answer as it is displayed.",
      "Sign out, open /faqs, and look for the question — first under the category sidebar, then under All.",
      "Sign back in, change ONLY the answer to 'Edited by the tester checklist.', and save.",
      "RELOAD the editor and read the answer, then open /faqs again and read it there.",
      "Change the Category to Payments, save, reload, and check whether it moved category on /faqs.",
      "Delete the FAQ and confirm it disappears from /admin/faqs and /faqs.",
    ],
    inputs: {
      question: "QA FAQ create-edit-category?",
      answerBefore: "Created by the tester checklist.",
      answerAfter: "Edited by the tester checklist.",
      categoryBefore: "Shipping",
      categoryAfter: "Payments",
    },
    expectedBehaviour:
      "Two independent things, and they have different answers today. (1) The ANSWER round-trip: creating a FAQ wraps the flat answer into a text-plus-format object, and the update must apply the same transform rather than spreading a bare string into a field every reader expects to be an object. (2) The CATEGORY: whatever the picker offers must be a value the rest of the product can represent, or the FAQ lands in a category nothing renders.",
    expectedUiState:
      "The answer half should PASS — verified in source, the PATCH applies the same transform as create, so the answer reads as prose in both the admin editor and on /faqs, with no raw markup and no blank public answer.\n\n🛑 EXPECT THE CATEGORY HALF TO FAIL, AND RECORD IT AS A FAILURE. The picker's 'Shipping' writes the string 'shipping', and FAQCategory has no such value — it has 'shipping_delivery'. The API types category as a bare z.string() and casts it, so it is stored unvalidated, and /faqs counts a FAQ only if its category is a known one. So expect the question to be absent from every category in the sidebar while still appearing under All, and the move to Payments to change nothing visible. Say which categories you tried.",
    expectedData: { answerRendersAsProse: true, appearsUnderAnyCategory: false },
    endResult:
      "The FAQ is deleted from both surfaces. Keep the two halves apart in the comment: one mechanism works and one writes a value no reader understands.",
  },
};
