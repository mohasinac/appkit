/*
 * WHY: Authored six-part procedures for the selling/media-limits page.
 * WHAT: 6 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * Every upload step names a committed fixture from public/test-media/, whose
 * bytes are asserted against the same detector the finalize endpoint uses. "Any
 * image" is not a test — two runs of it are two different tests, and the
 * rejection fixtures in particular only reject because of what they contain.
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
  "checklist-selling-media-limits-media-gallery-accepts-images-and-video": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and type 'QA Product media-gallery' as the title.",
      "Upload public/test-media/sample-image.png to the gallery.",
      "Upload public/test-media/sample-image.jpg to the gallery.",
      "Upload public/test-media/sample-image.webp to the gallery.",
      "Upload public/test-media/sample-video.mp4 to the video field.",
      "Read the previews for all four.",
    ],
    inputs: {
      title: "QA Product media-gallery",
      images: "sample-image.png, sample-image.jpg, sample-image.webp",
      video: "public/test-media/sample-video.mp4",
    },
    expectedBehaviour:
      "All three image formats and the video are accepted, and each renders its own preview. Bytes go straight from the browser to storage through a signed URL and never through an API route, so the request payload cap never applies however large the file.",
    expectedUiState:
      "Three image previews and one video poster frame, each showing its own content rather than a generic icon. No error toast on any of the four.",
    endResult:
      "Leave the editor without saving so no draft product is created.",
  },
  "checklist-selling-media-limits-media-tenth-image-uploads": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and type 'QA Product media-tenth' as the title.",
      "Upload public/test-media/sample-image.png to the gallery nine times, counting the previews after each.",
      "Upload it a tenth time.",
      "Read the preview count and any message about the limit.",
    ],
    inputs: { title: "QA Product media-tenth", uploadCount: 10, cap: 10 },
    expectedBehaviour:
      "The tenth image is accepted, because the cap is ten and a cap is inclusive of its own number. An off-by-one that refuses the tenth is the most likely error and the least likely to be noticed, since nine images look like plenty.",
    expectedUiState:
      "Ten previews are present after the tenth upload. Any limit message reads as 'you have reached the limit' rather than as a rejection of the tenth file.",
    expectedData: { imageCount: 10 },
    endResult: "Leave the editor without saving.",
  },
  "checklist-selling-media-limits-media-eleventh-image-refused-client-side": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and upload public/test-media/sample-image.png ten times.",
      "Open the browser's Network panel.",
      "Attempt an eleventh upload of the same file.",
      "Read the message shown and count the previews.",
      "Check the Network panel for any upload request made by that eleventh attempt.",
    ],
    inputs: { cap: 10, attemptCount: 11 },
    expectedBehaviour:
      "The eleventh is refused in the browser, before any signed URL is requested. Refusing it only after the bytes have reached storage leaves an orphaned object behind and spends the seller's upload time on a file that was never going to be kept.",
    expectedUiState:
      "A readable message names the ten-image limit, the preview count stays at ten, and the Network panel shows NO upload request for the eleventh attempt. A refusal that appears only after a round trip is the failure.",
    expectedData: { imageCount: 10, uploadRequestsForEleventh: 0 },
    endResult: "Leave the editor without saving.",
  },
  "checklist-selling-media-limits-media-second-video-refused-first-kept": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and type 'QA Product media-second-video' as the title.",
      "Upload public/test-media/sample-video.mp4 to the video field and wait for its poster frame.",
      "Attempt to upload public/test-media/sample-video.mp4 a second time.",
      "Read the message shown.",
      "Read the video field and check the first video is still attached with its poster.",
    ],
    inputs: { title: "QA Product media-second-video", videoCap: 1 },
    expectedBehaviour:
      "A listing carries one video. A second attempt is refused and the first is KEPT — refusing while also clearing the field loses work the seller had already done and looks like the upload broke.",
    expectedUiState:
      "A readable message explains the one-video limit. The first video is still attached with its poster frame intact. An empty video field after the refusal is the failure.",
    expectedData: { videoCount: 1 },
    endResult: "Leave the editor without saving.",
  },
  "checklist-selling-media-limits-media-caps-flat-across-types": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and read the stated image and video limits.",
      "Open the auction creation form and read its stated limits.",
      "Open the pre-order creation form and read its limits.",
      "Open the classified, digital-code and live-item creation forms and read each.",
      "Compare all six.",
    ],
    expectedBehaviour:
      "The caps come from one shared limits module, so every listing type states the same numbers. A type stating a different cap has a local copy, and a local copy is a number that will drift the first time the shared one changes.",
    expectedUiState:
      "All six forms state the same image and video limits. Any form differing is the finding, named by type and by the number it states.",
    endResult:
      "Leave every editor without saving. The live-item form additionally requires a video, which is the next case rather than a contradiction of this one.",
  },
  "checklist-selling-media-limits-media-live-listing-still-requires-video": {
    roles: ["seller"],
    startPage: "/store/live/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/live/new and fill every required field except the video.",
      "Type 'QA Live Item media-requires-video' as the title.",
      "Submit the form and read where the error appears.",
      "Upload public/test-media/sample-video.mp4 to the video field.",
      "Submit again.",
      "Delete the created listing.",
    ],
    inputs: {
      title: "QA Live Item media-requires-video",
      video: "public/test-media/sample-video.mp4",
    },
    expectedBehaviour:
      "A live listing requires a video where every other type treats it as optional — a buyer purchasing an animal or a plant needs to see it move. Shared caps and a per-type requirement are different rules and both hold at once.",
    expectedUiState:
      "The first submit is refused with an inline error on or beside the video field, and the typed values are preserved. The second submit succeeds.",
    endResult:
      "The listing is deleted by the final step so it does not accumulate across runs.",
  },
};
