/*
 * WHY: Authored six-part procedures for the selling/sectionised-forms page.
 * WHAT: 9 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THE FIRST AND LAST CASES ARE THE SAME ASSERTION AT TWO SCALES: saving a form
 * writes back only what changed. A form that submits its whole object from
 * partly-populated state overwrites every field it did not load, returns a normal
 * success, and is invisible without a reload — which is why both end in one.
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
  "checklist-selling-sectionised-forms-form-sections-save-unchanged": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open the editor for 'Beyblade Burst B-01 Valkyrie' and expand every section.",
      "Write down the value of every field in every section.",
      "Change one field in ONE section — the description — and save.",
      "RELOAD the editor and expand every section again.",
      "Compare every field against what was written down.",
      "Restore the description and save.",
    ],
    inputs: { productId: "product-beyblade-burst-valkyrie" },
    expectedBehaviour:
      "Editing one section leaves every other section's values untouched. A sectionised form that submits its whole object from state populated only by the sections the user opened silently blanks the rest — and the save reports success either way.",
    expectedUiState:
      "After the reload only the description differs. Every other field in every other section holds its original value, including images, category, brand, stock and the type-specific fields.",
    expectedData: { unintendedFieldChanges: 0 },
    endResult:
      "The product is restored. Any field that emptied itself is the failure, and it is invisible without expanding every section after the reload.",
  },
  "checklist-selling-sectionised-forms-form-error-summary-jumps": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and read the page before typing — note whether any errors are listed.",
      "Leave required fields empty in two DIFFERENT sections.",
      "Collapse both of those sections.",
      "Attempt to publish.",
      "Read the error summary and click an error belonging to a collapsed section.",
    ],
    expectedBehaviour:
      "The summary appears only after a submit is attempted, and clicking an entry expands the owning section and moves to the field. An error in a collapsed section is otherwise unreachable — the user is told something is wrong and cannot see what.",
    expectedUiState:
      "No summary before the publish attempt. Afterwards it lists errors from both sections, tagged with their section. Clicking one expands that section and scrolls the field into view.",
    endResult: "Nothing is published. Leave the editor without saving.",
  },
  "checklist-selling-sectionised-forms-required-section-has-no-dead-chevron": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and look at every section header.",
      "Find any section that is always open because it is required.",
      "Look at whether it still shows an expand chevron.",
      "Click that chevron and read what happens.",
      "Compare against a collapsible section's chevron.",
    ],
    expectedBehaviour:
      "A section that cannot collapse does not display a collapse control. A chevron that responds to nothing teaches the user the whole form's chevrons are unreliable, which is a worse cost than the one dead control.",
    expectedUiState:
      "Always-open sections have no chevron, or their chevron is visibly non-interactive. A chevron that looks identical to a working one and does nothing on click is the failure.",
    endResult: "Read-only; leave the editor without saving.",
  },
  "checklist-selling-sectionised-forms-open-section-does-not-clip-dropdowns": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and expand a section containing a picker.",
      "Open that picker and read whether its full option list is visible.",
      "Scroll while it is open and check it stays anchored to its field.",
      "Open a picker in the LAST section of the form, near the bottom of the page.",
      "Read whether its list is clipped by the section's own boundary.",
      "Resize to 390 pixels wide and open the same picker.",
    ],
    inputs: { mobileWidth: 390 },
    expectedBehaviour:
      "A picker's list escapes its section's bounds. A section with overflow hidden — which is what a collapsing container needs to animate — clips any list that opens inside it, so the options exist and cannot be seen.",
    expectedUiState:
      "The full option list is visible in every case, including in the last section and at 390 pixels. A list cut off at the section's edge is the failure, and it is worst at the bottom of the form where there is least room.",
    endResult: "Read-only; leave the editor without saving.",
  },
  "checklist-selling-sectionised-forms-error-jump-lands-on-the-field": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and leave a required field empty in a section far down the form.",
      "Collapse that section and attempt to publish.",
      "Click the error for that field in the summary.",
      "Read where the page has scrolled to and whether the field is visible.",
      "Check whether the field is focused and marked, not merely on screen.",
    ],
    expectedBehaviour:
      "Clicking an error lands ON the field — section expanded, field scrolled into view, focused and marked. Landing on the section heading leaves the user hunting through a section that may hold a dozen fields.",
    expectedUiState:
      "The offending field is visible, focused, and carries its own error message. Scrolling to the section heading and stopping there is the failure, as is scrolling past the field so it sits under a sticky bar.",
    endResult: "Nothing is published. Leave the editor without saving.",
  },
  "checklist-selling-sectionised-forms-long-form-typing-is-smooth": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and expand every section.",
      "Type a long paragraph into the description field at normal speed.",
      "Watch for characters lagging behind the keystrokes.",
      "Attempt a publish so validation is running live, then keep typing into another field.",
      "Watch again for lag.",
    ],
    expectedBehaviour:
      "Typing stays responsive with every section open and live validation running. Validation runs on every change once a submit has been attempted — that is what keeps the error summary current — so this is the state where a form is most likely to stutter.",
    expectedUiState:
      "Characters appear as they are typed, with no visible catch-up. The error summary updates as fields are fixed without the field itself becoming laggy.",
    endResult: "Nothing is published. Leave the editor without saving.",
  },
  "checklist-selling-sectionised-forms-form-mobile-action-bar": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Resize the browser window to 390 pixels wide and open /store/products/new.",
      "Read the action bar at the bottom and every control in it.",
      "Type into a field so the form becomes dirty and read the bar again.",
      "Attempt a publish with fields missing and read what the bar shows.",
      "Open the error sheet from the bar, close it, then attempt a publish again and check it reopens.",
      "Count the fixed bars at the bottom.",
    ],
    inputs: { mobileWidth: 390 },
    expectedBehaviour:
      "The form's save row and its error sheet occupy the same measured bottom tier as everything else. The sheet's label carries the error COUNT, because the panel only republishes when that label changes — a static label would freeze the sheet's contents while the user fixes fields. Reopening on a second failed submit is driven by a counter rather than a flag, so an ordinary re-render does not reopen what the user just closed.",
    expectedUiState:
      "Discard, Save draft and Publish are all reachable and none is clipped. The sheet's label states how many issues remain and that number falls as fields are fixed. Closing it and submitting again reopens it. Exactly one bottom tab bar sits below the action bar.",
    endResult: "Nothing is published. Restore the window width afterwards.",
  },
  "checklist-selling-sectionised-forms-form-conditional-fields-drop-values": {
    roles: ["seller"],
    startPage: "/store/products/new",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products/new and find a control that reveals conditional fields — a listing type or a shipping choice.",
      "Set it so the conditional fields appear and fill them in, noting each value.",
      "Change the controlling field so those conditionals are hidden.",
      "Change it back so they reappear.",
      "Read whether the values are still there.",
      "Publish and then reload the editor, reading those fields again.",
    ],
    expectedBehaviour:
      "A hidden conditional field either keeps its value or is genuinely dropped — but whichever it does, the saved record must match what the form displayed at submit. The dangerous case is a field that looks retained on screen and is dropped on save, or one dropped from view and still written.",
    expectedUiState:
      "Toggling the controlling field back and forth leaves the conditional values in a state the form shows honestly. After publishing and reloading, the stored values match what was on screen when Publish was pressed.",
    endResult:
      "Delete the created listing afterwards. A field the form showed and did not save is the failure, and so is one it hid and saved anyway.",
  },
  "checklist-selling-sectionised-forms-site-settings-save-still-writes-everything": {
    roles: ["admin"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/site and walk every tab, writing down a distinctive value from each.",
      "Open one tab — Fees — and change a single field.",
      "Save.",
      "RELOAD /admin/site and walk every tab again.",
      "Compare each noted value against what was written down.",
      "Restore the changed field and save.",
    ],
    expectedBehaviour:
      "Saving one tab of the settings singleton preserves every other tab. This is the same defect as the first case at the largest possible scale: the whole document is one record, so a form submitting its full object from a partly-populated state can blank branding, fees, integrations and legal copy in one save that reports success.",
    expectedUiState:
      "After the reload only the Fees field differs. Every noted value on every other tab is unchanged — branding, announcement copy, integrations, shipping, legal pages. The masked credentials are still shown as masked rather than blank.",
    expectedData: { unintendedFieldChanges: 0 },
    endResult:
      "The changed field is restored. This is the highest-blast-radius save in the application; check every tab rather than sampling two.",
  },
};
