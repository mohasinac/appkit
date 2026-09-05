/*
 * WHY: Authored six-part procedures for the design-ux/footer-theme page.
 * WHAT: 6 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 EVERY CASE HERE IS READ IN BOTH THEMES. A near-white tint is the same fill
 * in every theme, so white-on-white shows up in exactly one of them — reading
 * only the light theme passes the whole page while half of it is invisible.
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
  "checklist-design-ux-footer-theme-footer-dark-mode": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window and switch the site to dark mode.",
      "Scroll to the footer.",
      "Read every link, heading and paragraph in it.",
      "Hover each link and read it while hovering.",
      "Write down anything that becomes unreadable at any point.",
    ],
    expectedBehaviour:
      "Footer colours come from theme tokens that invert, so text stays readable in both themes and a hover fill stays behind its own ink. A named palette tint such as zinc-50 is the same near-white in every theme, so under inverted ink it is white-on-white on hover only.",
    expectedUiState:
      "Every link, heading and paragraph is legible against the dark footer. Hovering any link keeps its text readable — a link that vanishes on hover is the specific failure, and it is invisible until the pointer is actually over it.",
    expectedData: { unreadableElementsOnHover: 0 },
    endResult: "Read-only; return the site to light mode afterwards.",
  },
  "checklist-design-ux-footer-theme-footer-github-icon": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window and scroll to the footer.",
      "Find the GitHub icon and look at its size relative to the other social icons.",
      "Hover it and read any tooltip or label.",
      "Click it and read where it lands.",
      "Switch to dark mode and look at the icon again.",
    ],
    expectedBehaviour:
      "The icon is a real sized glyph inside its control, not a text character. A text character cannot be sized by any width or height utility — it renders at the platform font fallback, which is exactly what makes one icon in a row look wrong next to its neighbours.",
    expectedUiState:
      "The GitHub icon is the same size as the other social icons in the row and is visible in both themes. It opens the real profile rather than a 404 or the GitHub homepage.",
    endResult: "Read-only; return the site to light mode afterwards.",
  },
  "checklist-design-ux-footer-theme-footer-text-weight-readable": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at a desktop width and scroll to the footer.",
      "Read the body text in each column at normal viewing distance.",
      "Compare the link text's weight and contrast against the paragraph text around it.",
      "Resize to 390 pixels wide and read the same text.",
    ],
    expectedBehaviour:
      "Footer text is legible rather than technically present. A muted token applied to text that is already small enough to be secondary compounds into text nobody reads.",
    expectedUiState:
      "Body text in every column is readable without leaning in, at both widths. Links are distinguishable from surrounding paragraph text by more than colour alone.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-footer-theme-footer-column-headings-stand-out": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window and scroll to the footer.",
      "Read each column heading and the links beneath it.",
      "Compare each heading's weight and size against its own links.",
      "Switch to dark mode and compare them again.",
    ],
    expectedBehaviour:
      "A column heading is visually distinct from its links, so the footer reads as grouped columns rather than one long list. The distinction has to survive both themes, since it usually comes from a colour token.",
    expectedUiState:
      "Every heading is clearly heavier or larger than the links under it, in both themes. A heading indistinguishable from its own links is the failure — the grouping is then invisible and the footer reads as noise.",
    endResult: "Read-only; return the site to light mode afterwards.",
  },
  "checklist-design-ux-footer-theme-footer-weight-both-themes": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window in light mode and scroll to the footer.",
      "Write down how the footer reads: heading weights, link contrast, divider visibility.",
      "Switch to dark mode without navigating.",
      "Read the same three things again and compare.",
      "Look specifically at any divider or border between columns or rows.",
    ],
    expectedBehaviour:
      "The footer's visual hierarchy is the same in both themes because every colour is a token that inverts. A divider declared once under the root and never inverted is invisible in one of the two.",
    expectedUiState:
      "Headings, links and dividers all read equivalently in both themes. A divider visible in light and gone in dark — or the reverse — is the failure this case is looking for.",
    endResult: "Read-only; return the site to light mode afterwards.",
  },
  "checklist-design-ux-footer-theme-footer-mobile-accordions": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Resize the browser window to 390 pixels wide and open / in a private window.",
      "Scroll to the footer.",
      "Read how the columns are presented.",
      "Expand one section and read its links.",
      "Collapse it and expand another.",
      "Try to scroll the page sideways.",
    ],
    inputs: { mobileWidth: 390 },
    expectedBehaviour:
      "On a phone the columns collapse to accordions so the footer does not become a screen-and-a-half of links. Collapsing must remove the section's height rather than hide it by transform, or the page keeps the full footer's length with nothing in it.",
    expectedUiState:
      "Sections are collapsed by default and expand on tap, showing their links. A collapsed section takes no vertical space. The page does not scroll sideways.",
    endResult: "Read-only; restore the window width afterwards.",
  },
};
