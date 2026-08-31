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
import type { IconKey } from "../../../ui/icons/icon-registry";

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
  // "CLASSIFIED" and "LIVE" were removed 2026-08-31 — both buckets held a
  // single consumerless action naming the deleted conversations feature.
  | "DIGITAL_CODE"
  | "BUNDLE"
  | "GROUP"
  | "CATEGORY"
  | "BRAND"
  | "SUBLISTING"
  | "STORE"
  | "BLOG"
  | "EVENT"
  | "SHIPMENT"
  | "CATALOGUE"
  | "USER"
  | "SELLER"
  | "ADMIN"
  | "CART"
  | "CHECKOUT"
  | "NAV"
  | "MEDIA"
  | "SUPPORT"
  | "LOTTERY"
  | "TESTER";

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
  /**
   * Icon for this action, resolved through `ICONS` in `ui/icons/icon-registry`.
   *
   * Typed `IconKey`, not `string`: as a bare string this field was set on 2 of
   * 220 actions and rendered by nothing for months, and a typo was a silent
   * no-op. A key outside the registry is now a compile error.
   */
  iconKey?: IconKey;
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
    /*
     * The buyer-facing verbs below shipped long ago; the four CRUD entries
     * here did not exist at all, so every "New listing" / "Edit" / "Delete"
     * control in the seller and admin product surfaces was an inline action
     * object outside the registry (Rule #7).
     */
    view: {
      iconKey: "view",
      id: "product.view",
      label: "View",
      ariaLabel: "View listing",
      description: "Open the listing's public detail page.",
      kind: "secondary",
    },
    create: {
      iconKey: "create",
      id: "product.create",
      label: "New listing",
      ariaLabel: "Create a new listing",
      description: "Create a listing of any type.",
      kind: "primary",
      permissions: ["admin", "seller"],
    },
    edit: {
      iconKey: "edit",
      id: "product.edit",
      label: "Edit",
      ariaLabel: "Edit listing",
      description: "Edit this listing.",
      kind: "secondary",
      permissions: ["admin", "seller"],
    },
    delete: {
      iconKey: "delete",
      id: "product.delete",
      label: "Delete",
      ariaLabel: "Delete listing",
      description: "Permanently delete this listing.",
      kind: "danger",
      permissions: ["admin", "seller"],
      confirmation: {
        title: "Delete this listing?",
        body: "This cannot be undone. Orders that already reference it keep their own copy of the title, price and image, so past orders stay readable.",
        confirmLabel: "Delete listing",
      },
    },
    "add-to-cart": {
      iconKey: "cart",
      id: "product.add-to-cart",
      label: "Add to cart",
      ariaLabel: "Add to cart",
      description: "Add a standard listing to the buyer's cart.",
      kind: "primary",
      listingTypeScope: ["standard", "pre-order", "prize-draw", "digital-code", "live"],
    },
    "buy-now": {
      iconKey: "cart",
      id: "product.buy-now",
      label: "Buy now",
      description: "Skip cart and head straight to checkout for this listing.",
      kind: "primary",
      listingTypeScope: ["standard", "pre-order"],
    },
    "add-to-wishlist": {
      iconKey: "wishlist",
      id: "product.add-to-wishlist",
      label: "Save",
      ariaLabel: "Add to wishlist",
      description: "Bookmark this listing into the buyer's wishlist.",
      kind: "ghost",
    },
    "remove-from-wishlist": {
      iconKey: "wishlist",
      id: "product.remove-from-wishlist",
      label: "Saved",
      ariaLabel: "Remove from wishlist",
      description: "Remove this listing from the buyer's wishlist.",
      kind: "ghost",
    },
    "sync-wishlist-item": {
      iconKey: "retry",
      id: "product.sync-wishlist-item",
      label: "Sync",
      ariaLabel: "Sync this wishlist item with the latest product data",
      description: "Refreshes the wishlist entry's stored price/title/image against the live listing, removing it if the listing is no longer available.",
      kind: "ghost",
    },
    "share": {
      iconKey: "share",
      id: "product.share",
      label: "Share",
      ariaLabel: "Share this listing",
      description: "Open the native share sheet or copy the listing URL.",
      kind: "ghost",
    },
    "compare": {
      iconKey: "analytics",
      id: "product.compare",
      label: "Compare",
      ariaLabel: "Add to comparison",
      description: "Add this listing to the side-by-side comparison panel.",
      kind: "ghost",
    },
    "make-offer": {
      iconKey: "message",
      id: "product.make-offer",
      label: "Make an offer",
      /*
       * Scope corrected 2026-08-31: this was `["classified"]`, but the button it
       * labels (`MakeOfferButton`) mounts on every type whose capability says
       * `canMakeOffer` — which is standard, art and stickers as well. On
       * classified specifically it is the ONLY purchase path, and a seller who
       * has not opted into haggling receives a request to buy at the asking
       * price rather than a lower offer.
       */
      description: "Propose a price to the seller, or request to buy at the asking price.",
      kind: "secondary",
      listingTypeScope: ["standard", "classified", "art", "stickers"],
    },
  },
  AUCTION: {
    "place-bid": {
      iconKey: "bid",
      id: "auction.place-bid",
      label: "Place bid",
      description: "Submit a bid on an auction listing.",
      kind: "primary",
      listingTypeScope: ["auction"],
    },
    "buy-it-now": {
      iconKey: "cart",
      id: "auction.buy-it-now",
      label: "Buy It Now",
      description:
        "Claim the listing at the buy-now price (SB-UNI-H). Offered while the auction is unsold, before its end date, and while the buy-now price still beats the standing bid. Places a bid at that price plus a 1h locked cart line — the auction stays live until the buyer pays.",
      kind: "secondary",
      listingTypeScope: ["auction"],
    },
    "watch": {
      iconKey: "view",
      id: "auction.watch",
      label: "Watch auction",
      ariaLabel: "Watch this auction",
      description: "Subscribe to bid activity and ending-soon alerts for this auction.",
      kind: "ghost",
      listingTypeScope: ["auction"],
    },
    "unwatch": {
      iconKey: "hide",
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
      iconKey: "cart",
      id: "pre-order.add-to-cart",
      label: "Add to cart",
      description: "Add a pre-order listing to the cart for checkout.",
      kind: "secondary",
      listingTypeScope: ["pre-order"],
    },
    "reserve-now": {
      iconKey: "cart",
      id: "pre-order.reserve-now",
      label: "Reserve now",
      description: "Lock in a pre-order reservation for this listing.",
      kind: "primary",
      listingTypeScope: ["pre-order"],
    },
    "cancel-reservation": {
      iconKey: "cancel",
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
      iconKey: "cart",
      id: "prize-draw.buy-now",
      label: "Buy now",
      description: "Purchase a prize-draw entry directly (buyout — skips cart, goes to checkout).",
      kind: "primary",
      listingTypeScope: ["prize-draw"],
    },
    "enter-draw": {
      iconKey: "confirm",
      id: "prize-draw.enter-draw",
      label: "Enter draw",
      description: "Purchase an entry into the prize draw.",
      kind: "secondary",
      listingTypeScope: ["prize-draw"],
    },
    "reveal-code": {
      iconKey: "view",
      id: "prize-draw.reveal-code",
      label: "Reveal code",
      description: "Reveal the buyer's prize-draw redemption code.",
      kind: "primary",
      listingTypeScope: ["prize-draw"],
    },
  },
  /*
   * `CLASSIFIED` held one entry, "contact-seller", whose description read
   * "Open a conversations thread with the seller". It had ZERO consumers — the
   * button on the classified PDP was hand-written — and the feature it named was
   * deleted 2026-08-31. `PRODUCT["make-offer"]` below is the action that is
   * actually wired (`MakeOfferButton`), and on a classified it is now the only
   * purchase path, so a second bucket duplicating it would be exactly the drift
   * Rule #7 exists to prevent.
   */
  DIGITAL_CODE: {
    "claim-code": {
      iconKey: "confirm",
      id: "digital-code.claim-code",
      label: "Claim code",
      description: "Purchase and immediately reveal a digital code.",
      kind: "primary",
      listingTypeScope: ["digital-code"],
    },
  },
  /*
   * `LIVE.inquire` ("Open a conversation with the seller about a live-item
   * listing") went the same way and for the same two reasons: no consumer, and
   * the conversations feature is gone. It was never needed either — a live item
   * has `canAddToCart: true`, so unlike classified it has a real checkout.
   */
  BUNDLE: {
    "buy-now": {
      iconKey: "cart",
      id: "bundle.buy-now",
      label: "Buy now",
      description: "Purchase a bundle directly (buyout — skips cart, goes to checkout).",
      kind: "primary",
      categoryTypeScope: ["bundle"],
    },
  },
  /*
   * These four buckets were literally `{}` for months while their editors
   * shipped and worked — every CRUD control on a category, brand, grouped
   * listing or sub-listing was therefore an inline action object, which is
   * exactly what Rule #7 exists to prevent.
   *
   * Every destructive entry carries a `confirmation`, without which the action
   * fires immediately and irreversibly.
   */
  GROUP: {
    view: {
      iconKey: "view",
      id: "group.view",
      label: "View",
      ariaLabel: "View grouped listing",
      description: "Open the grouped listing detail page.",
      kind: "secondary",
    },
    create: {
      iconKey: "create",
      id: "group.create",
      label: "New grouped listing",
      ariaLabel: "Create a new grouped listing",
      description: "Create a new grouped listing.",
      kind: "primary",
      permissions: ["admin"],
    },
    edit: {
      iconKey: "edit",
      id: "group.edit",
      label: "Edit",
      ariaLabel: "Edit grouped listing",
      description: "Edit this grouped listing.",
      kind: "secondary",
      permissions: ["admin"],
    },
    delete: {
      iconKey: "delete",
      id: "group.delete",
      label: "Delete",
      ariaLabel: "Delete grouped listing",
      description: "Permanently delete this grouped listing.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Delete this grouped listing?",
        body: "This cannot be undone. Member listings are not deleted — only the group that ties them together.",
        confirmLabel: "Delete",
      },
    },
  },
  CATEGORY: {
    view: {
      iconKey: "view",
      id: "category.view",
      label: "View",
      ariaLabel: "View category",
      description: "Open the category detail page.",
      kind: "secondary",
      categoryTypeScope: ["category"],
    },
    create: {
      iconKey: "create",
      id: "category.create",
      label: "New category",
      ariaLabel: "Create a new category",
      description: "Create a new category.",
      kind: "primary",
      permissions: ["admin"],
      categoryTypeScope: ["category"],
    },
    edit: {
      iconKey: "edit",
      id: "category.edit",
      label: "Edit",
      ariaLabel: "Edit category",
      description: "Edit this category.",
      kind: "secondary",
      permissions: ["admin"],
      categoryTypeScope: ["category"],
    },
    delete: {
      iconKey: "delete",
      id: "category.delete",
      label: "Delete",
      ariaLabel: "Delete category",
      description: "Permanently delete this category.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Delete this category?",
        body: "This cannot be undone. Listings filed under it are not deleted, but they will no longer appear on this category page.",
        confirmLabel: "Delete",
      },
      categoryTypeScope: ["category"],
    },
  },
  BRAND: {
    view: {
      iconKey: "view",
      id: "brand.view",
      label: "View",
      ariaLabel: "View brand",
      description: "Open the brand detail page.",
      kind: "secondary",
      categoryTypeScope: ["brand"],
    },
    create: {
      iconKey: "create",
      id: "brand.create",
      label: "New brand",
      ariaLabel: "Create a new brand",
      description: "Create a new brand.",
      kind: "primary",
      permissions: ["admin"],
      categoryTypeScope: ["brand"],
    },
    edit: {
      iconKey: "edit",
      id: "brand.edit",
      label: "Edit",
      ariaLabel: "Edit brand",
      description: "Edit this brand.",
      kind: "secondary",
      permissions: ["admin"],
      categoryTypeScope: ["brand"],
    },
    delete: {
      iconKey: "delete",
      id: "brand.delete",
      label: "Delete",
      ariaLabel: "Delete brand",
      description: "Permanently delete this brand.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Delete this brand?",
        body: "This cannot be undone. Products keep their `brand` string, so they will be orphaned from every brand page until re-filed.",
        confirmLabel: "Delete",
      },
      categoryTypeScope: ["brand"],
    },
  },
  SUBLISTING: {
    view: {
      iconKey: "view",
      id: "sublisting.view",
      label: "View",
      ariaLabel: "View sub-listing",
      description: "Open the sub-listing detail page.",
      kind: "secondary",
      categoryTypeScope: ["sublisting"],
    },
    create: {
      iconKey: "create",
      id: "sublisting.create",
      label: "New sub-listing",
      ariaLabel: "Create a new sub-listing",
      description: "Create a new sub-listing.",
      kind: "primary",
      permissions: ["admin"],
      categoryTypeScope: ["sublisting"],
    },
    edit: {
      iconKey: "edit",
      id: "sublisting.edit",
      label: "Edit",
      ariaLabel: "Edit sub-listing",
      description: "Edit this sub-listing.",
      kind: "secondary",
      permissions: ["admin"],
      categoryTypeScope: ["sublisting"],
    },
    delete: {
      iconKey: "delete",
      id: "sublisting.delete",
      label: "Delete",
      ariaLabel: "Delete sub-listing",
      description: "Permanently delete this sub-listing.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Delete this sub-listing?",
        body: "This cannot be undone.",
        confirmLabel: "Delete",
      },
      categoryTypeScope: ["sublisting"],
    },
  },
  STORE: {
    "follow": {
      iconKey: "wishlist",
      id: "store.follow",
      label: "Follow",
      ariaLabel: "Follow this store",
      description: "Subscribe to new listing and sale notifications from this store.",
      kind: "secondary",
    },
    "unfollow": {
      iconKey: "wishlist",
      id: "store.unfollow",
      label: "Following",
      ariaLabel: "Unfollow this store",
      description: "Unsubscribe from this store's notifications.",
      kind: "ghost",
    },
    "view-all": {
      iconKey: "view",
      id: "store.view-all",
      label: "View all",
      ariaLabel: "View all listings from this store",
      description: "Navigate to the full product listing for this store.",
      kind: "link",
    },
    // ── Offer management ─────────────────────────────────────────────────
    "accept-offer": {
      iconKey: "approve",
      id: "store.accept-offer",
      label: "Accept",
      ariaLabel: "Accept this offer",
      description: "Accept a buyer's offer on a classified listing.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    "reject-offer": {
      iconKey: "reject",
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
      iconKey: "reply",
      id: "store.counter-offer",
      label: "Counter",
      ariaLabel: "Counter this offer",
      description: "Send a counter-offer to the buyer.",
      kind: "secondary",
      permissions: ["seller", "admin"],
    },
    // ── Payout view ──────────────────────────────────────────────────────
    "view-payout": {
      iconKey: "view",
      id: "store.view-payout",
      label: "View Details",
      ariaLabel: "View payout details",
      description: "View the details of a payout.",
      kind: "ghost",
      permissions: ["seller", "admin"],
    },
    "export-payout": {
      iconKey: "export",
      id: "store.export-payout",
      label: "Export",
      ariaLabel: "Export payout details",
      description: "Download payout details as a file.",
      kind: "ghost",
      permissions: ["seller", "admin"],
    },
    "set-payout-reminder": {
      iconKey: "settings",
      id: "store.set-payout-reminder",
      label: "Remind Me",
      ariaLabel: "Toggle a follow-up reminder on this payout",
      description: "Flag this payout for a personal follow-up reminder.",
      kind: "ghost",
      permissions: ["seller"],
    },
    // ── Review management ───────────────────────────────────────────────
    "reply-review": {
      iconKey: "reply",
      id: "store.reply-review",
      label: "Reply",
      ariaLabel: "Reply to this review",
      description: "Post or edit a public store reply to a buyer's review.",
      kind: "secondary",
      permissions: ["seller", "admin"],
    },
    "contest-review": {
      iconKey: "report",
      id: "store.contest-review",
      label: "Contest",
      ariaLabel: "Contest this review",
      description: "Flag a review for admin investigation.",
      kind: "ghost",
      permissions: ["seller", "admin"],
    },
    "buyer-feedback": {
      iconKey: "message",
      id: "store.buyer-feedback",
      label: "Feedback",
      ariaLabel: "Send feedback to buyer",
      description: "Send a private message to the buyer's notification inbox.",
      kind: "ghost",
      permissions: ["seller", "admin"],
    },
    // ── WhatsApp integration ────────────────────────────────────────────
    "whatsapp-connect": {
      iconKey: "link",
      id: "store.whatsapp-connect",
      label: "Save & Connect",
      ariaLabel: "Save WhatsApp credentials and connect",
      description: "Save WhatsApp Business credentials and establish connection.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    "whatsapp-catalog-sync": {
      iconKey: "retry",
      id: "store.whatsapp-catalog-sync",
      label: "Push to WhatsApp",
      ariaLabel: "Sync products to WhatsApp catalog",
      description: "Push published standard products to WhatsApp Business Catalog.",
      kind: "secondary",
      permissions: ["seller", "admin"],
    },
    "whatsapp-catalog-import": {
      iconKey: "upload",
      id: "store.whatsapp-catalog-import",
      label: "Import from WhatsApp",
      ariaLabel: "Import products from WhatsApp catalog",
      description: "Import products from WhatsApp Catalog as drafts.",
      kind: "secondary",
      permissions: ["seller", "admin"],
    },
    // ── Google Reviews integration ──────────────────────────────────────
    "google-reviews-sync": {
      iconKey: "retry",
      id: "store.google-reviews-sync",
      label: "Sync now",
      ariaLabel: "Sync Google Business reviews",
      description: "Pull latest reviews from Google Business profile.",
      kind: "ghost",
      permissions: ["seller", "admin"],
    },
    "save-google-settings": {
      iconKey: "save",
      id: "store.save-google-settings",
      label: "Save Settings",
      ariaLabel: "Save Google Business settings",
      description: "Save Google Business profile configuration.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    // ── Refresh ─────────────────────────────────────────────────────────
    "refresh-offers": {
      iconKey: "retry",
      id: "store.refresh-offers",
      label: "Refresh",
      ariaLabel: "Refresh offers list",
      description: "Reload latest offers and statuses.",
      kind: "ghost",
      permissions: ["seller", "admin"],
    },
    "edit-listing": {
      iconKey: "edit",
      id: "store.edit-listing",
      label: "Edit",
      ariaLabel: "Edit listing",
      description: "Navigate to the edit form for this store listing.",
      kind: "ghost",
      permissions: ["seller", "admin"],
    },
    "delete-listing": {
      iconKey: "delete",
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
      iconKey: "save",
      id: "store.publish-listing",
      label: "Publish",
      description: "Make this listing visible to buyers.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    "unpublish-listing": {
      iconKey: "hide",
      id: "store.unpublish-listing",
      label: "Unpublish",
      description: "Hide this listing from buyers.",
      kind: "secondary",
      permissions: ["seller", "admin"],
    },
    "mark-shipped": {
      iconKey: "ship",
      id: "store.mark-shipped",
      label: "Mark as shipped",
      description: "Update an order status to shipped and enter tracking info.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    "mark-installment-paid": {
      iconKey: "confirm",
      id: "store.mark-installment-paid",
      label: "Mark installment paid",
      ariaLabel: "Mark this EMI installment as paid",
      description: "Record collection of one EMI installment after verifying the buyer's manual transfer proof.",
      kind: "primary",
      permissions: ["seller", "admin"],
      confirmation: {
        title: "Mark this installment as paid?",
        body: "This confirms the buyer's payment was received and verified. The order becomes eligible to ship once every installment is marked paid.",
        confirmLabel: "Mark paid",
        confirmKind: "primary",
      },
    },
    "request-payout": {
      iconKey: "send",
      id: "store.request-payout",
      label: "Request payout",
      description: "Submit a payout request for available store earnings.",
      kind: "primary",
      permissions: ["seller"],
    },
    "save-changes": {
      iconKey: "save",
      id: "store.save-changes",
      label: "Save changes",
      description: "Submit the store listing or settings form.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    "print-labels": {
      iconKey: "export",
      id: "store.print-labels",
      label: "Print Labels",
      ariaLabel: "Print inventory labels for selected products",
      description: "Open the print page for inventory labels for the selected products.",
      kind: "secondary",
      permissions: ["seller", "admin"],
    },
    "set-location": {
      iconKey: "settings",
      id: "store.set-location",
      label: "Set Location",
      ariaLabel: "Set physical storage location for selected items",
      description: "Assign zone, shelf, and bin for the selected inventory items.",
      kind: "ghost",
      permissions: ["seller", "admin"],
    },
    "print-packing-slips": {
      iconKey: "export",
      id: "store.print-packing-slips",
      label: "Print Packing Slips",
      ariaLabel: "Print packing slips for selected orders",
      description: "Open the print page for packing slip labels for the selected orders.",
      kind: "secondary",
      permissions: ["seller", "admin"],
    },
    "open-print-center": {
      iconKey: "view",
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
      iconKey: "create",
      id: "store.create-template",
      label: "Create Template",
      ariaLabel: "Create a new product template",
      description: "Submit the new-template form.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    "update-template": {
      iconKey: "edit",
      id: "store.update-template",
      label: "Save Changes",
      ariaLabel: "Save changes to template",
      description: "Submit the edit-template form.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    "edit-template": {
      iconKey: "edit",
      id: "store.edit-template",
      label: "Edit",
      ariaLabel: "Edit template",
      description: "Open the edit-template drawer for this row.",
      kind: "ghost",
      permissions: ["seller", "admin"],
    },
    "delete-template": {
      iconKey: "delete",
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
      iconKey: "create",
      id: "store.create-bundle",
      label: "Create Bundle",
      ariaLabel: "Create a new bundle",
      description: "Submit the new-bundle form.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    "create-feature": {
      iconKey: "create",
      id: "store.create-feature",
      label: "Create Feature",
      ariaLabel: "Create a new product feature badge",
      description: "Submit the new-feature form.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    "update-slug": {
      iconKey: "edit",
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
      iconKey: "delete",
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
    /*
     * The alerts list rendered a bare `<Button variant="ghost">Delete</Button>`
     * with a raw onClick — no ActionDef, so no confirmation, so one misplaced
     * click silently removed an alert with nothing to undo it (Rule #7).
     */
    "delete-analytics-alert": {
      iconKey: "delete",
      id: "store.delete-analytics-alert",
      label: "Delete",
      ariaLabel: "Delete this analytics alert",
      description: "Permanently removes this alert rule. Past notifications are unaffected.",
      kind: "danger",
      permissions: ["seller", "admin"],
      confirmation: {
        title: "Delete this alert?",
        body: "You will stop being notified when this rule matches. Alerts already sent are unaffected. This cannot be undone.",
        confirmLabel: "Delete alert",
        confirmKind: "danger",
      },
    },
    "cancel-form": {
      iconKey: "cancel",
      id: "store.cancel-form",
      label: "Cancel",
      ariaLabel: "Cancel form and close",
      description: "Discard unsaved changes and close the drawer/form.",
      kind: "ghost",
    },
    "new-template": {
      iconKey: "create",
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
      iconKey: "create",
      id: "blog.create-post",
      label: "New Post",
      ariaLabel: "Create a new blog post",
      description: "Navigate to the blog post editor.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "edit-post": {
      iconKey: "edit",
      id: "blog.edit-post",
      label: "Edit",
      ariaLabel: "Edit this blog post",
      description: "Open the editor for a blog post.",
      kind: "ghost",
      permissions: ["admin", "moderator"],
    },
    "delete-post": {
      iconKey: "delete",
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
      iconKey: "user",
      id: "event.register",
      label: "Register",
      description: "Register to participate in this event.",
      kind: "primary",
    },
    "cancel-registration": {
      iconKey: "cancel",
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
      iconKey: "cancel",
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
    "cancel-order-items": {
      iconKey: "cancel",
      id: "user.cancel-order-items",
      label: "Cancel Selected Items",
      description: "Cancel a subset of items on a pending or confirmed order and continue with the rest.",
      kind: "danger",
      confirmation: {
        title: "Cancel selected items?",
        body: "The selected items will be cancelled and refunded within 5–7 business days. The rest of your order will continue as normal.",
        confirmLabel: "Cancel selected items",
        confirmKind: "danger",
      },
    },
    "request-return": {
      iconKey: "restore",
      id: "user.request-return",
      label: "Request return",
      description: "Raise a return request for a delivered order.",
      kind: "secondary",
    },
    "save-settings": {
      iconKey: "save",
      id: "user.save-settings",
      label: "Save changes",
      description: "Submit the user settings form.",
      kind: "primary",
    },
    "send-verification-email": {
      iconKey: "send",
      id: "user.send-verification-email",
      label: "Send Verification Email",
      description: "Send a verification link to the new email address.",
      kind: "secondary",
    },
    "update-password": {
      iconKey: "edit",
      id: "user.update-password",
      label: "Update Password",
      description: "Submit the change-password form.",
      kind: "secondary",
    },
    "delete-address": {
      iconKey: "delete",
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
      iconKey: "confirm",
      id: "user.set-default-address",
      label: "Set as default",
      ariaLabel: "Set as default address",
      description: "Mark this address as the default delivery address.",
      kind: "ghost",
    },
    // Plan §6 — wishlist bulk actions (sticky bulk-action toolbar leaves).
    "wishlist-bulk-remove": {
      iconKey: "wishlist",
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
      iconKey: "wishlist",
      id: "user.wishlist-bulk-move-to-cart",
      label: "Move to cart",
      ariaLabel: "Move selected items to cart",
      description: "Add the selected wishlist items to your cart.",
      kind: "primary",
    },
    "clear-selection": {
      iconKey: "delete",
      id: "user.clear-selection",
      label: "Deselect",
      ariaLabel: "Clear current selection",
      description: "Exit selection mode.",
      kind: "ghost",
    },
    // ── Order lifecycle ─────────────────────────────────────────────────
    "view-order": {
      id: "user.view-order",
      label: "View Details",
      ariaLabel: "View order details",
      description: "Open the full details of this order.",
      kind: "ghost",
      iconKey: "view",
    },
    "track-order": {
      iconKey: "ship",
      id: "user.track-order",
      label: "Track Order",
      ariaLabel: "Track your order shipment",
      description: "View shipment tracking details for a shipped order.",
      kind: "ghost",
    },
    "reorder": {
      iconKey: "order",
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
      iconKey: "export",
    },
    "write-review": {
      iconKey: "review",
      id: "user.write-review",
      label: "Write Review",
      ariaLabel: "Write a review for this order",
      description: "Leave a review for a product from a delivered order.",
      kind: "secondary",
    },
    "refresh-offers": {
      iconKey: "retry",
      id: "user.refresh-offers",
      label: "Refresh",
      ariaLabel: "Refresh offers",
      description: "Reload latest offers received.",
      kind: "ghost",
    },
    // Plan §10 — claim-coupon wallet (won-coupon entry points & wallet leaves).
    "claim-coupon": {
      iconKey: "confirm",
      id: "user.claim-coupon",
      label: "Claim Coupon",
      ariaLabel: "Claim this coupon to your wallet",
      description: "Add this coupon to your claimed-coupons wallet for use at checkout.",
      kind: "primary",
    },
    "use-claimed-coupon": {
      iconKey: "confirm",
      id: "user.use-claimed-coupon",
      label: "Apply at checkout",
      ariaLabel: "Apply this coupon at checkout",
      description: "Deep-link to checkout with this coupon pre-filled.",
      kind: "link",
    },
    "remove-claimed-coupon": {
      iconKey: "delete",
      id: "user.remove-claimed-coupon",
      label: "Remove",
      ariaLabel: "Remove coupon from wallet",
      description: "Remove this coupon from your wallet (history is preserved).",
      kind: "ghost",
    },
  },
  SELLER: {
    "cancel-bid": {
      iconKey: "cancel",
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
  SHIPMENT: {
    "create": {
      iconKey: "create",
      id: "shipment.create",
      label: "New Shipment",
      ariaLabel: "Create a new procurement shipment",
      description: "Start tracking a new import shipment.",
      kind: "primary",
      permissions: ["admin"],
    },
    "mark-received": {
      iconKey: "confirm",
      id: "shipment.mark-received",
      label: "Mark Received",
      ariaLabel: "Mark this shipment as received",
      description: "Flags the shipment as physically received so processing can begin.",
      kind: "secondary",
      permissions: ["admin"],
    },
    "unlink-item": {
      iconKey: "link",
      id: "shipment.unlink-item",
      label: "Unlink",
      ariaLabel: "Unlink this item from its product",
      description: "Clears the product link on this shipment item without touching the product itself.",
      kind: "ghost",
      permissions: ["admin"],
    },
    "delete": {
      iconKey: "delete",
      id: "shipment.delete",
      label: "Delete",
      ariaLabel: "Delete this shipment",
      description: "Permanently deletes the shipment and all its lots/items.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Delete this shipment?",
        body: "This permanently removes the shipment and all its lots and items. This cannot be undone. Items still linked to a product must be unlinked first.",
        confirmLabel: "Delete shipment",
        confirmKind: "danger",
      },
    },
    /*
     * A LOT, not the whole shipment.
     *
     * The lot row's delete button used `shipment.delete`, so the dialog asked
     * "Delete this shipment?" and warned about removing every lot — while the
     * handler deleted one lot. A confirmation that names the wrong object is
     * worse than none: it is either ignored, or it stops someone doing
     * something harmless.
     */
    "delete-lot": {
      iconKey: "delete",
      id: "shipment.delete-lot",
      label: "Delete",
      ariaLabel: "Delete this lot and its items",
      description: "Permanently deletes this lot and every item in it.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Delete this lot?",
        body: "This permanently removes the lot and every item in it. The rest of the shipment is untouched. Items still linked to a product must be unlinked first.",
        confirmLabel: "Delete lot",
        confirmKind: "danger",
      },
    },
  },
  CATALOGUE: {
    "list-item": {
      iconKey: "create",
      id: "catalogue.list-item",
      label: "List",
      ariaLabel: "List this catalogue item directly",
      description: "Seller-only — turns a catalogue item into a real listing under your own store immediately.",
      kind: "primary",
      permissions: ["seller", "admin"],
    },
    "submit-for-approval": {
      iconKey: "send",
      id: "catalogue.submit-for-approval",
      label: "Request to sell",
      ariaLabel: "Request admin list this item on your behalf",
      description: "Sends this item to admin for review before it's listed.",
      kind: "secondary",
    },
    "unlink": {
      iconKey: "link",
      id: "catalogue.unlink",
      label: "Unlink",
      ariaLabel: "Unlink this catalogue item from its product",
      description: "Clears the product link on this catalogue item without touching the product itself.",
      kind: "ghost",
      permissions: ["admin"],
    },
    "delete": {
      iconKey: "delete",
      id: "catalogue.delete",
      label: "Delete",
      ariaLabel: "Remove this catalogue item",
      description: "Permanently removes this item from your personal catalogue.",
      kind: "danger",
      confirmation: {
        title: "Remove this item from your catalogue?",
        body: "This cannot be undone. Items already listed cannot be deleted from here.",
        confirmLabel: "Remove",
        confirmKind: "danger",
      },
    },
    "approve": {
      iconKey: "approve",
      id: "catalogue.approve",
      label: "Approve",
      ariaLabel: "Approve this catalogue listing request",
      description: "Creates the product under the platform's consignment store and marks the item listed.",
      kind: "primary",
      permissions: ["admin"],
    },
    "reject": {
      iconKey: "reject",
      id: "catalogue.reject",
      label: "Reject",
      ariaLabel: "Reject this catalogue listing request",
      description: "Declines the request and records a reason the owner can see.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Reject this listing request?",
        body: "The owner will see your rejection reason.",
        confirmLabel: "Reject",
        confirmKind: "danger",
      },
    },
  },
  ADMIN: {
    // ── Product moderation ─────────────────────────────────────────────────
    "approve-product": {
      iconKey: "approve",
      id: "admin.approve-product",
      label: "Approve",
      ariaLabel: "Approve listing",
      description: "Mark a pending product listing as approved and visible to buyers.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "reject-product": {
      iconKey: "reject",
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
      iconKey: "ban",
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
      iconKey: "restore",
      id: "admin.unban-user",
      label: "Lift ban",
      ariaLabel: "Lift ban on this user",
      description: "Remove a soft-ban and restore normal account access.",
      kind: "secondary",
      permissions: ["admin"],
    },
    "bulk-suspend-users": {
      iconKey: "ban",
      id: "admin.bulk-suspend-users",
      label: "Suspend selected",
      ariaLabel: "Suspend selected users",
      description: "Disable login for the selected accounts.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Suspend these users?",
        body: "Selected accounts will be disabled from logging in. You can restore them later.",
        confirmLabel: "Suspend",
        confirmKind: "danger",
      },
    },
    "bulk-restore-users": {
      iconKey: "restore",
      id: "admin.bulk-restore-users",
      label: "Restore selected",
      ariaLabel: "Restore selected users",
      description: "Re-enable login for the selected accounts.",
      kind: "secondary",
      permissions: ["admin"],
    },
    "bulk-delete-users": {
      iconKey: "delete",
      id: "admin.bulk-delete-users",
      label: "Delete selected",
      ariaLabel: "Delete selected users",
      description: "Disable the selected accounts.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Delete these users?",
        body: "Selected accounts will be disabled. Their data (orders, reviews) is preserved — this does not permanently erase the account.",
        confirmLabel: "Delete",
        confirmKind: "danger",
      },
    },
    "verify-payment": {
      iconKey: "verify",
      id: "admin.verify-payment",
      label: "Verify Payment",
      ariaLabel: "Mark payment as received and verified",
      description: "Confirms manual cash/UPI payment was received. Moves order to Processing.",
      kind: "primary",
      permissions: ["admin", "moderator"],
      confirmation: {
        title: "Verify payment?",
        body: "This marks the payment as received. The order will move to Processing. This action cannot be undone.",
        confirmLabel: "Yes, verify",
      },
    },
    "request-payment-reupload": {
      iconKey: "upload",
      id: "admin.request-payment-reupload",
      label: "Request Re-upload",
      ariaLabel: "Ask the buyer to re-upload a corrected payment proof",
      description: "Clears the current proof and gives the buyer 15 more minutes to resubmit — for honest mistakes (blurry screenshot, wrong amount), not fraud.",
      kind: "secondary",
      permissions: ["admin", "moderator"],
      confirmation: {
        title: "Request a proof re-upload?",
        body: "The buyer's current proof will be cleared and they'll get 15 more minutes to resubmit. Use this for honest mistakes, not suspected fraud.",
        confirmLabel: "Request re-upload",
      },
    },
    "reject-payment-fraud": {
      iconKey: "reject",
      id: "admin.reject-payment-fraud",
      label: "Reject as Fraudulent",
      ariaLabel: "Reject this payment proof as fraudulent, cancel the order, and ban the account",
      description: "Cancels the order, restores stock, and triggers a temporary 7-day full-account ban. Use only for suspected deliberate fraud, not honest mistakes.",
      kind: "danger",
      permissions: ["admin", "moderator"],
      confirmation: {
        title: "Reject as fraudulent?",
        body: "This cancels the order, returns the item to stock, and suspends the buyer's account for 7 days. This is severe — use only for suspected deliberate fraud, not an honest mistake.",
        confirmLabel: "Reject and ban 7 days",
        confirmKind: "danger",
      },
    },
    "verify-vendor": {
      iconKey: "verify",
      id: "admin.verify-vendor",
      label: "Verify vendor",
      ariaLabel: "Grant verified-vendor status",
      description: "Grant verified-vendor badge to a seller account.",
      kind: "primary",
      permissions: ["admin"],
    },
    "unverify-vendor": {
      iconKey: "reject",
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
      iconKey: "verify",
      id: "admin.verify-store",
      label: "Verify store",
      ariaLabel: "Verify this store",
      description: "Grant verified status to a store.",
      kind: "primary",
      permissions: ["admin"],
    },
    "suspend-store": {
      iconKey: "ban",
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
      iconKey: "approve",
      id: "admin.approve-review",
      label: "Approve",
      ariaLabel: "Approve review",
      description: "Publish a pending product review.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "reject-review": {
      iconKey: "reject",
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
      iconKey: "approve",
      id: "admin.approve-return",
      label: "Approve return",
      ariaLabel: "Approve return request",
      description: "Approve a return request and initiate the refund flow.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "reject-return": {
      iconKey: "reject",
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
    "calculate-payouts": {
      iconKey: "analytics",
      id: "admin.calculate-payouts",
      label: "Calculate Payouts",
      ariaLabel: "Run the weekly payout eligibility calculation",
      description: "Runs the same weekly sweep as the scheduled job on demand, generating pending payout records for eligible sellers.",
      kind: "primary",
      permissions: ["admin"],
    },
    "grant-payout": {
      iconKey: "approve",
      id: "admin.grant-payout",
      label: "Approve payout",
      ariaLabel: "Approve payout request",
      description: "Approve a seller payout request and trigger the transfer.",
      kind: "primary",
      permissions: ["admin"],
    },
    "hold-payout": {
      iconKey: "pause",
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
      iconKey: "retry",
      id: "admin.rebuild-bundle",
      label: "Rebuild bundle",
      ariaLabel: "Trigger bundle stock rebuild",
      description: "Recalculate bundle availability from its constituent product stock.",
      kind: "secondary",
      permissions: ["admin"],
    },
    // ── Dev / system ───────────────────────────────────────────────────────
    "reset-seed-data": {
      iconKey: "retry",
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
      iconKey: "save",
      id: "admin.save-changes",
      label: "Save changes",
      description: "Submit any admin editor form.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "export-csv": {
      iconKey: "export",
      id: "admin.export-csv",
      label: "Export CSV",
      ariaLabel: "Export data as CSV",
      description: "Download the current view's data as a CSV file.",
      kind: "ghost",
      permissions: ["admin", "moderator"],
    },
    // ── Order management ──────────────────────────────────────────────────
    "mark-shipped": {
      iconKey: "ship",
      id: "admin.mark-shipped",
      label: "Mark as Shipped",
      ariaLabel: "Mark order as shipped",
      description: "Update an order status to shipped.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "mark-delivered": {
      iconKey: "ship",
      id: "admin.mark-delivered",
      label: "Mark as Delivered",
      ariaLabel: "Mark order as delivered",
      description: "Update an order status to delivered.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "mark-installment-paid": {
      iconKey: "confirm",
      id: "admin.mark-installment-paid",
      label: "Mark installment paid",
      ariaLabel: "Mark this EMI installment as paid",
      description: "Record collection of one EMI installment after verifying the buyer's manual transfer proof.",
      kind: "primary",
      permissions: ["admin", "moderator"],
      confirmation: {
        title: "Mark this installment as paid?",
        body: "This confirms the buyer's payment was received and verified. The order becomes eligible to ship once every installment is marked paid.",
        confirmLabel: "Mark paid",
        confirmKind: "primary",
      },
    },
    "cancel-order": {
      iconKey: "cancel",
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
      iconKey: "confirm",
      id: "admin.mark-paid",
      label: "Mark Paid",
      ariaLabel: "Mark payout as paid",
      description: "Mark a payout as paid after transfer has been completed.",
      kind: "primary",
      permissions: ["admin"],
    },
    // ── Session management ────────────────────────────────────────────────
    "revoke-session": {
      iconKey: "ban",
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
      iconKey: "confirm",
      id: "admin.mark-read",
      label: "Mark Read",
      ariaLabel: "Mark selected notifications as read",
      description: "Mark one or more notifications as read.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "delete-notification": {
      iconKey: "delete",
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
    // ── Tester QA management ──────────────────────────────────────────────
    "mark-feedback-reviewed": {
      iconKey: "confirm",
      id: "admin.mark-feedback-reviewed",
      label: "Mark Reviewed",
      ariaLabel: "Mark this tester feedback as reviewed",
      description: "Mark a tester feedback submission as reviewed by the dev team.",
      kind: "secondary",
      permissions: ["admin"],
    },
    "export-tester-feedback": {
      iconKey: "export",
      id: "admin.export-tester-feedback",
      label: "Download Report",
      ariaLabel: "Download tester feedback as a Markdown report",
      description: "Download every tester checklist response as a Markdown file, grouped by feature area, for offline triage.",
      kind: "ghost",
      permissions: ["admin"],
    },
    "export-event-entries": {
      iconKey: "export",
      id: "admin.export-event-entries",
      label: "Download Report",
      ariaLabel: "Download this event's entries as a Markdown report",
      description: "Download an event's entries as a Markdown file — a per-option vote tally for polls, or individual entries (submitter, status, points, responses) for every other event type.",
      kind: "ghost",
      permissions: ["admin"],
    },
    "create-checklist-item": {
      iconKey: "create",
      id: "admin.create-checklist-item",
      label: "Add Test Case",
      ariaLabel: "Add a new tester checklist item",
      description: "Create a new test case in the tester QA checklist catalog.",
      kind: "primary",
      permissions: ["admin"],
    },
    "edit-checklist-item": {
      iconKey: "edit",
      id: "admin.edit-checklist-item",
      label: "Edit",
      ariaLabel: "Edit this tester checklist item",
      description: "Edit an existing test case in the tester QA checklist catalog.",
      kind: "secondary",
      permissions: ["admin"],
    },
    "delete-checklist-item": {
      iconKey: "delete",
      id: "admin.delete-checklist-item",
      label: "Delete",
      ariaLabel: "Delete this tester checklist item",
      description: "Permanently delete a test case from the tester QA checklist catalog.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Delete this checklist item?",
        body: "This test case will be permanently removed from the tester QA checklist. Any tester answers already recorded for it are kept, but the item will no longer appear on the Tester Hub.",
        confirmLabel: "Delete",
        confirmKind: "danger",
      },
    },
    "confirm-bug": {
      iconKey: "confirm",
      id: "admin.confirm-bug",
      label: "Mark as Bug",
      ariaLabel: "Confirm this as a real bug and credit the reporting tester",
      description:
        "Confirms this reported issue as a real bug, credits the reporting tester as the bug hunter, and disables the case for all other testers.",
      kind: "danger",
      permissions: ["admin"],
      confirmation: {
        title: "Confirm this bug?",
        body: "This credits the reporting tester as the bug hunter for this case and disables it so no other tester can answer it. This can't be undone from the UI.",
        confirmLabel: "Mark as Bug",
        confirmKind: "danger",
      },
    },
    "reopen-checklist-item": {
      iconKey: "restore",
      id: "admin.reopen-checklist-item",
      label: "Reopen as New Test Case",
      ariaLabel: "Reopen this fixed case as a new version for retest",
      description:
        "Once a confirmed bug is fixed, reopen it as a new version (v+1) for testers to retest — the old disabled case stays in the database with its bug-hunter credit intact.",
      kind: "secondary",
      permissions: ["admin"],
      confirmation: {
        title: "Reopen this case for retest?",
        body: "This creates a new, active version of this test case for testers to answer again. The old case stays disabled in the database — its bug-hunter credit is not affected.",
        confirmLabel: "Reopen",
        confirmKind: "primary",
      },
    },
    "resend-notification": {
      iconKey: "send",
      id: "admin.resend-notification",
      label: "Resend",
      ariaLabel: "Resend this notification",
      description: "Re-send a notification to the recipient.",
      kind: "ghost",
      permissions: ["admin"],
    },
    // ── Blog management ───────────────────────────────────────────────────
    "publish-blog": {
      iconKey: "save",
      id: "admin.publish-blog",
      label: "Publish Selected",
      ariaLabel: "Publish selected blog posts",
      description: "Set selected blog posts to published status.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "draft-blog": {
      iconKey: "edit",
      id: "admin.draft-blog",
      label: "Move to Draft",
      ariaLabel: "Move selected posts to draft",
      description: "Revert selected blog posts to draft status.",
      kind: "secondary",
      permissions: ["admin", "moderator"],
    },
    // ── Brand & category management ───────────────────────────────────────
    "edit-brand": {
      iconKey: "edit",
      id: "admin.edit-brand",
      label: "Edit Brand",
      ariaLabel: "Edit this brand",
      description: "Open the edit panel for a brand.",
      kind: "primary",
      permissions: ["admin"],
    },
    "edit-category": {
      iconKey: "edit",
      id: "admin.edit-category",
      label: "Edit Category",
      ariaLabel: "Edit this category",
      description: "Open the edit panel for a category.",
      kind: "primary",
      permissions: ["admin"],
    },
    // ── Feature & prize-draw management ────────────────────────────────────
    "delete-feature": {
      iconKey: "delete",
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
      iconKey: "delete",
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
      iconKey: "review",
      id: "admin.toggle-featured",
      label: "Toggle Featured",
      ariaLabel: "Toggle featured status",
      description: "Toggle whether the selected products appear in featured sections.",
      kind: "secondary",
      permissions: ["admin", "moderator"],
    },
    "toggle-promoted": {
      iconKey: "analytics",
      id: "admin.toggle-promoted",
      label: "Toggle Promoted",
      ariaLabel: "Toggle promoted status",
      description: "Toggle whether the selected products appear in promoted placements.",
      kind: "secondary",
      permissions: ["admin"],
    },
    "toggle-on-sale": {
      iconKey: "analytics",
      id: "admin.toggle-on-sale",
      label: "Toggle On Sale",
      ariaLabel: "Toggle on-sale status",
      description: "Toggle the on-sale flag for the selected products.",
      kind: "secondary",
      permissions: ["admin", "moderator"],
    },
    // ── Bundle management ─────────────────────────────────────────────────
    "activate-bundle": {
      iconKey: "resume",
      id: "admin.activate-bundle",
      label: "Activate",
      ariaLabel: "Activate selected bundles",
      description: "Set the selected bundles to active status.",
      kind: "primary",
      permissions: ["admin"],
    },
    "deactivate-bundle": {
      iconKey: "pause",
      id: "admin.deactivate-bundle",
      label: "Deactivate",
      ariaLabel: "Deactivate selected bundles",
      description: "Set the selected bundles to inactive status.",
      kind: "secondary",
      permissions: ["admin"],
    },
    "delete-bundle": {
      iconKey: "delete",
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
      iconKey: "settings",
      id: "admin.manage-store",
      label: "Manage Store",
      ariaLabel: "Manage this store",
      description: "Open the store management panel.",
      kind: "primary",
      permissions: ["admin"],
    },
    "manage-user": {
      iconKey: "settings",
      id: "admin.manage-user",
      label: "Manage Selected",
      ariaLabel: "Manage selected users",
      description: "Open the user management panel.",
      kind: "primary",
      permissions: ["admin"],
    },
    // ── Carousel management ──────────────────────────────────────────────
    "edit-carousel": {
      iconKey: "edit",
      id: "admin.edit-carousel",
      label: "Edit Slide",
      ariaLabel: "Edit carousel slide",
      description: "Open the edit panel for a carousel slide.",
      kind: "ghost",
      permissions: ["admin"],
    },
    "delete-carousel": {
      iconKey: "delete",
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
      iconKey: "confirm",
      id: "admin.mark-contact-read",
      label: "Mark Read",
      ariaLabel: "Mark selected messages as read",
      description: "Mark one or more contact messages as read.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "archive-contact": {
      iconKey: "archive",
      id: "admin.archive-contact",
      label: "Archive Messages",
      ariaLabel: "Archive selected messages",
      description: "Move the selected contact messages to archive.",
      kind: "secondary",
      permissions: ["admin", "moderator"],
    },
    "delete-contact": {
      iconKey: "delete",
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
      iconKey: "email",
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
      iconKey: "edit",
      id: "admin.edit-team-member",
      label: "Edit Permissions",
      ariaLabel: "Edit team member permissions",
      description: "Open the permissions editor for a team member.",
      kind: "ghost",
      permissions: ["admin"],
    },
    "remove-team-member": {
      iconKey: "delete",
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
      iconKey: "delete",
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
      iconKey: "archive",
      id: "admin.archive-faq",
      label: "Archive FAQs",
      ariaLabel: "Archive selected FAQs",
      description: "Archive the selected FAQ entries.",
      kind: "secondary",
      permissions: ["admin", "moderator"],
    },
    // ── Coupon management ─────────────────────────────────────────────────
    "delete-coupon": {
      iconKey: "delete",
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
      iconKey: "edit",
      id: "admin.edit-coupon",
      label: "Edit Coupon",
      ariaLabel: "Edit this coupon",
      description: "Open the edit panel for a coupon.",
      kind: "ghost",
      permissions: ["admin"],
    },
    "duplicate-coupon": {
      iconKey: "duplicate",
      id: "admin.duplicate-coupon",
      label: "Duplicate",
      ariaLabel: "Duplicate this coupon",
      description: "Create a copy of this coupon with a new code.",
      kind: "ghost",
      permissions: ["admin"],
    },
    // ── Navigation management ─────────────────────────────────────────────
    "edit-nav": {
      iconKey: "edit",
      id: "admin.edit-nav",
      label: "Edit",
      ariaLabel: "Edit navigation item",
      description: "Edit a navigation menu item.",
      kind: "ghost",
      permissions: ["admin"],
    },
    "delete-nav": {
      iconKey: "delete",
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
      iconKey: "delete",
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
      iconKey: "verify",
      id: "admin.verify-scammer",
      label: "Verify Report",
      ariaLabel: "Verify this scammer report",
      description: "Mark a scammer report as verified after review.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "dismiss-scammer": {
      iconKey: "reject",
      id: "admin.dismiss-scammer",
      label: "Dismiss",
      ariaLabel: "Dismiss this scammer report",
      description: "Dismiss a scammer report as unverified.",
      kind: "secondary",
      permissions: ["admin", "moderator"],
    },
    "delete-scammer": {
      iconKey: "delete",
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
      iconKey: "view",
      id: "admin.view-ticket",
      label: "View Details",
      ariaLabel: "View support ticket details",
      description: "Open the full support ticket details.",
      kind: "ghost",
      permissions: ["admin", "moderator"],
    },
    "close-ticket": {
      iconKey: "cancel",
      id: "admin.close-ticket",
      label: "Close Tickets",
      ariaLabel: "Close selected tickets",
      description: "Close the selected support tickets.",
      kind: "secondary",
      permissions: ["admin", "moderator"],
    },
    "escalate-ticket": {
      iconKey: "report",
      id: "admin.escalate-ticket",
      label: "Escalate",
      ariaLabel: "Escalate this ticket",
      description: "Escalate a support ticket to a higher priority.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    // ── Event entry management ────────────────────────────────────────────
    "approve-entry": {
      iconKey: "approve",
      id: "admin.approve-entry",
      label: "Approve Entries",
      ariaLabel: "Approve selected event entries",
      description: "Approve the selected event entries.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "reject-entry": {
      iconKey: "reject",
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
      iconKey: "confirm",
      id: "admin.confirm-entry",
      label: "Confirm",
      ariaLabel: "Confirm this event entry",
      description: "Confirm a single event entry.",
      kind: "primary",
      permissions: ["admin", "moderator"],
    },
    "waitlist-entry": {
      iconKey: "pause",
      id: "admin.waitlist-entry",
      label: "Waitlist",
      ariaLabel: "Waitlist this event entry",
      description: "Move a single event entry to waitlist.",
      kind: "secondary",
      permissions: ["admin", "moderator"],
    },
    "cancel-entry": {
      iconKey: "cancel",
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
      iconKey: "review",
      id: "admin.feature-review",
      label: "Feature",
      ariaLabel: "Feature this review",
      description: "Feature a review on the product page.",
      kind: "ghost",
      permissions: ["admin", "moderator"],
    },
    "unfeature-review": {
      iconKey: "review",
      id: "admin.unfeature-review",
      label: "Unfeature",
      ariaLabel: "Unfeature this review",
      description: "Remove a review from the featured section.",
      kind: "ghost",
      permissions: ["admin", "moderator"],
    },
    // ── Scammer management (row-level) ────────────────────────────────
    "review-scammer": {
      iconKey: "review",
      id: "admin.review-scammer",
      label: "Review",
      ariaLabel: "Review this scammer report",
      description: "Open the scammer profile for detailed review.",
      kind: "ghost",
      permissions: ["admin", "moderator"],
    },
    // ── Bid management ────────────────────────────────────────────────────
    "cancel-bid": {
      iconKey: "cancel",
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
    "cancel-offer": {
      iconKey: "cancel",
      id: "admin.cancel-offer",
      label: "Cancel Offer",
      ariaLabel: "Cancel this offer",
      description:
        "Expire the offer, clear it from the buyer's cart, and notify them. Admin cannot accept or counter on a seller's behalf.",
      kind: "danger",
      // Admin only. The route is ROLES_ADMIN_ONLY, so listing "moderator" here
      // showed a moderator an action that could only ever return 403.
      permissions: ["admin"],
      confirmation: {
        title: "Cancel this offer?",
        body: "The offer will be expired and removed from the buyer's cart, and they'll be notified. This cannot be undone — the buyer would need to make a new offer.",
        confirmLabel: "Cancel offer",
        confirmKind: "danger",
      },
    },
    // ── Address ban management ─────────────────────────────────────────────
    "ban-address": {
      iconKey: "ban",
      id: "admin.ban-address",
      label: "Ban Address",
      ariaLabel: "Ban this address",
      description: "Ban an address from being used on the platform.",
      kind: "danger",
      permissions: ["admin", "moderator"],
      confirmation: {
        title: "Ban this address?",
        body: "The address will be blocked from use at checkout across all accounts.",
        confirmLabel: "Ban address",
        confirmKind: "danger",
      },
    },
    "approve-unban": {
      iconKey: "approve",
      id: "admin.approve-unban",
      label: "Approve Unban",
      ariaLabel: "Approve unban request",
      description: "Approve an address unban request and restore it to active.",
      kind: "primary",
      permissions: ["admin"],
    },
    "reject-unban": {
      iconKey: "reject",
      id: "admin.reject-unban",
      label: "Reject Unban",
      ariaLabel: "Reject unban request",
      description: "Reject an address unban request — address stays banned.",
      kind: "secondary",
      permissions: ["admin"],
    },
    // ── Payment method ban management ──────────────────────────────────────
    "ban-payment-method": {
      iconKey: "ban",
      id: "admin.ban-payment-method",
      label: "Ban Payment Method",
      ariaLabel: "Ban this payment method",
      description: "Ban a payment identifier from being used on the platform.",
      kind: "danger",
      permissions: ["admin", "moderator"],
      confirmation: {
        title: "Ban this payment method?",
        body: "The payment identifier will be blocked from checkout across all accounts.",
        confirmLabel: "Ban payment method",
        confirmKind: "danger",
      },
    },
    "approve-payment-unban": {
      iconKey: "approve",
      id: "admin.approve-payment-unban",
      label: "Approve Unban",
      ariaLabel: "Approve payment method unban",
      description: "Approve a payment method unban request.",
      kind: "primary",
      permissions: ["admin"],
    },
    "reject-payment-unban": {
      iconKey: "reject",
      id: "admin.reject-payment-unban",
      label: "Reject Unban",
      ariaLabel: "Reject payment method unban",
      description: "Reject a payment method unban request — stays banned.",
      kind: "secondary",
      permissions: ["admin"],
    },
  },
  CART: {
    "clear-cart": {
      iconKey: "delete",
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
      iconKey: "delete",
      id: "cart.remove-item",
      label: "Remove",
      ariaLabel: "Remove item from cart",
      description: "Remove a single line item from the cart.",
      kind: "ghost",
    },
    "checkout": {
      iconKey: "cart",
      id: "cart.checkout",
      label: "Proceed to checkout",
      description: "Navigate from the cart page to the checkout flow.",
      kind: "primary",
    },
    "continue-shopping": {
      iconKey: "back",
      id: "cart.continue-shopping",
      label: "Continue shopping",
      description: "Navigate back from the cart to the product catalogue.",
      kind: "ghost",
    },
    "add-group-to-cart": {
      iconKey: "cart",
      id: "cart.add-group-to-cart",
      label: "Add selected to cart",
      ariaLabel: "Add the selected group items to the cart as one line",
      description:
        "Add a buyer-assembled selection of group members to the cart as a SINGLE line, rather than one line per product.",
      kind: "primary",
    },
    "add-bundle-to-cart": {
      iconKey: "cart",
      id: "cart.add-bundle-to-cart",
      label: "Add to cart",
      ariaLabel: "Add this bundle to the cart",
      description:
        "Add a whole bundle to the cart. Bundles are all-or-nothing — the quantity is the number of COPIES of the bundle.",
      kind: "primary",
    },
    "remove-group-member": {
      iconKey: "delete",
      id: "cart.remove-group-member",
      label: "Remove",
      ariaLabel: "Remove this item from the group line",
      description:
        "Drop one member out of a grouped cart line. Ghost rather than danger on purpose: it reuses the cart's existing undo affordance, and Rule #7.4's mandatory-confirmation requirement applies to destructive actions.",
      kind: "ghost",
    },
    // No iconKey — these two exist only to keep the stepper's accessible names
    // in the registry rather than hard-coded in the primitive. The glyphs are
    // the literal "+" / "−" characters.
    "increase-quantity": {
      id: "cart.increase-quantity",
      label: "+",
      ariaLabel: "Increase quantity",
      description: "Default accessible name for QuantityStepper's increment control.",
      kind: "ghost",
    },
    "decrease-quantity": {
      id: "cart.decrease-quantity",
      label: "−",
      ariaLabel: "Decrease quantity",
      description: "Default accessible name for QuantityStepper's decrement control.",
      kind: "ghost",
    },
  },
  CHECKOUT: {
    "place-order": {
      iconKey: "bid",
      id: "checkout.place-order",
      label: "Place order",
      description: "Submit the order with the chosen payment method.",
      kind: "primary",
    },
    "continue-to-verification": {
      iconKey: "back",
      id: "checkout.continue-to-verification",
      label: "Continue",
      description: "Advance from address selection to the payment step.",
      kind: "primary",
    },
    "continue-to-payment": {
      iconKey: "cart",
      id: "checkout.continue-to-payment",
      label: "Continue to payment",
      description: "Advance from the add-ons & fees step to the payment step.",
      kind: "primary",
    },
    back: {
      iconKey: "back",
      id: "checkout.back",
      label: "Back",
      description:
        "Return to the previous checkout step. Safe at any point before payment — add-on selections are persisted to the cart as they are made, so nothing is lost.",
      kind: "ghost",
    },
    "verify-otp": {
      iconKey: "verify",
      id: "checkout.verify-otp",
      label: "Verify & Continue",
      description: "Submit the high-value-order one-time code and proceed to payment.",
      kind: "primary",
    },
    "resend-otp": {
      iconKey: "send",
      id: "checkout.resend-otp",
      label: "Resend code",
      description: "Re-send the high-value-order verification code to the buyer's registered email.",
      kind: "ghost",
    },
    "pay-online": {
      iconKey: "cart",
      id: "checkout.pay-online",
      label: "Pay Online (Razorpay)",
      description: "Initiate an online payment via Razorpay UPI/Card/NetBanking.",
      kind: "primary",
    },
    "pay-cod": {
      iconKey: "cart",
      id: "checkout.pay-cod",
      label: "Cash on Delivery",
      description: "Place the order for cash-on-delivery payment.",
      kind: "secondary",
    },
    "admin-bypass": {
      iconKey: "lock",
      id: "checkout.admin-bypass",
      label: "Skip Verification — Admin Bypass",
      description: "Admin test mode: skip identity verification and place a test order without payment.",
      kind: "secondary",
    },
    "admin-bypass-payment": {
      iconKey: "lock",
      id: "checkout.admin-bypass-payment",
      label: "No Payment — Admin Bypass Order",
      description: "Admin test mode: place a real order record without charging any payment.",
      kind: "secondary",
    },
    "apply-coupon": {
      iconKey: "confirm",
      id: "checkout.apply-coupon",
      label: "Apply coupon",
      description: "Validate and apply a coupon code at checkout before payment.",
      kind: "secondary",
    },
    "remove-coupon": {
      iconKey: "delete",
      id: "checkout.remove-coupon",
      label: "Remove coupon",
      description: "Remove an applied coupon from the current checkout session.",
      kind: "ghost",
    },
  },
  NAV: {
    "sign-in": {
      iconKey: "user",
      id: "nav.sign-in",
      label: "Sign in",
      description: "Navigate to the sign-in page.",
      kind: "primary",
    },
    "sign-up": {
      iconKey: "user",
      id: "nav.sign-up",
      label: "Sign up",
      description: "Navigate to the registration page.",
      kind: "secondary",
    },
    "sign-out": {
      iconKey: "back",
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
      iconKey: "duplicate",
      id: "media.copy-url",
      label: "Copy URL",
      ariaLabel: "Copy media URL to clipboard",
      description: "Copy the storage URL of a media file to clipboard.",
      kind: "ghost",
    },
    "clear-previews": {
      iconKey: "delete",
      id: "media.clear-previews",
      label: "Clear previews",
      ariaLabel: "Clear uploaded previews",
      description: "Remove all preview images from the current session.",
      kind: "secondary",
      permissions: ["admin", "moderator"],
    },
    "discard-staged": {
      iconKey: "delete",
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
      iconKey: "create",
      id: "support.create-ticket",
      label: "Contact Support",
      ariaLabel: "Create a support ticket",
      description: "Open the support ticket form.",
      kind: "primary",
    },
    "reply-ticket": {
      iconKey: "reply",
      id: "support.reply-ticket",
      label: "Reply",
      ariaLabel: "Reply to this ticket",
      description: "Add a reply to an open support ticket.",
      kind: "primary",
    },
    "close-ticket": {
      iconKey: "cancel",
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
  TESTER: {
    "save-note": {
      iconKey: "save",
      id: "tester.save-note",
      label: "Save Note",
      ariaLabel: "Save comment and screenshot for this step",
      description: "Save your comment and screenshot for this checklist step.",
      kind: "primary",
    },
  },
  LOTTERY: {
    "pull": {
      iconKey: "retry",
      id: "lottery.pull",
      label: "Submit Entry",
      description: "Submit a lottery pull entry — slot assigned immediately.",
      kind: "primary",
    },
    "flag-entry": {
      iconKey: "report",
      id: "lottery.flag-entry",
      label: "Flag as Scammer",
      description: "Flag a lottery entry as fraudulent.",
      kind: "danger",
      permissions: ["admin", "moderator"],
      confirmation: {
        title: "Flag this entry?",
        body: "Entry will be marked fraudulent. Their claimed slot stays booked until you manually reopen it.",
        confirmLabel: "Flag entry",
        confirmKind: "danger",
      },
    },
    "reopen-slot": {
      iconKey: "restore",
      id: "lottery.reopen-slot",
      label: "Reopen Slot",
      description: "Free a flagged entry's slot so it can be claimed again.",
      kind: "secondary",
      permissions: ["admin"],
      confirmation: {
        title: "Reopen this slot?",
        body: "The slot will be available for new pulls. The flagged entry's slot assignment is removed.",
        confirmLabel: "Reopen",
      },
    },
    "cancel": {
      iconKey: "cancel",
      id: "lottery.cancel",
      label: "Cancel Lottery",
      description: "Close the draw window and reject pending pulls.",
      kind: "danger",
      permissions: ["admin", "moderator"],
      confirmation: {
        title: "Cancel lottery?",
        body: "Draw window closes immediately. Pending pulls rejected.",
        confirmLabel: "Cancel",
        confirmKind: "danger",
      },
    },
  },
};

/** Sugar — `act("PRODUCT", "add-to-cart")` reads more naturally at call sites. */
export function act(resource: ActionResource, id: string): ActionDef | null {
  return action(ACTIONS, resource, id);
}
