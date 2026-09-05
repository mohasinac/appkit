/*
 * WHY: Authored six-part procedures for the selling/become-seller page.
 * WHAT: 4 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 STORE APPROVAL IS TWO FIELDS ON TWO DOCUMENTS — a status on the user record
 * and a status plus a public flag on the store. Flipping only the user's is the
 * classic half-fix: the seller sees an approved dashboard while every public
 * visibility check reads the store's, so the store never appears anywhere.
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
  "checklist-selling-become-seller-sell-redirect": {
    roles: ["guest", "buyer"],
    startPage: "/sell",
    steps: [
      "Open /sell in a private window with no session and read where the browser lands.",
      "Read the HTTP status if the browser's network panel is open, and note whether the page rendered before moving.",
      "Sign in as karthik.new@gmail.com / TempPass123!, a buyer with no store.",
      "Open /sell and read where it lands.",
      "Sign out and sign in as tyson@beybladearena.in / TempPass123!, who already has a store.",
      "Open /sell and read where it lands.",
    ],
    expectedBehaviour:
      "/sell is an entry point that routes by who is asking: a signed-out visitor to sign-in, a buyer without a store to the become-seller flow, an existing seller to their dashboard. It redirects rather than rendering, and a redirect fires before any document is produced — so a page that returns 200 with content here is not redirecting at all.",
    expectedUiState:
      "Each of the three identities ends somewhere different and appropriate. None sees a 404, and none is left on /sell showing an error. A 200 carrying an error page rather than a redirect is the failure worth naming — it is exactly what no monitoring flags.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-selling-become-seller-apply-seller": {
    roles: ["buyer"],
    startPage: "/user/become-seller",
    steps: [
      "Sign in as karthik.new@gmail.com / TempPass123!.",
      "Open /user/become-seller and read the whole form before typing.",
      "Submit it with every field empty and read where the errors appear.",
      "Type 'QA Store apply-seller' as the store name and fill every other required field.",
      "Submit the form.",
      "Read what is shown immediately afterwards.",
      "Reload the page and read it again.",
    ],
    inputs: { storeName: "QA Store apply-seller" },
    expectedBehaviour:
      "The application creates a store and records the applicant's seller status. This view is a slot shell — rendering it with no render props gives a layout skeleton with no content at all, which is a page that looks built and does nothing.",
    expectedUiState:
      "The form renders with real fields, not an empty shell. Empty submission marks the individual fields. After submitting, the page reports the application's state rather than returning to a blank form, and that state survives the reload.",
    endResult:
      "A store exists for karthik.new@gmail.com. Note its status — it feeds the next two cases.",
  },
  "checklist-selling-become-seller-store-setup": {
    roles: ["seller"],
    startPage: "/store",
    steps: [
      "Sign in as tester@letitrip.in / TempPass123!, whose tester flag auto-approves their store.",
      "Open /store and read the dashboard.",
      "Open the store's own settings and read its name, description, logo and banner.",
      "Change the description to 'QA Store store-setup description' and save.",
      "RELOAD and read the description.",
      "Open the store's public page and read the description there.",
      "Restore the original description.",
    ],
    inputs: { description: "QA Store store-setup description" },
    expectedBehaviour:
      "A tester's store is approved on both documents at once — the user record's status AND the store's own status and public flag. Flipping only the user's leaves the seller with a working dashboard and a store invisible to the public, because every visibility check reads the store's own status.",
    expectedUiState:
      "The dashboard loads rather than showing a pending-approval gate. The edited description survives the reload AND appears on the public store page. A description that saves in the dashboard but never reaches the public page means the store is not actually public.",
    endResult:
      "The description is restored by the final step. The public page rendering at all is the real assertion here.",
  },
  "checklist-selling-become-seller-store-address": {
    roles: ["seller"],
    startPage: "/store/addresses",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/addresses and read the existing pickup addresses.",
      "Add one: name 'QA Address store-address', street '10 Test Lane', city 'Indore', state 'Madhya Pradesh', pincode 452010, landmark 'Behind the arena'.",
      "Mark it as a pickup location and save.",
      "RELOAD the page and read every field of the new address, including the landmark.",
      "Delete it.",
    ],
    inputs: {
      name: "QA Address store-address",
      street: "10 Test Lane",
      city: "Indore",
      state: "Madhya Pradesh",
      pincode: "452010",
      landmark: "Behind the arena",
    },
    expectedBehaviour:
      "A store address is written into the same top-level addresses collection as buyer addresses, discriminated by owner type rather than living in a subcollection of its own. Every field the form offers is stored, including the landmark — a form missing a field does not leave it alone, it sends undefined and overwrites.",
    expectedUiState:
      "After the reload every typed value is present, landmark included, and the pickup flag is still set. A blank landmark after the reload is the failure this case shares with the store-address edit case in page-wiring.",
    endResult:
      "The address is deleted by the final step so it does not accumulate across runs.",
  },
};
