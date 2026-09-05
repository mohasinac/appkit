/*
 * WHY: Authored six-part procedures for the public-pages/auth-error-pages page.
 * WHAT: 6 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
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
  "checklist-public-pages-auth-error-pages-register-page": {
    roles: ["guest"],
    startPage: "/auth/register",
    steps: [
      "Open /auth/register in a private window with no session.",
      "Click 'Create account' with every field empty and read where the errors appear.",
      "Type 'QA Register register-page' as the full name and 'not-an-email' as the email, then click 'Create account'.",
      "Type qa-register-1@mailnull.com as the email — if that address already has an account from a previous run, increment the number.",
      "Type TestPass123! in the password field and Different123! in the confirm field, then click 'Create account'.",
      "Correct the confirm field to TestPass123!, tick the terms checkbox, and click 'Create account'.",
    ],
    inputs: {
      fullName: "QA Register register-page",
      email: "qa-register-1@mailnull.com",
      password: "TestPass123!",
      mismatchedConfirm: "Different123!",
    },
    expectedBehaviour:
      "Each rule reports on the field that broke it — required, email format, password match, terms accepted — before any request is sent, and the account is created only once all four pass.",
    expectedUiState:
      "The empty submit marks the individual fields rather than showing one banner. 'not-an-email' is rejected on the email field. The mismatched confirm is rejected on the confirm field, not the password field. The final submit signs the browser in and leaves /auth/register.",
    endResult:
      "The account exists and persists. This case creates a real row that teardown does not remove, which is why the address is numbered rather than fixed.",
  },
  "checklist-public-pages-auth-error-pages-forgot-reset-password-pages": {
    roles: ["guest"],
    startPage: "/auth/forgot-password",
    steps: [
      "Open /auth/forgot-password in a private window with no session.",
      "Click 'Send reset link' with the field empty and read where the error appears.",
      "Type not-an-email and click 'Send reset link'.",
      "Type divya.funko@gmail.com and click 'Send reset link'.",
      "Open that inbox, open the reset link, and read the page it lands on.",
      "Submit the reset form with two different passwords typed into its two fields.",
      "Set both fields to QaAuthPages654! and submit.",
      "Request another link for the same address and use it to set the password back to TempPass123!.",
    ],
    inputs: {
      email: "divya.funko@gmail.com",
      newPassword: "QaAuthPages654!",
      restoredPassword: "TempPass123!",
    },
    expectedBehaviour:
      "Both pages validate on the field before submitting, and the reset page enforces that the two password entries match. The link's action code is what authorises the change — reaching the inbox is the proof of identity.",
    expectedUiState:
      "Empty and malformed emails are marked on the field. A real address produces the generic 'if an account exists' message. The reset page rejects mismatched passwords on the confirm field and accepts matching ones with a confirmation.",
    endResult:
      "The password is back at TempPass123! by the final step. This case shares divya.funko@gmail.com with the single-use-link case in signup-login and with nothing else, deliberately — the seeder never resets an existing password, so a changed one outlives every future re-seed.",
  },
  "checklist-public-pages-auth-error-pages-verify-email-page": {
    roles: ["guest"],
    startPage: "/auth/register",
    steps: [
      "Open /auth/register in a private window and create an account with an inbox you can open, using TestPass123! as the password.",
      "Open the inbox and find the verification email.",
      "Open the verification link and read the page it lands on.",
      "Open /user and look for an unverified-email warning.",
      "Open the same verification link a second time and read the page.",
    ],
    inputs: { password: "TestPass123!" },
    expectedBehaviour:
      "The verify-email page consumes the action code, reports the outcome, and offers a way onward. A second visit finds the code spent and says so rather than reporting a second success.",
    expectedUiState:
      "The first visit shows a clear confirmation and a link into the site. /user then carries no unverified-email warning. The second visit shows a readable already-used or expired message — not a blank page, not a raw Firebase error code, and not another success.",
    expectedData: { emailVerified: true },
    endResult:
      "The account is verified and stays verified across a sign-out and sign-in.",
  },
  "checklist-public-pages-auth-error-pages-oauth-loading-redirect": {
    roles: ["guest"],
    startPage: "/auth/login",
    steps: [
      "Open /auth/login in a private window with no session.",
      "Click 'Sign in with Google'.",
      "Complete the Google popup and watch what the site shows while it finishes.",
      "Wait up to 30 seconds without clicking anything.",
      "Read where the browser ends up.",
    ],
    expectedBehaviour:
      "The interstitial waits for the sign-in signal and then moves on by itself. It must not be a terminal state: a page that shows a spinner and never navigates is the same to a user as a crash, and it is the state a dropped realtime signal produces.",
    expectedUiState:
      "A loading state appears briefly and then the browser navigates to / or /user with the header showing a signed-in avatar. It does not sit on the loading page indefinitely and it does not land back on /auth/login as though nothing happened.",
    endResult:
      "The session is established and survives a reload. Needs a Google account — answer null with that reason if none is available.",
  },
  "checklist-public-pages-auth-error-pages-checkout-success-page": {
    roles: ["buyer"],
    startPage: "/checkout",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /products/product-tester-standard-1 and click 'Add to Cart'.",
      "Open /checkout, select the first saved address, continue through the add-ons step, choose Cash on Delivery and place the order.",
      "Read the success page for an order number, the item, the address and the total.",
      "Copy the URL and reload it.",
      "Open the same URL in a private window with no session.",
    ],
    inputs: { productId: "product-tester-standard-1", price: 199, paymentMethod: "Cash on Delivery" },
    expectedBehaviour:
      "The success page reads the real order rather than whatever the checkout had in memory, so it survives a reload. It is also order-scoped data, so a signed-out visitor with the URL must not be shown someone's delivery address.",
    expectedUiState:
      "The page names an order number, 'Test Gadget — Standard Listing #1' at ₹199.00, the delivery address and a total. After the reload it shows the same. In the private window it does not render the order details — it asks for sign-in or reports not-found.",
    expectedData: { orderTotal: 199 },
    endResult:
      "The order exists in /user/orders. A success page that goes blank on reload was rendering from checkout state and not from the order.",
  },
  "checklist-public-pages-auth-error-pages-unauthorized-404-pages": {
    roles: ["guest", "buyer"],
    startPage: "/",
    steps: [
      "Open /this-page-does-not-exist-qa in a private window and read the page.",
      "Click whatever the page offers as a way back and read where it lands.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /admin/site and read the page.",
      "Open /unauthorized directly and read the page.",
    ],
    expectedBehaviour:
      "Both error pages render as real pages inside the site chrome and offer a way out. A buyer reaching an admin route gets the unauthorized page rather than a crash or a raw framework error, and neither page leaks anything about what it was protecting.",
    expectedUiState:
      "The 404 shows a readable message and at least one working link back into the site. The unauthorized page does the same. Neither shows a stack trace, a file path, or an error digest presented as the whole page, and neither renders as an unstyled white page outside the site's own layout.",
    endResult:
      "Read-only; nothing persists. A blank white page for either is the failure — it reads as the site being down rather than as one route being unavailable.",
  },
};
