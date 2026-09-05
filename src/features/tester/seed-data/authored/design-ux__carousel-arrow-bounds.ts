/*
 * WHY: Authored six-part procedures for the design-ux/carousel-arrow-bounds page.
 * WHAT: 12 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * Every carousel in the app shares one implementation, so the last two cases
 * exist to prove that sharing is real: a fix that lands on the homepage rail and
 * not on the related-items rail means there are two implementations.
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
  "checklist-design-ux-carousel-arrow-bounds-arrows-never-cover-cards": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at 1280 pixels wide.",
      "Scroll to a horizontal card carousel.",
      "Look at the left and right arrows and what sits under each.",
      "Read the title and price of the first and last visible cards.",
      "Try to click the first card's title without hitting an arrow.",
    ],
    inputs: { viewportWidth: 1280 },
    expectedBehaviour:
      "Arrows sit in reserved gutters beside the rail rather than floating over the first and last cards. An arrow on top of a card takes the click meant for the card, which reads as a card that does not open.",
    expectedUiState:
      "Neither arrow overlaps a card's image, title or price. The first card is clickable across its whole area. An arrow covering the corner of the end card is the failure even when the card still opens from elsewhere.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-carousel-arrow-bounds-arrows-no-overlap-mid-scroll": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at 1280 pixels wide and scroll to a card carousel.",
      "Click the right arrow once and watch the cards move.",
      "While the cards are still moving, look at where the arrows are.",
      "Let it settle and look again.",
      "Click through to the middle of the rail and look once more.",
    ],
    expectedBehaviour:
      "The arrows are fixed to the rail's gutters and do not move with its content, so a card sliding past never ends up under one — mid-scroll is the moment a card is most likely to be beneath an arrow.",
    expectedUiState:
      "Arrows stay in place while the cards move and no card passes under them. In the middle of the rail neither arrow overlaps a card.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-carousel-arrow-bounds-no-arrows-on-mobile": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Resize the browser window to 390 pixels wide and open / in a private window.",
      "Scroll to a card carousel and look for arrows.",
      "Swipe the rail and check it moves.",
      "Resize to 1280 pixels and look for the arrows again.",
    ],
    inputs: { mobileWidth: 390, desktopWidth: 1280 },
    expectedBehaviour:
      "Arrows are a pointer affordance and are hidden on touch widths, where swiping is the interaction. Keeping them costs horizontal space the cards need on the narrowest screens.",
    expectedUiState:
      "No arrows at 390 pixels, and the rail still swipes. Arrows return at 1280. Arrows present at 390 are the failure.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-carousel-arrow-bounds-mobile-card-not-clipped": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Resize the browser window to 390 pixels wide and open / in a private window.",
      "Scroll to a card carousel and look at the first card's left edge.",
      "Look at the last card's right edge after swiping to the end.",
      "Read each visible card's title and price in full.",
      "Try to scroll the page sideways rather than the rail.",
    ],
    inputs: { mobileWidth: 390 },
    expectedBehaviour:
      "Cards are fully readable at the rail's ends, with the container's own padding preserved. A rail that bleeds into the page's edge padding makes the whole page scroll sideways instead of the rail.",
    expectedUiState:
      "No card is clipped at either end. Every visible title and price reads in full. The PAGE does not scroll sideways — only the rail does.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-carousel-arrow-bounds-mobile-swipe-and-snap": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Resize the browser window to 390 pixels wide and open / in a private window.",
      "Scroll to a card carousel and swipe it left with a short flick.",
      "Watch where it comes to rest.",
      "Swipe again with a long flick and watch where it rests.",
      "Swipe back to the start.",
    ],
    inputs: { mobileWidth: 390 },
    expectedBehaviour:
      "The rail snaps so a card edge aligns to the viewport rather than resting mid-card. Both a short and a long flick end aligned — a snap that only works for one gesture length is not a snap.",
    expectedUiState:
      "After both flicks the rail rests with a card edge aligned, not with a card half off screen. Swiping back reaches the true start with the first card fully visible.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-carousel-arrow-bounds-no-white-fade-smear": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window in light mode at 1280 pixels and scroll to a card carousel.",
      "Look at the left and right edges of the rail for a fade or gradient overlay.",
      "Switch to dark mode and look at the same edges.",
      "Scroll the rail to the middle and look again in dark mode.",
    ],
    expectedBehaviour:
      "Any edge fade is drawn from a theme-relative surface so it matches the page behind it. A fade hard-coded to white sits as a pale smear over a dark page — visible as a haze rather than as a gradient into the background.",
    expectedUiState:
      "The rail's edges blend into the page background in both themes. In dark mode there is no light smear or milky band at either edge.",
    endResult: "Read-only; return the site to light mode and restore the width.",
  },
  "checklist-design-ux-carousel-arrow-bounds-two-row-tall-arrows": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at 1280 pixels and find a carousel whose cards wrap to two rows, or a taller card variant.",
      "Look at the arrows' vertical position relative to the rail.",
      "Check whether they are centred on the full height or on one row.",
      "Click each and check it scrolls the whole rail.",
    ],
    expectedBehaviour:
      "Arrows centre on the rail's full height whatever the card height, so a taller card variant does not leave them stranded near the top.",
    expectedUiState:
      "Both arrows are vertically centred against the full rail height and both scroll the entire rail. Arrows aligned to the first row of a two-row rail are the failure.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-carousel-arrow-bounds-arrows-dark-mode": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window and switch to dark mode.",
      "Scroll to a card carousel and look at both arrows.",
      "Hover each and look at it while hovering.",
      "Compare their visibility against light mode.",
    ],
    expectedBehaviour:
      "Arrow fill and glyph both come from tokens that invert, so the control is visible in both themes at rest and on hover. A named palette tint as the hover fill is the same near-white in both, and swallows the glyph in dark.",
    expectedUiState:
      "Both arrows are clearly visible in dark mode and stay visible while hovered. An arrow that disappears under its own hover fill is the failure.",
    endResult: "Read-only; return the site to light mode afterwards.",
  },
  "checklist-design-ux-carousel-arrow-bounds-arrow-end-state-no-jump": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at 1280 pixels and scroll to a card carousel.",
      "Look at the left arrow while the rail is at its start.",
      "Click right repeatedly to the end of the rail.",
      "Look at the right arrow at the end and at the rail's position.",
      "Watch whether the cards shift when an arrow changes state.",
    ],
    expectedBehaviour:
      "An arrow that cannot act is disabled in place rather than removed. Removing it frees its gutter, the rail widens, and every card jumps sideways at exactly the moment the user is reaching for one.",
    expectedUiState:
      "At the start the left arrow is present and visibly disabled, not absent. At the end the right arrow is the same. The cards do not shift horizontally when either changes state.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-carousel-arrow-bounds-resize-across-breakpoint": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at 1280 pixels and scroll to a card carousel.",
      "Slowly resize the window down through 1024, 768 and 640 to 390 pixels, watching the rail throughout.",
      "Note the width at which the arrows disappear.",
      "Slowly resize back up to 1280, watching the rail.",
      "Check no card is left clipped or overlapped at any width.",
    ],
    expectedBehaviour:
      "The rail re-measures as the viewport changes, so arrows appear and disappear at the breakpoint and the card widths keep up. A rail that measures once on mount is correct at the width it loaded at and wrong at every other.",
    expectedUiState:
      "Arrows appear and disappear cleanly at the breakpoint in both directions. At no intermediate width is a card clipped, overlapped by an arrow, or left at a stale width. The page never scrolls sideways.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-carousel-arrow-bounds-related-carousels-same-behaviour": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Open /products/product-beyblade-burst-valkyrie in a private window at 1280 pixels.",
      "Scroll to the related-items carousels below the main content.",
      "Check the arrows against the same points as the homepage: no card overlap, disabled at the ends, centred vertically.",
      "Resize to 390 pixels and check the arrows disappear and the rail swipes.",
      "Compare everything against how the homepage carousel behaved.",
    ],
    inputs: { desktopWidth: 1280, mobileWidth: 390 },
    expectedBehaviour:
      "Related-items rails use the same carousel as the homepage, so every behaviour above holds here without a separate fix. A difference means there are two implementations and a fix has only landed on one.",
    expectedUiState:
      "Arrow bounds, disabled end states, vertical centring and mobile behaviour all match the homepage carousel. Any difference is the finding, named specifically.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-carousel-arrow-bounds-category-page-carousels-same-behaviour": {
    roles: ["guest"],
    startPage: "/categories/category-beyblade-burst",
    steps: [
      "Open /categories/category-beyblade-burst in a private window at 1280 pixels.",
      "Scroll to the grouped-listings carousel.",
      "Check the arrows against the same points as the homepage rail.",
      "Open /brands/brand-beyblade and check its carousel the same way.",
      "Resize both to 390 pixels and check the arrows disappear and the rails swipe.",
    ],
    inputs: { desktopWidth: 1280, mobileWidth: 390 },
    expectedBehaviour:
      "Category and brand pages use the same carousel again. These two are worth checking separately because the category and brand tab components are deliberate near-duplicates, and a duplicate is exactly where a shared component gets replaced by a local copy.",
    expectedUiState:
      "Both pages' carousels behave identically to the homepage rail at both widths. A difference between the category page and the brand page is itself a finding, since they should be the same component scoped differently.",
    endResult: "Read-only; restore the window width afterwards.",
  },
};
