/*
 * WHY: Authored six-part procedures for the selling/listing-a-product page.
 * WHAT: 15 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 EVERY UPLOAD STEP NAMES A COMMITTED FIXTURE from public/test-media/. Their
 * bytes are asserted against the same detector the finalize endpoint uses, so the
 * rejection fixtures reject because of what they contain rather than by luck.
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
  "checklist-selling-listing-a-product-list-standard": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and publish with every field empty, reading where the errors land.",
      "Type 'QA Product list-standard' as the title and 750 as the price.",
      "Select a category and a brand, set the stock to 5, and write a description.",
      "Upload public/test-media/sample-image.png as the main image.",
      "Publish.",
      "Open the product's public page and read its title, price, stock badge and images.",
    ],
    inputs: { title: "QA Product list-standard", price: 750, stock: 5, image: "public/test-media/sample-image.png" },
    expectedBehaviour:
      "A standard listing is created and becomes publicly visible. The slug is derived from the title at creation and is then immutable — the update schema does not accept it, which is the deliberate convention across categories, brands and bundles and is what keeps existing links working.",
    expectedUiState:
      "The empty publish marks individual fields rather than showing one banner. After publishing, the public page shows the title, ₹750.00, an in-stock badge naming 5, the description and the uploaded image. Its URL carries a slug derived from the title.",
    endResult:
      "The listing exists and is the fixture the edit case reads. Delete it after that case.",
  },
  "checklist-selling-listing-a-product-list-auction": {
    roles: ["seller"],
    startPage: "/store/auctions/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the auction creation form and type 'QA Auction list-auction' as the title.",
      "Set the starting bid to 1000, the minimum increment to 100, and an end date two days out.",
      "Upload public/test-media/sample-image.png and fill every other required field.",
      "Publish.",
      "Open the auction's public page and read the starting bid, increment, countdown and purchase controls.",
      "Delete the auction.",
    ],
    inputs: {
      title: "QA Auction list-auction",
      startingBid: 1000,
      minIncrement: 100,
      image: "public/test-media/sample-image.png",
    },
    expectedBehaviour:
      "An auction is created with a bidding path and no cart path — the capability is per listing type, not a styling choice. A per-listing increment can only RAISE the platform's banded floor, never lower it, so the saved 100 is a floor that the band may still override upward.",
    expectedUiState:
      "The public page shows a ticking countdown, the starting bid of ₹1,000.00, and a 'Place a bid' control. There is no 'Add to Cart' anywhere on the page.",
    endResult: "The auction is deleted by the final step.",
  },
  "checklist-selling-listing-a-product-list-preorder": {
    roles: ["seller"],
    startPage: "/store/pre-orders/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the pre-order creation form and type 'QA Pre-order list-preorder' as the title.",
      "Set the price to 1200, the deposit percentage to 25, an estimated delivery date a month out, and the production status.",
      "Upload public/test-media/sample-image.png and fill every other required field.",
      "Publish.",
      "Open the pre-order's public page and read the price, deposit note, delivery date and status badge.",
      "Delete the pre-order.",
    ],
    inputs: {
      title: "QA Pre-order list-preorder",
      price: 1200,
      depositPercent: 25,
      image: "public/test-media/sample-image.png",
    },
    expectedBehaviour:
      "A pre-order takes a deposit rather than the full price and shows an estimated delivery date — the two things that distinguish it from a standard listing that happens to be out of stock. The deposit shown to the buyer is computed from the saved percentage rather than typed separately.",
    expectedUiState:
      "The public page shows ₹1,200.00, a deposit note naming ₹300.00 (25% of 1,200), an estimated delivery label with a real date rather than 'undefined', and the production status badge.",
    expectedData: { depositAmount: 300 },
    endResult: "The pre-order is deleted by the final step.",
  },
  "checklist-selling-listing-a-product-edit-listing": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products and open the editor for 'QA Product list-standard'.",
      "Write down every field's current value.",
      "Change the price to 850 and nothing else.",
      "Save, then RELOAD the editor and compare every field against what was written down.",
      "Open the public page and read the price and everything else.",
      "Delete the listing.",
    ],
    inputs: { priceBefore: 750, priceAfter: 850 },
    expectedBehaviour:
      "An edit writes back only what changed. The URL slug stays as it was — that immutability is deliberate, and recomputing it from the new title would break every existing link to the listing.",
    expectedUiState:
      "After the reload only the price differs; images, category, brand, stock and description are unchanged, and the slug in the URL is the original. The public page shows ₹850.00 with everything else intact.",
    expectedData: { unintendedFieldChanges: 0 },
    endResult:
      "The listing is deleted by the final step, so nothing accumulates across runs.",
  },
  "checklist-selling-listing-a-product-new-listing-belongs-to-store": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and publish a listing titled 'QA Product belongs-to-store' at 300.",
      "Open its public page and read the seller line at the bottom of the info panel.",
      "Click the 'Visit Store' link and read where it lands.",
      "Open /stores/store-beyblade-arena and find the listing in the Products tab.",
      "Sign out and sign in as tester@letitrip.in / TempPass123!, a different seller.",
      "Open that seller's own products list and check the listing is NOT there.",
      "Sign back in as tyson and delete the listing.",
    ],
    inputs: { title: "QA Product belongs-to-store", price: 300 },
    expectedBehaviour:
      "The listing is filed against the signed-in seller's store, taken from the session rather than from anything the form sends. The store id is the key orders split on, coupons scope to, and payouts hang off — so a listing attributed to the wrong store misroutes all four.",
    expectedUiState:
      "The public page reads 'Sold by Beyblade Arena' and its Visit Store link opens that store. The listing appears in that store's Products tab and NOT in the other seller's list.",
    endResult: "The listing is deleted by the final step.",
  },
  "checklist-selling-listing-a-product-store-rename-updates-cards": {
    roles: ["seller", "guest"],
    startPage: "/store",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the store's settings and change the store name to 'QA Store rename-updates-cards'.",
      "Save and reload to confirm.",
      "Open /products in a private window and find a card from that store.",
      "Read the seller name on the card and on the product's detail page.",
      "Open /stores and read the store's name on its directory card.",
      "Restore the original store name.",
    ],
    inputs: { newName: "QA Store rename-updates-cards" },
    expectedBehaviour:
      "The new name reaches every surface that shows it. Where a name is denormalised onto other documents for display, a rename must update those copies too — otherwise cards keep showing the old name until each is written again, and the two disagree indefinitely.",
    expectedUiState:
      "Product cards, the product detail page's seller line, and the store directory card all show the new name. Any surface still showing the old one is the finding, named specifically.",
    endResult:
      "The original name is restored by the final step. Other cases read this store by name.",
  },
  "checklist-selling-listing-a-product-media-upload": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and open the media upload field.",
      "Upload public/test-media/sample-image.png and wait for it to finish.",
      "Read the preview and the stored URL if it is shown.",
      "Attempt to upload public/test-media/not-really-an-image.png and read the message.",
      "Attempt to upload public/test-media/empty.png and read the message.",
    ],
    inputs: {
      valid: "public/test-media/sample-image.png",
      mismatched: "public/test-media/not-really-an-image.png",
      empty: "public/test-media/empty.png",
    },
    expectedBehaviour:
      "Bytes go from the browser straight to storage through a signed URL and are then verified by their actual content, not their declared type. The mismatched fixture declares itself a PNG and is text; the empty one is zero length. Both are refused with a readable message rather than a stack trace.",
    expectedUiState:
      "The valid file previews and its stored path is a /media/… proxy URL rather than a raw bucket URL. The mismatched file is refused with a message about the file's type. The empty one is refused with a readable message, not an unhandled error.",
    endResult: "Leave the editor without saving.",
  },
  "checklist-selling-listing-a-product-media-upload-preview-no-white-box": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and upload public/test-media/sample-image.png.",
      "Look at the preview tile the moment it appears and again once it has settled.",
      "Upload two more images and look at all three tiles.",
      "Resize the window to 390 pixels and look at them again.",
    ],
    inputs: { image: "public/test-media/sample-image.png", mobileWidth: 390 },
    expectedBehaviour:
      "A preview tile renders its image at its intended size. A fill-style image resolves its percentages against its parent, so a shrink-to-fit wrapper between the control and the image collapses both to nothing — the tile becomes an empty bordered box while the control still looks and behaves correctly.",
    expectedUiState:
      "Every preview shows its picture at the same size as its neighbours, at both widths. An empty white or bordered box where a photo should be is the failure, and it hits every clickable image tile in the app at once.",
    endResult: "Leave the editor without saving.",
  },
  "checklist-selling-listing-a-product-media-upload-images-capped-at-5": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and read the stated image limit before uploading anything.",
      "Upload public/test-media/sample-image.png repeatedly, counting the previews after each.",
      "Continue until an upload is refused.",
      "Read the message and the preview count at that point.",
      "Compare the count against the limit the form stated.",
    ],
    inputs: { image: "public/test-media/sample-image.png" },
    expectedBehaviour:
      "The number the form STATES is the number it enforces. This case exists to catch a disagreement between them: a label saying five against a limit of ten, or the reverse, is a promise the form does not keep — and the checklist label itself says five while the shared limits module is the authority.",
    expectedUiState:
      "Uploads are accepted up to the stated limit and the next is refused with a readable message. The refusal count equals the stated limit exactly. If the two disagree, record BOTH numbers — which one is wrong is a judgement for the reader, not for the tester.",
    endResult: "Leave the editor without saving.",
  },
  "checklist-selling-listing-a-product-media-upload-video-duration": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and read any stated video duration or size limit.",
      "Upload public/test-media/sample-video.mp4 to the video field.",
      "Wait for it to finish and read the preview and any duration shown.",
      "Read whether a poster frame was captured.",
      "Attempt a second video upload and read the message.",
    ],
    inputs: { video: "public/test-media/sample-video.mp4" },
    expectedBehaviour:
      "A video within the limits is accepted, its duration read, and a poster frame captured. The limits are stated before the upload rather than after it fails — a seller who waits out a long upload to be told the file was always too long has had their time taken.",
    expectedUiState:
      "Any duration or size limit is stated up front. The fixture uploads, shows a poster frame rather than an empty box, and reports its duration. A second video is refused while the first is kept.",
    endResult: "Leave the editor without saving.",
  },
  "checklist-selling-listing-a-product-media-upload-multiple-images": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and select public/test-media/sample-image.png, sample-image.jpg and sample-image.webp together in one file dialog.",
      "Watch the upload progress and read whether each file reports its own.",
      "Read the previews once they finish and count them.",
      "Check each preview shows its own file rather than three copies of one.",
    ],
    inputs: { images: "sample-image.png, sample-image.jpg, sample-image.webp" },
    expectedBehaviour:
      "A multi-select uploads each file with its own progress, sequentially, and produces one preview per file. Three previews of the same picture means the loop is reusing one file reference.",
    expectedUiState:
      "Three previews appear, each showing its own image. Progress is reported per file rather than as one indeterminate spinner for the batch.",
    expectedData: { previewCount: 3 },
    endResult: "Leave the editor without saving.",
  },
  "checklist-selling-listing-a-product-media-upload-remove-image": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and upload sample-image.png, sample-image.jpg and sample-image.webp.",
      "Note which image is in which position.",
      "Remove the MIDDLE one and read the remaining previews.",
      "Check the remaining two are the ones expected and are in their original relative order.",
      "Remove another and check the same.",
    ],
    expectedBehaviour:
      "Removing an image removes that image. A remove keyed on array position rather than on the item itself deletes the wrong one whenever the list has shifted — the same index-versus-identity mistake that hands one buyer another's lottery slot.",
    expectedUiState:
      "After removing the middle image the remaining two are the first and third, in that order. Removing by index would leave the wrong pair, and both survivors would still look like valid previews.",
    expectedData: { remainingCount: 2 },
    endResult: "Leave the editor without saving.",
  },
  "checklist-selling-listing-a-product-media-upload-main-image-crop": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and upload public/test-media/sample-image.png as the main image.",
      "Open the crop editor and read the aspect-ratio presets offered.",
      "Choose a preset, rotate the image, zoom in, and apply.",
      "Read the resulting preview.",
      "Reopen the crop editor and check it opens on the cropped result rather than the original.",
    ],
    inputs: { image: "public/test-media/sample-image.png" },
    expectedBehaviour:
      "Cropping produces a new stored image and the preview reflects it. Cropping runs a native image library, so it belongs in a background function rather than a request handler — a large source image processed inline is a real timeout risk in production even when it is fast locally.",
    expectedUiState:
      "Aspect presets are offered, rotate and zoom respond, and applying updates the preview visibly. Reopening the editor shows the cropped image. A crop that appears to apply and reverts on reopen means the result was never stored.",
    endResult:
      "Leave the editor without saving. If the crop hangs on a large image, that is the timeout risk rather than a UI fault — record how long it took.",
  },
  "checklist-selling-listing-a-product-media-upload-video-both-sources-render": {
    roles: ["seller", "guest"],
    startPage: "/store/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open a product editor, select the video field's Upload tab, and upload public/test-media/sample-video.mp4.",
      "Read the editor's own preview panel.",
      "Save, open the product's public page, and play the video from the gallery.",
      "Return to the editor, switch the video field to its YouTube tab, and paste a YouTube watch URL.",
      "Read the editor's preview panel again.",
      "Save, open the public page, and play the video.",
      "Remove the video and save so the product is left as it was.",
    ],
    expectedBehaviour:
      "Both sources render, in the editor preview AND on the public page. A YouTube URL must become a privacy-preserving embed rather than being handed to a native video element, which cannot play a watch-page URL and says so in the player's own words. The upload field has always offered the YouTube tab; for a long time nothing on the render side knew what to do with what it stored.",
    expectedUiState:
      "The uploaded file plays in both the preview and the public gallery. The YouTube source shows an embedded player in both. Neither shows 'No video with supported format and MIME type found'.",
    endResult:
      "The video is removed by the final step, so the product's gallery is left as seeded.",
  },
  "checklist-selling-listing-a-product-seller-quick-add-drawer-flips": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products and open the quick-add drawer.",
      "Note which edge it slides in from and where its close control sits.",
      "Close it, open /user/settings, and set 'Left-hand mode' to on.",
      "Return to /store/products and open the quick-add drawer again.",
      "Note the edge and the close control's corner.",
      "Set 'Left-hand mode' back to off.",
    ],
    inputs: { leftHandMode: true },
    expectedBehaviour:
      "The quick-add drawer is chrome placed for reach, so it mirrors with left-hand mode — edge, animation direction and close control together. A drawer that lands on the mirrored edge while still animating in from the original one reads as broken.",
    expectedUiState:
      "With the mode on, the drawer enters from and rests on the mirrored edge and its close control is in the mirrored corner. With it off, both return to the default.",
    endResult:
      "The mode is off again by the final step, and nothing is added. Later cases assume the default layout.",
  },
};
