/*
 * WHY: Authored six-part procedures for the selling/product-upload-details page.
 * WHAT: 6 case(s), keyed by full checklist id.
 *
 * The seller product form has THREE separate media controls and they are easy to
 * conflate. Grounded in SellerProductShell.tsx `StepMedia` (:342-497):
 *
 *   Main image    ImageUpload,      label "Main Image", enableAdvancedCrop,
 *                                   cropAspectRatio 1, max 10 MB, index 1
 *   Gallery       MediaUploadList,  label "Gallery (up to 10 images + 1 video)",
 *                                   maxItems 11, maxImages 10, maxVideos 1,
 *                                   maxSizeMB 50, indices 2..11
 *   Video panel   MediaUploadField, YouTube / external URL / trim / poster
 *
 * The existing pages already cover the CAPS (selling/media-limits: 10th uploads,
 * 11th refused, second video refused) and the basics (selling/listing-a-product:
 * upload, preview, remove, crop, multiple). This page covers what neither does:
 * refusal copy, type refusal, ordering, index collision, and the video path that
 * was returning a 500 until 2026-09.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

import type { AuthoredCase } from "./_types";
import { MEDIA_ENDPOINTS } from "../../../../constants/api-endpoints";

/*
 * The endpoint comes from the registry, not a literal.
 *
 * These cases genuinely need to name it — the tester is told to open the
 * network panel and read that exact request, and "the signing request" would be
 * too vague for R8, which requires literal values. But a pasted copy of the path
 * is a second definition that silently rots the day the route moves, leaving a
 * tester hunting a request that no longer exists and reporting a bug that is
 * really a stale case. Interpolating keeps it precise AND single-sourced.
 */
const SIGN = MEDIA_ENDPOINTS.SIGN;

const SIGN_IN_SELLER = "Sign in as tyson@beybladearena.in / TempPass123!.";

export const authored: Record<string, AuthoredCase> = {
  "checklist-selling-product-upload-details-main-image-crop-applies": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      SIGN_IN_SELLER,
      "Open /store/products/new and click 'Show all fields (advanced)' to reach the sectioned form.",
      "Open the Media section and choose public/test-media/sample-image.png for 'Main Image'.",
      "Wait for the crop dialog to appear and note the shape of the crop box.",
      "Drag the crop box to cover clearly only the LEFT half of the picture, then confirm.",
      "Read the thumbnail that appears afterwards and compare what it shows against the original.",
    ],
    inputs: { image: "public/test-media/sample-image.png" },
    expectedBehaviour:
      "The crop is applied to the bytes that are uploaded, not merely previewed. A cropper that shows a selection and then stores the original is worse than no cropper — the seller believes they framed the photo and the marketplace shows something else. The box is locked square because the main image is rendered square on every card.",
    expectedUiState:
      "A crop dialog opens before any upload begins, and its box is square and stays square when dragged. The resulting thumbnail shows the LEFT half that was selected, not the whole picture.",
    expectedData: { cropAspectRatio: 1 },
    endResult:
      "Leave without saving. Re-open the form: no half-uploaded image is left attached to a draft.",
  },

  "checklist-selling-product-upload-details-oversize-image-refused-client-side": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      SIGN_IN_SELLER,
      "Open /store/products/new and switch to the advanced form.",
      "Open the Media section and read the size limit stated next to 'Main Image'.",
      "Choose public/test-media/oversized.png for the Main Image and start a timer. (The batch generates this file — it is >10 MB of incompressible noise and deliberately not committed.)",
      "Read the message that appears and note how long it took.",
      `Open the browser network panel and check whether any request to ${SIGN} was made.`,
    ],
    inputs: { image: "public/test-media/oversized.png", limitMb: 10 },
    expectedBehaviour:
      "A file over the limit is refused BEFORE any bytes leave the browser. The point is the seller's time: a 12 MB upload that travels, then finalises, then fails validation has taken a minute to tell them something the form already knew when they picked the file. The limit is also stated up front rather than only in the refusal.",
    expectedUiState:
      `The refusal is immediate (well under a second) and reads 'File size must be less than 10MB', naming the actual size. No ${SIGN} request appears in the network panel. The field keeps whatever image it had before.`,
    expectedData: { signRequestsMade: 0 },
    endResult: "Leave without saving; nothing was uploaded.",
  },

  "checklist-selling-product-upload-details-disallowed-type-refused": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      SIGN_IN_SELLER,
      "Open /store/products/new and switch to the advanced form.",
      "Open the Media section and choose public/test-media/sample-vector.svg for the Main Image.",
      "Read the message that appears.",
      "Now choose public/test-media/sample-image.png for the same field.",
      "Read whether it is accepted.",
    ],
    inputs: { rejected: "public/test-media/sample-vector.svg", accepted: "public/test-media/sample-image.png" },
    expectedBehaviour:
      "SVG is deliberately outside the allowed image types — it is a document format that can carry script, and it is served from our own origin. The refusal happens on type, not on extension alone, and the control recovers: refusing one file must not leave the field wedged.",
    expectedUiState:
      "The SVG is refused with a message naming the accepted types. Immediately afterwards the PNG uploads normally in the same field — no reload needed.",
    endResult: "Leave without saving.",
  },

  "checklist-selling-product-upload-details-gallery-order-persists": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      SIGN_IN_SELLER,
      "Open /store/products/new and switch to the advanced form.",
      "Open the Media section and add three gallery images one at a time: public/test-media/sample-image.png, then public/test-media/sample-image-2.png, then public/test-media/sample-image-3.png.",
      "Note the order the three thumbnails appear in, left to right.",
      "Drag the THIRD thumbnail to the first position.",
      "Fill Title 'Gallery Order Probe', Description 'Checking that gallery ordering survives a save and reload.', Category 'Beyblade Burst', Price 499, then Publish.",
      "Re-open the product for editing and read the gallery order again.",
    ],
    inputs: {
      images: "public/test-media/sample-image.png + sample-image-2.png + sample-image-3.png",
      title: "Gallery Order Probe",
      price: 499,
    },
    expectedBehaviour:
      "Gallery order is the seller's editorial decision about which angle a buyer sees second, so it is stored, not just displayed. Order that survives in the form but resets on reload means the array is being rebuilt from upload time rather than from the arrangement.",
    expectedUiState:
      "After the drag the moved image is first. After publish and re-open it is STILL first, in the same order as before the save.",
    expectedData: { firstGalleryImage: "public/test-media/sample-image-3.png" },
    endResult:
      "The published product's gallery order matches what was arranged. Delete the product afterwards.",
  },

  "checklist-selling-product-upload-details-main-image-does-not-collide-with-gallery": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      SIGN_IN_SELLER,
      "Open /store/products/new and switch to the advanced form.",
      "Open the Media section and set the Main Image to public/test-media/sample-image.png, accepting the crop.",
      "Add public/test-media/sample-image-2.png as the first GALLERY image.",
      "Read both previews and confirm they show different pictures.",
      "Publish with Title 'Slot Collision Probe', Description 'Main image and first gallery image must not overwrite each other.', Category 'Beyblade Burst', Price 499.",
      "Open the product's public page and read the main image and the first gallery thumbnail.",
    ],
    inputs: { mainImage: "public/test-media/sample-image.png", firstGalleryImage: "public/test-media/sample-image-2.png", price: 499 },
    expectedBehaviour:
      "The main image occupies index 1 and the gallery starts at index 2. Filenames here are content-derived with no timestamp, so two uploads that computed the same index would write the same storage path and the second would silently overwrite the first — the seller would see one of their two pictures simply vanish.",
    expectedUiState:
      "The main image and the first gallery thumbnail show DIFFERENT pictures, both in the form and on the published page. Neither is blank.",
    expectedData: { distinctImages: 2 },
    endResult: "Both images survive a reload of the public page. Delete the product afterwards.",
  },

  "checklist-selling-product-upload-details-video-upload-succeeds": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      SIGN_IN_SELLER,
      "Open /store/products/new and switch to the advanced form.",
      "Open the Media section and open the video panel's 'Upload' tab.",
      "Choose public/test-media/sample-video.mp4 and wait for it to finish.",
      `Open the browser network panel and read the status of the ${SIGN} request.`,
      "Read whether a poster frame and a duration appear.",
      "Publish with Title 'Video Upload Probe', Description 'Checking the seller video upload path end to end.', Category 'Beyblade Burst', Price 499, then open the public page and play the video.",
    ],
    inputs: { video: "public/test-media/sample-video.mp4", price: 499 },
    expectedBehaviour:
      "The dedicated video panel uploads through the same signed-URL flow as the gallery. This path returned HTTP 500 until 2026-09 because the panel omitted the category from the upload context and the filename generator threw on it — so every seller video upload from this panel failed while the gallery path worked. This case is that defect's regression test.",
    expectedUiState:
      `${SIGN} returns 200, not 400 or 500. A poster frame and a duration appear. The published page plays the video.`,
    expectedData: { signStatus: 200 },
    endResult:
      "The video survives a reload of the public page. Delete the product afterwards.",
  },
};
