/*
 * WHY: The core commerce path, end to end, for all four identities — the flows
 *      that must work for the site to be a marketplace at all. Browse a
 *      category, reach a brand, reach a store, open a standard product, buy it,
 *      pay for it, watch the seller fulfil it and the admin verify it.
 *
 *      The catalogue had ~1,295 cases and no page that walked the whole path in
 *      order. Coverage was by SURFACE — a cart page, a checkout page, an orders
 *      page — so a break in the seam BETWEEN two surfaces had no owner, and the
 *      seams are where this codebase fails: an adapter that drops a field
 *      (#57), a settlement that writes an order nobody can pay for (#60), a
 *      price that is right in the cart and wrong at capture (#75).
 *
 * WHAT: Exports happyPathPages — consumed by group() in
 *       tester-checklist-seed-data.ts. Authored INLINE, six parts per case,
 *       against _money-flows.ts as the reference.
 *
 * 🛑 SCOPE IS DELIBERATELY NARROW: categories, brands, stores and STANDARD
 *    products only. No auctions, pre-orders, prize draws, bundles, classifieds,
 *    digital codes, live items or art/stickers — each has its own group, and
 *    widening this one would turn "does buying work" into "does everything
 *    work", which is what the other 1,295 cases are for.
 *
 * 🛑 MANUAL PAYMENT IS THE PAYMENT PATH TESTED HERE, and `cash` is what reaches
 *    it: CheckoutRouteClient redirects a cash order to ROUTES.USER.ORDER_PAYMENT,
 *    the proof-upload page. PhonePe replaced Razorpay in the online lane and
 *    needs a real gateway session, so it is not a happy-path case.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag access:server-only
 * @tag consumers:tester-checklist-seed-data.ts
 * @tag sideEffects:none
 */

import type { TesterCaseRole } from "../schemas";

interface HappyPathCase {
  key: string;
  label: string;
  /** Every role the case affects; per-role detail goes inline in the expectations. */
  roles: TesterCaseRole[];
  startPage?: string;
  steps: string[];
  inputs?: Record<string, string | number | boolean>;
  expectedBehaviour: string;
  expectedUiState: string;
  expectedData?: Record<string, string | number | boolean>;
  endResult: string;
  href?: string;
}

interface HappyPathPage {
  pageKey: string;
  pageLabel: string;
  href?: string;
  cases: HappyPathCase[];
}

/* Reused verbatim so the wording cannot drift between cases. */
const SIGNIN_BUYER = "Sign in as rehan.sheikh@gmail.com / TempPass123!.";
const SIGNIN_SELLER = "Sign in as tyson@beybladearena.in / TempPass123!, who owns store-beyblade-arena.";
const SIGNIN_ADMIN = "Sign in as admin@letitrip.in / TempPass123!.";

export const happyPathPages: HappyPathPage[] = [
  /* ── 1. Guest browse ───────────────────────────────────────────────────── */
  {
    pageKey: "guest-browse",
    pageLabel: "Guest: browse the catalogue",
    href: "/",
    cases: [
      {
        key: "home-renders-with-products",
        label: "The homepage renders real listings, not an empty shell",
        roles: ["guest"],
        startPage: "/",
        steps: [
          "Open / signed out.",
          "Wait for the page to finish hydrating.",
          "Read the section headings and count the product cards under the first listing section.",
        ],
        expectedBehaviour:
          "The homepage renders its configured sections server-side and each listing section is populated from the live catalogue.",
        expectedUiState:
          "Exactly one h1 is present. At least one section shows product cards with a title and an image. No section shows 'Nothing listed here yet' where the catalogue has stock.",
        endResult: "Nothing is written; reloading renders the same sections.",
      },
      {
        key: "categories-index-lists-roots",
        label: "The categories index shows the real root categories",
        roles: ["guest"],
        startPage: "/categories",
        steps: [
          "Open /categories signed out.",
          "Wait for the grid to render.",
          "Read every category name shown at the top level.",
        ],
        expectedBehaviour:
          "The index lists the tier-0 roots of the category forest, which are Spinning Tops and Living Collectibles.",
        expectedUiState:
          "Both 'Spinning Tops' and 'Living Collectibles' are visible as cards or links. The page is not empty and does not render only leaf categories.",
        expectedData: { rootCategoriesVisible: 2 },
        endResult: "Nothing is written; reloading shows the same roots.",
      },
      {
        key: "category-detail-lists-products",
        label: "A category page lists the products filed under it",
        roles: ["guest"],
        startPage: "/categories/category-beyblade-x",
        steps: [
          "Open /categories/category-beyblade-x signed out.",
          "Wait for the product grid to render.",
          "Count the product cards and read the first card's title.",
        ],
        expectedBehaviour:
          "Products are matched by array-contains-any against their own categorySlugs chain, so a product filed at this node appears without descendant expansion.",
        expectedUiState:
          "At least one product card is rendered. 'Beyblade X BX-01 Wizard Arrow' is among the titles. The grid does not read 'Nothing listed here yet'.",
        endResult: "Nothing is written; reloading shows the same products.",
      },
      {
        key: "brand-detail-lists-products",
        label: "A brand page lists that brand's products",
        roles: ["guest"],
        startPage: "/brands/brand-beyblade",
        steps: [
          "Open /brands/brand-beyblade signed out.",
          "Wait for the grid to render.",
          "Count the product cards.",
        ],
        expectedBehaviour:
          "Products are matched on the brand DISPLAY NAME, not the slug, so the brand row's name and every product's brand string must agree exactly.",
        expectedUiState:
          "At least one product card is rendered, and an 'About this brand' panel is present. The grid does not read 'Nothing listed here yet'.",
        endResult: "Nothing is written; reloading shows the same products.",
      },
      {
        key: "store-detail-lists-products",
        label: "A store page lists that store's listings",
        roles: ["guest"],
        startPage: "/stores/store-beyblade-arena",
        steps: [
          "Open /stores/store-beyblade-arena signed out.",
          "Wait for the page to render.",
          "Read the store name in the header and count the listing cards.",
        ],
        expectedBehaviour:
          "The store detail page loads the store by slug and lists its published, available listings.",
        expectedUiState:
          "The header reads 'Beyblade Arena'. At least one listing card is rendered.",
        endResult: "Nothing is written; reloading shows the same listings.",
      },
      {
        key: "product-detail-renders",
        label: "A standard product page renders its title, images and add-to-cart",
        roles: ["guest"],
        startPage: "/products/product-beyblade-x-wizard-arrow",
        steps: [
          "Open /products/product-beyblade-x-wizard-arrow signed out.",
          "Wait for the gallery to render.",
          "Read the title, the seller name, and the label on the primary call to action.",
        ],
        expectedBehaviour:
          "The product detail page renders the standard-listing layout with a cart affordance, since standard products have canAddToCart.",
        expectedUiState:
          "The title reads 'Beyblade X BX-01 Wizard Arrow'. At least one gallery image is shown. A cart call to action is present and is not disabled.",
        endResult: "Nothing is written; reloading renders the same page.",
      },
      {
        key: "guest-sees-no-price",
        label: "🛑 A signed-out visitor is shown a sign-in prompt where the price would be, and never a flash of the real amount",
        roles: ["guest"],
        startPage: "/products/product-beyblade-x-wizard-arrow",
        steps: [
          "Open /products/product-beyblade-x-wizard-arrow signed out.",
          "Read the price row immediately, before hydration completes.",
          "Wait three seconds and read the price row again.",
          "Reload the page twice more, reading the price row each time.",
        ],
        expectedBehaviour:
          "Prices are gated from signed-out visitors. The gate has three states, and the unresolved state renders a neutral placeholder rather than either the amount or the prompt.",
        expectedUiState:
          "The price row reads 'Sign in to see price' and links to /auth/login. The rupee amount 899 never appears in the price row at any point, on any of the three loads.",
        expectedData: { rupeeAmountVisibleToGuest: false },
        endResult: "Nothing is written; every reload behaves the same way.",
      },
      {
        key: "search-filters-with-nonsense-control",
        label: "Catalogue search narrows results, proven against a nonsense term",
        roles: ["guest"],
        startPage: "/products",
        steps: [
          "Open /products signed out.",
          "Type dranzer into the catalogue search box and submit.",
          "Count the product cards rendered.",
          "Clear the box, type zzzznope and submit.",
          "Count the product cards rendered.",
        ],
        inputs: { realTerm: "dranzer", nonsenseTerm: "zzzznope" },
        expectedBehaviour:
          "The search term reaches the query rather than being dropped, so the two terms return different result sets.",
        expectedUiState:
          "'dranzer' renders at least one card and every title shown relates to Dranzer. 'zzzznope' renders zero cards and an empty state. The two counts differ — identical counts mean the term is being ignored, which is a FAIL however plausible the rows look.",
        expectedData: { nonsenseResultCount: 0 },
        endResult: "Nothing is written; the URL carries the term and reloading repeats the result.",
      },
    ],
  },

  /* ── 2. Buyer purchase, manual payment ─────────────────────────────────── */
  {
    pageKey: "buyer-purchase",
    pageLabel: "Buyer: cart to paid order (manual payment)",
    href: "/products/product-beyblade-x-wizard-arrow",
    cases: [
      {
        key: "add-to-cart",
        label: "Adding a standard product to the cart puts it in the cart",
        roles: ["buyer"],
        startPage: "/products/product-beyblade-x-wizard-arrow",
        steps: [
          SIGNIN_BUYER,
          "Open /products/product-beyblade-x-wizard-arrow.",
          "Click the add-to-cart call to action.",
          "Open /cart.",
        ],
        expectedBehaviour:
          "A cart line is created for this product at quantity 1, priced from the product document rather than from anything the client sent.",
        expectedUiState:
          "The cart lists one line reading 'Beyblade X BX-01 Wizard Arrow' at ₹899, quantity 1, under the seller heading 'Beyblade Arena'. The cart does not read 'Your cart is empty'.",
        expectedData: { cartLineCount: 1, lineUnitPrice: 899 },
        endResult: "After reloading /cart the line is still present at ₹899, quantity 1.",
      },
      {
        key: "cart-line-shows-no-raw-field-names",
        label: "🛑 The cart line shows no raw field name to the buyer",
        roles: ["buyer"],
        startPage: "/cart",
        steps: [
          SIGNIN_BUYER,
          "Open /cart holding the single Wizard Arrow line.",
          "Read every line of text inside the cart line, between the product title and the price.",
        ],
        expectedBehaviour:
          "The line renders the seller once, as the group heading. CartItemRow prints each meta.attributes entry verbatim as `key: value`, so any plumbing field placed in that bag is published to the buyer with its own field name.",
        expectedUiState:
          "No text of the form `<fieldName>: <value>` appears anywhere in the line. In particular the string 'storeName:' does NOT appear. The seller is shown once, as 'SOLD BY BEYBLADE ARENA' above the line.",
        expectedData: { rawFieldLabelsVisible: 0 },
        endResult: "Nothing is written; the same line reads the same way after a reload.",
        href: "/cart",
      },
      {
        key: "cart-quantity-updates-total",
        label: "Changing the quantity updates the line and the cart total",
        roles: ["buyer"],
        startPage: "/cart",
        steps: [
          SIGNIN_BUYER,
          "Open /cart holding the single Wizard Arrow line at quantity 1.",
          "Click the quantity stepper's increment control once.",
          "Wait for the total to settle.",
          "Reload /cart.",
        ],
        expectedBehaviour:
          "The quantity is written to the cart document and the subtotal is recomputed server-side from the stored quantity, not from a client-held figure.",
        expectedUiState:
          "The line quantity reads 2 and the line total reads ₹1,798. The cart subtotal reflects the same figure.",
        expectedData: { lineQuantity: 2, lineTotal: 1798 },
        endResult: "After the reload the quantity is still 2 — not reset to 1.",
      },
      {
        key: "checkout-address-step",
        label: "Checkout opens on the address step with the buyer's saved address selectable",
        roles: ["buyer"],
        startPage: "/checkout",
        steps: [
          SIGNIN_BUYER,
          "Open /cart and click the checkout call to action.",
          "Read the step indicator and the address options offered.",
        ],
        expectedBehaviour:
          "Checkout is a three-step flow — address, then extras and fees, then payment — and opens on the address step with the signed-in buyer's saved addresses loaded.",
        expectedUiState:
          "The step indicator shows the address step as active. The saved address 'Home' at 123 Stadium Lane, Indore is listed and selectable. A continue control is present.",
        endResult: "Nothing is written by opening the step; reloading returns to the address step.",
      },
      {
        key: "checkout-extras-step",
        label: "Continuing from the address reaches the extras-and-fees step with per-seller add-ons",
        roles: ["buyer"],
        startPage: "/checkout",
        steps: [
          SIGNIN_BUYER,
          "Open /checkout with the Wizard Arrow line in the cart.",
          "Select the saved 'Home' address.",
          "Click the continue control.",
          "Read the headings and controls on the step that appears.",
        ],
        expectedBehaviour:
          "The extras step lists one card per seller in the cart, sourced from the cart itself rather than from the pricing preview, so the controls exist before any network round trip completes.",
        expectedUiState:
          "A section for 'Beyblade Arena' is shown with its add-on choices and its own fee lines. An order summary shows a subtotal. The step is not blank while the preview loads.",
        endResult: "Nothing is ordered by advancing; reloading /checkout returns to the address step.",
      },
      {
        key: "checkout-offers-cash-payment",
        label: "The payment step offers the manual cash option",
        roles: ["buyer"],
        startPage: "/checkout",
        steps: [
          SIGNIN_BUYER,
          "Open /checkout with the Wizard Arrow line in the cart.",
          "Select the saved 'Home' address and continue.",
          "Continue again from the extras step.",
          "Read every payment option offered and the total shown.",
        ],
        expectedBehaviour:
          "The payment step renders the options the site settings enable. The manual cash lane is offered by default.",
        expectedUiState:
          "A cash or manual-payment option is present and selectable, with guidance describing paying outside the app and uploading proof. A total is displayed as a rupee amount rather than a blank or ₹0.00.",
        endResult: "No order exists yet; reloading /checkout returns to the address step.",
      },
      {
        key: "place-cash-order-redirects-to-proof-upload",
        label: "🛑 Placing a cash order creates the order AND lands the buyer on the proof-upload page",
        roles: ["buyer"],
        startPage: "/checkout",
        steps: [
          SIGNIN_BUYER,
          "Open /checkout with the Wizard Arrow line in the cart.",
          "Select the saved 'Home' address and continue.",
          "Continue again from the extras step.",
          "Select the cash payment option.",
          "Click the place-order control.",
          "Wait for the navigation to settle and read the URL.",
        ],
        expectedBehaviour:
          "An order is created with paymentMethod cash and paymentStatus pending, the cart line is consumed, and the buyer is routed to the manual-payment upload page for that order.",
        expectedUiState:
          "The URL is /user/orders/{orderId}/payment. The page shows an upload control for a payment screenshot and a countdown to the payment deadline. It does NOT read 'This order does not require manual payment upload.' — that message means paymentMethod never reached the client and the whole manual lane is dead.",
        expectedData: { landsOnPaymentPage: true },
        endResult:
          "After reloading /user/orders the new order is listed, and reopening its payment page still offers the upload rather than the not-required message.",
      },
      {
        key: "order-row-names-the-product",
        label: "The new order is listed by its product name, not a bare order id",
        roles: ["buyer"],
        startPage: "/user/orders",
        steps: [
          SIGNIN_BUYER,
          "Open /user/orders.",
          "Read the primary label and thumbnail of the newest row.",
        ],
        expectedBehaviour:
          "Order rows render from the items array denormalised onto the order document, so no extra fetch is needed to name what was bought.",
        expectedUiState:
          "The newest row's primary label reads 'Beyblade X BX-01 Wizard Arrow' and shows its thumbnail. The order id is present but de-emphasised. The row does not read only 'Order order-1-…'.",
        endResult: "After a reload the row still names the product.",
      },
      {
        key: "order-detail-shows-payment-state",
        label: "The order detail page shows the manual-payment panel and the real status",
        roles: ["buyer"],
        startPage: "/user/orders",
        steps: [
          SIGNIN_BUYER,
          "Open /user/orders.",
          "Open the newest order's detail page.",
          "Read the status, the payment method and the panel offered.",
        ],
        expectedBehaviour:
          "The order adapter carries paymentMethod, paymentStatus and the payment deadline through to the client, so the manual-payment panel can decide to render.",
        expectedUiState:
          "The page names the product, shows a status of Pending, identifies the payment method as cash or manual, and offers a control to complete or re-upload the payment proof.",
        endResult: "After a reload the same panel and status are shown.",
      },
    ],
  },

  /* ── 3. Buyer addresses ────────────────────────────────────────────────── */
  {
    pageKey: "buyer-addresses",
    pageLabel: "Buyer: addresses",
    href: "/user/addresses",
    cases: [
      {
        key: "create-address",
        label: "A new address can be created and appears in the list",
        roles: ["buyer"],
        startPage: "/user/addresses",
        steps: [
          SIGNIN_BUYER,
          "Open /user/addresses.",
          "Click the control that adds a new address.",
          "Enter the label QA Addr create.",
          "Enter the full name QA Buyer.",
          "Enter the phone 9876500011.",
          "Enter the address line 12 Test Street.",
          "Enter the postal code 452001.",
          "Enter the city Indore.",
          "Select the state Madhya Pradesh.",
          "Click Save.",
          "Reload /user/addresses.",
        ],
        inputs: {
          label: "QA Addr create",
          fullName: "QA Buyer",
          phone: "9876500011",
          line1: "12 Test Street",
          postalCode: "452001",
          city: "Indore",
          state: "Madhya Pradesh",
        },
        expectedBehaviour:
          "An address row is written against the signed-in buyer with ownerType user, and its PII fields are encrypted at rest.",
        expectedUiState:
          "The drawer or form closes and a row labelled 'QA Addr create' is listed showing 12 Test Street, Indore, 452001.",
        endResult: "After the reload the 'QA Addr create' row is still listed with the same street and postal code.",
      },
      {
        key: "postal-code-fills-city-state",
        label: "Entering a postal code fills the city and state",
        roles: ["buyer"],
        startPage: "/user/addresses",
        steps: [
          SIGNIN_BUYER,
          "Open /user/addresses.",
          "Click the control that adds a new address.",
          "Enter the postal code 560001.",
          "Move focus out of the postal-code field and wait for the lookup to settle.",
          "Read the city and state fields.",
        ],
        inputs: { postalCode: "560001" },
        expectedBehaviour:
          "A postal-code lookup resolves the city and state and populates both fields without the buyer typing them.",
        expectedUiState:
          "The city field reads Bangalore and the state field reads Karnataka. Neither is left blank, and neither reads a street or post-office name such as 'Rajbhavan' — that is the defect this case exists to catch.",
        expectedData: { city: "Bangalore", state: "Karnataka" },
        endResult: "Nothing is saved unless the form is submitted; leaving the page discards it.",
      },
      {
        key: "edit-address-persists",
        label: "🛑 Editing an address saves — checked after a reload, not from the toast",
        roles: ["buyer"],
        startPage: "/user/addresses",
        steps: [
          SIGNIN_BUYER,
          "Open /user/addresses.",
          "Open the edit control on the 'QA Addr create' row.",
          "Change the address line to 99 Revised Road.",
          "Click Save.",
          "Reload /user/addresses.",
          "Read the 'QA Addr create' row.",
        ],
        inputs: { newLine1: "99 Revised Road" },
        expectedBehaviour:
          "The changed field is persisted. A success response that writes nothing is the most common defect shape in this codebase, so the reload is the only oracle that settles it.",
        expectedUiState:
          "Immediately after saving the row reads 99 Revised Road. After the reload it STILL reads 99 Revised Road, not 12 Test Street.",
        expectedData: { line1AfterReload: "99 Revised Road" },
        endResult: "The row reads 99 Revised Road after any number of reloads.",
      },
      {
        key: "set-default-address",
        label: "Setting an address as default marks exactly one default",
        roles: ["buyer"],
        startPage: "/user/addresses",
        steps: [
          SIGNIN_BUYER,
          "Open /user/addresses.",
          "Click the set-as-default control on the 'QA Addr create' row.",
          "Reload /user/addresses.",
          "Read which rows carry a default marker.",
        ],
        expectedBehaviour:
          "The chosen address becomes the default and the previously default address is cleared, so the flag stays singular.",
        expectedUiState:
          "'QA Addr create' shows a Default badge. Exactly one row carries that badge — not two.",
        expectedData: { defaultCount: 1 },
        endResult: "After the reload 'QA Addr create' is still the only row marked default.",
      },
      {
        key: "delete-address",
        label: "Deleting an address removes it, and the deletion survives a reload",
        roles: ["buyer"],
        startPage: "/user/addresses",
        steps: [
          SIGNIN_BUYER,
          "Open /user/addresses.",
          "Open the delete control on the 'QA Addr create' row.",
          "Confirm in the dialog.",
          "Reload /user/addresses.",
        ],
        expectedBehaviour:
          "The address document is deleted. A destructive action must ask before acting, so a delete that happens with no dialog is a FAIL even when the deletion itself is correct.",
        expectedUiState:
          "A confirmation dialog appears before anything is removed. After confirming, the 'QA Addr create' row is gone from the list.",
        endResult: "After the reload the row is still absent, and the seeded 'Home' address is untouched.",
      },
    ],
  },

  /* ── 4. Seller: list a product ─────────────────────────────────────────── */
  {
    pageKey: "seller-listing",
    pageLabel: "Seller: list a standard product",
    href: "/store/products",
    cases: [
      {
        key: "create-standard-listing",
        label: "A seller can create and publish a standard listing",
        roles: ["seller"],
        startPage: "/store/products/new",
        steps: [
          SIGNIN_SELLER,
          "Open /store/products/new.",
          "Enter the title QA Listing seller-listing.",
          "Enter the description A standard listing created by the QA happy-path run.",
          "Enter the price 1250.",
          "Enter the stock quantity 5.",
          "Select the category Beyblade X Tops. Pick the LEAF, not the generation: the point of this case is that the repository derives the ancestor chain, and category-x-tops sits under category-beyblade-x, which is the page the next case checks. NOTE the picker's search box does not filter — scroll or use Load more to find it.",
          "Upload a product image. It is a REQUIRED field and Publish is refused with 'Product image is required' without one; the crop dialog that opens must be confirmed with Save Crop.",
          "Brand and condition are NOT on the quick-add form — they live behind 'Show all fields (advanced)'. Leave them at their defaults for this case.",
          "Click the publish control.",
          "Wait for the navigation to settle.",
        ],
        inputs: {
          title: "QA Listing seller-listing",
          price: 1250,
          stockQuantity: 5,
          categoryName: "Beyblade X",
          brandName: "Beyblade",
          condition: "New",
        },
        expectedBehaviour:
          "A product is written against store-beyblade-arena with listingType standard and status published. The repository derives the full ancestor chain onto categorySlugs from the chosen leaf, which is what makes the listing reachable from its category later.",
        expectedUiState:
          "The form leaves the create screen and lands on /store/products, where a row reads 'QA Listing seller-listing' with 'standard' and 'new · published'. Once the image is attached no validation error is displayed.",
        endResult: "After reloading /store/products the listing is present with status Published.",
      },
      {
        key: "listing-appears-in-seller-list",
        label: "The new listing appears in the seller's own products list",
        roles: ["seller"],
        startPage: "/store/products",
        steps: [
          SIGNIN_SELLER,
          "Open /store/products.",
          "Search the list for QA Listing seller-listing.",
          "Read its row — title, price, status and stock.",
        ],
        expectedBehaviour: "The seller's product list is scoped to their own store and includes the newly created listing.",
        expectedUiState:
          "A row reads 'QA Listing seller-listing', ₹1,250, status Published, stock 5.",
        expectedData: { price: 1250, stockQuantity: 5 },
        endResult: "After a reload the row is unchanged.",
      },
      {
        key: "listing-is-publicly-reachable",
        label: "🛑 The new listing is reachable from its own category by a signed-out visitor",
        roles: ["guest", "seller"],
        startPage: "/categories/category-beyblade-x",
        steps: [
          "Open /categories/category-beyblade-x signed out.",
          "Wait for the product grid to render.",
          "Look for a card titled QA Listing seller-listing.",
        ],
        expectedBehaviour:
          "A UI-created listing carries its full ancestor chain on categorySlugs, so it is matched by its own leaf category as well as by every ancestor. A listing created through the form that is invisible on its own category page means the chain was stripped on write and is a FAIL.",
        expectedUiState:
          "A card titled 'QA Listing seller-listing' is present in the grid. Its price row reads the guest sign-in prompt rather than ₹1,250.",
        endResult: "The card is still present after a reload.",
      },
      {
        key: "edit-listing-persists",
        label: "Editing the listing's price saves — checked after a reload",
        roles: ["seller"],
        startPage: "/store/products",
        steps: [
          SIGNIN_SELLER,
          "Open /store/products.",
          "Open the edit screen for QA Listing seller-listing.",
          "Change the price to 1350.",
          "Click Save.",
          "Reload the edit screen.",
          "Read the price field.",
        ],
        inputs: { newPrice: 1350 },
        expectedBehaviour:
          "The price is persisted on the product document. The editor must be seeded from the unwrapped product rather than from an action envelope, or every field reads blank and saving writes defaults over the live listing.",
        expectedUiState:
          "The form is populated with the listing's real values when opened — title, price and category are filled, not blank. After saving and reloading, the price field reads 1350.",
        expectedData: { priceAfterReload: 1350 },
        endResult: "The listing is still ₹1,350 and still Published — a save must not silently flip status to draft.",
      },
      {
        key: "delete-listing",
        label: "The seller can delete the listing they created",
        roles: ["seller"],
        startPage: "/store/products",
        steps: [
          SIGNIN_SELLER,
          "Open /store/products.",
          "Open the row actions for QA Listing seller-listing.",
          "Click the delete action.",
          "Confirm in the dialog.",
          "Reload /store/products.",
        ],
        expectedBehaviour: "The listing is removed or archived so it no longer appears in the seller's active list.",
        expectedUiState:
          "A confirmation dialog appears before anything is deleted. After confirming, the row is gone.",
        endResult: "After the reload the row is still absent, and the seeded listings are untouched.",
      },
    ],
  },

  /* ── 5. Seller: fulfil an order ────────────────────────────────────────── */
  {
    pageKey: "seller-fulfil",
    pageLabel: "Seller: fulfil an order",
    href: "/store/orders",
    cases: [
      {
        key: "order-appears-for-seller",
        label: "The buyer's order appears in the owning seller's orders list",
        roles: ["seller"],
        startPage: "/store/orders",
        steps: [
          SIGNIN_SELLER,
          "Open /store/orders.",
          "Read the newest row's product name, buyer and status.",
        ],
        expectedBehaviour:
          "Orders are split per store at creation, so a seller sees only orders containing their own listings.",
        expectedUiState:
          "The newest row names the purchased product rather than only an order id, and shows a status of Pending.",
        endResult: "After a reload the row is still listed.",
      },
      {
        key: "seller-order-detail-opens",
        label: "🛑 The seller can OPEN the order, not only act on it from the row",
        roles: ["seller"],
        startPage: "/store/orders",
        steps: [
          SIGNIN_SELLER,
          "Open /store/orders.",
          "Open the newest order's detail view.",
          "Read the items, the quantities and the shipping destination.",
        ],
        expectedBehaviour:
          "A listing row has a detail affordance. A menu of pure mutations lets a seller act on a record they were never able to read, which is not the same as the record being reachable.",
        expectedUiState:
          "A detail view opens showing the ordered item, its quantity, the order total and the delivery city. It is not a blank shell.",
        endResult: "Nothing is written by viewing; reloading shows the same detail.",
      },
      {
        key: "seller-sees-no-payment-screenshot",
        label: "The seller sees the payment status but NOT the buyer's payment screenshot",
        roles: ["seller"],
        startPage: "/store/orders",
        steps: [
          SIGNIN_SELLER,
          "Open /store/orders.",
          "Open the newest order's detail view.",
          "Look for the payment section and read what it exposes.",
        ],
        expectedBehaviour:
          "Manual-payment review is an admin and moderator responsibility. The screenshot is a bank or UPI capture, so the seller gets the status and the reference only.",
        expectedUiState:
          "A payment status is shown. No payment screenshot image is rendered, and no verify or reject control is offered to the seller.",
        expectedData: { screenshotVisibleToSeller: false },
        endResult: "Nothing is written by viewing.",
      },
      {
        key: "mark-shipped-with-tracking",
        label: "Marking an order shipped with a carrier and tracking number persists",
        roles: ["seller"],
        startPage: "/store/orders",
        steps: [
          SIGNIN_SELLER,
          "Open /store/orders.",
          "Open the newest order and start the ship action.",
          "Enter the carrier QA Carrier.",
          "Enter the tracking number QA123456789.",
          "Click the confirm control.",
          "Reload /store/orders.",
        ],
        inputs: { carrier: "QA Carrier", trackingNumber: "QA123456789" },
        expectedBehaviour:
          "The order status moves to Shipped and the carrier and tracking number are written to the order document. The buyer receives an order-shipped notification.",
        expectedUiState: "The row's status badge reads Shipped.",
        expectedData: { trackingNumber: "QA123456789" },
        endResult: "After the reload the status still reads Shipped and the tracking number is still QA123456789.",
      },
      {
        key: "buyer-sees-shipped-status",
        label: "The buyer's own order page reflects the shipped status and tracking",
        roles: ["buyer"],
        startPage: "/user/orders",
        steps: [
          SIGNIN_BUYER,
          "Open /user/orders.",
          "Open the order the seller has just shipped.",
          "Read the status and look for the tracking number.",
        ],
        expectedBehaviour:
          "The seller's status change is visible to the buyer on the same order, with the tracking details carried through the order adapter.",
        expectedUiState:
          "The status reads Shipped and the tracking number QA123456789 is displayed. The page does not still read Pending.",
        expectedData: { status: "Shipped", trackingNumber: "QA123456789" },
        endResult: "After a reload the buyer still sees Shipped.",
      },
    ],
  },

  /* ── 6. Admin: verify the payment ──────────────────────────────────────── */
  {
    pageKey: "admin-verify",
    pageLabel: "Admin: verify a manual payment",
    href: "/admin/orders",
    cases: [
      {
        key: "admin-orders-list-loads",
        label: "The admin orders list loads and names the products ordered",
        roles: ["admin"],
        startPage: "/admin/orders",
        steps: [
          SIGNIN_ADMIN,
          "Open /admin/orders.",
          "Wait for the table to render.",
          "Read the newest row's primary label and status.",
        ],
        expectedBehaviour: "The admin orders list is unscoped and renders every store's orders.",
        expectedUiState:
          "Rows are listed and the newest names its product rather than only an order id. The table is not empty and shows no error banner.",
        endResult: "Nothing is written; reloading shows the same rows.",
      },
      {
        key: "manual-payment-queue-filters",
        label: "The manual-payment filter narrows the list, proven against the unfiltered count",
        roles: ["admin"],
        startPage: "/admin/orders",
        steps: [
          SIGNIN_ADMIN,
          "Open /admin/orders.",
          "Count the rows shown with no filter applied.",
          "Apply the manual-payment filter for orders awaiting verification.",
          "Count the rows shown now.",
        ],
        expectedBehaviour:
          "The queue is refined in memory over a bounded query rather than by a Firestore inequality, because 'has a proof' excludes every document where the field was never written — which is exactly the awaiting-payment set.",
        expectedUiState:
          "The filtered count is smaller than the unfiltered count, and every remaining row shows a manual payment method. An identical count means the filter is not being applied and is a FAIL.",
        endResult: "The filter is carried in the URL, so reloading keeps the same scope.",
      },
      {
        key: "admin-sees-payment-proof",
        label: "The admin can open the order and see the buyer's uploaded proof",
        roles: ["admin"],
        startPage: "/admin/orders",
        steps: [
          SIGNIN_ADMIN,
          "Open /admin/orders.",
          "Open the detail view for the cash order placed earlier in this run.",
          "Read the payment section.",
        ],
        expectedBehaviour:
          "The admin review surface shows the uploaded screenshot, the reported reference, the expected UPI id and any mismatch between them.",
        expectedUiState:
          "The payment screenshot is rendered, and verify, request-re-upload and reject controls are offered. The section is not empty.",
        endResult: "Nothing is written by viewing.",
      },
      {
        key: "verify-payment-marks-paid",
        label: "🛑 Verifying the proof marks the order paid, and the buyer sees it",
        roles: ["admin", "buyer"],
        startPage: "/admin/orders",
        steps: [
          SIGNIN_ADMIN,
          "Open /admin/orders.",
          "Open the detail view for the cash order placed earlier in this run.",
          "Click the verify control.",
          "Confirm in the dialog.",
          "Reload the order detail.",
        ],
        expectedBehaviour:
          "The payment status becomes paid and a status-history entry records the actor and the reason. The buyer's own order page stops offering the proof upload.",
        expectedUiState:
          "The payment status badge reads Paid. Admin: the verify control is no longer offered. Buyer: /user/orders/{orderId}/payment no longer offers an upload.",
        expectedData: { paymentStatus: "Paid" },
        endResult: "After the reload the status still reads Paid — not Pending.",
      },
      {
        key: "admin-cannot-be-bypassed-by-url",
        label: "A signed-out visitor cannot reach the admin orders list",
        roles: ["guest"],
        startPage: "/admin/orders",
        steps: [
          "Open /admin/orders signed out.",
          "Wait for the navigation to settle and read the URL and the page.",
        ],
        expectedBehaviour:
          "The admin subtree reads the session in its layout, so an unauthenticated request is redirected rather than rendered.",
        expectedUiState:
          "The browser lands on a sign-in or unauthorised page. No order rows, no buyer names and no email addresses are rendered at any point.",
        expectedData: { orderRowsVisibleToGuest: 0 },
        endResult: "Nothing is written; repeating the navigation behaves the same way.",
      },
    ],
  },
];
