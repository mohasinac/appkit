/*
 * WHY: Authored six-part procedures for the admin/catalog-listings page.
 * WHAT: 17 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THE ADMIN TYPE CHIPS ONCE USED DISPLAY LABELS AS FILTER VALUES, translated
 * through an indirection map that hid two entirely missing types. A filter value
 * is compared byte-exactly, so a chip reading "Pre-orders" against a stored
 * "pre-order" matches nothing forever with no error. Four cases here read the
 * chips against the real union rather than trusting the labels.
 *
 * Categories are the other theme: a product carries its FULL ancestor chain so a
 * parent page can match on its own id alone, and nothing on the write side
 * derives that chain yet.
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
  "checklist-admin-catalog-listings-brands-crud": {
    roles: ["admin", "guest"],
    startPage: "/admin/categories",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin brands surface and create one named 'QA Brand admin-crud' with a website, a country and a founding year.",
      "Upload public/test-media/sample-image.png to the field labelled for the hero or cover image.",
      "Save, RELOAD, and read every field.",
      "Open /brands/{slug} in a private window and read the hero banner and the 'About this brand' panel.",
      "Check the uploaded image is what renders as the hero.",
      "Rename the brand, save, reload, and check its URL slug is unchanged.",
      "Delete the brand and confirm it disappears from /brands.",
    ],
    inputs: { name: "QA Brand admin-crud", image: "public/test-media/sample-image.png" },
    expectedBehaviour:
      "Brands are category rows discriminated by type, not a separate collection. The image field that actually drives the public hero is the COVER image — a form once offered a 'Logo' input that fed the hero and a 'Banner' input that fed a field with no readers anywhere, so every uploaded banner was silently discarded. Website, country and founding year must render publicly rather than being accepted and never shown.",
    expectedUiState:
      "After the reload every field holds. The public page's hero is the uploaded image, and the 'About this brand' panel shows the website, country and year. The slug is unchanged after the rename.",
    endResult:
      "The brand is deleted. Record any field the form accepts that never appears publicly — that is a field with no reader.",
  },
  "checklist-admin-catalog-listings-categories-crud": {
    roles: ["admin", "guest"],
    startPage: "/admin/categories",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/categories and read the tree, noting the two roots and how depth is shown.",
      "Create a child category named 'QA Category admin-crud' under category-beyblade-burst.",
      "Save, RELOAD, and read its parent, its tier and its position in the tree.",
      "Open /categories in a private window and find it beneath its parent.",
      "Rename it, save, reload, and check its slug is unchanged.",
      "Delete it and confirm it disappears from the tree and from /categories.",
    ],
    inputs: { name: "QA Category admin-crud", parent: "category-beyblade-burst" },
    expectedBehaviour:
      "Creating a child places it in the tree with its full ancestor chain derived rather than hand-written — the chain, tier, path and position are all computed, and hand-writing any of them is how a tree goes inconsistent. The slug is immutable after creation, as everywhere else.",
    expectedUiState:
      "After the reload the category sits under Beyblade Burst at the right depth, and it appears there publicly. Its slug survives the rename. After the delete it is gone from both surfaces.",
    endResult: "The category is deleted by the final step.",
  },
  "checklist-admin-catalog-listings-products-crud": {
    roles: ["admin", "guest"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products and create a product titled 'QA Product admin-crud' at 600 with a category, a brand, stock 3 and an image.",
      "Save, RELOAD, and read every field.",
      "Open its public page and read the title, price, stock badge, category links and brand link.",
      "Count the category links shown.",
      "Edit ONLY the price to 700, save, RELOAD, and compare every other field.",
      "Delete the product and confirm the public page no longer resolves.",
    ],
    inputs: { title: "QA Product admin-crud", priceBefore: 600, priceAfter: 700, stock: 3 },
    expectedBehaviour:
      "An admin create and edit round-trip, and an edit writes back only what changed. The category link count is worth recording: a product is supposed to carry its full ancestor chain so every ancestor page can find it, and nothing on the write side derives that chain — so a product created through a form against a deep category gets ONE slug and is invisible on every ancestor page.",
    expectedUiState:
      "After each reload the values hold and only the price differs after the edit. Record how many category links the public page shows — one, where the chosen category has ancestors, is the known gap rather than a surprise. After the delete the public URL no longer resolves.",
    expectedData: { unintendedFieldChanges: 0 },
    endResult:
      "The product is deleted. Report the category link count either way.",
  },
  "checklist-admin-catalog-listings-products-default-listing-not-empty": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products with NO query parameters at all.",
      "Read the result count and the rows.",
      "Read which availability scope and which status filter are applied by default.",
      "Switch to the All scope and compare the count.",
      "Clear every filter and compare again.",
    ],
    expectedBehaviour:
      "The admin listing opens showing rows. This page shares one query implementation with the public browse path, reached through a sentinel that lets any status through — so an admin listing that opens empty usually means a filter default meant for the public path is being applied here, where an admin needs to see drafts and archived rows too.",
    expectedUiState:
      "The default view holds rows rather than an empty state. The All scope returns at least as many. An empty default listing with rows appearing only after clearing filters is the failure.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-catalog-listings-categories-toggle-filters": {
    roles: ["admin"],
    startPage: "/admin/categories",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/categories and note the total row count.",
      "Read every toggle and filter offered above the list.",
      "Use each in turn and read the resulting count and rows.",
      "Write down any toggle that leaves the count unchanged.",
      "Clear everything and confirm the original count returns.",
    ],
    expectedBehaviour:
      "Every toggle changes the list. A toggle that renders, counts toward the filter badge and matches nothing is inert — that happens when it reads a field the document does not have, and nothing raises. Category rows carry a type discriminator, so filters separating categories from brands, bundles and sublistings are the ones most likely to be reading the wrong field.",
    expectedUiState:
      "Each toggle visibly changes the rows. A toggle leaving the count identical while incrementing the filter badge is the failure, named specifically.",
    expectedData: { inertToggles: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-catalog-listings-admin-products-type-chips-all-types": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products and read every listing-type chip offered.",
      "Write the list down and compare it against the nine types the catalogue supports.",
      "Select each chip in turn and read the result count and the rows.",
      "Write down any chip returning zero rows, and any returning the full unfiltered list.",
      "Check whether a chip for `bundle` is offered.",
    ],
    expectedBehaviour:
      "Nine chips, each filtering to its own type. The chips once used display LABELS as filter values through an indirection map that hid two missing types entirely — and a filter value is compared byte-exactly, so a chip reading 'Pre-orders' against a stored 'pre-order' matches nothing forever. A chip for `bundle` must NOT exist: it stopped being a listing type and would match zero rows permanently.",
    expectedUiState:
      "Nine chips are offered and each returns only its own type. No `bundle` chip. A chip returning zero while that type demonstrably exists is the byte-exactness failure; one returning everything is the dropped-filter failure.",
    expectedData: { typeChipCount: 9 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-catalog-listings-admin-products-type-chips-multi-select": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products and tick the Auctions chip, reading the count.",
      "Tick Pre-orders as well and read the count.",
      "Check the count is the sum of the two rather than either alone.",
      "Read the URL and check it encodes both types.",
      "Open the sort dropdown and read which options are offered with two types selected.",
      "Untick both and confirm the unfiltered count returns.",
    ],
    expectedBehaviour:
      "Multiple type chips form an OR, so selecting two returns both sets. The alias layer has to split a joined value before looking each part up — testing the whole joined string as one token returns an empty value that is then dropped, so the filter vanishes and the page shows everything. The sort dropdown narrows to options valid for every selected type, since a sort valid for one alone would fail the others.",
    expectedUiState:
      "Two chips ticked returns the sum of their individual counts, and the URL carries both. The sort dropdown offers only sorts common to both. A combined selection returning the FULL unfiltered list is the dropped-filter failure.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-catalog-listings-admin-products-featured-promoted-sorts": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products and read the sort dropdown's options.",
      "Select 'Featured first' and read the row order.",
      "Select 'Promoted first' and read the row order.",
      "Compare both against the default order.",
      "Reload with one applied and read the order on first paint.",
    ],
    expectedBehaviour:
      "Both sorts reorder the rows. A sort whose field is not marked sortable is dropped before the query runs, so the dropdown changes and nothing moves — these two shipped exactly that way and went unreported, because a sort that does nothing looks like a list already in that order.",
    expectedUiState:
      "Featured rows rise under the first and promoted under the second, and both differ from the default. After a reload the chosen order holds on first paint rather than re-sorting a moment later.",
    expectedData: { inertSortOptions: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-catalog-listings-admin-per-type-pages-have-filters": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open each per-type admin listing in turn — auctions, pre-orders, prize draws, classifieds, digital codes, live items, art and stickers.",
      "On each, read the filters offered and note whether any are specific to that type.",
      "Use each type-specific filter and confirm it changes the rows.",
      "Write down any page offering no filters at all.",
      "Write down any filter that changes nothing.",
    ],
    expectedBehaviour:
      "Each type's page offers the facets that type actually has — a classified's city, a live item's species, an auction's bid range — on top of the shared ones. A facet that renders and matches nothing is inert, which happens when it emits a field the query allowlist does not carry, and nothing raises.",
    expectedUiState:
      "Every per-type page offers filters including its own, and each visibly changes the rows. A page with no filters, or a filter that leaves the count identical while incrementing the badge, are both findings named by page.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-catalog-listings-admin-listing-reset-restores-defaults": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products and note the default count, scope and sort.",
      "Apply a search term, two type chips, a status filter and a different sort.",
      "Read the URL and the count.",
      "Use the reset control.",
      "Read the URL, the count, the scope, the sort and every filter control.",
      "Reload and read them again.",
    ],
    expectedBehaviour:
      "Reset returns every control AND the URL to the defaults, not just the visible chips. A reset that clears the drawer while leaving the search term or the sort in the URL produces a list the controls no longer describe.",
    expectedUiState:
      "After reset the count, scope and sort match the untouched defaults and the URL carries no leftover parameters. The search box is empty. Reloading reproduces the default view.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-catalog-listings-admin-address-payment-status-chips-in-url": {
    roles: ["admin"],
    startPage: "/admin/addresses",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/addresses and select a status chip.",
      "Read the URL and check it encodes the selection.",
      "Copy the URL, open it in a new tab, and read which chip is active on arrival.",
      "Press the browser back button and read which chip is active.",
      "Repeat all of this on the admin payment-methods listing.",
    ],
    expectedBehaviour:
      "Chip state lives in the URL on both listings, so a filtered view is shareable and the back button walks the selections. A chip held in component state alone makes the URL describe a different page from the one on screen.",
    expectedUiState:
      "Both listings encode the chip in the URL, the copied URL arrives with the same chip active, and back returns to the previous selection. One press per selection — two presses to undo one chip is the double-navigation failure.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-catalog-listings-admin-listing-sort-dropdown-preselected": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products with no query parameters and read the sort dropdown's selection.",
      "Check something is selected rather than the control being blank.",
      "Confirm the selected option is one of the options the dropdown offers.",
      "Repeat on /admin/orders, /admin/addresses and the admin payment-methods listing.",
      "Write down any listing whose dropdown opens with nothing selected.",
    ],
    expectedBehaviour:
      "A listing's default sort is one of the options it offers. Where the default names a field the dropdown does not list, the control opens blank — the list IS sorted, but nothing on screen says how, and two of these listings shipped exactly that way.",
    expectedUiState:
      "Every listing opens with a sort visibly selected and that selection is among its own options. A blank dropdown is the failure, named by listing.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-admin-catalog-listings-sublisting-categories-crud": {
    roles: ["admin", "guest"],
    startPage: "/admin/categories",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin sublisting-categories surface and read the existing rows.",
      "Create one named 'QA Sublisting admin-crud' with a description and save.",
      "RELOAD and read every field.",
      "Rename it, save, RELOAD, and read the derived page title and description.",
      "Check they reflect the NEW name rather than the original.",
      "Delete it and confirm it is gone.",
    ],
    inputs: { name: "QA Sublisting admin-crud" },
    expectedBehaviour:
      "Derived page metadata is recomputed on rename. Deriving it only at creation freezes the title and description at the original name, so the page keeps describing itself as something it is no longer called — a create-time transform the update path does not repeat.",
    expectedUiState:
      "After the rename and reload both the name and the derived title and description reflect the new name. Metadata still naming the original is the failure.",
    endResult: "The sublisting category is deleted by the final step.",
  },
  "checklist-admin-catalog-listings-carousel-crud": {
    roles: ["admin", "guest"],
    startPage: "/admin/carousels",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/carousels and read what the page lists.",
      "Check it lists NAMED carousels rather than rendering a flat slide editor.",
      "Create a carousel named 'QA Carousel admin-crud' and add a slide with a title, an image and a link.",
      "Save, RELOAD, and read the carousel's name, status and its slide.",
      "Set it active and open / in a private window to find it.",
      "Count the active carousels and check the cap is respected.",
      "Delete the carousel.",
    ],
    inputs: { name: "QA Carousel admin-crud", maxActive: 5 },
    expectedBehaviour:
      "The list page lists named carousels — it once rendered the flat slide editor instead, so there was no list at all. At most five may be active at once, and a slide's background may be an image, a video, a colour or a gradient; a video background renders through a real video element, so its URL must be directly playable rather than routed through the image proxy, which rejects video outright.",
    expectedUiState:
      "The page lists named carousels. After the reload the carousel holds its name, status and slide. Activating it shows it publicly. Attempting a sixth active carousel is refused rather than silently accepted.",
    endResult: "The carousel is deleted by the final step.",
  },
  "checklist-admin-catalog-listings-sections-crud": {
    roles: ["admin", "guest"],
    startPage: "/admin",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the homepage sections editor and read every section, its type and its order.",
      "Create a section, choosing a type, and configure every field it offers.",
      "Save, RELOAD, and read every field back.",
      "Open / in a private window and find the new section in the right position.",
      "Change ONE field, save, RELOAD, and check every other field is unchanged.",
      "Delete the section and confirm it disappears from the public homepage.",
    ],
    expectedBehaviour:
      "A section round-trips every field its type offers, and the public homepage reflects its configuration and position. Saving one field must not rewrite the others — a form submitting its whole object from partly-populated state blanks every field it did not load, and the save reports success.",
    expectedUiState:
      "After each reload every field holds and only the edited one differs. The public homepage shows the section in its configured position and with its configured content. After the delete it is gone publicly.",
    expectedData: { unintendedFieldChanges: 0 },
    endResult: "The section is deleted by the final step.",
  },
  "checklist-admin-catalog-listings-art-stickers-crud": {
    roles: ["admin", "guest"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Create an art listing titled 'QA Art Print admin-crud' at 700 with a size, material, finish and edition size.",
      "Save, RELOAD, and read all four print fields.",
      "Open the admin listing filtered to art and check the listing appears there.",
      "Read every other row in that filtered view and check none is an ordinary product.",
      "Open the public art tab and check the listing appears there too.",
      "Delete the listing.",
    ],
    inputs: { title: "QA Art Print admin-crud", price: 700 },
    expectedBehaviour:
      "Art and stickers are real listing types with their own fields and their own filter value. They were added to the type union and the plugin registry without being added to the repository's alias map, so their queries ran with NO type filter — the filtered view rendered and returned the whole catalogue, which looks like a working page.",
    expectedUiState:
      "The print fields round-trip. The art-filtered admin view holds only art listings — an ordinary Beyblade product among them is the dropped-filter failure. The public art tab shows it too.",
    expectedData: { ordinaryProductsInFilteredView: 0 },
    endResult: "The listing is deleted by the final step.",
  },
  "checklist-admin-catalog-listings-deals-featured-crud": {
    roles: ["admin", "guest"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products and open a product's editor.",
      "Set its featured flag on and save.",
      "RELOAD and confirm the flag is still on.",
      "Open / in a private window and find the product in a featured section.",
      "Set the promoted or on-sale flag on, save, reload, and check the public surface that flag drives.",
      "Turn both flags back off, save, and confirm the product leaves those surfaces.",
    ],
    expectedBehaviour:
      "Featured, promoted and on-sale flags reach the public surfaces they drive, in both directions. Turning a flag off must remove the product from its section — a flag that only ever adds is half a flag, and the homepage sections that read them filter by availability too, so a sold-out featured product should not appear.",
    expectedUiState:
      "Each flag survives its reload and its public surface follows it on and off. The product appears in the featured section when flagged and leaves when unflagged.",
    endResult:
      "Both flags are off by the final step, so the seeded product is left as it was.",
  },
};
