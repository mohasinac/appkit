/**
 * Bundle UI copy — single source of truth for user-facing strings rendered by
 * the bundle views (S-SBUNI-3 + S-SBUNI-4). Keeping these in one shared module
 * means a copy change touches one file, not five components.
 *
 * Pure string constants — no React, no styling. Safe to import from anywhere
 * in the appkit tree.
 */

export const BUNDLE_COPY = {
  // Headings + section titles
  detailItemsHeading: "What's included",
  detailDescriptionHeading: "About this bundle",
  featuredDefaultTitle: "Curated Bundles",
  adminListTitle: "Bundles",
  adminEditorTitleNew: "New bundle",
  adminEditorTitleEdit: "Edit bundle",
  picker: {
    title: "Bundle members",
    selectedCount: (selected: number, min: number, max: number) =>
      `${selected} selected · min ${min}, max ${max}`,
    searchPlaceholder: "Search products to add (type at least 2 characters)",
    searchAriaLabel: "Search bundle member products",
    searchingHint: "Searching…",
    searchErrorPrefix: "Search error",
    noMatches: (query: string) => `No matches for "${query}".`,
    removeAria: (title: string) => `Remove ${title}`,
    toggleAria: (title: string) => `Toggle ${title}`,
  },

  // Detail page
  detail: {
    priceFallback: "—",
    itemCount: (n: number) => `${n} item${n !== 1 ? "s" : ""}`,
    emptyMembers: "Bundle contents are being updated. Check back shortly.",
    // SB-UNI-5 2026-05-13 — CTA functional. Disabled-CTA copy retained for
    // consumers that opt out of the wired CTA (the new client island reads
    // the active strings below).
    ctaDisabled: "Add to cart coming soon",
    ctaHint:
      "Bundle checkout is being wired up — buyers can browse contents now and the buy flow ships in the next release.",
    ctaAddToCart: "Add bundle to cart",
    ctaAdding: "Adding…",
    ctaOutOfStock: "Currently out of stock",
    ctaSuccess: "Bundle added to cart",
    ctaSignInRequired: "Sign in to add to cart",
    ctaErrorFallback: "Couldn't add bundle to cart",
    ctaBuyNow: "Buy now",
    qtyLabel: "Qty",
    qtyAriaLabel: "Bundle quantity",
  },

  // Order detail bundle grouping (SB-UNI-5)
  orderDetail: {
    bundleHeader: (name: string) => `Bundle: ${name}`,
    bundleItemCount: (n: number) =>
      `Includes ${n} item${n !== 1 ? "s" : ""}`,
    expandLabel: "Show items",
    collapseLabel: "Hide items",
  },

  // Featured strip
  featured: {
    viewAll: "View all bundles →",
    empty: "Bundles coming soon — curated multi-item drops launching shortly.",
    priceFallback: "—",
    itemCount: (n: number) => `${n} item${n !== 1 ? "s" : ""}`,
  },

  // Admin list
  adminList: {
    newButton: "+ New bundle",
    loading: "Loading bundles…",
    empty: "No bundles yet. Create one to get started.",
    columns: {
      name: "Name",
      price: "Price",
      members: "Members",
      stock: "Stock",
      status: "Status",
    },
    editLabel: "Edit",
    activeBadge: "Active",
    inactiveBadge: "Inactive",
  },

  // Admin editor
  adminEditor: {
    loading: "Loading bundle…",
    saveButton: (saving: boolean, isEdit: boolean) =>
      saving ? "Saving…" : isEdit ? "Save changes" : "Create bundle",
    deleteButton: (deleting: boolean) =>
      deleting ? "Deleting…" : "Delete bundle",
    deleteConfirm: "Delete this bundle? This action cannot be undone.",
    fields: {
      nameLabel: "Name *",
      namePlaceholder: "Pokémon TCG Starter Pack 2026",
      descriptionLabel: "Description",
      descriptionPlaceholder:
        "One paragraph describing what's in the bundle and who it's for.",
      priceLabel: "Bundle price (₹) *",
      pricePlaceholder: "6499",
      pricePaiseHint: (paise: number | null) =>
        `Stored as paise: ${paise ?? "—"}`,
      coverImageLabel: "Cover image URL",
      activeLabel: "Bundle is active (visible to buyers)",
    },
    // SB-UNI-5 2026-05-13 — static/dynamic rule-type toggle.
    ruleTypeLabel: "Bundle members source",
    ruleTypeStatic: "Hand-picked products",
    ruleTypeDynamic: "Dynamic query (auto-resolves)",
    // Bundle kind
    bundleKindLabel: "Bundle kind",
    bundleKindHint: "Special bundles show the 'Bundled' badge on product cards and update member product metadata. Brand bundles are discovery collections only.",
    bundleKindSpecial: "Special bundle",
    bundleKindBrand: "Brand collection",
    // Prize-draw draw count
    drawCountLabel: "Draw entries included",
    drawCountHint: "How many raffle entries the buyer receives for this prize-draw when purchasing the bundle.",
    drawCountPlaceholder: "e.g. 5",
    dynamic: {
      title: "Dynamic query rule",
      hint: "onProductStockChange resolves bundleProductIds; bundleQueryResolvedAt tracks the last refresh.",
      fields: {
        categorySlug: "Category slug filter",
        brandSlug: "Brand slug filter",
        tags: "Tags (comma-separated)",
        listingType: "Listing type",
        orderBy: "Order by",
        limit: "Limit",
      },
    },
    errors: {
      nameRequired: "Bundle name is required",
      priceInvalid: "Bundle price must be a positive number (rupees)",
      loadFailed: "Failed to load bundle",
      saveFailed: "Save failed",
      deleteFailed: "Delete failed",
    },
  },

  // Stock badges (shared between list + featured + detail)
  stockBadge: {
    in_stock: "In stock",
    out_of_stock: "Not active",
    listVariantInStock: "In stock",
    listVariantOutOfStock: "Not active",
  },
} as const;

/** Stock-status variant mapping (kept here so consumers can drive Badge variant prop). */
export const BUNDLE_STOCK_VARIANT = {
  in_stock: "success",
  out_of_stock: "warning",
} as const;
