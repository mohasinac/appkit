/**
 * CTA Action Registry — SB-UNI-W-1 shell (foundation only) 2026-05-13.
 *
 * Single source of truth for every CTA label, aria-label, permission, scope
 * and confirmation across the app. Phase 7 W-2..W-4 sweeps the existing
 * UI to consume `action(...)` references instead of inline strings.
 *
 * Shape (per spec):
 *   ACTIONS.{RESOURCE}.{actionId}: ActionDef
 *
 * Helpers:
 *   action(resource, id)          → ActionDef | null
 *   canPerformAction(actionDef, role) → boolean (permission gate)
 *   actionsForListingType(scope)  → ActionDef[] (filter by listingTypeScope)
 *   actionLabel(actionDef)        → resolved label (LabelsProvider override hook)
 *
 * Extended <Button action={...}> in `ui/components/Button.tsx` is the W-1
 * cohort's other half — wire to it when the consumer surfaces start
 * adopting actions in W-2..W-4.
 *
 * This file ships the SHELL only — the per-resource action leaves are
 * intentionally sparse so the W-2..W-4 sweeps can fill them surface-by-
 * surface without merge churn here.
 */

import type { UserRole } from "../../../features/auth/types";
import type { ListingType } from "../../../features/products/types/index";
import type { CategoryType } from "../../../features/categories/types/index";

// ─── Action types ────────────────────────────────────────────────────────────

/** What KIND of action — drives default UI affordance (link vs button vs danger). */
export type ActionKind =
  | "primary"
  | "secondary"
  | "danger"
  | "ghost"
  | "link"
  | "chip";

/** Resource bucket — keyed top-level in the ACTIONS tree. */
export type ActionResource =
  | "PRODUCT"
  | "AUCTION"
  | "PRE_ORDER"
  | "PRIZE_DRAW"
  | "CLASSIFIED"
  | "DIGITAL_CODE"
  | "LIVE"
  | "BUNDLE"
  | "GROUP"
  | "CATEGORY"
  | "BRAND"
  | "SUBLISTING"
  | "STORE"
  | "BLOG"
  | "EVENT"
  | "USER"
  | "SELLER"
  | "ADMIN"
  | "CART"
  | "CHECKOUT"
  | "NAV"
  | "MEDIA"
  | "SUPPORT";

/** Confirmation modal config — when set, <Button action={...}> opens
 *  a confirm dialog before firing the actual handler. */
export interface ActionConfirmation {
  /** Title shown in the confirm dialog. */
  title: string;
  /** Body shown in the confirm dialog. */
  body: string;
  /** Confirm button label. */
  confirmLabel: string;
  /** Cancel button label (defaults to "Cancel"). */
  cancelLabel?: string;
  /** Visual variant of the confirm button. */
  confirmKind?: ActionKind;
}

/** One CTA registration. */
export interface ActionDef {
  /** Stable id, e.g. "product.add-to-cart". */
  id: string;
  /** User-visible label (English default; i18n overrides land via LabelsProvider). */
  label: string;
  /** Optional aria-label override (defaults to `label`). */
  ariaLabel?: string;
  /** One-line semantic comment — surfaces in dev tooling + audit reports. */
  description: string;
  /** Affordance hint. */
  kind: ActionKind;
  /** Optional target route — useful for Link-style actions. */
  target?: string;
  /** Roles that may perform this action; absent = anyone authed. */
  permissions?: readonly UserRole[];
  /** Listing-type scope — surfaces this action only on these listingTypes. */
  listingTypeScope?: readonly ListingType[];
  /** Category-type scope — same but for category discriminators. */
  categoryTypeScope?: readonly CategoryType[];
  /** Optional icon name (resolved by the consumer's icon set). */
  iconKey?: string;
  /** Optional confirmation modal config. */
  confirmation?: ActionConfirmation;
}

// ─── Registry shape ──────────────────────────────────────────────────────────

export type ActionTree = Record<ActionResource, Record<string, ActionDef>>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Pluck an `ActionDef` by resource + id. Returns null when missing. */
export function action(
  tree: ActionTree,
  resource: ActionResource,
  id: string,
): ActionDef | null {
  const bucket = tree[resource];
  if (!bucket) return null;
  return bucket[id] ?? null;
}

/** Permission gate — returns true when the role may perform the action.
 *  Admin always passes. No `permissions` field = anyone authed passes. */
export function canPerformAction(
  def: ActionDef,
  role: UserRole | undefined,
): boolean {
  if (role === "admin") return true;
  if (!def.permissions || def.permissions.length === 0) {
    return Boolean(role); // anyone authed
  }
  if (!role) return false;
  return def.permissions.includes(role);
}

/** Filter the registry to actions scoped to the given listingType. */
export function actionsForListingType(
  tree: ActionTree,
  listingType: ListingType,
): ActionDef[] {
  const out: ActionDef[] = [];
  for (const bucket of Object.values(tree)) {
    for (const def of Object.values(bucket)) {
      if (!def.listingTypeScope || def.listingTypeScope.includes(listingType)) {
        out.push(def);
      }
    }
  }
  return out;
}

/** Resolve the label — placeholder for LabelsProvider i18n override.
 *  Today returns the English default; Phase 7 wires the override hook. */
export function actionLabel(def: ActionDef): string {
  return def.label;
}

// ─── Sparse seed tree ────────────────────────────────────────────────────────
// Phase 7 W-2..W-4 sweeps fill these out resource-by-resource. The shell
// just establishes the shape + a few "obvious" actions that other Phase 5
// flows can reference today.

export const ACTIONS: ActionTree = {
  PRODUCT: {
    "add-to-cart": {
      id: "product.add-to-cart",
      label: "Add to cart",
      ariaLabel: "Add to cart",
      description: "Add a standard listing to the buyer's cart.",
      kind: "primary",
      listingTypeScope: ["standard", "pre-order", "prize-draw", "digital-code", "live"],
    },
    "buy-now": {
      id: "product.buy-now",
      label: "Buy now",
      description: "Skip cart and head straight to checkout for this listing.",
      kind: "primary",
      listingTypeScope: ["standard", "pre-order"],
    },
    "add-to-wishlist": {
      id: "product.add-to-wishlist",
      label: "Save",
      ariaLabel: "Add to wishlist",
      description: "Bookmark this listing into the buyer's wishlist.",
      kind: "ghost",
    },
    "remove-from-wishlist": {
      id: "product.remove-from-wishlist",
      label: "Saved",
      ariaLabel: "Remove from wishlist",
      description: "Remove this listing from the buyer's wishlist.",
      kind: "ghost",
    },
    "share": {
      id: "product.share",
      label: "Share",
      ariaLabel: "Share this listing",
      description: "Open the native share sheet or copy the listing URL.",
      kind: "ghost",
    },
    "compare": {
      id: "product.compare",
      label: "Compare",
      ariaLabel: "Add to comparison",
      description: "Add this listing to the side-by-side comparison panel.",
      kind: "ghost",
    },
    "make-offer": {
      id: "product.make-offer",
      label: "Make an offer",
      description: "Propose a price to the seller for a classified listing.",
      kind: "secondary",
      listingTypeScope: ["classified"],
    },
  },
  AUCTION: {
    "place-bid": {
      id: "auction.place-bid",
      label: "Place bid",
      description: "Submit a bid on an auction listing.",
      kind: "primary",
      listingTypeScope: ["auction"],
    },
    "buy-it-now": {
      id: "auction.buy-it-now",
      label: "Buy It Now",
      description: "Skip bidding and purchase at the BIN price (SB-UNI-H). Hidden once bidsHaveStarted is true.",
      kind: "secondary",
      listingTypeScope: ["auction"],
    },
    "watch": {
      id: "auction.watch",
      label: "Watch auction",
      ariaLabel: "Watch this auction",
      description: "Subscribe to bid activity and ending-soon alerts for this auction.",
      kind: "ghost",
      listingTypeScope: ["auction"],
    },
    "unwatch": {
      id: "auction.unwatch",
      label: "Watching",
      ariaLabel: "Stop watching this auction",
      description: "Unsubscribe from bid activity alerts for this auction.",
      kind: "ghost",
      listingTypeScope: ["auction"],
    },
  },
  PRE_ORDER: {
    "reserve-now": {
      id: "pre-order.reserve-now",
      label: "Reserve now",
      description: "Lock in a pre-order reservation for this listing.",
      kind: "primary",
      listingTypeScope: ["pre-order"],
    },
    "cancel-reservation": {
      id: "pre-order.cancel-reservation",
      label: "Cancel reservation",
      description: "Cancel the buyer's pre-order reservation.",
      kind: "danger",
      listingTypeScope: ["pre-order"],
      confirmation: {
        title: "Cancel reservation?",
        body: "Your reservation will be released and the spot may be taken by another buyer.",
        confirmLabel: "Cancel reservation",
        confirmKind: "danger",
      },
    },
  },
  PRIZE_DRAW: {
    "enter-draw": {
      id: "prize-draw.enter-draw",
      label: "Enter draw",
      description: "Purchase an entry into the prize draw.",
      kind: "primary",
      listingTypeScope: ["prize-draw"],
    },
    "reveal-code": {
      id: "prize-draw.reveal-code",
      label: "Reveal code",
      description: "Reveal the buyer's prize-draw redemption code.",
      kind: "primary",
      listingTypeScope: ["prize-draw"],
    },
  },
  CLASSIFIED: {
    "contact-seller": {
      id: "classified.contact-seller",
      label: "Contact seller",
      description: "Open a conversations thread with the seller — classified flow (SB-UNI-M).",
      kind: "primary",
      listingTypeScope: ["classified"],
    },
  },
  DIGITAL_CODE: {
    "claim-code": {
      id: "digital-code.claim-code",
      label: "Claim code",
      description: "Purchase and immediately reveal a digital code.",
      kind: "primary",
      listingTypeScope: ["digital-code"],
    },
  },
  LIVE: {
    "inquire": {
      id: "live.inquire",
      label: "Inquire",
      description: "Open a conversation with the seller about a live-item listing.",
      kind: "primary",
      listingTypeScope: ["live"],
    },
  },
  BUNDLE: {
    "add-bundle-to-cart": {
      id: "bundle.add-to-cart",
      label: "Add bundle to cart",
      description: "Add a categoryType:'bundle' to the cart (SB-UNI-Bundle-Checkout).",
      kind: "primary",
      categoryTypeScope: ["bundle"],
    },
  },
  GROUP: {},
  CATEGORY: {},
  BRAND: {},
  SUBLISTING: {},
  STORE: {
    "follow": {
      id: "store.follow",
      label: "Follow",
      ariaLabel: "Follow this store",
      description: "Subscribe to new listing and sale notifications from this store.",
      kind: "secondary",
    },
    "unfollow": {
      id: "store.unfollow",
      label: "Following",
      ariaLabel: "Unfollow this store",
      description: "Unsubscribe from this store's notifications.",
      kind: "ghost",
    },
    "view-all": {
      id: "store.view-all",
      label: "View all",
      ariaLabel: "View all listings from this store",
      description: "Navigate to the full product listing for this store.",
      kind: "link",
    },
    "edit-listing": {
      id: "store.edit-listing",
      label: "Edit",
      ariaLabel: "Edit listing",
      description: "Navigate to the edit form for this store listing.",
      kind: "ghost",
      permissions: ["seller", "admin"],
    },
    "delete-listing": {
      id: "store.delete-listing",
      label: "Delete",
      ariaLabel: "Delete listing",
      description: "Permanently delete this store listing.",
      kind: "danger",
      permissions: ["seller", "admin"],
      confirmation: {
        title: "Delete listing?",
        body: "This listing will be permanently removed. This action cannot be undone.",
        confirmLabel: "Delete listing",
        confirmKind: "danger",
      },
    },
    "publish-listing": {
      id: "store.publish-listing",
      label: "Publish",
      description: "Make this listing visible to buyers.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    "unpublish-listing": {
      id: "store.unpublish-listing",
      label: "Unpublish",
      description: "Hide this listing from buyers.",
      kind: "secondary",
      permissions: ["seller", "admin"],
    },
    "mark-shipped": {
      id: "store.mark-shipped",
      label: "Mark as shipped",
      description: "Update an order status to shipped and enter tracking info.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    "request-payout": {
      id: "store.request-payout",
      label: "Request payout",
      description: "Submit a payout request for available store earnings.",
      kind: "primary",
      permissions: ["seller"],
    },
    "save-changes": {
      id: "store.save-changes",
      label: "Save changes",
      description: "Submit the store listing or settings form.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
  },
  BLOG: {},
  EVENT: {
    "register": {
      id: "event.register",
      label: "Register",
      description: "Register to participate in this event.",
      kind: "primary",
    },
    "cancel-registration": {
      id: "event.cancel-registration",
      label: "Cancel registration",
      description: "Cancel participation in this event.",
      kind: "danger",
      confirmation: {
        title: "Cancel registration?",
        body: "Your spot will be released and you may not be able to re-register if it fills up.",
        confirmLabel: "Yes, cancel",
        confirmKind: "danger",
      },
    },
  },
  USER: {
    "cancel-order": {
      id: "user.cancel-order",
      label: "Cancel Order",
      description: "Cancel a pending or confirmed order.",
      kind: "danger",
      confirmation: {
        title: "Cancel this order?",
        body: "Your order will be cancelled. Refunds are processed within 5–7 business days.",
        confirmLabel: "Cancel order",
        confirmKind: "danger",
      },
    },
    "request-return": {
      id: "user.request-return",
      label: "Request return",
      description: "Raise a return request for a delivered order.",
      kind: "secondary",
    },
    "save-settings": {
      id: "user.save-settings",
      label: "Save changes",
      description: "Submit the user settings form.",
      kind: "primary",
    },
    "send-verification-email": {
      id: "user.send-verification-email",
      label: "Send Verification Email",
      description: "Send a verification link to the new email address.",
      kind: "secondary",
    },
    "update-password": {
      id: "user.update-password",
      label: "Update Password",
      description: "Submit the change-password form.",
      kind: "secondary",
    },
    "delete-address": {
      id: "user.delete-address",
      label: "Delete address",
      ariaLabel: "Delete address",
      description: "Permanently remove a saved delivery address.",
      kind: "danger",
      confirmation: {
        title: "Delete address?",
        body: "This address will be removed and cannot be recovered.",
        confirmLabel: "Delete",
        confirmKind: "danger",
      },
    },
    "set-default-address": {
      id: "user.set-default-address",
      label: "Set as default",
      ariaLabel: "Set as default address",
      description: "Mark this address as the default delivery address.",
      kind: "ghost",
    },
  },
  SELLER: {},
  ADMIN: {
    // ── Product moderation ─────────────────────────────────────────────────
    "approve-product": {
      id: "admin.approve-product",
      label: "Approve",
      ariaLabel: "Approve listing",
      description: "Mark a pending product listing as approved and visible to buyers.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "reject-product": {
      id: "admin.reject-product",
      label: "Reject",
      ariaLabel: "Reject listing",
      description: "Reject a product listing and notify the seller with a reason.",
      kind: "danger",
      permissions: ["admin", "moderator"],
      confirmation: {
        title: "Reject this listing?",
        body: "The listing will be rejected and the seller will be notified. You can restore it later.",
        confirmLabel: "Reject listing",
        confirmKind: "danger",
      },
    },
    // ── User moderation ────────────────────────────────────────────────────
    "ban-user": {
      id: "admin.ban-user",
      label: "Ban user",
      ariaLabel: "Ban this user",
      description: "Soft-ban a user account — blocks login and all marketplace activity.",
      kind: "danger",
      permissions: ["admin", "moderator"],
      confirmation: {
        title: "Ban this user?",
        body: "The user will be blocked from logging in and all marketplace activity. You can lift the ban later.",
        confirmLabel: "Ban user",
        confirmKind: "danger",
      },
    },
    "unban-user": {
      id: "admin.unban-user",
      label: "Lift ban",
      ariaLabel: "Lift ban on this user",
      description: "Remove a soft-ban and restore normal account access.",
      kind: "secondary",
      permissions: ["admin"],
    },
    "verify-vendor": {
      id: "admin.verify-vendor",
      label: "Verify vendor",
      ariaLabel: "Grant verified-vendor status",
      description: "Grant verified-vendor badge to a seller account.",
      kind: "primary",
      permissions: ["admin"],
    },
    "unverify-vendor": {
      id: "admin.unverify-vendor",
      label: "Remove verification",
      ariaLabel: "Revoke verified-vendor status",
      description: "Revoke the verified-vendor badge from a seller account.",
      kind: "secondary",
      permissions: ["admin"],
      confirmation: {
        title: "Remove vendor verification?",
        body: "The verified badge will be removed from this seller's store.",
        confirmLabel: "Remove verification",
        confirmKind: "danger",
      },
    },
    // ── Store moderation ───────────────────────────────────────────────────
    "verify-store": {
      id: "admin.verify-store",
      label: "Verify store",
      ariaLabel: "Verify this store",
      description: "Grant verified status to a store.",
      kind: "primary",
      permissions: ["admin"],
    },
    "suspend-store": {
      id: "admin.suspend-store",
      label: "Suspend store",
      ariaLabel: "Suspend this store",
      description: "Suspend a store — hides all its listings from buyers.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Suspend this store?",
        body: "All listings from this store will be hidden. The seller will be notified.",
        confirmLabel: "Suspend store",
        confirmKind: "danger",
      },
    },
    // ── Review moderation ──────────────────────────────────────────────────
    "approve-review": {
      id: "admin.approve-review",
      label: "Approve",
      ariaLabel: "Approve review",
      description: "Publish a pending product review.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "reject-review": {
      id: "admin.reject-review",
      label: "Reject",
      ariaLabel: "Reject review",
      description: "Reject a product review and prevent it from being shown.",
      kind: "danger",
      permissions: ["admin", "moderator"],
      confirmation: {
        title: "Reject this review?",
        body: "The review will be hidden from the product page.",
        confirmLabel: "Reject review",
        confirmKind: "danger",
      },
    },
    // ── Return request moderation ──────────────────────────────────────────
    "approve-return": {
      id: "admin.approve-return",
      label: "Approve return",
      ariaLabel: "Approve return request",
      description: "Approve a return request and initiate the refund flow.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "reject-return": {
      id: "admin.reject-return",
      label: "Reject return",
      ariaLabel: "Reject return request",
      description: "Reject a return request with a reason.",
      kind: "danger",
      permissions: ["admin", "moderator"],
      confirmation: {
        title: "Reject return request?",
        body: "The return request will be declined and the buyer will be notified.",
        confirmLabel: "Reject return",
        confirmKind: "danger",
      },
    },
    // ── Payout management ──────────────────────────────────────────────────
    "grant-payout": {
      id: "admin.grant-payout",
      label: "Approve payout",
      ariaLabel: "Approve payout request",
      description: "Approve a seller payout request and trigger the transfer.",
      kind: "primary",
      permissions: ["admin"],
    },
    "hold-payout": {
      id: "admin.hold-payout",
      label: "Hold payout",
      ariaLabel: "Put payout on hold",
      description: "Put a payout request on hold pending investigation.",
      kind: "secondary",
      permissions: ["admin"],
      confirmation: {
        title: "Hold this payout?",
        body: "The payout will be paused. The seller will be notified.",
        confirmLabel: "Hold payout",
        confirmKind: "danger",
      },
    },
    // ── Bundle management ──────────────────────────────────────────────────
    "rebuild-bundle": {
      id: "admin.rebuild-bundle",
      label: "Rebuild bundle",
      ariaLabel: "Trigger bundle stock rebuild",
      description: "Recalculate bundle availability from its constituent product stock.",
      kind: "secondary",
      permissions: ["admin"],
    },
    // ── Dev / system ───────────────────────────────────────────────────────
    "reset-seed-data": {
      id: "admin.reset-seed-data",
      label: "Reset seed data",
      ariaLabel: "Clear and re-seed Firestore",
      description: "Delete all seeded documents and reload from seed fixtures. Dev environments only.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Reset all seed data?",
        body: "Every seeded document will be deleted and reloaded from fixtures. This cannot be undone. Only use this in a development environment.",
        confirmLabel: "Reset seed data",
        confirmKind: "danger",
      },
    },
    // ── Generic admin forms ────────────────────────────────────────────────
    "save-changes": {
      id: "admin.save-changes",
      label: "Save changes",
      description: "Submit any admin editor form.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
  },
  CART: {
    "clear-cart": {
      id: "cart.clear",
      label: "Clear cart",
      description: "Remove every item from the buyer's cart.",
      kind: "danger",
      confirmation: {
        title: "Clear your cart?",
        body: "Every item will be removed. This can't be undone.",
        confirmLabel: "Clear cart",
        confirmKind: "danger",
      },
    },
    "remove-item": {
      id: "cart.remove-item",
      label: "Remove",
      ariaLabel: "Remove item from cart",
      description: "Remove a single line item from the cart.",
      kind: "ghost",
    },
    "checkout": {
      id: "cart.checkout",
      label: "Proceed to checkout",
      description: "Navigate from the cart page to the checkout flow.",
      kind: "primary",
    },
    "continue-shopping": {
      id: "cart.continue-shopping",
      label: "Continue shopping",
      description: "Navigate back from the cart to the product catalogue.",
      kind: "ghost",
    },
  },
  CHECKOUT: {
    "place-order": {
      id: "checkout.place-order",
      label: "Place order",
      description: "Submit the order with the chosen payment method.",
      kind: "primary",
    },
  },
  NAV: {
    "sign-in": {
      id: "nav.sign-in",
      label: "Sign in",
      description: "Navigate to the sign-in page.",
      kind: "primary",
    },
    "sign-up": {
      id: "nav.sign-up",
      label: "Sign up",
      description: "Navigate to the registration page.",
      kind: "secondary",
    },
    "sign-out": {
      id: "nav.sign-out",
      label: "Sign out",
      description: "End the current session.",
      kind: "ghost",
      confirmation: {
        title: "Sign out?",
        body: "You'll need to sign back in to access your account.",
        confirmLabel: "Sign out",
      },
    },
  },
  MEDIA: {},
  SUPPORT: {},
};

/** Sugar — `act("PRODUCT", "add-to-cart")` reads more naturally at call sites. */
export function act(resource: ActionResource, id: string): ActionDef | null {
  return action(ACTIONS, resource, id);
}
