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

import { PRODUCT_MAX_IMAGES } from "../../../../_internal/shared/media/limits";
import type { AuthoredCase } from "./_types";

export const authored: Record<string, AuthoredCase> = {
  "checklist-selling-media-limits-media-gallery-accepts-images-and-video": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and type 'QA Product media-gallery' as the title.",
      "Click 'Show all fields (advanced)' before touching any media. 🛑 /store/products/new opens the QUICK form by default for a create of a standard listing, and it has ONE field — 'Product Image' — with no gallery and no video field at all. Every media step below needs the advanced form.",
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
  "checklist-selling-media-limits-media-last-allowed-image-uploads": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and type 'QA Product media-boundary' as the title.",
      "Click 'Show all fields (advanced)' before touching any media. 🛑 /store/products/new opens the QUICK form by default for a create of a standard listing, and it has ONE field — 'Product Image' — with no gallery and no video field at all. Every media step below needs the advanced form.",
      `Read the counter under the gallery and note the cap it advertises. It must read ${PRODUCT_MAX_IMAGES}. 🛑 Do NOT assume a number here — the cap is one constant (\`PRODUCT_MAX_IMAGES\`) and this case is written against whatever it currently is.`,
      "Upload public/test-media/sample-image.png to the gallery repeatedly, one at a time, counting the previews after each, until the control refuses one.",
      "Record the preview count reached at the moment of the first refusal.",
    ],
    inputs: { title: "QA Product media-boundary", cap: PRODUCT_MAX_IMAGES },
    expectedBehaviour: `Every upload up to and including the ${PRODUCT_MAX_IMAGES}th is accepted, because a cap is inclusive of its own number. An off-by-one that refuses the last one is the most likely error and the least likely to be noticed, since one short of the cap still looks like plenty.`,
    expectedUiState: `The preview count reached before the first refusal is exactly ${PRODUCT_MAX_IMAGES}. The counter's own advertised cap and the count actually reachable must be the SAME number — a form that says ${PRODUCT_MAX_IMAGES} and allows ${PRODUCT_MAX_IMAGES - 1} is the failure, whichever number it says.`,
    expectedData: { imageCount: PRODUCT_MAX_IMAGES },
    endResult: "Leave the editor without saving.",
  },
  "checklist-selling-media-limits-media-over-cap-image-refused-client-side": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new.",
      "Click 'Show all fields (advanced)' before touching any media. 🛑 /store/products/new opens the QUICK form by default for a create of a standard listing, and it has ONE field — 'Product Image' — with no gallery and no video field at all. Every media step below needs the advanced form.",
      `Fill the gallery to its cap with public/test-media/sample-image.png (${PRODUCT_MAX_IMAGES} uploads).`,
      "Open the browser's Network panel.",
      "Attempt one more upload of the same file.",
      "Read the message shown and count the previews.",
      "Check the Network panel for any signed-URL or upload request made by that over-cap attempt.",
    ],
    inputs: { cap: PRODUCT_MAX_IMAGES, attemptCount: PRODUCT_MAX_IMAGES + 1 },
    expectedBehaviour:
      "The over-cap file is refused in the browser, before any signed URL is requested. Refusing it only after the bytes have reached storage leaves an orphaned object behind and spends the seller's upload time on a file that was never going to be kept.",
    expectedUiState: `A readable message NAMES the limit as ${PRODUCT_MAX_IMAGES}, the preview count stays at ${PRODUCT_MAX_IMAGES}, and the Network panel shows NO upload request for the over-cap attempt. A refusal that appears only after a round trip is the failure, and so is a refusal that does not say what the limit is.`,
    expectedData: { imageCount: PRODUCT_MAX_IMAGES, uploadRequestsForOverCap: 0 },
    endResult: "Leave the editor without saving.",
  },
  "checklist-selling-media-limits-media-second-video-refused-first-kept": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and type 'QA Product media-second-video' as the title.",
      "Click 'Show all fields (advanced)' before touching any media. 🛑 /store/products/new opens the QUICK form by default for a create of a standard listing, and it has ONE field — 'Product Image' — with no gallery and no video field at all. Every media step below needs the advanced form.",
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
      "Click 'Show all fields (advanced)' before touching any media. 🛑 /store/products/new opens the QUICK form by default for a create of a standard listing, and it has ONE field — 'Product Image' — with no gallery and no video field at all. Every media step below needs the advanced form.",
      "Read the stated image and video limits on the advanced form.",
      "Open /store/auctions/new and read its stated limits. These per-type creation routes render the full form directly, so no advanced switch is needed on any of them.",
      "Open /store/pre-orders/new and read its limits.",
      "Open /store/classified/new, /store/digital-codes/new and /store/live/new and read each.",
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
