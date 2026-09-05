/*
 * WHY: Authored six-part procedures for the design-ux/general-design page.
 * WHAT: 12 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THE COLOUR CASES ARE READ IN BOTH THEMES, ALWAYS. Two spellings produce
 * white-on-white in exactly one theme: a status tint paired with a literal
 * text-white, and a named palette tint used as a hover fill under inverted ink.
 * Reading one theme passes both.
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
  "checklist-design-ux-general-design-contrast-readability": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window in light mode and read every heading, paragraph, badge and button label down the page.",
      "Write down anything that is hard to read at normal viewing distance.",
      "Switch to dark mode without navigating and read the same page again.",
      "Open /products and repeat in both themes.",
      "Hover every link and button on both pages and read them while hovering.",
    ],
    expectedBehaviour:
      "Every foreground and background pair comes from tokens that invert together, so contrast holds in both themes. A pair where only one half inverts is legible in one theme and invisible in the other.",
    expectedUiState:
      "All text is readable in both themes, including while hovering. The specific failure to look for is text that disappears on hover only — a hover fill that does not invert sits under ink that does.",
    expectedData: { unreadableElements: 0 },
    endResult: "Read-only; return the site to light mode afterwards.",
  },
  "checklist-design-ux-general-design-mobile-nav": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Resize the browser window to 390 pixels wide and open / in a private window.",
      "Open the mobile navigation and read every item.",
      "Compare that list against the desktop top navigation at 1280 pixels.",
      "Tap into a nested group if one exists and read its items.",
      "Navigate somewhere and check the menu closes.",
      "Look at the bottom of the screen and count the fixed bars present.",
    ],
    inputs: { mobileWidth: 390, desktopWidth: 1280 },
    expectedBehaviour:
      "The mobile navigation carries the same destinations as the desktop one and closes on navigation. Exactly one bottom navigation bar may be mounted per route — it is the sole publisher of the tab-bar height, so two mounted at once means two bars on the same pixels and a height nobody owns.",
    expectedUiState:
      "Every desktop destination is reachable from the mobile menu. The menu closes after navigating. Exactly one fixed bar sits at the bottom of the screen — never two stacked or overlapping.",
    expectedData: { bottomNavCount: 1 },
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-general-design-dark-mode": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window and find the theme control.",
      "Switch to dark mode and read the page.",
      "Navigate to /products, then to a product page, reading each.",
      "Reload the page and watch the first moment it paints.",
      "Set the theme control to follow the system setting and change the system theme.",
    ],
    expectedBehaviour:
      "The chosen mode is applied before first paint and persists across navigation and reload. Themes are written to the document root at runtime from the active record, so a flash of the wrong theme on load means the choice is being applied after render rather than before.",
    expectedUiState:
      "Dark mode holds across every page and survives the reload with no flash of light theme on first paint. The follow-system option tracks the system setting.",
    endResult: "Read-only; return the site to light mode afterwards.",
  },
  "checklist-design-ux-general-design-loading-states": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open browser DevTools and throttle the network to a slow connection.",
      "Open /products in a private window and watch the page while it loads.",
      "Read what occupies the grid area before the cards arrive.",
      "Navigate to a product page and watch the same.",
      "Wait and check the loading state resolves rather than persisting.",
      "Remove the throttle.",
    ],
    expectedBehaviour:
      "A loading state occupies the space its content will take, so the page does not jump when data arrives. It must also resolve — a spinner that never stops is indistinguishable from a crash, and is what a fetch that neither succeeds nor reports failure looks like.",
    expectedUiState:
      "Placeholders roughly the size of the incoming cards, not a bare centred spinner on an empty page. Content replaces them without the layout jumping. No loading state is still showing after the data has arrived.",
    endResult: "Read-only; remove the network throttle afterwards.",
  },
  "checklist-design-ux-general-design-empty-states": {
    roles: ["guest", "buyer"],
    startPage: "/products",
    steps: [
      "Open /products in a private window, search zzzznope, and read what fills the grid area.",
      "Open /faqs, search zzzznope, and read what is shown.",
      "Sign in as karthik.new@gmail.com / TempPass123!, an account with little history.",
      "Open /user/orders, /user/bids and /wishlist and read each.",
      "Write down any that show a blank area rather than a message.",
    ],
    inputs: { nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "Every list that can be empty says so, inside the normal layout, and where useful offers a way forward. A blank area is read as a broken page rather than as an empty one.",
    expectedUiState:
      "Each surface shows a named empty state with a readable message. None shows a bare white area, and none shows a heading with nothing under it.",
    expectedData: { blankEmptyAreas: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-design-ux-general-design-error-states": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open /this-page-does-not-exist-qa in a private window and read the page.",
      "Open a product URL with a slug that does not exist and read that page.",
      "Read both for a reference code and for any file path or stack trace.",
      "Check each offers a link back into the site.",
    ],
    expectedBehaviour:
      "Error pages render inside the site chrome, offer a way out, and show the digest as a reference the user can quote. The digest is an opaque hash, not sensitive data — hiding it in production is what makes a user's bug report unactionable.",
    expectedUiState:
      "Both pages are styled site pages with a readable message and at least one working link. Where a digest exists it is shown as a reference. Neither shows a file path, a stack trace, or an unstyled white page.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-design-ux-general-design-card-row-heights-aligned": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products in a private window at 1280 pixels wide.",
      "Look along the top edge of each row of cards, then along the bottom edge.",
      "Find a row mixing a short title with a long one and compare those two cards' heights.",
      "Resize to 768 pixels and look again.",
      "Resize to 390 pixels and look again.",
      "Scroll to the last row and look at how many cards it holds and how wide they are.",
    ],
    inputs: { widths: "1280, 768, 390" },
    expectedBehaviour:
      "Cards in a row share a height so the grid reads as rows. The grid also uses auto-fill rather than auto-fit: auto-fit collapses the empty tracks in a short final row and lets the remaining card stretch across the container, so one leftover card ends up several times the width of its siblings.",
    expectedUiState:
      "Card tops and bottoms line up within each row at all three widths. A final row holding one card shows it at the SAME width as the cards above it, not stretched across the grid.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-general-design-image-watermark-subtle": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products in a private window and look at the watermark on several card images.",
      "Open a product page and look at the watermark on the main gallery image.",
      "Open the image lightbox and look at it there.",
      "Judge whether the product itself is still clearly visible under it.",
      "Look at a video's poster frame and check it carries the watermark too.",
    ],
    expectedBehaviour:
      "Images are watermarked by the media proxy on the way out, so the mark is present everywhere an image is served. It degrades through a fallback chain — an admin override, then the bundled brand mark, then the wordmark, then plain text — and never simply skips, so an absent mark means the proxy was bypassed.",
    expectedUiState:
      "Every product image carries a visible but unobtrusive watermark, including in the lightbox and on video poster frames. The product remains clearly visible. An image with NO mark at all is the finding — it means that image is not being served through the proxy.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-design-ux-general-design-clickable-image-tiles-not-blank": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Open /products/product-beyblade-burst-valkyrie in a private window.",
      "Look at the thumbnail strip below the main image and check each tile shows a picture.",
      "Click a thumbnail and check the main image changes.",
      "Open a product page that has reviews with photos and look at the 'Photos' grid.",
      "Open the review lightbox and look at its thumbnail strip.",
      "Open /bundles/bundle-tester-sandbox and look at its member collage.",
    ],
    expectedBehaviour:
      "An image inside a button renders at its intended size. A fill-style image resolves its percentages against its parent, so a shrink-to-fit wrapper between the button and the image collapses both to nothing — the tile becomes an empty bordered square while the button still looks and clicks correctly.",
    expectedUiState:
      "Every clickable image tile shows its picture at the same size as its neighbours, on all four surfaces. An empty bordered square where a photo should be is the failure, and it is the same failure on each of them.",
    expectedData: { blankTiles: 0 },
    endResult:
      "Read-only; nothing persists. Check all four surfaces — this defect hits every clickable image tile in the app at once, so finding one page clean proves nothing about the others.",
  },
  "checklist-design-ux-general-design-icon-button-label-spacing": {
    roles: ["guest", "buyer"],
    startPage: "/products/product-beyblade-original-dranzer-s",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /products/product-beyblade-original-dranzer-s.",
      "Look at each button that has both an icon and a label, and check the gap between them.",
      "Compare the icon's size against the button's own height.",
      "Open /admin or /store and look at the same on toolbar buttons.",
      "Find an icon-only control and check whether it is a true square.",
    ],
    expectedBehaviour:
      "A button's gap and alignment reach its real children, and its glyph size derives from the button's own size rather than being fixed. An icon-only control belongs in the square-boxed primitive: the ordinary button's small size sets a minimum height that beats a caller's height utility, so a round icon button rendered that way comes out as an ellipse.",
    expectedUiState:
      "Icon and label are separated by a visible gap on every such button. Glyphs scale with their button rather than all being one size. Icon-only controls are square, not oval.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-design-ux-general-design-section-cta-buttons-visible": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window in light mode and scroll to the bottom.",
      "Find every section-level call-to-action button and read its label.",
      "Check each against its section's background.",
      "Switch to dark mode and read them all again.",
      "Look specifically at buttons sitting on a coloured or gradient band.",
    ],
    expectedBehaviour:
      "A button on a branded or coloured band uses the pairing meant for that case — a solid fill with its own on-solid ink — rather than a theme-relative surface, which is a light background in every light theme and produces white-on-white under inverted ink.",
    expectedUiState:
      "Every section CTA is readable in both themes, including those on coloured bands. A button whose label vanishes in one theme is the failure, and it will be one that reads perfectly in the other.",
    expectedData: { unreadableCtas: 0 },
    endResult: "Read-only; return the site to light mode afterwards.",
  },
  "checklist-design-ux-general-design-mobile-search-bar-proportions": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Resize the browser window to 390 pixels wide and open / in a private window.",
      "Look at the header search bar and any control beside it.",
      "Compare the width of the text input against the width of the adjacent control.",
      "Type into the input and check the text is not clipped.",
      "Resize to 320 pixels and look again.",
      "Try to scroll the page sideways at both widths.",
    ],
    inputs: { widths: "390, 320" },
    expectedBehaviour:
      "The input takes the majority of the row and its neighbouring control stays at its own width. A control whose sizing utilities land on an inner element rather than the wrapper that is actually the flex child will ignore them and claim the whole row — which squeezes the input toward zero.",
    expectedUiState:
      "The text input is clearly the wider of the two at both widths, typed text is fully visible, and nothing scrolls sideways. A dropdown or button that has ballooned to take most of the row is the failure.",
    endResult: "Read-only; restore the window width afterwards.",
  },
};
