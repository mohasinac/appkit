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
 * 🛑 …AND THAT SECOND CONSUMER IS NOT ON THE PRODUCT PAGE (found 2026-09-29).
 * `<MediaVideo>`, which owns the overlay, is mounted in exactly three places:
 * `HeroCarousel` and the two admin upload previews. A product video plays in
 * `ImageLightbox`, which renders a bare `<video controls>` — no overlay layer at
 * all. So the poster frame is watermarked (it is a still, proxied like any
 * image) and the playing video is not. The parity case now expects that and
 * names the homepage hero as the surface where the overlay does apply.
 *
 * The watermark tab is on /admin/site → 'Watermark'. Its real controls:
 * a 'Watermark type' select (Text | Image), 'Watermark text' or a
 * 'Watermark image' upload, a `Size — N% of image width` slider (5-100 step 5),
 * an `Opacity — N%` slider (5-100 step 5), a 'Position' select, and a
 * 'Use a custom X/Y offset instead' toggle revealing two labelled offset
 * inputs measured in percent FROM CENTER (+right/+down).
 *
 * 🛑 THEME RECOLOUR READS `defaultLightThemeId` AND NOTHING ELSE.
 * `resolveThemeGradientStops` looks up the theme record named by
 * `theme.defaultLightThemeId` (falling back to "default-light") and takes its
 * `--appkit-gradient-logo` stops. Changing the DARK default, or a viewer's own
 * mode, does not move the composited mark's colour — so the case must change
 * the default LIGHT theme or it will report a failure that is really a
 * mis-aimed step.
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
      "Open /admin/site, go to its 'Watermark' tab, and write down the current values of the `Size — N% of image width` and `Opacity — N%` sliders.",
      "Sign out and open /products/product-beyblade-burst-valkyrie, then open its main image and note how the mark looks.",
      "Sign back in and set Size to 100 and Opacity to 100, then save.",
      "Sign out, reload that product image with a HARD reload, and compare.",
      "Sign back in, restore both sliders to the values written down in step 2, save, and reload the image again.",
    ],
    inputs: {
      product: "product-beyblade-burst-valkyrie",
      sizeAfter: 100,
      opacityAfter: 100,
      sliderStep: 5,
    },
    expectedBehaviour:
      "Size and opacity reach the served image. The mark is composited server-side as the image is proxied, so a setting that saves without changing the output means the render path is not reading it — and because images are cached aggressively, a hard reload may be needed before concluding either way.",
    expectedUiState:
      "The mark is visibly larger and more opaque after the change, and back to its original appearance after the restore. Both sliders move in steps of 5 between 5 and 100, so a value typed outside that range is not reachable and is not a finding. A settings page that saves with no visible effect on the served image IS the failure.",
    endResult:
      "Both settings are restored. Note whether a hard reload was required — that is cache behaviour rather than a defect, but it changes how the next tester reads this page.",
  },
  "checklist-admin-media-watermark-watermark-position-presets": {
    roles: ["admin", "guest"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/site → 'Watermark' and read every option in the 'Position' select, writing down which is currently set.",
      "Select each preset in turn — the four corners and center — saving after each. Leave 'custom' to the offset case.",
      "After each save, sign out and open /products/product-beyblade-burst-valkyrie's main image, noting where the mark sits.",
      "Repeat one corner preset against a portrait image and a landscape one.",
      "Restore the preset written down in step 2.",
    ],
    inputs: { product: "product-beyblade-burst-valkyrie" },
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
      "Open /admin/site → 'Watermark' and write down the current Position and any offsets.",
      "Turn on 'Use a custom X/Y offset instead' and read the two inputs it reveals — 'X offset (%) — + right / − left of center' and 'Y offset (%) — + down / − up from center'.",
      "Set X to 10 and Y to 10, save, sign out, and read /products/product-beyblade-burst-valkyrie's main image.",
      "Sign back in, set X to 100 and Y to 100 — far enough to push the mark past the edge — save, sign out, and read the image again.",
      "Read whether the mark is clipped, gone entirely, or clamped so it stays fully inside the frame.",
      "Sign back in and restore the Position and offsets written down in step 2.",
    ],
    inputs: {
      product: "product-beyblade-burst-valkyrie",
      modestOffset: 10,
      extremeOffset: 100,
    },
    expectedBehaviour:
      "A custom offset moves the mark, and an offset that would push it out of frame is clamped rather than obeyed. Obeying it produces images with no visible watermark at all — which is indistinguishable from the proxy being bypassed and would mask a much larger problem.",
    expectedUiState:
      "The modest offset moves the mark by the amount set. The extreme offset leaves the mark still visible, clamped flush to the frame, rather than pushing it off the image. A silently unwatermarked image is the failure. This is expected to PASS — the offset is clamped twice, once when the setting is read and again when the overlay is placed — so a clipped mark here would mean one of those clamps stopped running.",
    endResult: "The original offset is restored.",
  },
  "checklist-admin-media-watermark-watermark-theme-recolor": {
    roles: ["admin", "guest"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/site → 'Watermark' and confirm 'Watermark type' has no uploaded 'Watermark image' override — with none set the mark falls through to the bundled brand glyph, which is the only tier the theme can recolour.",
      "Sign out, open /products/product-beyblade-burst-valkyrie's main image, and note the mark's colour.",
      "Sign back in, open the 'Themes' tab, and write down which theme is set as the DEFAULT LIGHT theme.",
      "Change the default LIGHT theme to one with different brand colours and save. Changing the dark default will not move the mark — the resolver reads the light one only.",
      "Sign out, hard-reload the product image, and compare the mark's colour.",
      "Compare a dark product photo and a light one and check the mark is legible on both.",
      "Sign back in and restore the default light theme written down in step 4.",
    ],
    inputs: { product: "product-beyblade-burst-valkyrie", themeSetting: "defaultLightThemeId" },
    expectedBehaviour:
      "With no image override the mark falls through to the bundled brand glyph, whose gradient stops come from theme colour tokens — so changing the theme recolours it without a second asset. It must stay legible over both dark and light photographs, which is the part a colour change can quietly break.",
    expectedUiState:
      "The mark's colour follows the DEFAULT LIGHT theme's logo gradient. It remains legible on both a dark and a light product photo after the change. A mark that vanishes into one of the two is the finding. A mark that does not change at all is only a finding if the default LIGHT theme was the one changed — say which you changed.",
    endResult: "The original theme is restored.",
  },
  "checklist-admin-media-watermark-watermark-video-overlay-parity": {
    roles: ["admin", "guest"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/site → 'Watermark' and write down the size, opacity and position.",
      "Sign out and open /products/product-beyblade-burst-spryzen-video-demo.",
      "Look at the video's POSTER frame in the gallery strip and note whether it carries the mark.",
      "Click it to open the lightbox, play the video, and look for the mark while it is playing.",
      "Compare that against a still image on the same page.",
      "Now open / and find the 'Live auctions' hero slide, whose background is a video, and look for the mark on it while it plays.",
      "Sign back in, change the watermark position, save, sign out, and check which of the three — the poster, the product video, the hero video — followed.",
      "Restore the position.",
    ],
    inputs: {
      product: "product-beyblade-burst-spryzen-video-demo",
      heroSlide: "Live auctions",
    },
    expectedBehaviour:
      "A still goes through the proxy and is composited server-side. A video cannot be, within the platform's compute budget, so its mark has to be a client overlay reading the same settings — two consumers, one configuration. The case is whether every surface that plays a video has that second consumer.",
    expectedUiState:
      "The poster frame carries the mark, and follows a position change.\n\n🛑 EXPECT THE PRODUCT VIDEO TO CARRY NO MARK, AND RECORD IT AS A FAILURE. The overlay lives in `<MediaVideo>`, which is mounted only by the homepage hero carousel and the two admin upload previews; a product video plays in the lightbox, which renders a bare `<video controls>` with no overlay layer. So expect: poster marked, product video unmarked, hero video marked. Report which of the three followed the position change — that comparison is the finding, and a bare 'the video has no watermark' does not distinguish a missing overlay from a broken one.",
    expectedData: { posterMarked: true, productVideoMarked: false, heroVideoMarked: true },
    endResult:
      "The position is restored. Parity between the paths is the case — a mark on the poster alone proves nothing about the frames a buyer actually watches.",
  },
};
