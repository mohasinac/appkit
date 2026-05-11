/**
 * action-defs.ts
 *
 * Single source of truth for ALL action IDs, labels, variants, and groupings
 * used across the platform:
 *
 *   Product detail pages  — desktop action panel + mobile BuyBar
 *   Listing pages         — BulkActionsBar selections
 *   Table rows            — RowActionMenu items (admin / seller / user)
 *   Form shells           — submit / cancel / save-draft / publish / delete
 *   Dashboard quick bar   — top-level shortcut buttons per dashboard type
 *
 * Pure TypeScript — no React, no JSX, no callbacks.
 * Consuming components resolve iconName → Lucide component, and supply onClick.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Shared variant type
// ─────────────────────────────────────────────────────────────────────────────

export type ActionVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "warning";

// ─────────────────────────────────────────────────────────────────────────────
// § 1  Product / listing actions
//      Used by: detail pages, BulkActionsBar, BuyBar
// ─────────────────────────────────────────────────────────────────────────────

export const ACTION_ID = {
  // Standard product
  BUY_NOW:              "buy-now",
  ADD_TO_CART:          "add-to-cart",
  ADD_TO_WISHLIST:      "add-to-wishlist",
  REMOVE_FROM_WISHLIST: "remove-from-wishlist",
  MAKE_OFFER:           "make-offer",
  SHARE:                "share",
  COMPARE:              "compare",
  // Auction
  PLACE_BID:            "place-bid",
  BUY_NOW_AUCTION:      "buy-now-auction",
  WATCH_AUCTION:        "watch-auction",
  // Pre-order
  RESERVE_NOW:          "reserve-now",
  CANCEL_RESERVATION:   "cancel-reservation",
} as const;

export type ActionId = (typeof ACTION_ID)[keyof typeof ACTION_ID];

export interface ActionMeta {
  id: ActionId;
  /** Display label for buttons and menu items */
  label: string;
  /** Button variant — maps to the design system's Button variant prop */
  variant: ActionVariant;
  /** Lucide icon name — consuming component resolves this to the React component */
  iconName?: string;
  /** When true, the action is hidden if the user is not authenticated */
  requiresAuth?: boolean;
}

export const ACTION_META: Record<ActionId, ActionMeta> = {
  [ACTION_ID.BUY_NOW]:              { id: ACTION_ID.BUY_NOW,              label: "Buy Now",              variant: "primary"                              },
  [ACTION_ID.ADD_TO_CART]:          { id: ACTION_ID.ADD_TO_CART,          label: "Add to Cart",          variant: "secondary", iconName: "ShoppingCart"   },
  [ACTION_ID.ADD_TO_WISHLIST]:      { id: ACTION_ID.ADD_TO_WISHLIST,      label: "Add to Wishlist",      variant: "ghost",     iconName: "Heart"          },
  [ACTION_ID.REMOVE_FROM_WISHLIST]: { id: ACTION_ID.REMOVE_FROM_WISHLIST, label: "Remove from Wishlist", variant: "ghost",     iconName: "HeartOff"       },
  [ACTION_ID.MAKE_OFFER]:           { id: ACTION_ID.MAKE_OFFER,           label: "Make an Offer",        variant: "outline",   iconName: "Tag",            requiresAuth: true },
  [ACTION_ID.SHARE]:                { id: ACTION_ID.SHARE,                label: "Share",                variant: "ghost",     iconName: "Share2"         },
  [ACTION_ID.COMPARE]:              { id: ACTION_ID.COMPARE,              label: "Compare",              variant: "secondary", iconName: "Columns"        },
  [ACTION_ID.PLACE_BID]:            { id: ACTION_ID.PLACE_BID,            label: "Place Bid",            variant: "primary",                               requiresAuth: true },
  [ACTION_ID.BUY_NOW_AUCTION]:      { id: ACTION_ID.BUY_NOW_AUCTION,      label: "Buy Now",              variant: "secondary",                             requiresAuth: true },
  [ACTION_ID.WATCH_AUCTION]:        { id: ACTION_ID.WATCH_AUCTION,        label: "Watch",                variant: "ghost",     iconName: "Eye"            },
  [ACTION_ID.RESERVE_NOW]:          { id: ACTION_ID.RESERVE_NOW,          label: "Reserve Now",          variant: "primary",                               requiresAuth: true },
  [ACTION_ID.CANCEL_RESERVATION]:   { id: ACTION_ID.CANCEL_RESERVATION,   label: "Cancel Reservation",   variant: "danger",    iconName: "X",              requiresAuth: true },
};

// Detail page action groups — ordered top-to-bottom in the right-hand panel
export const DETAIL_ACTIONS = {
  /** Standard product: buy, cart, wishlist, offer, share */
  product:  [ACTION_ID.BUY_NOW, ACTION_ID.ADD_TO_CART, ACTION_ID.ADD_TO_WISHLIST, ACTION_ID.MAKE_OFFER, ACTION_ID.SHARE],
  /** Auction: bid, buy-now, watch, share */
  auction:  [ACTION_ID.PLACE_BID, ACTION_ID.BUY_NOW_AUCTION, ACTION_ID.WATCH_AUCTION, ACTION_ID.SHARE],
  /** Pre-order: reserve, wishlist, share */
  preorder: [ACTION_ID.RESERVE_NOW, ACTION_ID.ADD_TO_WISHLIST, ACTION_ID.SHARE],
} as const satisfies Record<string, readonly ActionId[]>;

// Mobile BuyBar — 1–2 primary CTAs only (limited horizontal space)
export const MOBILE_PRIMARY_ACTIONS = {
  product:  [ACTION_ID.BUY_NOW, ACTION_ID.ADD_TO_CART],
  auction:  [ACTION_ID.PLACE_BID, ACTION_ID.BUY_NOW_AUCTION],
  preorder: [ACTION_ID.RESERVE_NOW],
} as const satisfies Record<string, readonly ActionId[]>;

// Listing page bulk actions — shown in BulkActionsBar when items are selected
export const LISTING_BULK_ACTIONS = {
  products:  [ACTION_ID.ADD_TO_CART, ACTION_ID.ADD_TO_WISHLIST, ACTION_ID.COMPARE],
  auctions:  [ACTION_ID.WATCH_AUCTION, ACTION_ID.ADD_TO_WISHLIST, ACTION_ID.COMPARE],
  preorders: [ACTION_ID.ADD_TO_CART, ACTION_ID.ADD_TO_WISHLIST, ACTION_ID.COMPARE],
  stores:    [ACTION_ID.COMPARE] as ActionId[],
} as const satisfies Record<string, readonly ActionId[]>;

/** Maximum number of items the Compare overlay (BK3) supports at once. */
export const COMPARE_MAX_ITEMS = 4;

// ─────────────────────────────────────────────────────────────────────────────
// § 2  Row / table actions
//      Used by: RowActionMenu in admin, seller, and user dashboard tables
// ─────────────────────────────────────────────────────────────────────────────

export const ROW_ACTION_ID = {
  EDIT:      "row-edit",
  VIEW:      "row-view",
  DELETE:    "row-delete",
  APPROVE:   "row-approve",
  REJECT:    "row-reject",
  SUSPEND:   "row-suspend",
  RESTORE:   "row-restore",
  MANAGE:    "row-manage",
  DUPLICATE: "row-duplicate",
  EXPORT:    "row-export",
  TRACK:     "row-track",
  CANCEL:    "row-cancel",
  REFUND:    "row-refund",
  RESEND:    "row-resend",
  REPLY:     "row-reply",
  PUBLISH:   "row-publish",
  ARCHIVE:   "row-archive",
} as const;

export type RowActionId = (typeof ROW_ACTION_ID)[keyof typeof ROW_ACTION_ID];

export interface RowActionMeta {
  id: RowActionId;
  /** Menu item label */
  label: string;
  /** Lucide icon name */
  iconName?: string;
  /** When true, item renders in red (destructive) in RowActionMenu */
  destructive?: boolean;
  /** Adds a separator above this item in the dropdown */
  separator?: boolean;
}

export const ROW_ACTION_META: Record<RowActionId, RowActionMeta> = {
  [ROW_ACTION_ID.EDIT]:      { id: ROW_ACTION_ID.EDIT,      label: "Edit",           iconName: "Pencil"      },
  [ROW_ACTION_ID.VIEW]:      { id: ROW_ACTION_ID.VIEW,      label: "View",           iconName: "Eye"         },
  [ROW_ACTION_ID.DELETE]:    { id: ROW_ACTION_ID.DELETE,    label: "Delete",         iconName: "Trash2",     destructive: true, separator: true },
  [ROW_ACTION_ID.APPROVE]:   { id: ROW_ACTION_ID.APPROVE,   label: "Approve",        iconName: "Check"       },
  [ROW_ACTION_ID.REJECT]:    { id: ROW_ACTION_ID.REJECT,    label: "Reject",         iconName: "X",          destructive: true  },
  [ROW_ACTION_ID.SUSPEND]:   { id: ROW_ACTION_ID.SUSPEND,   label: "Suspend",        iconName: "Ban",        destructive: true, separator: true },
  [ROW_ACTION_ID.RESTORE]:   { id: ROW_ACTION_ID.RESTORE,   label: "Restore",        iconName: "RotateCcw"  },
  [ROW_ACTION_ID.MANAGE]:    { id: ROW_ACTION_ID.MANAGE,    label: "Manage",         iconName: "Settings"   },
  [ROW_ACTION_ID.DUPLICATE]: { id: ROW_ACTION_ID.DUPLICATE, label: "Duplicate",      iconName: "Copy"       },
  [ROW_ACTION_ID.EXPORT]:    { id: ROW_ACTION_ID.EXPORT,    label: "Export",         iconName: "Download"   },
  [ROW_ACTION_ID.TRACK]:     { id: ROW_ACTION_ID.TRACK,     label: "Track Shipment", iconName: "Truck"      },
  [ROW_ACTION_ID.CANCEL]:    { id: ROW_ACTION_ID.CANCEL,    label: "Cancel",         iconName: "X",          destructive: true  },
  [ROW_ACTION_ID.REFUND]:    { id: ROW_ACTION_ID.REFUND,    label: "Refund",         iconName: "RefreshCw",  destructive: true, separator: true },
  [ROW_ACTION_ID.RESEND]:    { id: ROW_ACTION_ID.RESEND,    label: "Resend",         iconName: "Send"       },
  [ROW_ACTION_ID.REPLY]:     { id: ROW_ACTION_ID.REPLY,     label: "Reply",          iconName: "MessageSquare" },
  [ROW_ACTION_ID.PUBLISH]:   { id: ROW_ACTION_ID.PUBLISH,   label: "Publish",        iconName: "Upload"     },
  [ROW_ACTION_ID.ARCHIVE]:   { id: ROW_ACTION_ID.ARCHIVE,   label: "Archive",        iconName: "Archive",    separator: true    },
};

// Admin dashboard row action groups per entity type
export const ADMIN_ROW_ACTIONS = {
  users:    [ROW_ACTION_ID.VIEW, ROW_ACTION_ID.EDIT, ROW_ACTION_ID.SUSPEND, ROW_ACTION_ID.RESTORE, ROW_ACTION_ID.DELETE],
  stores:   [ROW_ACTION_ID.MANAGE, ROW_ACTION_ID.APPROVE, ROW_ACTION_ID.REJECT, ROW_ACTION_ID.SUSPEND, ROW_ACTION_ID.DELETE],
  products: [ROW_ACTION_ID.VIEW, ROW_ACTION_ID.EDIT, ROW_ACTION_ID.PUBLISH, ROW_ACTION_ID.ARCHIVE, ROW_ACTION_ID.DELETE],
  orders:   [ROW_ACTION_ID.VIEW, ROW_ACTION_ID.EDIT, ROW_ACTION_ID.REFUND, ROW_ACTION_ID.CANCEL],
  reviews:  [ROW_ACTION_ID.VIEW, ROW_ACTION_ID.APPROVE, ROW_ACTION_ID.REJECT, ROW_ACTION_ID.DELETE],
  events:   [ROW_ACTION_ID.VIEW, ROW_ACTION_ID.EDIT, ROW_ACTION_ID.ARCHIVE, ROW_ACTION_ID.DELETE],
  payouts:  [ROW_ACTION_ID.VIEW, ROW_ACTION_ID.APPROVE, ROW_ACTION_ID.REJECT],
  coupons:  [ROW_ACTION_ID.EDIT, ROW_ACTION_ID.DUPLICATE, ROW_ACTION_ID.ARCHIVE, ROW_ACTION_ID.DELETE],
  blog:     [ROW_ACTION_ID.VIEW, ROW_ACTION_ID.EDIT, ROW_ACTION_ID.PUBLISH, ROW_ACTION_ID.ARCHIVE, ROW_ACTION_ID.DELETE],
  faqs:     [ROW_ACTION_ID.EDIT, ROW_ACTION_ID.ARCHIVE, ROW_ACTION_ID.DELETE],
  bids:     [ROW_ACTION_ID.VIEW, ROW_ACTION_ID.CANCEL],
} as const satisfies Record<string, readonly RowActionId[]>;

// Seller / Store dashboard row action groups per entity type
export const SELLER_ROW_ACTIONS = {
  products:  [ROW_ACTION_ID.VIEW, ROW_ACTION_ID.EDIT, ROW_ACTION_ID.DUPLICATE, ROW_ACTION_ID.ARCHIVE, ROW_ACTION_ID.DELETE],
  orders:    [ROW_ACTION_ID.VIEW, ROW_ACTION_ID.EDIT, ROW_ACTION_ID.TRACK, ROW_ACTION_ID.RESEND],
  reviews:   [ROW_ACTION_ID.VIEW, ROW_ACTION_ID.REPLY],
  payouts:   [ROW_ACTION_ID.VIEW, ROW_ACTION_ID.EXPORT],
  coupons:   [ROW_ACTION_ID.EDIT, ROW_ACTION_ID.DUPLICATE, ROW_ACTION_ID.DELETE],
  bids:      [ROW_ACTION_ID.VIEW],
  addresses: [ROW_ACTION_ID.EDIT, ROW_ACTION_ID.DELETE],
} as const satisfies Record<string, readonly RowActionId[]>;

// User dashboard row action groups per entity type
export const USER_ROW_ACTIONS = {
  orders:    [ROW_ACTION_ID.VIEW, ROW_ACTION_ID.TRACK, ROW_ACTION_ID.CANCEL],
  addresses: [ROW_ACTION_ID.EDIT, ROW_ACTION_ID.DELETE],
  bids:      [ROW_ACTION_ID.VIEW, ROW_ACTION_ID.CANCEL],
} as const satisfies Record<string, readonly RowActionId[]>;

// ─────────────────────────────────────────────────────────────────────────────
// § 3  Form actions
//      Used by: FormShell, DrawerFormFooter, SideModal forms, inline forms
// ─────────────────────────────────────────────────────────────────────────────

export const FORM_ACTION_ID = {
  SUBMIT:     "form-submit",
  CANCEL:     "form-cancel",
  RESET:      "form-reset",
  SAVE_DRAFT: "form-save-draft",
  PUBLISH:    "form-publish",
  DELETE:     "form-delete",
  DISCARD:    "form-discard",
} as const;

export type FormActionId = (typeof FORM_ACTION_ID)[keyof typeof FORM_ACTION_ID];

export interface FormActionMeta {
  id: FormActionId;
  /** Default button label — callers may override via a `labels` prop */
  label: string;
  variant: ActionVariant;
  /** HTML button type */
  type: "submit" | "button" | "reset";
  iconName?: string;
  /** When true, the action is considered destructive (visual hint for callers) */
  destructive?: boolean;
}

export const FORM_ACTION_META: Record<FormActionId, FormActionMeta> = {
  [FORM_ACTION_ID.SUBMIT]:     { id: FORM_ACTION_ID.SUBMIT,     label: "Save Changes", variant: "primary",  type: "submit"                              },
  [FORM_ACTION_ID.CANCEL]:     { id: FORM_ACTION_ID.CANCEL,     label: "Cancel",       variant: "outline",  type: "button"                              },
  [FORM_ACTION_ID.RESET]:      { id: FORM_ACTION_ID.RESET,      label: "Reset",        variant: "ghost",    type: "reset"                               },
  [FORM_ACTION_ID.SAVE_DRAFT]: { id: FORM_ACTION_ID.SAVE_DRAFT, label: "Save Draft",   variant: "outline",  type: "button", iconName: "Save"            },
  [FORM_ACTION_ID.PUBLISH]:    { id: FORM_ACTION_ID.PUBLISH,    label: "Publish",      variant: "primary",  type: "button", iconName: "Upload"          },
  [FORM_ACTION_ID.DELETE]:     { id: FORM_ACTION_ID.DELETE,     label: "Delete",       variant: "danger",   type: "button", iconName: "Trash2",         destructive: true },
  [FORM_ACTION_ID.DISCARD]:    { id: FORM_ACTION_ID.DISCARD,    label: "Discard",      variant: "ghost",    type: "button",                             destructive: true },
};

/**
 * Preset ordered action groups for common form footer layouts.
 * Consumed by FormShell and DrawerFormFooter to determine which buttons render,
 * in which order (left → right).
 */
export const FORM_FOOTER_PRESET = {
  /** Standard edit drawer: Cancel | Save Changes */
  drawerEdit:       [FORM_ACTION_ID.CANCEL, FORM_ACTION_ID.SUBMIT],
  /** Edit drawer with delete: Delete | Cancel | Save Changes */
  drawerEditDelete: [FORM_ACTION_ID.DELETE, FORM_ACTION_ID.CANCEL, FORM_ACTION_ID.SUBMIT],
  /** Content editor (blog / product): Discard | Save Draft | Publish */
  contentEditor:    [FORM_ACTION_ID.DISCARD, FORM_ACTION_ID.SAVE_DRAFT, FORM_ACTION_ID.PUBLISH],
  /** Simple modal / dialog: Cancel | Submit */
  modalForm:        [FORM_ACTION_ID.CANCEL, FORM_ACTION_ID.SUBMIT],
  /** Settings page: Reset | Save Changes */
  settingsForm:     [FORM_ACTION_ID.RESET, FORM_ACTION_ID.SUBMIT],
} as const satisfies Record<string, readonly FormActionId[]>;

// ─────────────────────────────────────────────────────────────────────────────
// § 4  Dashboard quick actions
//      Top-of-page shortcut buttons, one group per dashboard context
// ─────────────────────────────────────────────────────────────────────────────

export const DASHBOARD_QUICK_ACTION_ID = {
  // Admin
  ADMIN_ADD_PRODUCT:  "dqa-admin-add-product",
  ADMIN_ADD_USER:     "dqa-admin-add-user",
  ADMIN_ADD_STORE:    "dqa-admin-add-store",
  ADMIN_ADD_COUPON:   "dqa-admin-add-coupon",
  ADMIN_ADD_EVENT:    "dqa-admin-add-event",
  ADMIN_ADD_BLOG:     "dqa-admin-add-blog",
  ADMIN_ADD_FAQ:      "dqa-admin-add-faq",
  ADMIN_SETTINGS:     "dqa-admin-settings",
  // Seller / Store
  SELLER_ADD_PRODUCT: "dqa-seller-add-product",
  SELLER_ADD_COUPON:  "dqa-seller-add-coupon",
  SELLER_VIEW_ORDERS: "dqa-seller-view-orders",
  SELLER_PAYOUT_REQ:  "dqa-seller-payout-request",
  SELLER_SETTINGS:    "dqa-seller-settings",
  // User / Buyer
  USER_VIEW_ORDERS:   "dqa-user-view-orders",
  USER_VIEW_WISHLIST: "dqa-user-view-wishlist",
  USER_EDIT_PROFILE:  "dqa-user-edit-profile",
  USER_ADD_ADDRESS:   "dqa-user-add-address",
} as const;

export type DashboardQuickActionId = (typeof DASHBOARD_QUICK_ACTION_ID)[keyof typeof DASHBOARD_QUICK_ACTION_ID];

export interface DashboardQuickActionMeta {
  id: DashboardQuickActionId;
  label: string;
  variant: ActionVariant;
  iconName?: string;
  /** ROUTES key path that the button navigates to — consuming component resolves */
  routeKey?: string;
}

export const DASHBOARD_QUICK_ACTION_META: Record<DashboardQuickActionId, DashboardQuickActionMeta> = {
  [DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_PRODUCT]:  { id: DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_PRODUCT,  label: "Add Product",    variant: "primary",   iconName: "Plus"          },
  [DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_USER]:     { id: DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_USER,     label: "Add User",       variant: "outline",   iconName: "UserPlus"      },
  [DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_STORE]:    { id: DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_STORE,    label: "Add Store",      variant: "outline",   iconName: "Store"         },
  [DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_COUPON]:   { id: DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_COUPON,   label: "Add Coupon",     variant: "outline",   iconName: "Tag"           },
  [DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_EVENT]:    { id: DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_EVENT,    label: "Add Event",      variant: "outline",   iconName: "Calendar"      },
  [DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_BLOG]:     { id: DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_BLOG,     label: "New Post",       variant: "outline",   iconName: "FileText"      },
  [DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_FAQ]:      { id: DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_FAQ,      label: "Add FAQ",        variant: "outline",   iconName: "HelpCircle"    },
  [DASHBOARD_QUICK_ACTION_ID.ADMIN_SETTINGS]:     { id: DASHBOARD_QUICK_ACTION_ID.ADMIN_SETTINGS,     label: "Settings",       variant: "ghost",     iconName: "Settings"      },
  [DASHBOARD_QUICK_ACTION_ID.SELLER_ADD_PRODUCT]: { id: DASHBOARD_QUICK_ACTION_ID.SELLER_ADD_PRODUCT, label: "List a Product", variant: "primary",   iconName: "Plus"          },
  [DASHBOARD_QUICK_ACTION_ID.SELLER_ADD_COUPON]:  { id: DASHBOARD_QUICK_ACTION_ID.SELLER_ADD_COUPON,  label: "New Coupon",     variant: "outline",   iconName: "Tag"           },
  [DASHBOARD_QUICK_ACTION_ID.SELLER_VIEW_ORDERS]: { id: DASHBOARD_QUICK_ACTION_ID.SELLER_VIEW_ORDERS, label: "Orders",         variant: "outline",   iconName: "ShoppingBag"   },
  [DASHBOARD_QUICK_ACTION_ID.SELLER_PAYOUT_REQ]:  { id: DASHBOARD_QUICK_ACTION_ID.SELLER_PAYOUT_REQ,  label: "Request Payout", variant: "outline",   iconName: "Banknote"      },
  [DASHBOARD_QUICK_ACTION_ID.SELLER_SETTINGS]:    { id: DASHBOARD_QUICK_ACTION_ID.SELLER_SETTINGS,    label: "Store Settings", variant: "ghost",     iconName: "Settings"      },
  [DASHBOARD_QUICK_ACTION_ID.USER_VIEW_ORDERS]:   { id: DASHBOARD_QUICK_ACTION_ID.USER_VIEW_ORDERS,   label: "My Orders",      variant: "outline",   iconName: "Package"       },
  [DASHBOARD_QUICK_ACTION_ID.USER_VIEW_WISHLIST]: { id: DASHBOARD_QUICK_ACTION_ID.USER_VIEW_WISHLIST, label: "Wishlist",       variant: "outline",   iconName: "Heart"         },
  [DASHBOARD_QUICK_ACTION_ID.USER_EDIT_PROFILE]:  { id: DASHBOARD_QUICK_ACTION_ID.USER_EDIT_PROFILE,  label: "Edit Profile",   variant: "outline",   iconName: "User"          },
  [DASHBOARD_QUICK_ACTION_ID.USER_ADD_ADDRESS]:   { id: DASHBOARD_QUICK_ACTION_ID.USER_ADD_ADDRESS,   label: "Add Address",    variant: "outline",   iconName: "MapPin"        },
};

// Quick action groups — ordered left-to-right in the top shortcut bar
export const DASHBOARD_QUICK_ACTIONS = {
  admin: [
    DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_PRODUCT,
    DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_USER,
    DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_STORE,
    DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_COUPON,
    DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_EVENT,
    DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_BLOG,
    DASHBOARD_QUICK_ACTION_ID.ADMIN_SETTINGS,
  ],
  seller: [
    DASHBOARD_QUICK_ACTION_ID.SELLER_ADD_PRODUCT,
    DASHBOARD_QUICK_ACTION_ID.SELLER_ADD_COUPON,
    DASHBOARD_QUICK_ACTION_ID.SELLER_VIEW_ORDERS,
    DASHBOARD_QUICK_ACTION_ID.SELLER_PAYOUT_REQ,
    DASHBOARD_QUICK_ACTION_ID.SELLER_SETTINGS,
  ],
  user: [
    DASHBOARD_QUICK_ACTION_ID.USER_VIEW_ORDERS,
    DASHBOARD_QUICK_ACTION_ID.USER_VIEW_WISHLIST,
    DASHBOARD_QUICK_ACTION_ID.USER_EDIT_PROFILE,
    DASHBOARD_QUICK_ACTION_ID.USER_ADD_ADDRESS,
  ],
} as const satisfies Record<string, readonly DashboardQuickActionId[]>;

// Admin bulk actions per listing entity — used in BulkActionsBar on admin tables
export const ADMIN_BULK_ACTIONS = {
  users:    [ROW_ACTION_ID.SUSPEND, ROW_ACTION_ID.RESTORE, ROW_ACTION_ID.DELETE],
  stores:   [ROW_ACTION_ID.APPROVE, ROW_ACTION_ID.REJECT, ROW_ACTION_ID.SUSPEND],
  products: [ROW_ACTION_ID.PUBLISH, ROW_ACTION_ID.ARCHIVE, ROW_ACTION_ID.DELETE],
  orders:   [ROW_ACTION_ID.REFUND, ROW_ACTION_ID.CANCEL],
  reviews:  [ROW_ACTION_ID.APPROVE, ROW_ACTION_ID.REJECT, ROW_ACTION_ID.DELETE],
  blog:     [ROW_ACTION_ID.PUBLISH, ROW_ACTION_ID.ARCHIVE, ROW_ACTION_ID.DELETE],
  faqs:     [ROW_ACTION_ID.ARCHIVE, ROW_ACTION_ID.DELETE],
} as const satisfies Record<string, readonly RowActionId[]>;

// Seller bulk actions per listing entity
export const SELLER_BULK_ACTIONS = {
  products: [ROW_ACTION_ID.PUBLISH, ROW_ACTION_ID.ARCHIVE, ROW_ACTION_ID.DELETE],
  coupons:  [ROW_ACTION_ID.ARCHIVE, ROW_ACTION_ID.DELETE],
} as const satisfies Record<string, readonly RowActionId[]>;
