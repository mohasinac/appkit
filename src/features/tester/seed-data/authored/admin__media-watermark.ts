/*
 * WHY: Authored six-part procedures for the admin/media-watermark page.
 * WHAT: 5 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THE WATERMARK HAS A FOUR-TIER FALLBACK and never simply skips: an admin image
 * override, then the bundled brand mark, then the wordmark, then plain text. So an
 * image with NO mark at all does not mean the watermark is off — it means that
 * image was not served through the proxy, which is a different and larger finding.
 *
 * Video is the exception, and deliberately so: it cannot be composited server-side
 * within the platform's compute budget, so the mark is a client overlay and its
 * settings have to reach a second consumer.
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
  "checklist-admin-media-watermark-watermark-size-opacity-controls": {
    roles: ["admin", "guest"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/site and go to the watermark settings, noting the current size and opacity.",
      "Open a product image in a private window and note how the mark looks.",
      "Change the size to its largest offered value and the opacity to its most opaque, then save.",
      "Reload the product image in the private window and compare.",
      "Restore both settings to their original values and reload the image again.",
    ],
    expectedBehaviour:
      "Size and opacity reach the served image. The mark is composited server-side as the image is proxied, so a setting that saves without changing the output means the render path is not reading it — and because images are cached aggressively, a hard reload may be needed before concluding either way.",
    expectedUiState:
      "The mark is visibly larger and more opaque after the change, and back to its original appearance after the restore. A settings page that saves with no visible effect on the served image is the failure.",
    endResult:
      "Both settings are restored. Note whether a hard reload was required — that is cache behaviour rather than a defect, but it changes how the next tester reads this page.",
  },
  "checklist-admin-media-watermark-watermark-position-presets": {
    roles: ["admin", "guest"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the watermark settings and read every position preset offered.",
      "Select each preset in turn, saving after each.",
      "After each save, open a product image in a private window and note where the mark sits.",
      "Check the mark stays fully inside the image at every preset.",
      "Restore the original preset.",
    ],
    expectedBehaviour:
      "Every preset places the mark somewhere different and every one keeps it inside the frame. A corner preset that pushes part of the mark off the edge is the likely failure, since the offset is computed from the image's dimensions and a portrait image behaves differently from a landscape one.",
    expectedUiState:
      "Each preset moves the mark to its named position and the whole mark remains visible within the image at all of them. Test at least one portrait and one landscape image — a preset correct on one aspect and clipped on the other is the finding.",
    endResult: "The original preset is restored.",
  },
  "checklist-admin-media-watermark-watermark-custom-offset": {
    roles: ["admin", "guest"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the watermark settings and find the custom offset controls.",
      "Set a modest offset, save, and read a product image in a private window.",
      "Set an extreme offset — larger than the image itself would allow — save, and read the image again.",
      "Read whether the mark is clipped, hidden entirely, or clamped to stay visible.",
      "Restore the original offset.",
    ],
    expectedBehaviour:
      "A custom offset moves the mark, and an offset that would push it out of frame is clamped rather than obeyed. Obeying it produces images with no visible watermark at all — which is indistinguishable from the proxy being bypassed and would mask a much larger problem.",
    expectedUiState:
      "The modest offset moves the mark by the amount set. The extreme offset leaves the mark still visible, clamped to the frame, rather than pushing it off the image. A silently unwatermarked image is the failure.",
    endResult: "The original offset is restored.",
  },
  "checklist-admin-media-watermark-watermark-theme-recolor": {
    roles: ["admin", "guest"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the watermark settings and confirm no custom image override is set.",
      "Open a product image in a private window and note the mark's colour.",
      "Open the Themes tab, switch the active theme to one with different brand colours, and save.",
      "Reload the product image and compare the mark's colour.",
      "Read a dark product photo and a light one and check the mark is visible on both.",
      "Restore the original theme.",
    ],
    expectedBehaviour:
      "With no image override the mark falls through to the bundled brand glyph, whose gradient stops come from theme colour tokens — so changing the theme recolours it without a second asset. It must stay legible over both dark and light photographs, which is the part a colour change can quietly break.",
    expectedUiState:
      "The mark's colour follows the theme. It remains visible on both a dark and a light product photo after the change. A mark that vanishes into one of the two is the finding.",
    endResult: "The original theme is restored.",
  },
  "checklist-admin-media-watermark-watermark-video-overlay-parity": {
    roles: ["admin", "guest"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the watermark settings and note the size, opacity and position.",
      "Open /products/product-beyblade-burst-spryzen-video-demo in a private window.",
      "Look at the video's POSTER frame in the gallery strip and note the mark.",
      "Play the video and look for the mark while it is playing.",
      "Compare the mark on the video against the mark on a still image on the same page.",
      "Change the watermark position, save, and check both the still and the video follow.",
      "Restore the position.",
    ],
    expectedBehaviour:
      "The poster frame is a still image and goes through the proxy, so it is composited like any other. The video itself cannot be composited server-side within the platform's compute budget, so its mark is a client overlay reading the same settings from the public settings response — two consumers, one configuration, and they must agree.",
    expectedUiState:
      "The poster frame carries the mark. The playing video carries a matching overlay in the same position at a comparable size. After the position change both the still and the video move. A video with no mark, or one whose mark ignores the setting, is the failure.",
    endResult:
      "The position is restored. Parity between the two paths is the case — either alone proves nothing.",
  },
};
