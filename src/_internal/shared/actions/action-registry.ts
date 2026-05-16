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
      listingTypeScope: undefined,
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
  SELLER: {
    "edit-listing": {
      id: "seller.edit-listing",
      label: "Edit",
      ariaLabel: "Edit listing",
      description: "Navigate to the edit form for this seller listing.",
      kind: "ghost",
      permissions: ["seller", "admin"],
    },
    "delete-listing": {
      id: "seller.delete-listing",
      label: "Delete",
      ariaLabel: "Delete listing",
      description: "Permanently delete this seller listing.",
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
      id: "seller.publish-listing",
      label: "Publish",
      description: "Make this listing visible to buyers.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    "unpublish-listing": {
      id: "seller.unpublish-listing",
      label: "Unpublish",
      description: "Hide this listing from buyers.",
      kind: "secondary",
      permissions: ["seller", "admin"],
    },
    "mark-shipped": {
      id: "seller.mark-shipped",
      label: "Mark as shipped",
      description: "Update an order status to shipped and enter tracking info.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    "request-payout": {
      id: "seller.request-payout",
      label: "Request payout",
      description: "Submit a payout request for available seller earnings.",
      kind: "primary",
      permissions: ["seller"],
    },
    "save-changes": {
      id: "seller.save-changes",
      label: "Save changes",
      description: "Submit the seller listing or settings form.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
  },
  ADMIN: {},
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
