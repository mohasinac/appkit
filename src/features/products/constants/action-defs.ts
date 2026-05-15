/**
 * action-defs.ts
 *
 * Universal CTA registry for the entire platform.
 * Every action — public marketplace CTAs, dashboard row actions, quick actions — is
 * registered here with auth requirements, RBAC permissions, and enable/disable defaults.
 *
 * Three enforcement layers read from this registry:
 *   Client  — useAuthGate() shows LoginRequiredModal for Tier 1 (public) actions
 *   Server  — checkActionAllowed() enforces the same guards on every server action
 *   Admin   — ActionPermissionsManager toggles defaultEnabled via siteSettings.actionConfig
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
  UNWATCH_AUCTION:      "unwatch-auction",
  // Pre-order
  RESERVE_NOW:          "reserve-now",
  CANCEL_RESERVATION:   "cancel-reservation",
  // ── Checkout / navigation CTAs ───────────────────────────────────────────
  CHECKOUT:             "checkout",
  ENTER_PRIZE_DRAW:     "enter-prize-draw",
  ENTER_RAFFLE:         "enter-raffle",
  REPORT_LISTING:       "report-listing",
  FOLLOW_STORE:         "follow-store",
  // ── Reviews & social ─────────────────────────────────────────────────────
  WRITE_REVIEW:         "write-review",
  MESSAGE_SELLER:       "message-seller",
  // ── Seller (public-facing CTAs on store/product pages) ───────────────────
  BECOME_SELLER:        "become-seller",
  REQUEST_PAYOUT:       "request-payout",
  RESPOND_TO_REVIEW:    "respond-to-review",
  // ── User account actions ─────────────────────────────────────────────────
  CANCEL_ORDER:         "cancel-order",
  REQUEST_RETURN:       "request-return",
  REORDER:              "reorder",
  TRACK_ORDER:          "track-order",
  EDIT_PROFILE:         "edit-profile",
  ADD_ADDRESS:          "add-address",
  EDIT_ADDRESS:         "edit-address",
  DELETE_ADDRESS:       "delete-address",
  CHANGE_PASSWORD:      "change-password",
  DELETE_ACCOUNT:       "delete-account",
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
  /**
   * Tier 1: shows LoginRequiredModal on public pages if user is not signed in.
   * Server action also enforces via checkActionAllowed().
   */
  requiresAuth?: boolean;
  /** Message shown in LoginRequiredModal. Required when requiresAuth=true. */
  authMessage?: string;
  /**
   * RBAC permission key required to use this action.
   * If set, user must have this permission in addition to being signed in.
   * Uses the 85+ permission keys from the RBAC system.
   * Example: "products.create", "orders.refund", "admin.users.suspend"
   */
  requiredPermission?: string;
  /**
   * Whether this action is enabled by default.
   * Can be overridden at runtime via siteSettings.actionConfig[actionId].enabled.
   * Defaults to true when omitted.
   */
  defaultEnabled?: boolean;
}

export const ACTION_META: Record<ActionId, ActionMeta> = {
  [ACTION_ID.BUY_NOW]:              { id: ACTION_ID.BUY_NOW,              label: "Buy Now",              variant: "primary",   requiresAuth: true,  authMessage: "You need to be signed in to purchase items."                   },
  [ACTION_ID.ADD_TO_CART]:          { id: ACTION_ID.ADD_TO_CART,          label: "Add to Cart",          variant: "secondary", iconName: "ShoppingCart"                                                                          },
  [ACTION_ID.ADD_TO_WISHLIST]:      { id: ACTION_ID.ADD_TO_WISHLIST,      label: "Add to Wishlist",      variant: "ghost",     iconName: "Heart",    requiresAuth: true,  authMessage: "You need to be signed in to save items to your wishlist." },
  [ACTION_ID.REMOVE_FROM_WISHLIST]: { id: ACTION_ID.REMOVE_FROM_WISHLIST, label: "Remove from Wishlist", variant: "ghost",     iconName: "HeartOff", requiresAuth: true,  authMessage: "You need to be signed in to manage your wishlist."         },
  [ACTION_ID.MAKE_OFFER]:           { id: ACTION_ID.MAKE_OFFER,           label: "Make an Offer",        variant: "outline",   iconName: "Tag",      requiresAuth: true,  authMessage: "You need to be signed in to make an offer."               },
  [ACTION_ID.SHARE]:                { id: ACTION_ID.SHARE,                label: "Share",                variant: "ghost",     iconName: "Share2"                                                                                },
  [ACTION_ID.COMPARE]:              { id: ACTION_ID.COMPARE,              label: "Compare",              variant: "secondary", iconName: "Columns"                                                                               },
  [ACTION_ID.PLACE_BID]:            { id: ACTION_ID.PLACE_BID,            label: "Place Bid",            variant: "primary",   requiresAuth: true,  authMessage: "You need to be signed in to place a bid."                      },
  [ACTION_ID.BUY_NOW_AUCTION]:      { id: ACTION_ID.BUY_NOW_AUCTION,      label: "Buy Now",              variant: "secondary", requiresAuth: true,  authMessage: "You need to be signed in to purchase items."                   },
  [ACTION_ID.WATCH_AUCTION]:        { id: ACTION_ID.WATCH_AUCTION,        label: "Watch",                variant: "ghost",     iconName: "Eye",      requiresAuth: true,  authMessage: "You need to be signed in to watch auctions."              },
  [ACTION_ID.UNWATCH_AUCTION]:      { id: ACTION_ID.UNWATCH_AUCTION,      label: "Unwatch",              variant: "ghost",     iconName: "EyeOff",   requiresAuth: true,  authMessage: "You need to be signed in to manage your watchlist."        },
  [ACTION_ID.RESERVE_NOW]:          { id: ACTION_ID.RESERVE_NOW,          label: "Reserve Now",          variant: "primary",   requiresAuth: true,  authMessage: "You need to be signed in to reserve a pre-order."              },
  [ACTION_ID.CANCEL_RESERVATION]:   { id: ACTION_ID.CANCEL_RESERVATION,   label: "Cancel Reservation",   variant: "danger",    iconName: "X",        requiresAuth: true,  authMessage: "You need to be signed in to cancel a reservation."         },
  // ── Checkout / navigation CTAs ────────────────────────────────────────────
  [ACTION_ID.CHECKOUT]:             { id: ACTION_ID.CHECKOUT,             label: "Checkout",             variant: "primary",   requiresAuth: true,  authMessage: "You need to be signed in to checkout."                         },
  [ACTION_ID.ENTER_PRIZE_DRAW]:     { id: ACTION_ID.ENTER_PRIZE_DRAW,     label: "Enter Draw",           variant: "primary",   requiresAuth: true,  authMessage: "You need to be signed in to enter a prize draw."               },
  [ACTION_ID.ENTER_RAFFLE]:         { id: ACTION_ID.ENTER_RAFFLE,         label: "Enter Raffle",         variant: "primary",   requiresAuth: true,  authMessage: "You need to be signed in to enter a raffle."                   },
  [ACTION_ID.REPORT_LISTING]:       { id: ACTION_ID.REPORT_LISTING,       label: "Report Listing",       variant: "ghost",     requiresAuth: true,  authMessage: "You need to be signed in to report a listing."                 },
  [ACTION_ID.FOLLOW_STORE]:         { id: ACTION_ID.FOLLOW_STORE,         label: "Follow Store",         variant: "outline",   requiresAuth: true,  authMessage: "You need to be signed in to follow a store."                   },
  // ── Reviews & social ──────────────────────────────────────────────────────
  [ACTION_ID.WRITE_REVIEW]:         { id: ACTION_ID.WRITE_REVIEW,         label: "Write a Review",       variant: "outline",   requiresAuth: true,  authMessage: "You need to be signed in to write a review."                   },
  [ACTION_ID.MESSAGE_SELLER]:       { id: ACTION_ID.MESSAGE_SELLER,       label: "Message Seller",       variant: "outline",   requiresAuth: true,  authMessage: "You need to be signed in to message a seller."                 },
  // ── Seller CTAs ───────────────────────────────────────────────────────────
  [ACTION_ID.BECOME_SELLER]:        { id: ACTION_ID.BECOME_SELLER,        label: "Apply as Seller",      variant: "primary",   requiresAuth: true,  authMessage: "You need to be signed in to apply as a seller."                },
  [ACTION_ID.REQUEST_PAYOUT]:       { id: ACTION_ID.REQUEST_PAYOUT,       label: "Request Payout",       variant: "outline",   requiresAuth: true,  authMessage: "You need to be signed in to request a payout.",  requiredPermission: "seller.payouts.request"  },
  [ACTION_ID.RESPOND_TO_REVIEW]:    { id: ACTION_ID.RESPOND_TO_REVIEW,    label: "Respond to Review",    variant: "outline",   requiresAuth: true,  authMessage: "You need to be signed in to respond to a review.", requiredPermission: "seller.reviews.respond" },
  // ── User account actions ──────────────────────────────────────────────────
  [ACTION_ID.CANCEL_ORDER]:         { id: ACTION_ID.CANCEL_ORDER,         label: "Cancel Order",         variant: "danger",    requiresAuth: true,  authMessage: "You need to be signed in to cancel an order."                  },
  [ACTION_ID.REQUEST_RETURN]:       { id: ACTION_ID.REQUEST_RETURN,       label: "Request Return",       variant: "outline",   requiresAuth: true,  authMessage: "You need to be signed in to request a return."                 },
  [ACTION_ID.REORDER]:              { id: ACTION_ID.REORDER,              label: "Reorder",              variant: "secondary", requiresAuth: true,  authMessage: "You need to be signed in to reorder."                          },
  [ACTION_ID.TRACK_ORDER]:          { id: ACTION_ID.TRACK_ORDER,          label: "Track Order",          variant: "ghost",     requiresAuth: true,  authMessage: "You need to be signed in to track your order."                 },
  [ACTION_ID.EDIT_PROFILE]:         { id: ACTION_ID.EDIT_PROFILE,         label: "Edit Profile",         variant: "outline",   requiresAuth: true,  authMessage: "You need to be signed in to edit your profile."                },
  [ACTION_ID.ADD_ADDRESS]:          { id: ACTION_ID.ADD_ADDRESS,          label: "Add Address",          variant: "outline",   requiresAuth: true,  authMessage: "You need to be signed in to add an address."                   },
  [ACTION_ID.EDIT_ADDRESS]:         { id: ACTION_ID.EDIT_ADDRESS,         label: "Edit Address",         variant: "ghost",     requiresAuth: true,  authMessage: "You need to be signed in to edit an address."                  },
  [ACTION_ID.DELETE_ADDRESS]:       { id: ACTION_ID.DELETE_ADDRESS,       label: "Delete Address",       variant: "danger",    requiresAuth: true,  authMessage: "You need to be signed in to delete an address."                },
  [ACTION_ID.CHANGE_PASSWORD]:      { id: ACTION_ID.CHANGE_PASSWORD,      label: "Change Password",      variant: "outline",   requiresAuth: true,  authMessage: "You need to be signed in to change your password."             },
  [ACTION_ID.DELETE_ACCOUNT]:       { id: ACTION_ID.DELETE_ACCOUNT,       label: "Delete Account",       variant: "danger",    requiresAuth: true,  authMessage: "You need to be signed in to delete your account.",  requiredPermission: "user.account.delete" },
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
  auctions:  [ACTION_ID.WATCH_AUCTION, ACTION_ID.UNWATCH_AUCTION, ACTION_ID.COMPARE],
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
  /** Tier 2: all row actions require auth (role-gated at layout level) */
  requiresAuth: true;
  /** Minimum role required — enforced by RoleGate/ProtectedRoute at layout, NOT useAuthGate */
  requiredRole?: "admin" | "moderator" | "seller" | "user";
  /** RBAC permission key — shown in admin panel next to the toggle */
  requiredPermission?: string;
  /** Whether this row action is enabled by default (admin can toggle via actionConfig) */
  defaultEnabled?: boolean;
}

export const ROW_ACTION_META: Record<RowActionId, RowActionMeta> = {
  [ROW_ACTION_ID.EDIT]:      { id: ROW_ACTION_ID.EDIT,      label: "Edit",           iconName: "Pencil",       requiresAuth: true                                                    },
  [ROW_ACTION_ID.VIEW]:      { id: ROW_ACTION_ID.VIEW,      label: "View",           iconName: "Eye",          requiresAuth: true                                                    },
  [ROW_ACTION_ID.DELETE]:    { id: ROW_ACTION_ID.DELETE,    label: "Delete",         iconName: "Trash2",       requiresAuth: true, destructive: true, separator: true               },
  [ROW_ACTION_ID.APPROVE]:   { id: ROW_ACTION_ID.APPROVE,   label: "Approve",        iconName: "Check",        requiresAuth: true, requiredRole: "admin", requiredPermission: "admin.content.approve" },
  [ROW_ACTION_ID.REJECT]:    { id: ROW_ACTION_ID.REJECT,    label: "Reject",         iconName: "X",            requiresAuth: true, requiredRole: "admin", requiredPermission: "admin.content.approve", destructive: true },
  [ROW_ACTION_ID.SUSPEND]:   { id: ROW_ACTION_ID.SUSPEND,   label: "Suspend",        iconName: "Ban",          requiresAuth: true, requiredRole: "admin", requiredPermission: "admin.users.suspend", destructive: true, separator: true },
  [ROW_ACTION_ID.RESTORE]:   { id: ROW_ACTION_ID.RESTORE,   label: "Restore",        iconName: "RotateCcw",    requiresAuth: true, requiredRole: "admin", requiredPermission: "admin.users.suspend" },
  [ROW_ACTION_ID.MANAGE]:    { id: ROW_ACTION_ID.MANAGE,    label: "Manage",         iconName: "Settings",     requiresAuth: true                                                    },
  [ROW_ACTION_ID.DUPLICATE]: { id: ROW_ACTION_ID.DUPLICATE, label: "Duplicate",      iconName: "Copy",         requiresAuth: true                                                    },
  [ROW_ACTION_ID.EXPORT]:    { id: ROW_ACTION_ID.EXPORT,    label: "Export",         iconName: "Download",     requiresAuth: true                                                    },
  [ROW_ACTION_ID.TRACK]:     { id: ROW_ACTION_ID.TRACK,     label: "Track Shipment", iconName: "Truck",        requiresAuth: true                                                    },
  [ROW_ACTION_ID.CANCEL]:    { id: ROW_ACTION_ID.CANCEL,    label: "Cancel",         iconName: "X",            requiresAuth: true, destructive: true                                 },
  [ROW_ACTION_ID.REFUND]:    { id: ROW_ACTION_ID.REFUND,    label: "Refund",         iconName: "RefreshCw",    requiresAuth: true, requiredRole: "admin", requiredPermission: "admin.orders.refund", destructive: true, separator: true },
  [ROW_ACTION_ID.RESEND]:    { id: ROW_ACTION_ID.RESEND,    label: "Resend",         iconName: "Send",         requiresAuth: true                                                    },
  [ROW_ACTION_ID.REPLY]:     { id: ROW_ACTION_ID.REPLY,     label: "Reply",          iconName: "MessageSquare",requiresAuth: true                                                    },
  [ROW_ACTION_ID.PUBLISH]:   { id: ROW_ACTION_ID.PUBLISH,   label: "Publish",        iconName: "Upload",       requiresAuth: true                                                    },
  [ROW_ACTION_ID.ARCHIVE]:   { id: ROW_ACTION_ID.ARCHIVE,   label: "Archive",        iconName: "Archive",      requiresAuth: true, separator: true                                   },
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

export const FORM_FOOTER_PRESET = {
  drawerEdit:       [FORM_ACTION_ID.CANCEL, FORM_ACTION_ID.SUBMIT],
  drawerEditDelete: [FORM_ACTION_ID.DELETE, FORM_ACTION_ID.CANCEL, FORM_ACTION_ID.SUBMIT],
  contentEditor:    [FORM_ACTION_ID.DISCARD, FORM_ACTION_ID.SAVE_DRAFT, FORM_ACTION_ID.PUBLISH],
  modalForm:        [FORM_ACTION_ID.CANCEL, FORM_ACTION_ID.SUBMIT],
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
  /** All dashboard quick actions require auth (role-gated at layout level) */
  requiresAuth: true;
  /** Minimum role required — enforced by RoleGate/ProtectedRoute at layout */
  requiredRole?: "admin" | "moderator" | "seller" | "user";
  /** RBAC permission key — shown in admin panel next to the toggle */
  requiredPermission?: string;
  /** Whether this quick action is enabled by default */
  defaultEnabled?: boolean;
}

export const DASHBOARD_QUICK_ACTION_META: Record<DashboardQuickActionId, DashboardQuickActionMeta> = {
  [DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_PRODUCT]:  { id: DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_PRODUCT,  label: "Add Product",    variant: "primary",  iconName: "Plus",         requiresAuth: true, requiredRole: "admin",  requiredPermission: "products.create" },
  [DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_USER]:     { id: DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_USER,     label: "Add User",       variant: "outline",  iconName: "UserPlus",     requiresAuth: true, requiredRole: "admin",  requiredPermission: "admin.users.create" },
  [DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_STORE]:    { id: DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_STORE,    label: "Add Store",      variant: "outline",  iconName: "Store",        requiresAuth: true, requiredRole: "admin",  requiredPermission: "admin.stores.create" },
  [DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_COUPON]:   { id: DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_COUPON,   label: "Add Coupon",     variant: "outline",  iconName: "Tag",          requiresAuth: true, requiredRole: "admin",  requiredPermission: "coupons.create" },
  [DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_EVENT]:    { id: DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_EVENT,    label: "Add Event",      variant: "outline",  iconName: "Calendar",     requiresAuth: true, requiredRole: "admin",  requiredPermission: "events.create" },
  [DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_BLOG]:     { id: DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_BLOG,     label: "New Post",       variant: "outline",  iconName: "FileText",     requiresAuth: true, requiredRole: "admin",  requiredPermission: "blog.create" },
  [DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_FAQ]:      { id: DASHBOARD_QUICK_ACTION_ID.ADMIN_ADD_FAQ,      label: "Add FAQ",        variant: "outline",  iconName: "HelpCircle",   requiresAuth: true, requiredRole: "admin",  requiredPermission: "faqs.create" },
  [DASHBOARD_QUICK_ACTION_ID.ADMIN_SETTINGS]:     { id: DASHBOARD_QUICK_ACTION_ID.ADMIN_SETTINGS,     label: "Settings",       variant: "ghost",    iconName: "Settings",     requiresAuth: true, requiredRole: "admin",  requiredPermission: "admin.settings.read" },
  [DASHBOARD_QUICK_ACTION_ID.SELLER_ADD_PRODUCT]: { id: DASHBOARD_QUICK_ACTION_ID.SELLER_ADD_PRODUCT, label: "List a Product", variant: "primary",  iconName: "Plus",         requiresAuth: true, requiredRole: "seller", requiredPermission: "products.create" },
  [DASHBOARD_QUICK_ACTION_ID.SELLER_ADD_COUPON]:  { id: DASHBOARD_QUICK_ACTION_ID.SELLER_ADD_COUPON,  label: "New Coupon",     variant: "outline",  iconName: "Tag",          requiresAuth: true, requiredRole: "seller", requiredPermission: "coupons.create" },
  [DASHBOARD_QUICK_ACTION_ID.SELLER_VIEW_ORDERS]: { id: DASHBOARD_QUICK_ACTION_ID.SELLER_VIEW_ORDERS, label: "Orders",         variant: "outline",  iconName: "ShoppingBag",  requiresAuth: true, requiredRole: "seller" },
  [DASHBOARD_QUICK_ACTION_ID.SELLER_PAYOUT_REQ]:  { id: DASHBOARD_QUICK_ACTION_ID.SELLER_PAYOUT_REQ,  label: "Request Payout", variant: "outline",  iconName: "Banknote",     requiresAuth: true, requiredRole: "seller", requiredPermission: "seller.payouts.request" },
  [DASHBOARD_QUICK_ACTION_ID.SELLER_SETTINGS]:    { id: DASHBOARD_QUICK_ACTION_ID.SELLER_SETTINGS,    label: "Store Settings", variant: "ghost",    iconName: "Settings",     requiresAuth: true, requiredRole: "seller" },
  [DASHBOARD_QUICK_ACTION_ID.USER_VIEW_ORDERS]:   { id: DASHBOARD_QUICK_ACTION_ID.USER_VIEW_ORDERS,   label: "My Orders",      variant: "outline",  iconName: "Package",      requiresAuth: true, requiredRole: "user" },
  [DASHBOARD_QUICK_ACTION_ID.USER_VIEW_WISHLIST]: { id: DASHBOARD_QUICK_ACTION_ID.USER_VIEW_WISHLIST, label: "Wishlist",       variant: "outline",  iconName: "Heart",        requiresAuth: true, requiredRole: "user" },
  [DASHBOARD_QUICK_ACTION_ID.USER_EDIT_PROFILE]:  { id: DASHBOARD_QUICK_ACTION_ID.USER_EDIT_PROFILE,  label: "Edit Profile",   variant: "outline",  iconName: "User",         requiresAuth: true, requiredRole: "user" },
  [DASHBOARD_QUICK_ACTION_ID.USER_ADD_ADDRESS]:   { id: DASHBOARD_QUICK_ACTION_ID.USER_ADD_ADDRESS,   label: "Add Address",    variant: "outline",  iconName: "MapPin",       requiresAuth: true, requiredRole: "user" },
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
