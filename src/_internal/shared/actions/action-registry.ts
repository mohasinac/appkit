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
    "add-to-cart": {
      id: "pre-order.add-to-cart",
      label: "Add to cart",
      description: "Add a pre-order listing to the cart for checkout.",
      kind: "secondary",
      listingTypeScope: ["pre-order"],
    },
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
    "buy-now": {
      id: "prize-draw.buy-now",
      label: "Buy now",
      description: "Purchase a prize-draw entry directly (buyout — skips cart, goes to checkout).",
      kind: "primary",
      listingTypeScope: ["prize-draw"],
    },
    "enter-draw": {
      id: "prize-draw.enter-draw",
      label: "Enter draw",
      description: "Purchase an entry into the prize draw.",
      kind: "secondary",
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
    "buy-now": {
      id: "bundle.buy-now",
      label: "Buy now",
      description: "Purchase a bundle directly (buyout — skips cart, goes to checkout).",
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
    // ── Offer management ─────────────────────────────────────────────────
    "accept-offer": {
      id: "store.accept-offer",
      label: "Accept",
      ariaLabel: "Accept this offer",
      description: "Accept a buyer's offer on a classified listing.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    "reject-offer": {
      id: "store.reject-offer",
      label: "Reject",
      ariaLabel: "Reject this offer",
      description: "Reject a buyer's offer on a classified listing.",
      kind: "danger",
      permissions: ["seller", "admin"],
      confirmation: {
        title: "Reject this offer?",
        body: "The buyer will be notified that their offer was declined.",
        confirmLabel: "Reject offer",
        confirmKind: "danger",
      },
    },
    "counter-offer": {
      id: "store.counter-offer",
      label: "Counter",
      ariaLabel: "Counter this offer",
      description: "Send a counter-offer to the buyer.",
      kind: "secondary",
      permissions: ["seller", "admin"],
    },
    // ── Payout view ──────────────────────────────────────────────────────
    "view-payout": {
      id: "store.view-payout",
      label: "View Details",
      ariaLabel: "View payout details",
      description: "View the details of a payout.",
      kind: "ghost",
      permissions: ["seller", "admin"],
    },
    "export-payout": {
      id: "store.export-payout",
      label: "Export",
      ariaLabel: "Export payout details",
      description: "Download payout details as a file.",
      kind: "ghost",
      permissions: ["seller", "admin"],
    },
    // ── Review management ───────────────────────────────────────────────
    "reply-review": {
      id: "store.reply-review",
      label: "Reply",
      ariaLabel: "Reply to this review",
      description: "Post or edit a public store reply to a buyer's review.",
      kind: "secondary",
      permissions: ["seller", "admin"],
    },
    "contest-review": {
      id: "store.contest-review",
      label: "Contest",
      ariaLabel: "Contest this review",
      description: "Flag a review for admin investigation.",
      kind: "ghost",
      permissions: ["seller", "admin"],
    },
    "buyer-feedback": {
      id: "store.buyer-feedback",
      label: "Feedback",
      ariaLabel: "Send feedback to buyer",
      description: "Send a private message to the buyer's notification inbox.",
      kind: "ghost",
      permissions: ["seller", "admin"],
    },
    // ── WhatsApp integration ────────────────────────────────────────────
    "whatsapp-connect": {
      id: "store.whatsapp-connect",
      label: "Save & Connect",
      ariaLabel: "Save WhatsApp credentials and connect",
      description: "Save WhatsApp Business credentials and establish connection.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    "whatsapp-catalog-sync": {
      id: "store.whatsapp-catalog-sync",
      label: "Push to WhatsApp",
      ariaLabel: "Sync products to WhatsApp catalog",
      description: "Push published standard products to WhatsApp Business Catalog.",
      kind: "secondary",
      permissions: ["seller", "admin"],
    },
    "whatsapp-catalog-import": {
      id: "store.whatsapp-catalog-import",
      label: "Import from WhatsApp",
      ariaLabel: "Import products from WhatsApp catalog",
      description: "Import products from WhatsApp Catalog as drafts.",
      kind: "secondary",
      permissions: ["seller", "admin"],
    },
    // ── Google Reviews integration ──────────────────────────────────────
    "google-reviews-sync": {
      id: "store.google-reviews-sync",
      label: "Sync now",
      ariaLabel: "Sync Google Business reviews",
      description: "Pull latest reviews from Google Business profile.",
      kind: "ghost",
      permissions: ["seller", "admin"],
    },
    "save-google-settings": {
      id: "store.save-google-settings",
      label: "Save Settings",
      ariaLabel: "Save Google Business settings",
      description: "Save Google Business profile configuration.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    // ── Refresh ─────────────────────────────────────────────────────────
    "refresh-offers": {
      id: "store.refresh-offers",
      label: "Refresh",
      ariaLabel: "Refresh offers list",
      description: "Reload latest offers and statuses.",
      kind: "ghost",
      permissions: ["seller", "admin"],
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
    "print-labels": {
      id: "store.print-labels",
      label: "Print Labels",
      ariaLabel: "Print inventory labels for selected products",
      description: "Open the print page for inventory labels for the selected products.",
      kind: "secondary",
      permissions: ["seller", "admin"],
    },
    "set-location": {
      id: "store.set-location",
      label: "Set Location",
      ariaLabel: "Set physical storage location for selected items",
      description: "Assign zone, shelf, and bin for the selected inventory items.",
      kind: "ghost",
      permissions: ["seller", "admin"],
    },
    "print-packing-slips": {
      id: "store.print-packing-slips",
      label: "Print Packing Slips",
      ariaLabel: "Print packing slips for selected orders",
      description: "Open the print page for packing slip labels for the selected orders.",
      kind: "secondary",
      permissions: ["seller", "admin"],
    },
    "open-print-center": {
      id: "store.open-print-center",
      label: "Print Center",
      ariaLabel: "Open the Print & Label Center",
      description: "Open the Print & Label Center for this store.",
      kind: "ghost",
      permissions: ["seller", "admin"],
    },
    // SB-UNI-W follow-up (plan §7) — leaves for the 11 unwired store-dashboard
    // form/row CTAs identified by the W-3 sweep.
    "create-template": {
      id: "store.create-template",
      label: "Create Template",
      ariaLabel: "Create a new product template",
      description: "Submit the new-template form.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    "update-template": {
      id: "store.update-template",
      label: "Save Changes",
      ariaLabel: "Save changes to template",
      description: "Submit the edit-template form.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    "edit-template": {
      id: "store.edit-template",
      label: "Edit",
      ariaLabel: "Edit template",
      description: "Open the edit-template drawer for this row.",
      kind: "ghost",
      permissions: ["seller", "admin"],
    },
    "delete-template": {
      id: "store.delete-template",
      label: "Delete",
      ariaLabel: "Delete template",
      description: "Permanently remove this template.",
      kind: "danger",
      permissions: ["seller", "admin"],
      confirmation: {
        title: "Delete template?",
        body: "This template will be permanently removed. Existing products created from it are unaffected. This action cannot be undone.",
        confirmLabel: "Delete template",
        confirmKind: "danger",
      },
    },
    "create-bundle": {
      id: "store.create-bundle",
      label: "Create Bundle",
      ariaLabel: "Create a new bundle",
      description: "Submit the new-bundle form.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    "create-feature": {
      id: "store.create-feature",
      label: "Create Feature",
      ariaLabel: "Create a new product feature badge",
      description: "Submit the new-feature form.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    "update-slug": {
      id: "store.update-slug",
      label: "Update Slug",
      ariaLabel: "Update store slug",
      description: "Submit the slug-change form. Caution: existing links will redirect.",
      kind: "primary",
      permissions: ["seller", "admin"],
      confirmation: {
        title: "Update store slug?",
        body: "Existing links that reference the old slug will start redirecting. Make sure to update social bios and external listings.",
        confirmLabel: "Update slug",
        confirmKind: "primary",
      },
    },
    "delete-sublisting-category": {
      id: "store.delete-sublisting-category",
      label: "Delete",
      ariaLabel: "Delete sublisting category",
      description: "Permanently remove this sublisting category from the store.",
      kind: "danger",
      permissions: ["seller", "admin"],
      confirmation: {
        title: "Delete sublisting category?",
        body: "Products tagged with this category will lose the tag. This action cannot be undone.",
        confirmLabel: "Delete category",
        confirmKind: "danger",
      },
    },
    "cancel-form": {
      id: "store.cancel-form",
      label: "Cancel",
      ariaLabel: "Cancel form and close",
      description: "Discard unsaved changes and close the drawer/form.",
      kind: "ghost",
    },
    "new-template": {
      id: "store.new-template",
      label: "+ New Template",
      ariaLabel: "Open the new-template drawer",
      description: "Open the new-template creation drawer.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
  },
  BLOG: {
    "create-post": {
      id: "blog.create-post",
      label: "New Post",
      ariaLabel: "Create a new blog post",
      description: "Navigate to the blog post editor.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "edit-post": {
      id: "blog.edit-post",
      label: "Edit",
      ariaLabel: "Edit this blog post",
      description: "Open the editor for a blog post.",
      kind: "ghost",
      permissions: ["admin", "moderator"],
    },
    "delete-post": {
      id: "blog.delete-post",
      label: "Delete",
      ariaLabel: "Delete this blog post",
      description: "Permanently delete a blog post.",
      kind: "danger",
      permissions: ["admin", "moderator"],
      confirmation: {
        title: "Delete this post?",
        body: "This blog post will be permanently removed. This action cannot be undone.",
        confirmLabel: "Delete post",
        confirmKind: "danger",
      },
    },
  },
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
    // Plan §6 — wishlist bulk actions (sticky bulk-action toolbar leaves).
    "wishlist-bulk-remove": {
      id: "user.wishlist-bulk-remove",
      label: "Remove selected",
      ariaLabel: "Remove selected items from wishlist",
      description: "Permanently remove the selected items from your wishlist.",
      kind: "danger",
      confirmation: {
        title: "Remove selected items?",
        body: "The selected items will be removed from your wishlist. You can add them again from product pages.",
        confirmLabel: "Remove",
        confirmKind: "danger",
      },
    },
    "wishlist-bulk-move-to-cart": {
      id: "user.wishlist-bulk-move-to-cart",
      label: "Move to cart",
      ariaLabel: "Move selected items to cart",
      description: "Add the selected wishlist items to your cart.",
      kind: "primary",
    },
    "clear-selection": {
      id: "user.clear-selection",
      label: "Deselect",
      ariaLabel: "Clear current selection",
      description: "Exit selection mode.",
      kind: "ghost",
    },
    // ── Order lifecycle ─────────────────────────────────────────────────
    "track-order": {
      id: "user.track-order",
      label: "Track Order",
      ariaLabel: "Track your order shipment",
      description: "View shipment tracking details for a shipped order.",
      kind: "ghost",
    },
    "reorder": {
      id: "user.reorder",
      label: "Reorder",
      ariaLabel: "Reorder items from this order",
      description: "Add the same items from a past order to your cart.",
      kind: "secondary",
    },
    "download-invoice": {
      id: "user.download-invoice",
      label: "Download Invoice",
      ariaLabel: "Download order invoice",
      description: "Download a PDF invoice for this order.",
      kind: "ghost",
      iconKey: "FileDown",
    },
    "write-review": {
      id: "user.write-review",
      label: "Write Review",
      ariaLabel: "Write a review for this order",
      description: "Leave a review for a product from a delivered order.",
      kind: "secondary",
    },
    "refresh-offers": {
      id: "user.refresh-offers",
      label: "Refresh",
      ariaLabel: "Refresh offers",
      description: "Reload latest offers received.",
      kind: "ghost",
    },
    // Plan §10 — claim-coupon wallet (won-coupon entry points & wallet leaves).
    "claim-coupon": {
      id: "user.claim-coupon",
      label: "Claim Coupon",
      ariaLabel: "Claim this coupon to your wallet",
      description: "Add this coupon to your claimed-coupons wallet for use at checkout.",
      kind: "primary",
    },
    "use-claimed-coupon": {
      id: "user.use-claimed-coupon",
      label: "Apply at checkout",
      ariaLabel: "Apply this coupon at checkout",
      description: "Deep-link to checkout with this coupon pre-filled.",
      kind: "link",
    },
    "remove-claimed-coupon": {
      id: "user.remove-claimed-coupon",
      label: "Remove",
      ariaLabel: "Remove coupon from wallet",
      description: "Remove this coupon from your wallet (history is preserved).",
      kind: "ghost",
    },
  },
  SELLER: {
    "cancel-bid": {
      id: "seller.cancel-bid",
      label: "Cancel selected",
      ariaLabel: "Cancel selected bids",
      description: "Cancel the selected bids from this store's auctions.",
      kind: "danger",
      permissions: ["seller", "admin"],
      confirmation: {
        title: "Cancel these bids?",
        body: "The selected bids will be cancelled and bidders will be notified.",
        confirmLabel: "Cancel bids",
        confirmKind: "danger",
      },
    },
  },
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
    "export-csv": {
      id: "admin.export-csv",
      label: "Export CSV",
      ariaLabel: "Export data as CSV",
      description: "Download the current view's data as a CSV file.",
      kind: "ghost",
      permissions: ["admin", "moderator"],
    },
    // ── Order management ──────────────────────────────────────────────────
    "mark-shipped": {
      id: "admin.mark-shipped",
      label: "Mark as Shipped",
      ariaLabel: "Mark order as shipped",
      description: "Update an order status to shipped.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "mark-delivered": {
      id: "admin.mark-delivered",
      label: "Mark as Delivered",
      ariaLabel: "Mark order as delivered",
      description: "Update an order status to delivered.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "cancel-order": {
      id: "admin.cancel-order",
      label: "Cancel Orders",
      ariaLabel: "Cancel selected orders",
      description: "Cancel one or more pending orders.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Cancel these orders?",
        body: "The selected orders will be cancelled. Refunds are processed within 5–7 business days.",
        confirmLabel: "Cancel orders",
        confirmKind: "danger",
      },
    },
    // ── Payout management (extended) ──────────────────────────────────────
    "mark-paid": {
      id: "admin.mark-paid",
      label: "Mark Paid",
      ariaLabel: "Mark payout as paid",
      description: "Mark a payout as paid after transfer has been completed.",
      kind: "primary",
      permissions: ["admin"],
    },
    // ── Session management ────────────────────────────────────────────────
    "revoke-session": {
      id: "admin.revoke-session",
      label: "Revoke Sessions",
      ariaLabel: "Revoke selected sessions",
      description: "Force-end one or more active user sessions.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Revoke these sessions?",
        body: "The selected sessions will be terminated. Users will need to sign in again.",
        confirmLabel: "Revoke sessions",
        confirmKind: "danger",
      },
    },
    // ── Notification management ───────────────────────────────────────────
    "mark-read": {
      id: "admin.mark-read",
      label: "Mark Read",
      ariaLabel: "Mark selected notifications as read",
      description: "Mark one or more notifications as read.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "delete-notification": {
      id: "admin.delete-notification",
      label: "Delete Notifications",
      ariaLabel: "Delete selected notifications",
      description: "Permanently delete one or more notifications.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Delete these notifications?",
        body: "The selected notifications will be permanently removed.",
        confirmLabel: "Delete",
        confirmKind: "danger",
      },
    },
    "resend-notification": {
      id: "admin.resend-notification",
      label: "Resend",
      ariaLabel: "Resend this notification",
      description: "Re-send a notification to the recipient.",
      kind: "ghost",
      permissions: ["admin"],
    },
    // ── Blog management ───────────────────────────────────────────────────
    "publish-blog": {
      id: "admin.publish-blog",
      label: "Publish Selected",
      ariaLabel: "Publish selected blog posts",
      description: "Set selected blog posts to published status.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "draft-blog": {
      id: "admin.draft-blog",
      label: "Move to Draft",
      ariaLabel: "Move selected posts to draft",
      description: "Revert selected blog posts to draft status.",
      kind: "secondary",
      permissions: ["admin", "moderator"],
    },
    // ── Brand & category management ───────────────────────────────────────
    "edit-brand": {
      id: "admin.edit-brand",
      label: "Edit Brand",
      ariaLabel: "Edit this brand",
      description: "Open the edit panel for a brand.",
      kind: "primary",
      permissions: ["admin"],
    },
    "edit-category": {
      id: "admin.edit-category",
      label: "Edit Category",
      ariaLabel: "Edit this category",
      description: "Open the edit panel for a category.",
      kind: "primary",
      permissions: ["admin"],
    },
    // ── Feature & prize-draw management ────────────────────────────────────
    "delete-feature": {
      id: "admin.delete-feature",
      label: "Delete Features",
      ariaLabel: "Delete selected features",
      description: "Permanently delete the selected product feature badges.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Delete these features?",
        body: "The selected product feature badges will be permanently removed. Products tagged with them will lose the badge.",
        confirmLabel: "Delete",
        confirmKind: "danger",
      },
    },
    "delete-prize-draw": {
      id: "admin.delete-prize-draw",
      label: "Delete Prize Draws",
      ariaLabel: "Delete selected prize draws",
      description: "Permanently delete the selected prize draw listings.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Delete these prize draws?",
        body: "The selected prize draw listings will be permanently removed. This action cannot be undone.",
        confirmLabel: "Delete",
        confirmKind: "danger",
      },
    },
    // ── Product toggles ───────────────────────────────────────────────────
    "toggle-featured": {
      id: "admin.toggle-featured",
      label: "Toggle Featured",
      ariaLabel: "Toggle featured status",
      description: "Toggle whether the selected products appear in featured sections.",
      kind: "secondary",
      permissions: ["admin", "moderator"],
    },
    "toggle-promoted": {
      id: "admin.toggle-promoted",
      label: "Toggle Promoted",
      ariaLabel: "Toggle promoted status",
      description: "Toggle whether the selected products appear in promoted placements.",
      kind: "secondary",
      permissions: ["admin"],
    },
    "toggle-on-sale": {
      id: "admin.toggle-on-sale",
      label: "Toggle On Sale",
      ariaLabel: "Toggle on-sale status",
      description: "Toggle the on-sale flag for the selected products.",
      kind: "secondary",
      permissions: ["admin", "moderator"],
    },
    // ── Bundle management ─────────────────────────────────────────────────
    "activate-bundle": {
      id: "admin.activate-bundle",
      label: "Activate",
      ariaLabel: "Activate selected bundles",
      description: "Set the selected bundles to active status.",
      kind: "primary",
      permissions: ["admin"],
    },
    "deactivate-bundle": {
      id: "admin.deactivate-bundle",
      label: "Deactivate",
      ariaLabel: "Deactivate selected bundles",
      description: "Set the selected bundles to inactive status.",
      kind: "secondary",
      permissions: ["admin"],
    },
    "delete-bundle": {
      id: "admin.delete-bundle",
      label: "Delete",
      ariaLabel: "Delete selected bundles",
      description: "Permanently delete the selected bundles.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Delete these bundles?",
        body: "The selected bundles will be permanently removed. This action cannot be undone.",
        confirmLabel: "Delete",
        confirmKind: "danger",
      },
    },
    // ── Store/User management (bulk) ──────────────────────────────────────
    "manage-store": {
      id: "admin.manage-store",
      label: "Manage Store",
      ariaLabel: "Manage this store",
      description: "Open the store management panel.",
      kind: "primary",
      permissions: ["admin"],
    },
    "manage-user": {
      id: "admin.manage-user",
      label: "Manage Selected",
      ariaLabel: "Manage selected users",
      description: "Open the user management panel.",
      kind: "primary",
      permissions: ["admin"],
    },
    // ── Carousel management ──────────────────────────────────────────────
    "edit-carousel": {
      id: "admin.edit-carousel",
      label: "Edit Slide",
      ariaLabel: "Edit carousel slide",
      description: "Open the edit panel for a carousel slide.",
      kind: "ghost",
      permissions: ["admin"],
    },
    "delete-carousel": {
      id: "admin.delete-carousel",
      label: "Delete Slides",
      ariaLabel: "Delete selected carousel slides",
      description: "Permanently delete the selected carousel slides.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Delete these slides?",
        body: "The selected carousel slides will be permanently removed.",
        confirmLabel: "Delete",
        confirmKind: "danger",
      },
    },
    // ── Contact management ────────────────────────────────────────────────
    "mark-contact-read": {
      id: "admin.mark-contact-read",
      label: "Mark Read",
      ariaLabel: "Mark selected messages as read",
      description: "Mark one or more contact messages as read.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "archive-contact": {
      id: "admin.archive-contact",
      label: "Archive Messages",
      ariaLabel: "Archive selected messages",
      description: "Move the selected contact messages to archive.",
      kind: "secondary",
      permissions: ["admin", "moderator"],
    },
    "delete-contact": {
      id: "admin.delete-contact",
      label: "Delete Messages",
      ariaLabel: "Delete selected messages",
      description: "Permanently delete the selected contact messages.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Delete these messages?",
        body: "The selected messages will be permanently removed.",
        confirmLabel: "Delete",
        confirmKind: "danger",
      },
    },
    // ── Newsletter management ─────────────────────────────────────────────
    "unsubscribe-newsletter": {
      id: "admin.unsubscribe-newsletter",
      label: "Unsubscribe",
      ariaLabel: "Unsubscribe selected subscribers",
      description: "Remove the selected subscribers from the newsletter.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Unsubscribe these subscribers?",
        body: "The selected subscribers will be removed from the newsletter.",
        confirmLabel: "Unsubscribe",
        confirmKind: "danger",
      },
    },
    // ── Team management ───────────────────────────────────────────────────
    "edit-team-member": {
      id: "admin.edit-team-member",
      label: "Edit Permissions",
      ariaLabel: "Edit team member permissions",
      description: "Open the permissions editor for a team member.",
      kind: "ghost",
      permissions: ["admin"],
    },
    "remove-team-member": {
      id: "admin.remove-team-member",
      label: "Remove Members",
      ariaLabel: "Remove selected team members",
      description: "Remove the selected team members.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Remove these team members?",
        body: "The selected team members will be removed from the team.",
        confirmLabel: "Remove",
        confirmKind: "danger",
      },
    },
    // ── FAQ management ────────────────────────────────────────────────────
    "delete-faq": {
      id: "admin.delete-faq",
      label: "Delete FAQs",
      ariaLabel: "Delete selected FAQs",
      description: "Permanently delete the selected FAQ entries.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Delete these FAQs?",
        body: "The selected FAQ entries will be permanently removed.",
        confirmLabel: "Delete",
        confirmKind: "danger",
      },
    },
    "archive-faq": {
      id: "admin.archive-faq",
      label: "Archive FAQs",
      ariaLabel: "Archive selected FAQs",
      description: "Archive the selected FAQ entries.",
      kind: "secondary",
      permissions: ["admin", "moderator"],
    },
    // ── Coupon management ─────────────────────────────────────────────────
    "delete-coupon": {
      id: "admin.delete-coupon",
      label: "Delete Coupons",
      ariaLabel: "Delete selected coupons",
      description: "Permanently delete the selected coupons.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Delete these coupons?",
        body: "The selected coupons will be permanently removed. Active coupon codes will stop working.",
        confirmLabel: "Delete",
        confirmKind: "danger",
      },
    },
    "edit-coupon": {
      id: "admin.edit-coupon",
      label: "Edit Coupon",
      ariaLabel: "Edit this coupon",
      description: "Open the edit panel for a coupon.",
      kind: "ghost",
      permissions: ["admin"],
    },
    "duplicate-coupon": {
      id: "admin.duplicate-coupon",
      label: "Duplicate",
      ariaLabel: "Duplicate this coupon",
      description: "Create a copy of this coupon with a new code.",
      kind: "ghost",
      permissions: ["admin"],
    },
    // ── Navigation management ─────────────────────────────────────────────
    "edit-nav": {
      id: "admin.edit-nav",
      label: "Edit",
      ariaLabel: "Edit navigation item",
      description: "Edit a navigation menu item.",
      kind: "ghost",
      permissions: ["admin"],
    },
    "delete-nav": {
      id: "admin.delete-nav",
      label: "Delete Nav Items",
      ariaLabel: "Delete selected navigation items",
      description: "Permanently delete the selected navigation items.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Delete these navigation items?",
        body: "The selected navigation items will be permanently removed from the menu.",
        confirmLabel: "Delete",
        confirmKind: "danger",
      },
    },
    // ── Sublisting category management ────────────────────────────────────
    "delete-sublisting-category": {
      id: "admin.delete-sublisting-category",
      label: "Delete Categories",
      ariaLabel: "Delete selected sublisting categories",
      description: "Permanently delete the selected sublisting categories.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Delete these categories?",
        body: "Products tagged with these categories will lose the tag.",
        confirmLabel: "Delete",
        confirmKind: "danger",
      },
    },
    // ── Scammer management ────────────────────────────────────────────────
    "verify-scammer": {
      id: "admin.verify-scammer",
      label: "Verify Report",
      ariaLabel: "Verify this scammer report",
      description: "Mark a scammer report as verified after review.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "dismiss-scammer": {
      id: "admin.dismiss-scammer",
      label: "Dismiss",
      ariaLabel: "Dismiss this scammer report",
      description: "Dismiss a scammer report as unverified.",
      kind: "secondary",
      permissions: ["admin", "moderator"],
    },
    "delete-scammer": {
      id: "admin.delete-scammer",
      label: "Delete Reports",
      ariaLabel: "Delete selected scammer reports",
      description: "Permanently delete the selected scammer reports.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Delete these reports?",
        body: "The selected scammer reports will be permanently removed.",
        confirmLabel: "Delete",
        confirmKind: "danger",
      },
    },
    // ── Support ticket management ──────────────────────────────────────────
    "view-ticket": {
      id: "admin.view-ticket",
      label: "View Details",
      ariaLabel: "View support ticket details",
      description: "Open the full support ticket details.",
      kind: "ghost",
      permissions: ["admin", "moderator"],
    },
    "close-ticket": {
      id: "admin.close-ticket",
      label: "Close Tickets",
      ariaLabel: "Close selected tickets",
      description: "Close the selected support tickets.",
      kind: "secondary",
      permissions: ["admin", "moderator"],
    },
    "escalate-ticket": {
      id: "admin.escalate-ticket",
      label: "Escalate",
      ariaLabel: "Escalate this ticket",
      description: "Escalate a support ticket to a higher priority.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    // ── Event entry management ────────────────────────────────────────────
    "approve-entry": {
      id: "admin.approve-entry",
      label: "Approve Entries",
      ariaLabel: "Approve selected event entries",
      description: "Approve the selected event entries.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "reject-entry": {
      id: "admin.reject-entry",
      label: "Reject Entries",
      ariaLabel: "Reject selected event entries",
      description: "Reject the selected event entries.",
      kind: "danger",
      permissions: ["admin", "moderator"],
      confirmation: {
        title: "Reject these entries?",
        body: "The selected entries will be rejected and participants will be notified.",
        confirmLabel: "Reject",
        confirmKind: "danger",
      },
    },
    // ── Event entry management (row-level) ──────────────────────────────
    "confirm-entry": {
      id: "admin.confirm-entry",
      label: "Confirm",
      ariaLabel: "Confirm this event entry",
      description: "Confirm a single event entry.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "waitlist-entry": {
      id: "admin.waitlist-entry",
      label: "Waitlist",
      ariaLabel: "Waitlist this event entry",
      description: "Move a single event entry to waitlist.",
      kind: "secondary",
      permissions: ["admin", "moderator"],
    },
    "cancel-entry": {
      id: "admin.cancel-entry",
      label: "Cancel",
      ariaLabel: "Cancel this event entry",
      description: "Cancel a single event entry.",
      kind: "danger",
      permissions: ["admin", "moderator"],
      confirmation: {
        title: "Cancel this entry?",
        body: "This will remove the participant from the event. They can re-register if the event is still open.",
        confirmLabel: "Cancel entry",
        confirmKind: "danger",
      },
    },
    // ── Review management (row-level) ─────────────────────────────────
    "feature-review": {
      id: "admin.feature-review",
      label: "Feature",
      ariaLabel: "Feature this review",
      description: "Feature a review on the product page.",
      kind: "ghost",
      permissions: ["admin", "moderator"],
    },
    "unfeature-review": {
      id: "admin.unfeature-review",
      label: "Unfeature",
      ariaLabel: "Unfeature this review",
      description: "Remove a review from the featured section.",
      kind: "ghost",
      permissions: ["admin", "moderator"],
    },
    // ── Scammer management (row-level) ────────────────────────────────
    "review-scammer": {
      id: "admin.review-scammer",
      label: "Review",
      ariaLabel: "Review this scammer report",
      description: "Open the scammer profile for detailed review.",
      kind: "ghost",
      permissions: ["admin", "moderator"],
    },
    // ── Bid management ────────────────────────────────────────────────────
    "cancel-bid": {
      id: "admin.cancel-bid",
      label: "Cancel Selected",
      ariaLabel: "Cancel selected bids",
      description: "Cancel the selected bids.",
      kind: "danger",
      permissions: ["admin", "moderator"],
      confirmation: {
        title: "Cancel these bids?",
        body: "The selected bids will be cancelled. Bidders will be notified.",
        confirmLabel: "Cancel bids",
        confirmKind: "danger",
      },
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
    "continue-to-verification": {
      id: "checkout.continue-to-verification",
      label: "Continue to Verification",
      description: "Advance from address selection to identity verification step.",
      kind: "primary",
    },
    "send-otp": {
      id: "checkout.send-otp",
      label: "Send verification code",
      description: "Send a one-time code to the buyer's registered email to verify identity before checkout.",
      kind: "primary",
    },
    "verify-otp": {
      id: "checkout.verify-otp",
      label: "Verify & Continue",
      description: "Submit the one-time code and proceed to payment selection.",
      kind: "primary",
    },
    "resend-otp": {
      id: "checkout.resend-otp",
      label: "Resend code",
      description: "Re-send the verification code to the buyer's registered email.",
      kind: "ghost",
    },
    "pay-online": {
      id: "checkout.pay-online",
      label: "Pay Online (Razorpay)",
      description: "Initiate an online payment via Razorpay UPI/Card/NetBanking.",
      kind: "primary",
    },
    "pay-cod": {
      id: "checkout.pay-cod",
      label: "Cash on Delivery",
      description: "Place the order for cash-on-delivery payment.",
      kind: "secondary",
    },
    "admin-bypass": {
      id: "checkout.admin-bypass",
      label: "Skip Verification — Admin Bypass",
      description: "Admin test mode: skip identity verification and place a test order without payment.",
      kind: "secondary",
    },
    "admin-bypass-payment": {
      id: "checkout.admin-bypass-payment",
      label: "No Payment — Admin Bypass Order",
      description: "Admin test mode: place a real order record without charging any payment.",
      kind: "secondary",
    },
    "apply-coupon": {
      id: "checkout.apply-coupon",
      label: "Apply coupon",
      description: "Validate and apply a coupon code at checkout before payment.",
      kind: "secondary",
    },
    "remove-coupon": {
      id: "checkout.remove-coupon",
      label: "Remove coupon",
      description: "Remove an applied coupon from the current checkout session.",
      kind: "ghost",
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
  MEDIA: {
    "copy-url": {
      id: "media.copy-url",
      label: "Copy URL",
      ariaLabel: "Copy media URL to clipboard",
      description: "Copy the storage URL of a media file to clipboard.",
      kind: "ghost",
    },
    "clear-previews": {
      id: "media.clear-previews",
      label: "Clear previews",
      ariaLabel: "Clear uploaded previews",
      description: "Remove all preview images from the current session.",
      kind: "secondary",
      permissions: ["admin", "moderator"],
    },
    "discard-staged": {
      id: "media.discard-staged",
      label: "Discard staged uploads",
      ariaLabel: "Discard all staged uploads",
      description: "Remove staged upload files from temporary storage.",
      kind: "danger",
      permissions: ["admin", "moderator"],
      confirmation: {
        title: "Discard staged uploads?",
        body: "All uploaded files not yet saved to a record will be deleted from storage.",
        confirmLabel: "Discard",
        confirmKind: "danger",
      },
    },
  },
  SUPPORT: {
    "create-ticket": {
      id: "support.create-ticket",
      label: "Contact Support",
      ariaLabel: "Create a support ticket",
      description: "Open the support ticket form.",
      kind: "primary",
    },
    "reply-ticket": {
      id: "support.reply-ticket",
      label: "Reply",
      ariaLabel: "Reply to this ticket",
      description: "Add a reply to an open support ticket.",
      kind: "primary",
    },
    "close-ticket": {
      id: "support.close-ticket",
      label: "Close Ticket",
      ariaLabel: "Close this support ticket",
      description: "Mark this support ticket as resolved.",
      kind: "secondary",
      confirmation: {
        title: "Close this ticket?",
        body: "The ticket will be marked as resolved. You can reopen it later.",
        confirmLabel: "Close ticket",
      },
    },
  },
};

/** Sugar — `act("PRODUCT", "add-to-cart")` reads more naturally at call sites. */
export function act(resource: ActionResource, id: string): ActionDef | null {
  return action(ACTIONS, resource, id);
}
