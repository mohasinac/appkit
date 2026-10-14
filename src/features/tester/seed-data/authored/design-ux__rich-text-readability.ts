/*
 * WHY: Authored six-part procedures for the design-ux/rich-text-readability page.
 * WHAT: 5 case(s), keyed by full checklist id.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

/*
 * Written against the 2026-10-15 fix. The defect these cases exist for was
 * invisible to every automated gate the project has — `npm run check`, tsc and
 * all ~150 audits passed throughout, because a Tailwind class that generates no
 * rule is not a type error, not a lint error and not a runtime error. It is an
 * element that renders unstyled, which reads as a design choice.
 *
 * 🛑 EVERY CASE HERE IS WRITTEN AS BEFORE → AFTER, deliberately. A case reading
 * "check the text is readable" PASSES AGAINST THE BUG: the page returns 200, the
 * paragraphs are present, the links are present and clickable, and a tester with
 * no statement of the prior behaviour has nothing to compare against. The thing
 * that was wrong was a COLOUR, and only naming the wrong colour makes the right
 * one checkable.
 *
 * What was actually wrong, since the cases reference it:
 *   - `dark:prose-invert` is authored on ~25 appkit surfaces and has NEVER
 *     compiled. The consumer build excludes appkit from scanning
 *     (`@source not "../../appkit"`) and appkit's own build loads no typography
 *     plugin, so `--tw-prose-invert-*` was defined and never switched on.
 *   - `important: true` then made `.prose :where(a){color:var(--tw-prose-links)
 *     !important}` beat the themed `.dark .appkit-rich-text a` rules, so the
 *     theme-aware stylesheet that existed for exactly this was dead on arrival.
 *   - Measured values in use: body `oklch(37.3% .034 259.733)` (gray-700) and
 *     links `oklch(21% .034 264.665)` (gray-900) — in BOTH themes.
 *
 * The fix rebinds the whole `--tw-prose-*` palette to appkit theme tokens, which
 * is why `prose-follows-custom-theme` is now testable at all: the old palette was
 * hardcoded greys no theme could reach.
 */

import type { AuthoredCase } from "./_types";

export const authored: Record<string, AuthoredCase> = {
  "checklist-design-ux-rich-text-readability-prose-body-readable-dark": {
    roles: ["guest"],
    startPage: "/categories/category-spinning-tops",
    steps: [
      "Set the site to DARK mode using the theme toggle in the header.",
      "Open /categories/category-spinning-tops.",
      "Scroll to the multi-paragraph write-up directly below the hero banner (it begins 'Four generations of Beyblade').",
      "Read the full write-up at normal viewing distance without leaning in or changing zoom.",
    ],
    expectedBehaviour:
      "The rich-text block takes its body colour from the active theme's own text token rather than from the Tailwind typography plugin's light-theme default. No element in the block should be rendering a colour that was chosen for a white page.",
    expectedUiState:
      "Every sentence of the write-up is comfortably readable against the dark page. The body copy is a light grey, clearly brighter than the page background. It is NOT the dim, low-contrast grey that appears to recede into the background — the specific prior symptom was body text at gray-700 on a dark surface.",
    endResult:
      "Nothing is written and nothing persists. Reloading the page in dark mode shows the same readable text; this is a pure rendering check.",
  },

  "checklist-design-ux-rich-text-readability-prose-links-visible-dark": {
    roles: ["guest"],
    startPage: "/categories/category-spinning-tops",
    steps: [
      "Stay in DARK mode on /categories/category-spinning-tops.",
      "Without moving the mouse over them, locate the five inline links in the write-up: 'Beyblade Original', 'Metal Fight', 'Burst', 'Beyblade X' and 'Accessories'.",
      "Compare each link's text colour against the paragraph text immediately surrounding it.",
    ],
    expectedBehaviour:
      "Link colour resolves to the theme's secondary accent in dark mode, not to the typography plugin's default link colour. Identifying a link must not require hovering, because hover is unavailable on touch devices.",
    expectedUiState:
      "All five links are a visibly different colour from the body copy around them and are obviously clickable at a glance. The prior symptom was links rendering at gray-900 — near-black on a dark page, effectively invisible, findable only by sweeping the cursor and watching for the pointer to change. An underline alone does NOT satisfy this case: the text colour itself must differ.",
    endResult:
      "No state changes. Clicking any of the five navigates to that category, which also confirms they were real links and not styled text.",
  },

  "checklist-design-ux-rich-text-readability-prose-readable-light-regression": {
    roles: ["guest"],
    startPage: "/categories/category-spinning-tops",
    steps: [
      "On /categories/category-spinning-tops, switch the theme toggle to LIGHT mode.",
      "Read the same write-up and locate the same five inline links.",
      "Toggle between light and dark three times, pausing on each to re-read one paragraph and one link.",
    ],
    expectedBehaviour:
      "Both themes resolve their colours from the same rebound token set, so a regression in one is a plausible consequence of a change to the other. Headings, body copy and links must each stay distinct from one another in both themes.",
    expectedUiState:
      "In LIGHT mode the body copy is dark on the white surface and the links are the primary brand colour. Headings remain visibly darker/stronger than body copy. Nothing is washed out, and no text becomes near-invisible at either end of the toggle.",
    endResult:
      "The theme choice persists across a reload (it is stored client-side), and the write-up renders correctly in whichever mode was last selected.",
  },

  "checklist-design-ux-rich-text-readability-prose-readable-across-surfaces": {
    roles: ["guest"],
    startPage: "/blog",
    steps: [
      "Set the site to DARK mode.",
      "Open any published post from /blog and read its body copy and any inline links.",
      "Open /terms (or /privacy) and read the policy body copy.",
      "Open /faqs and expand any answer.",
      "Open any product from /products and read its Description tab.",
    ],
    expectedBehaviour:
      "All four surfaces render through the same shared rich-text renderer, so one shared fix must reach all of them. A surface that is still unreadable means the fix did not apply there and the renderer is being bypassed.",
    expectedUiState:
      "On each of the four pages the body copy is readable light-grey-on-dark and any inline links are a visibly distinct colour. No page shows the dim gray-700 body or the near-black links described in the dark-mode cases above.",
    endResult:
      "Nothing persists. If any ONE of the four fails while the others pass, record which one — that narrows the cause to that surface's own markup rather than the shared renderer.",
  },

  "checklist-design-ux-rich-text-readability-prose-follows-custom-theme": {
    roles: ["admin"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/site and go to the Themes tab.",
      "Note which theme is currently the default, then set a visibly different one as the active default (for example Cobalt Night, or Sunset).",
      "Open /categories/category-spinning-tops in a new tab and read the write-up's body copy and links.",
      "Return to /admin/site → Themes and restore the original default theme.",
    ],
    inputs: {
      "Themes tab — active default": "a theme other than the current default",
    },
    expectedBehaviour:
      "Rich-text colours are bound to `--appkit-color-*` theme tokens, so switching the active theme must restyle admin-authored prose along with the rest of the site. This is only possible since the 2026-10-15 fix: the typography plugin's palette is hardcoded Tailwind greys that no theme record could ever reach.",
    expectedUiState:
      "After the theme change, the write-up's paragraph colour and link colour both shift to match the new theme — they do not stay the same grey the previous theme used. Body copy remains readable against whatever surface the new theme sets.",
    expectedData: {
      "siteSettings.theme.defaultDarkThemeId": "restored to its original value at the end",
    },
    endResult:
      "The original default theme is restored, so no other tester inherits a changed site theme. Reloading the category page shows prose in the original theme's colours again.",
  },
};
