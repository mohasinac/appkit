/*
 * WHY: Authored six-part procedures for the design-ux/header-brand-mark-centring page.
 * WHAT: 6 case(s), keyed by full checklist id.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

/*
 * 🛑 THESE ARE WIDTH-SWEEP CASES, NOT "LOOK AT THE HEADER" CASES.
 *
 * The defect (2026-10-19) was a BAND, not a state: the centred brand mark was
 * `absolute left-1/2`, i.e. out of flex flow, so `justify="between"` reserved no
 * space for it and the right-hand action cluster grew leftward over it. The mark
 * reveals at `md` (768px) and the bell/messages/wishlist/cart reveal at `lg`
 * (1024px) — two independent breakpoints — so the collision existed only from
 * 1024px to roughly 1150px and was invisible at every width either side of it.
 *
 * Which is why a case reading "the header looks right" PASSES AGAINST THIS BUG at
 * a maximised window, and why every case below names the widths to step through
 * rather than leaving the window wherever it happened to be.
 *
 * Two corollaries worth keeping:
 *   - SIGNED OUT IS THE WORST CASE. "Sign in" + "Register" (~160px) stand in for
 *     one 44px avatar, pushing the cluster ~120px further left. A case run only
 *     signed in can miss the band entirely.
 *   - HAND MODE IS WHERE A LAYOUT FIX HALF-WORKS. The row mirrors, so the two
 *     side tracks have to carry their own mirrored alignment; a fix that only
 *     corrects right-hand mode leaves the wordmark floating off its edge.
 */

import type { AuthoredCase } from "./_types";

export const authored: Record<string, AuthoredCase> = {
  "checklist-design-ux-header-brand-mark-centring-mark-clear-of-icons-across-the-lg-band": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products signed out.",
      "Set the window to exactly 1024px wide.",
      "Widen in roughly 32px steps to 1280px, pausing at each step.",
      "At each step look at the space between the 'LetItRip' wordmark and the first icon of the right-hand cluster.",
    ],
    expectedBehaviour:
      "The mark is one of three in-flow tracks in the title row, so the row's layout reserves its width and the action cluster cannot be laid out across it at any width. Previously it was absolutely positioned and the cluster simply grew over it between 1024px and ~1150px.",
    expectedUiState:
      "At every step the leaf mark sits in clear space with visible gap on both sides. No part of it overlaps the notification bell, the messages icon, the wishlist heart or the cart. Each icon's full 44px square is unobstructed. If an overlap appears, record the exact window width it starts and stops at — the band is the finding, not the single screenshot.",
    endResult:
      "Pure layout; nothing persists. Reloading at any width in the band reproduces the same clean header, and the band must not reappear after a reload.",
  },

  "checklist-design-ux-header-brand-mark-centring-mark-clear-signed-out-worst-case": {
    roles: ["guest", "buyer"],
    startPage: "/products",
    steps: [
      "Sign out completely and load /products.",
      "Set the window to approximately 1100px wide.",
      "Screenshot the header.",
      "Sign in as any buyer and, without changing the window width, screenshot the header again.",
    ],
    expectedBehaviour:
      "Signed out the cluster is at its widest, because 'Sign in' and 'Register' (~160px together) replace a single 44px avatar. ~1100px signed out is the exact combination the original bug report was captured at, so it is the case most likely to regress.",
    expectedUiState:
      "Both screenshots show the leaf mark clear of every control. Signed out the cluster reads search, Today's Deals, theme and hamburger plus 'Sign in' and 'Register'; signed in it reads bell, messages, heart, cart, avatar and the same four. In neither does the leaf touch an icon. If exactly one of the two fails, say which — signed-out-only failure means the auth buttons' extra width is still unaccounted for.",
    endResult:
      "Navigation and session change only. Signing back out at the same width must return to the clean signed-out header, not to an overlapping one.",
  },

  "checklist-design-ux-header-brand-mark-centring-mark-shifts-rather-than-overlapping": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Signed out at /products, start from 1280px.",
      "Narrow the window slowly toward 1024px.",
      "Watch the leaf mark's horizontal position as the gap closes.",
      "Stop at the narrowest point where the cluster still shows all of its icons.",
    ],
    expectedBehaviour:
      "When the cluster needs more than its half of the row, the side track holding the wordmark yields and the mark is pushed off-centre. Shifting is the intended degradation — the alternative designs either hide the mark under the icons (the old bug) or let the cluster shrink below its own content and be clipped, and the app shell is overflow-clipped, so clipped is gone rather than scrollable.",
    expectedUiState:
      "As the window narrows the leaf drifts toward the wordmark and stays fully visible the whole way — it never slides beneath an icon and never gets cropped. Every icon keeps its full box, the hamburger stays entirely inside the right edge, and nothing is cut off. Report separately whether the failure was an overlap, a clipped control, or a disappearing leaf; they have different causes.",
    endResult:
      "Nothing persists. Widening back to 1280px returns the leaf to the centre, which also confirms the shift is layout-driven and not a one-way state.",
  },

  "checklist-design-ux-header-brand-mark-centring-mark-centred-at-wide-widths": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Load /products and maximise the window (1440px or wider).",
      "Compare the leaf mark's position against the horizontal centre of the page content.",
      "Repeat at 1920px if the display allows it.",
    ],
    expectedBehaviour:
      "With room to spare the two side tracks each take an equal share of the free space, which places the middle track on the row's midpoint — the mark is centred by the layout rather than by a `left: 50%` offset.",
    expectedUiState:
      "The leaf is centred in the header to the eye, lining up with the centre of the page beneath it. A mark that is visibly nudged to one side at a wide width is a DIFFERENT fault from the collision — the side tracks are no longer balanced — and should be filed as such, with the window width noted.",
    endResult:
      "No state. The centring must hold across a reload and across a soft navigation to another page.",
  },

  "checklist-design-ux-header-brand-mark-centring-mark-absent-below-md": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Load /products signed out.",
      "Set the window to 767px, then 640px, then 320px.",
      "At each width inspect the whole header row end to end.",
      "At 320px tap the hamburger.",
    ],
    expectedBehaviour:
      "The centred mark is hidden below md, which removes it as a layout item entirely rather than merely making it invisible — so the mobile header should be identical to how it has always rendered, with the two side tracks splitting the full width.",
    expectedUiState:
      "No centred leaf at any of the three widths. A small leaf sits immediately left of the 'LetItRip' wordmark. The action cluster is still flush against the right edge with no unexplained empty gap between it and the edge. At 320px the hamburger is fully visible, not sliced by the edge, and tapping it opens the menu.",
    endResult:
      "Nothing is written. Widening back past 768px brings the centred leaf back, confirming the hide is width-driven.",
  },

  "checklist-design-ux-header-brand-mark-centring-mark-centred-in-left-hand-mode": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Load /products and switch the interface to left-hand mode.",
      "Set the window to 1024px.",
      "Widen in ~32px steps to 1280px, checking the header at each step.",
      "Narrow to 320px and check the header once more.",
    ],
    expectedBehaviour:
      "Hand mode reverses the row's main axis, so the two side tracks swap ends. Each side carries its own mirrored alignment, and the middle track is deliberately hand-neutral — a centred brand mark must not move when the hands swap.",
    expectedUiState:
      "The wordmark sits flush against the RIGHT edge with no gap between it and the edge; the icon cluster sits flush against the LEFT edge with the hamburger outermost; the leaf stays centred and overlaps nothing at any step. A wordmark floating away from the right edge means a side track lost its mirrored alignment — that is a fix that only works in right-hand mode, and it is the most likely way this regresses.",
    endResult:
      "The hand-mode preference persists across a reload; the header must render the same way after it. Switching back to right-hand mode mirrors everything again with the leaf still centred.",
  },
};
