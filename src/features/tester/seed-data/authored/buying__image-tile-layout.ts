/*
 * WHY: Authored six-part procedures for the buying/image-tile-layout page.
 * WHAT: 7 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 EVERY CASE HERE IS ONE DEFECT SEEN FROM A DIFFERENT SURFACE. A fill-style
 * image resolves its percentages against its parent, so a shrink-to-fit wrapper
 * between a button and its image collapses BOTH to nothing — the tile renders as
 * an empty bordered box while the button still looks and clicks correctly. Twelve
 * surfaces broke at once and none of the call sites had changed.
 *
 * Two things void the fix from outside the primitive, and both are checked here:
 * a bare display utility on the button — which un-layered important styles beat,
 * so the button stops being a flex container — and two or more in-flow children
 * without a column direction, which lays the tile out beside its caption at a
 * fraction of its width.
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
  "checklist-buying-image-tile-layout-bundle-member-thumbnails": {
    roles: ["guest"],
    startPage: "/bundles/bundle-tester-sandbox",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123! so sandbox content is visible.",
      "Open /bundles/bundle-tester-sandbox.",
      "Look at the member collage and count the tiles.",
      "Check each tile shows its member's photograph rather than an empty bordered box.",
      "Compare the tiles' widths against one another.",
      "Hard-reload with Ctrl+Shift+R and look again.",
    ],
    inputs: { bundleId: "bundle-tester-sandbox", memberCount: 2 },
    expectedBehaviour:
      "Each member tile renders its image at its intended size. This collage is one of the twelve surfaces that collapsed at once when a wrapper element appeared between a button and its fill-style image — and it is the surface that stayed broken longest, because a bare display utility on the button voided the primitive's own fix from the call site.",
    expectedUiState:
      "Two tiles, each showing its member's photo, both the same width. An empty bordered box where a photo should be is the collapse; a tile at a fraction of its neighbour's width is the row-direction failure.",
    expectedData: { blankTiles: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-image-tile-layout-bundle-badge-position": {
    roles: ["guest"],
    startPage: "/bundles",
    steps: [
      "Open /bundles in a private window at 1280 pixels wide.",
      "Look at each bundle card's discount badge and where it sits on the card.",
      "Check the badge does not cover the bundle's title or price.",
      "Read the badge's text against its background.",
      "Resize to 390 pixels and look at the badges again.",
      "Switch to dark mode and read them once more.",
    ],
    inputs: { desktopWidth: 1280, mobileWidth: 390 },
    expectedBehaviour:
      "The badge overlays the card image, so it takes the solid pairing — a fill with its own on-solid ink — rather than a pale tint. A tint over an arbitrary product photograph is unreadable regardless of theme, and a literal white ink against a theme-inverting background is invisible in exactly one of the two.",
    expectedUiState:
      "Every badge is readable at both widths and in both themes, and none covers the title or price. A visible badge shape with unreadable text inside it is the failure.",
    endResult: "Read-only; return the site to light mode and restore the width.",
  },
  "checklist-buying-image-tile-layout-bundle-tile-opens-lightbox": {
    roles: ["guest"],
    startPage: "/bundles/bundle-tester-sandbox",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!.",
      "Open /bundles/bundle-tester-sandbox and click a member tile in the collage.",
      "Read what opens.",
      "If a lightbox opens, use its next and previous controls and read what changes.",
      "Close it and check the page is unchanged behind it.",
      "Click a different tile and confirm it opens that member rather than the first.",
    ],
    expectedBehaviour:
      "A tile is a real control with a destination — either the member's own page or a lightbox on that member. A tile bound to stale state opens the first member whichever one is clicked, which looks like a working lightbox until a second tile is tried.",
    expectedUiState:
      "Clicking a tile opens something, and clicking a different tile opens that member. An inert tile, or one that always opens the same member, are both failures.",
    endResult: "Read-only; close without acting.",
  },
  "checklist-buying-image-tile-layout-prizedraw-collage-stacked": {
    roles: ["guest"],
    startPage: "/prize-draws/prizedraw-beyblade-mystery-box",
    steps: [
      "Open /prize-draws/prizedraw-beyblade-mystery-box in a private window.",
      "Find the prize collage and count its tiles.",
      "For each tile, check whether its image sits ABOVE its caption or beside it.",
      "Compare each tile's width against its neighbours.",
      "Resize to 390 pixels and check the arrangement again.",
      "Count the tiles against the number of photographed prizes.",
    ],
    expectedBehaviour:
      "A tile stacks its image above its caption. Where a control holds two or more in-flow children and no column direction, the content wrapper inherits a row direction and lays the image out BESIDE the caption at a fraction of its intended width — the tile still renders, which is why it reads as a design choice rather than a bug.",
    expectedUiState:
      "Every tile shows its image above its caption, all at the same width, at both viewport sizes. An image sitting beside its caption and squeezed narrow is the row-direction failure.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-buying-image-tile-layout-concern-card-icon-above-label": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at 1280 pixels wide.",
      "Find the concern or trust cards and look at each one.",
      "Check each card's icon sits above its label rather than beside it.",
      "Compare the icon's size against the card's own height.",
      "Resize to 390 pixels and check the arrangement holds.",
      "Switch to dark mode and check the icons are still visible.",
    ],
    inputs: { desktopWidth: 1280, mobileWidth: 390 },
    expectedBehaviour:
      "These cards carry an explicitly-sized icon box, which is what kept them from collapsing entirely when the wrapper defect hit — but an explicit size does not fix the direction, so they still laid the icon out beside the label. Sizing and direction are two separate failures and this card had only one of them.",
    expectedUiState:
      "Each card shows its icon above its label at both widths, with the icon proportionate to the card. An icon beside its label, or one at the platform font's fallback size, are different failures and should be reported as such.",
    endResult: "Read-only; return to light mode and restore the width.",
  },
  "checklist-buying-image-tile-layout-media-picker-existing-grid": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and open the media picker.",
      "Switch to its existing-files grid.",
      "Check every tile shows its image rather than an empty bordered box.",
      "Check each tile's caption sits below its image rather than beside it.",
      "Compare the tiles' widths against one another.",
      "Select one and confirm the right file is chosen.",
    ],
    expectedBehaviour:
      "The existing-files grid is the same clickable-image-tile shape as the bundle collage and the prize-draw collage, inside a form rather than on a public page. It carries both failure modes at once: the tiles can collapse to nothing, and their captions can end up beside the image instead of below it.",
    expectedUiState:
      "Every tile shows its image with its caption beneath, all at the same width. Selecting a tile chooses the file it shows rather than another.",
    expectedData: { blankTiles: 0 },
    endResult: "Leave the editor without saving.",
  },
  "checklist-buying-image-tile-layout-icon-button-spacing": {
    roles: ["guest", "buyer"],
    startPage: "/products/product-beyblade-original-dranzer-s",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /products/product-beyblade-original-dranzer-s.",
      "Find every button carrying both an icon and a label and check there is a visible gap between them.",
      "Compare each glyph's size against its own button's height.",
      "Find an icon-only control and check it is a true square rather than an ellipse.",
      "Check no control uses a text character in place of an icon.",
    ],
    expectedBehaviour:
      "A button's gap and alignment reach its real children rather than stopping at the wrapper, and a glyph's size derives from the button's size rather than being fixed. An icon-only control belongs in the square-boxed primitive: the ordinary button's small size sets a minimum height that beats a caller's height utility, so a round icon button rendered that way comes out an ellipse.",
    expectedUiState:
      "Every icon-and-label button shows a gap. Glyphs scale with their buttons rather than all being one size. Icon-only controls are square. No control uses a heart, star or similar text character as its icon — a text character cannot be sized by any utility and renders at the platform font fallback.",
    endResult: "Read-only; nothing persists.",
  },
};
