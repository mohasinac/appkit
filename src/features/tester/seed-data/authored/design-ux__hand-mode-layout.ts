/*
 * WHY: Authored six-part procedures for the design-ux/hand-mode-layout page.
 * WHAT: 18 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 HALF THESE CASES ASSERT THAT SOMETHING DOES *NOT* MOVE, and they are the
 * half worth reading carefully. Left-hand mode moves chrome the thumb reaches
 * for — sidebars, drawers, close buttons, floating controls. It must not mirror
 * content, reading order, or any control whose direction carries meaning: a
 * gallery's next-arrow still means "next", and flipping it inverts the gesture.
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
  "checklist-design-ux-hand-mode-layout-sidebar-flips": {
    roles: ["buyer"],
    startPage: "/user/settings",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user and note which side the sidebar is on.",
      "Open /user/settings, click the 'Appearance' tab, and set 'Left-hand mode' to on.",
      "Open /user and note which side the sidebar is on now.",
      "Open /admin or /store as the relevant role and check that portal's sidebar too.",
      "Set 'Left-hand mode' back to off.",
    ],
    inputs: { leftHandMode: true },
    expectedBehaviour:
      "The dashboard sidebar moves to the opposite side, and it does so in every portal, since all three wrap one structural shell. The main content reflows around it rather than sliding underneath.",
    expectedUiState:
      "With the mode on the sidebar is on the opposite side in every portal checked, and the content area has moved with it — no overlap and no horizontal scroll.",
    endResult:
      "The mode is off again by the last step. Later cases assume the default layout.",
  },
  "checklist-design-ux-hand-mode-layout-drawers-flip": {
    roles: ["buyer"],
    startPage: "/products",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and turn on 'Left-hand mode' from /user/settings.",
      "Open /products and click 'Filters' to open the filter drawer.",
      "Note which edge the drawer slides in from.",
      "Close it, then open any side drawer in the dashboard and note its edge.",
      "Turn 'Left-hand mode' off and repeat both.",
    ],
    inputs: { leftHandMode: true },
    expectedBehaviour:
      "Side drawers enter from the opposite edge, because a drawer is a thumb-reach surface. The animation direction follows the edge — a drawer that lands on the left while still animating in from the right reads as broken.",
    expectedUiState:
      "With the mode on, drawers enter from and rest on the opposite edge to their default, and the animation runs in that direction. With it off, they return to the default edge.",
    endResult: "The mode is off again by the last step.",
  },
  "checklist-design-ux-hand-mode-layout-close-buttons-flip": {
    roles: ["buyer"],
    startPage: "/products",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and turn on 'Left-hand mode'.",
      "Open /products, open the filter drawer, and note which corner its close control is in.",
      "Open a modal and note which corner its close control is in.",
      "Open a product image lightbox and note the same.",
      "Turn 'Left-hand mode' off and check all three again.",
    ],
    inputs: { leftHandMode: true },
    expectedBehaviour:
      "Close controls follow the hand, since dismissing is the most repeated action on any overlay. All three surfaces must agree — a modal that flips while the lightbox does not is the shape this defect takes.",
    expectedUiState:
      "With the mode on, all three close controls sit in the mirrored corner. With it off, all three return. One surface out of step with the other two is the finding.",
    endResult: "The mode is off again by the last step.",
  },
  "checklist-design-ux-hand-mode-layout-back-to-top-cta-flips": {
    roles: ["buyer"],
    startPage: "/products",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and turn on 'Left-hand mode'.",
      "Open /products and scroll past 400 pixels so the back-to-top control appears.",
      "Note which side of the viewport it is on.",
      "Open a product detail page, scroll until the purchase bar appears, and check the control still clears the bar.",
      "Turn 'Left-hand mode' off and check both again.",
    ],
    inputs: { leftHandMode: true },
    expectedBehaviour:
      "The floating control moves to the opposite side while still reading the same bottom-edge tiers, so it clears the purchase bar in either mode. Flipping the horizontal position must not reset the vertical offset.",
    expectedUiState:
      "With the mode on, the control is on the mirrored side AND still sits above the purchase bar with a visible gap. A control that flips sides and lands on top of the bar is the failure.",
    endResult: "The mode is off again by the last step.",
  },
  "checklist-design-ux-hand-mode-layout-quick-links-unaffected": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user and write down the order of the quick-links tiles, left to right and top to bottom.",
      "Turn on 'Left-hand mode' from /user/settings.",
      "Open /user and write down the tile order again.",
      "Compare the two.",
      "Turn 'Left-hand mode' off.",
    ],
    inputs: { leftHandMode: true },
    expectedBehaviour:
      "The quick-links grid is CONTENT, not chrome, so its order is unchanged. Mirroring a grid of tiles reverses reading order and moves every tile the user has learned the position of — the mode is about reach, not about handedness of content.",
    expectedUiState:
      "The tiles are in exactly the same order in both modes. A reversed grid is the failure even though it looks deliberate.",
    endResult: "The mode is off again by the last step.",
  },
  "checklist-design-ux-hand-mode-layout-hero-carousel-arrows-flip": {
    roles: ["buyer"],
    startPage: "/",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and turn on 'Left-hand mode'.",
      "Open / and look at the hero carousel's controls.",
      "Note where the previous and next controls sit.",
      "Click each and check which direction the slides move.",
      "Turn 'Left-hand mode' off and check both again.",
    ],
    inputs: { leftHandMode: true },
    expectedBehaviour:
      "The hero's controls are grouped chrome placed for reach, so the GROUP moves — but each control keeps its meaning. Next still advances; only where the pair sits changes.",
    expectedUiState:
      "With the mode on the control group sits on the mirrored side, and the next control still advances the carousel while previous still goes back. A next control that now goes backwards is the failure.",
    endResult: "The mode is off again by the last step.",
  },
  "checklist-design-ux-hand-mode-layout-gallery-arrows-unaffected": {
    roles: ["buyer"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and turn on 'Left-hand mode'.",
      "Open /products/product-beyblade-burst-valkyrie and look at the gallery's previous and next arrows.",
      "Note which side each is on and click each to check its direction.",
      "Open the image lightbox and check its arrows the same way.",
      "Turn 'Left-hand mode' off and compare.",
    ],
    inputs: { leftHandMode: true },
    expectedBehaviour:
      "Gallery arrows straddle the image and their positions ARE their meaning — left goes back, right goes forward. Mirroring them inverts the gesture, so they are explicitly out of scope for this mode.",
    expectedUiState:
      "The gallery arrows are in the same positions in both modes, and each still moves in its own direction. Arrows that swap sides are the failure here, which is the opposite of what the carousel case above expects.",
    endResult: "The mode is off again by the last step.",
  },
  "checklist-design-ux-hand-mode-layout-homepage-section-buttons-mirror": {
    roles: ["buyer"],
    startPage: "/",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and turn on 'Left-hand mode'.",
      "Open / and scroll through every section, noting where each section's action button sits relative to its heading.",
      "Turn 'Left-hand mode' off.",
      "Open / and note the same positions.",
      "Compare section by section.",
    ],
    inputs: { leftHandMode: true },
    expectedBehaviour:
      "A section's trailing action — a 'See all' or similar — moves to the mirrored end of its header row, since it is a reach target rather than content. The heading itself stays where reading starts.",
    expectedUiState:
      "In left-hand mode the section actions sit at the mirrored end of their rows while the headings stay put. A section whose heading has also moved is the failure.",
    endResult: "The mode is off again by the last step.",
  },
  "checklist-design-ux-hand-mode-layout-titlebar-actions-mirror": {
    roles: ["buyer"],
    startPage: "/",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and turn on 'Left-hand mode'.",
      "Open / and look at the title bar's action cluster — account, cart, notifications.",
      "Note which end of the bar it sits at and the order within it.",
      "Turn 'Left-hand mode' off and look again.",
      "Compare both the end and the internal order.",
    ],
    inputs: { leftHandMode: true },
    expectedBehaviour:
      "The header's action cluster moves to the mirrored end as a group. Whether the icons within it also reverse is the question worth recording — reversing them moves every icon the user has learned, for no reach benefit once the group has already moved.",
    expectedUiState:
      "The cluster sits at the mirrored end in left-hand mode. Note in the comment whether the icons within it kept their relative order, and whether that reads well.",
    endResult: "The mode is off again by the last step.",
  },
  "checklist-design-ux-hand-mode-layout-titlebar-centre-mark-unaffected": {
    roles: ["buyer"],
    startPage: "/",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open / and note where the brand mark and wordmark sit in the title bar.",
      "Turn on 'Left-hand mode' and open / again.",
      "Note where the brand mark and wordmark sit now.",
      "Resize to 390 pixels wide and check both modes again.",
      "Turn 'Left-hand mode' off.",
    ],
    inputs: { leftHandMode: true },
    expectedBehaviour:
      "The brand mark is identity, not a control, so it does not move. On desktop it is centred and on mobile it prefixes the bar — neither position is a reach target, so neither mirrors.",
    expectedUiState:
      "The mark is in the same place in both modes, at both widths. A brand mark that jumps sides with the mode is the failure.",
    endResult: "The mode is off again by the last step; restore the window width.",
  },
  "checklist-design-ux-hand-mode-layout-titlebar-row2-mirror": {
    roles: ["buyer"],
    startPage: "/",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and turn on 'Left-hand mode'.",
      "Open / and look at the header's second row — the nav items and any controls beside them.",
      "Note which end any control cluster sits at.",
      "Note whether the nav items themselves have reversed.",
      "Turn 'Left-hand mode' off and compare both.",
    ],
    inputs: { leftHandMode: true },
    expectedBehaviour:
      "Controls in the second row mirror; the nav items are content and keep their order. This is the same content-versus-chrome line the quick-links case draws, applied to a row that mixes both.",
    expectedUiState:
      "Control clusters sit at the mirrored end while the nav items read in their original order. Reversed nav items are the failure.",
    endResult: "The mode is off again by the last step.",
  },
  "checklist-design-ux-hand-mode-layout-titlebar-actions-no-overflow-narrow": {
    roles: ["buyer"],
    startPage: "/",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and turn on 'Left-hand mode'.",
      "Resize the browser window to 320 pixels wide and open /.",
      "Look at the title bar and check every control is fully on screen.",
      "Try to scroll the page sideways.",
      "Turn 'Left-hand mode' off at 320 pixels and check the same.",
    ],
    inputs: { leftHandMode: true, viewportWidth: 320 },
    expectedBehaviour:
      "Mirroring must not push anything off the edge at the narrowest width. A cluster that fits when right-aligned can overflow when left-aligned if its spacing was written for one direction only.",
    expectedUiState:
      "Every title-bar control is fully visible at 320 pixels in both modes, and the page does not scroll sideways in either.",
    endResult: "The mode is off again by the last step; restore the window width.",
  },
  "checklist-design-ux-hand-mode-layout-bottom-nav-mirror": {
    roles: ["buyer"],
    startPage: "/",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and turn on 'Left-hand mode'.",
      "Resize the browser window to 390 pixels wide and open /.",
      "Look at the bottom tab bar and write down its items in order.",
      "Turn 'Left-hand mode' off and write down the order again.",
      "Compare, and count the bottom bars in both modes.",
    ],
    inputs: { leftHandMode: true, mobileWidth: 390 },
    expectedBehaviour:
      "The bottom tab bar spans the full width, so handedness changes nothing about reach — its items are equally reachable either way. Reversing them moves every destination the user has memorised for no benefit.",
    expectedUiState:
      "The tab items are in the same order in both modes. Exactly one bottom tab bar is present in each — the bar is the sole publisher of its own height, so two mounted at once is a separate and worse failure.",
    expectedData: { bottomNavCount: 1 },
    endResult: "The mode is off again by the last step; restore the window width.",
  },
  "checklist-design-ux-hand-mode-layout-dashboard-bottom-nav-mirror": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and turn on 'Left-hand mode'.",
      "Resize the browser window to 390 pixels wide and open /user.",
      "Look at the bottom tab bar and write down its items in order.",
      "Count the bottom bars present.",
      "Turn 'Left-hand mode' off and check both again.",
      "Compare the dashboard's bar against the public one from the previous case.",
    ],
    inputs: { leftHandMode: true, mobileWidth: 390 },
    expectedBehaviour:
      "The dashboard renders its own bottom bar and the public one is suppressed on those routes, so exactly one is mounted. Two would be two bars on the same pixels with a height nobody owns, and everything above would be positioned against the wrong one.",
    expectedUiState:
      "Exactly one bottom bar on /user in both modes, carrying dashboard destinations rather than the public ones. Item order is unchanged between modes, matching the public bar's behaviour.",
    expectedData: { bottomNavCount: 1 },
    endResult: "The mode is off again by the last step; restore the window width.",
  },
  "checklist-design-ux-hand-mode-layout-count-badges-mirror": {
    roles: ["buyer"],
    startPage: "/",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! with at least one unread notification and one cart item.",
      "Open / and note which corner each count badge sits in on its icon.",
      "Turn on 'Left-hand mode' and open / again.",
      "Note the badge corners now, and read each number.",
      "Resize to 390 pixels and check the badges on the bottom bar too.",
      "Turn 'Left-hand mode' off.",
    ],
    inputs: { leftHandMode: true },
    expectedBehaviour:
      "A badge stays attached to its icon and does not drift off the icon's edge or under an adjacent control when the cluster mirrors. It must also stay readable — these badges overlay chrome and take the solid pairing, so a tint conversion would leave the number invisible.",
    expectedUiState:
      "Every badge sits on its own icon in both modes, fully within the bar, with its number readable. A badge clipped by the viewport edge in left-hand mode is the failure this case is looking for.",
    endResult: "The mode is off again by the last step; restore the window width.",
  },
  "checklist-design-ux-hand-mode-layout-nav-scroll-arrows-unaffected": {
    roles: ["buyer"],
    startPage: "/",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and turn on 'Left-hand mode'.",
      "Resize the browser window to 390 pixels wide and open /.",
      "Find a horizontally scrolling nav strip and look at its scroll arrows.",
      "Click each and check which direction the strip moves.",
      "Turn 'Left-hand mode' off and check both again.",
    ],
    inputs: { leftHandMode: true, mobileWidth: 390 },
    expectedBehaviour:
      "Scroll arrows describe a direction of travel, like gallery arrows, so they do not mirror. Left scrolls left in both modes.",
    expectedUiState:
      "The arrows are in the same positions and move the strip in the same directions in both modes. Swapped arrows are the failure.",
    endResult: "The mode is off again by the last step; restore the window width.",
  },
  "checklist-design-ux-hand-mode-layout-header-tab-order-sane": {
    roles: ["buyer"],
    startPage: "/",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and turn on 'Left-hand mode'.",
      "Open / and press Tab repeatedly from the top of the page, writing down each control as it receives focus.",
      "Continue until focus reaches the main content.",
      "Turn 'Left-hand mode' off and repeat the same walk.",
      "Compare the two sequences.",
    ],
    inputs: { leftHandMode: true },
    expectedBehaviour:
      "Mirroring is visual. Focus order follows the document, so a keyboard user's path through the header is unchanged — and every focused control shows a visible focus ring in both modes.",
    expectedUiState:
      "The tab sequence is the same in both modes and never jumps backwards across the header. Every focused control is visibly outlined. A focus order that reverses with the mode means the DOM is being reordered rather than the layout mirrored.",
    endResult: "The mode is off again by the last step.",
  },
  "checklist-design-ux-hand-mode-layout-hand-mode-no-fouc": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and turn on 'Left-hand mode'.",
      "Open /user and reload the page, watching the very first moment it paints.",
      "Note whether the sidebar appears on the default side before moving.",
      "Reload three more times, watching each time.",
      "Navigate between dashboard pages and watch for the same flash.",
      "Turn 'Left-hand mode' off.",
    ],
    inputs: { leftHandMode: true },
    expectedBehaviour:
      "The preference is stored on the user record and applied before first paint. Reading it only after hydration paints the default layout first and then moves it — visible as the sidebar jumping across the screen on every single load.",
    expectedUiState:
      "On all four reloads the sidebar is on the mirrored side from the first painted frame. No flash of the default layout, and no jump during client-side navigation.",
    endResult:
      "The mode is off again by the last step. Reloading four times matters — a flash this brief is easy to miss once.",
  },
};
