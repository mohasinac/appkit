/**
 * Cart Domain Actions (appkit)
 *
 * Pure business functions — auth, rate-limiting, and Next.js specifics
 * are handled by the calling server action in the consumer.
 */

import { serverLogger } from "../../../monitoring";
import { ValidationError } from "../../../errors";
import { cartRepository } from "../repository/cart.repository";
import { productRepository } from "../../products/repository/products.repository";
import { storeRepository } from "../../stores/repository/store.repository";
import { normalizeListingType } from "../../products/utils/listing-type";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import { CART_LANE, activeLane, canAddNewItems } from "../../../_internal/shared/checkout/lanes";
import { CART_MAX_ITEMS } from "../../../constants/limits";
import {
  getExpandedDecrements,
  validateCartItemStock,
} from "../../../_internal/server/features/checkout/bundle-expansion";
import type { ProductDocument } from "../../products/schemas/firestore";
import { safeRead } from "../../../errors/safe-read";
import {
  checkGroupRules,
  readGroupRules,
  type GroupRules,
} from "../../../_internal/shared/features/products/group-rules";
import type {
  AddToCartInput,
  CartDocument,
  CartGroupSource,
  CartItemDocument,
  CartLineMember,
  UpdateCartItemInput,
  UpdateCartGroupMembersInput,
} from "../schemas";

/**
 * Product documents don't always carry a denormalized `storeName` — the
 * create routes only set it when the caller explicitly passes one, so
 * listings created without it leave the field undefined forever. Cart items
 * built from those products then fell back to displaying the raw `storeId`
 * slug (e.g. "store-letitrip-official") in the UI. Resolving from the store
 * document here — the single add-to-cart chokepoint — fixes every caller at
 * once instead of patching each product-creation call site.
 */
async function resolveStoreName(storeId: string, candidate: string | undefined): Promise<string> {
  if (candidate) return candidate;
  const store = await safeRead(() => storeRepository.findById(storeId), {
    route: "/cart", key: "stores.findById", fallback: null,
  });
  return store?.storeName ?? storeId;
}

/**
 * Lane gate. While a higher-obligation lane (a won collector drop, then an accepted
 * offer) is outstanding, no NEW shopping may be added — otherwise the buyer can
 * keep deferring something they already committed to by piling more into the
 * cart. Enforced on the server, not only in the UI: the UI hint is a courtesy,
 * this is the rule.
 *
 * 🛑 Every add-to-cart entry point must call this. It lived inline inside
 * `addItemToCart` and therefore covered exactly one of the four ways a line can
 * be created — `addBundleToCartAction` and `POST /api/cart` both call
 * `cartRepository.addItem` directly and so bypassed it entirely, letting a buyer
 * with an unpaid collector drop win keep shopping.
 *
 * Returns the loaded cart so the caller doesn't pay a second read.
 */
export async function assertCanAddNewItems(userId: string): Promise<CartDocument> {
  const cart = await cartRepository.getOrCreate(userId);
  if (!canAddNewItems(cart.items ?? [])) {
    const blocking = activeLane(cart.items ?? []);
    throw new ValidationError(
      blocking === CART_LANE.COLLECTOR_DROP
        ? "Settle your won collector drop first — you can add other items once it's paid for."
        : "Complete your accepted offer first — you can add other items once it's paid for.",
      { code: CART_LANE_BLOCKED },
    );
  }
  return cart;
}

export async function addItemToCart(
  userId: string,
  input: AddToCartInput,
): Promise<CartDocument> {
  serverLogger.debug("addItemToCart", { userId, productId: input.productId });
  // SB-UNI-F 2026-05-13 — capability gate. Classified + live listings reject
  // add-to-cart at the action layer. UI surfaces a chat-only / jurisdiction
  // CTA for those types instead.
  const { canAddToCart } = await import(
    "../../../_internal/shared/listing-types/capabilities"
  );
  if (!canAddToCart(input.listingType)) {
    throw new ValidationError(
      `Listings of type "${input.listingType}" cannot be added to the cart.`,
    );
  }
  await assertCanAddNewItems(userId);

  const storeName = await resolveStoreName(input.storeId, input.storeName);
  return cartRepository.addItem(userId, { ...input, storeName });
}

/** Error code the client maps to a lane-aware message. */
export const CART_LANE_BLOCKED = "CART_LANE_BLOCKED";

/** Max members one grouped line may hold. Keeps the batch read bounded (Rule #6). */
export const GROUP_LINE_MAX_MEMBERS = 20;

export interface AddGroupLineToCartInput {
  /** `product.groupId` for a product group, or the `groupedListings` doc id. */
  groupId: string;
  groupSource: CartGroupSource;
  /** Ids and quantities ONLY — every other field is re-resolved server-side. */
  members: Array<{ productId: string; quantity: number }>;
}

/**
 * Add a buyer-assembled selection of group members as ONE cart line.
 *
 * The client sends ids and quantities and nothing else. Accepting a price, a
 * title or an image from the browser would be a ₹1-group exploit; every
 * snapshot below is read from Firestore here.
 *
 * A rejected member fails the WHOLE request, naming the offender. Silently
 * dropping it would hand the buyer a line that quietly isn't what they picked —
 * the "wrong data, no error" failure nobody can report.
 */
export async function addGroupLineToCart(
  userId: string,
  input: AddGroupLineToCartInput,
): Promise<CartDocument> {
  const { groupId, groupSource, members } = input;
  if (!groupId) throw new ValidationError("A group id is required.");
  if (!members.length) throw new ValidationError("Select at least one item to add.");
  if (members.length > GROUP_LINE_MAX_MEMBERS) {
    throw new ValidationError(
      `A single group line can hold at most ${GROUP_LINE_MAX_MEMBERS} different items.`,
    );
  }
  for (const m of members) {
    if (!Number.isInteger(m.quantity) || m.quantity < 1) {
      throw new ValidationError("Every selected item needs a whole quantity of at least 1.");
    }
  }
  if (new Set(members.map((m) => m.productId)).size !== members.length) {
    throw new ValidationError("The same item was selected twice.");
  }

  const cart = await assertCanAddNewItems(userId);

  // One batched read for the whole selection — capped at 20 above, so well
  // inside the per-request Firestore budget.
  const docs = await Promise.all(
    members.map((m) =>
      safeRead(() => productRepository.findById(m.productId), {
        route: "/cart", key: "products.findById", fallback: null,
      }),
    ),
  );
  const productById = new Map(members.map((m, i) => [m.productId, docs[i]]));

  const { getListingRule } = await import("../../../_internal/shared/checkout/rules");
  const { ProductStatusValues } = await import("../../products/schemas/firestore");

  const resolved: CartLineMember[] = [];
  for (const m of members) {
    const product = productById.get(m.productId);
    if (!product) {
      throw new ValidationError(`One of the selected items no longer exists.`);
    }
    if (product.status !== ProductStatusValues.PUBLISHED || product.isSold) {
      throw new ValidationError(`"${product.title}" is no longer available.`);
    }
    // Membership. Without this a caller could staple arbitrary products into
    // one line and buy them under a group's identity.
    const belongs =
      groupSource === "product-group"
        ? product.groupId === groupId
        : await isGroupedListingMember(groupId, product.id);
    if (!belongs) {
      throw new ValidationError(`"${product.title}" is not part of this group.`);
    }
    const listingType = normalizeListingType(product);
    const rule = getListingRule(listingType);
    if (!rule.cartEligible) {
      throw new ValidationError(
        `"${product.title}" can't be added to the cart. ${rule.cartIneligibleHint ?? ""}`.trim(),
      );
    }
    /*
     * 🛑 Made to order: no stock CHECK for this member. Nothing is held in
     * reserve — it is printed or built when the order arrives — so the only
     * honest answer to "how many are left" is "as many as you want". The
     * decrement still happens at checkout; see `validateCartItemStock`.
     */
    if (product.madeToOrder !== true && (product.availableQuantity ?? 0) < m.quantity) {
      throw new ValidationError(
        `Only ${product.availableQuantity ?? 0} left of "${product.title}".`,
      );
    }
    resolved.push({
      productId: product.id,
      quantity: m.quantity,
      unitPrice: product.price,
      title: product.title,
      image: product.images?.[0]?.url ?? product.mainImage,
      gstRate: product.gstRate,
      hsnCode: product.hsnCode,
      listingType,
    });
  }

  // Single-store rule. `storeId` is the order-splitting key AND the key the
  // per-store add-ons, coupons, shipping and payout all hang off, so a line
  // spanning two stores would break five things at once. The picker hides
  // itself for a cross-store group; this is the server-side half of that.
  const storeIds = new Set(resolved.map((r) => productById.get(r.productId)?.storeId ?? ""));
  if (storeIds.size > 1) {
    throw new ValidationError(
      "These items are sold by different sellers, so they can't be combined into one cart line.",
    );
  }
  const storeId = [...storeIds][0] ?? "";
  const first = productById.get(resolved[0].productId);

  // A one-member selection is just an ordinary line: 1 item × qty N is exactly
  // what a normal cart line already means, and routing it through the group
  // path would create a second representation of the same thing.
  if (resolved.length === 1) {
    return addItemToCart(userId, {
      productId: first!.id,
      productTitle: first!.title,
      productImage: first!.images?.[0]?.url ?? first!.mainImage,
      price: first!.price,
      currency: first!.currency,
      quantity: resolved[0].quantity,
      storeId,
      storeName: first!.storeName ?? "",
      listingType: resolved[0].listingType ?? "standard",
    });
  }

  // A grouped line counts as ONE item against the distinct-items cap.
  if (cart.items.length >= CART_MAX_ITEMS) {
    throw new ValidationError(
      `Cart full (${cart.items.length}/${CART_MAX_ITEMS}). Remove items to add new ones.`,
    );
  }

  // Same stock check checkout will run, so add-time and checkout-time agree by
  // construction rather than by two similar-looking implementations.
  const candidate = {
    itemId: "candidate",
    productId: groupId,
    quantity: 1,
    groupMembers: resolved,
  } as unknown as CartItemDocument;
  const expansion = getExpandedDecrements([...cart.items, candidate]);
  const shortfall = validateCartItemStock(
    candidate,
    new Map(
      [...productById.entries()].filter(([, p]) => p !== null) as Array<[string, ProductDocument]>,
    ),
    expansion.decrements,
  );
  if (shortfall) {
    const short = productById.get(shortfall.productId);
    throw new ValidationError(
      `Only ${shortfall.availableQty} left of "${short?.title ?? shortfall.productId}" once your cart is counted.`,
    );
  }

  const groupTitle = await resolveGroupTitle(groupId, groupSource, first ?? null);

  /*
   * 🛑 SERVER-SIDE ENFORCEMENT OF THE GROUP'S OWN RULES.
   *
   * `GroupMemberPicker` mirrors this so a buyer is not told "no" only after
   * submitting — but the picker is a convenience and this is the boundary. The
   * two share `checkGroupRules`, so they cannot disagree about what a valid
   * selection is; only about WHEN the buyer finds out.
   *
   * It throws on the FIRST violation while the picker shows all of them
   * together, which is each surface doing the right thing for its own job: a
   * form lists everything to fix, an API answers one reason.
   */
  const rules = await resolveGroupRules(groupId, groupSource, first ?? null);
  const violations = checkGroupRules(
    rules,
    resolved.map((r) => ({ productId: r.productId, quantity: r.quantity, title: r.title })),
  );
  if (violations.length > 0) {
    throw Object.assign(new ValidationError(violations[0].message), {
      code: violations[0].code,
    });
  }

  return cartRepository.addGroupLine(userId, {
    productId: groupId,
    productTitle: groupTitle,
    productImage: resolved[0].image ?? "",
    currency: first?.currency ?? getDefaultCurrency(),
    // Pinned to 1: member quantities carry the whole selection, and a copies
    // multiplier on top would double-count. See the invariant on CartLineMember.
    quantity: 1,
    storeId,
    storeName: await resolveStoreName(storeId, first?.storeName),
    listingType: "standard",
    lineKind: "group",
    groupSource,
    groupId,
    groupSlug: groupSource === "product-group" ? groupId : undefined,
    groupTitle,
    /*
     * Snapshotted at add time — see `CartItemDocument.groupDiscountPercent`.
     * Omitted entirely when there is no discount, so a line with no group
     * pricing carries no field rather than a zero that reads as "0% off".
     */
    ...(rules.groupDiscountPercent !== undefined && rules.groupDiscountPercent > 0
      ? { groupDiscountPercent: rules.groupDiscountPercent }
      : {}),
    groupMembers: resolved,
  });
}

/**
 * The group's selection rules, from whichever of the two homes owns them.
 *
 * 🛑 ONE resolver, because there are TWO homes: a product group keeps them on
 * its PARENT PRODUCT (identified by the parent's slug, which IS the groupId),
 * while a `groupedListing` keeps them on its own document. Reading them at each
 * call site is how the picker and the server come to disagree.
 *
 * Fails OPEN — an unreadable group yields no rules rather than refusing the
 * add. A transient Firestore error must not look like "your selection is
 * invalid", which is a statement about the buyer's choice and would send them
 * to change something that was already correct.
 */
async function resolveGroupRules(
  groupId: string,
  groupSource: CartGroupSource,
  sample: ProductDocument | null,
): Promise<GroupRules> {
  if (groupSource === "grouped-listing") {
    const { groupedListingsRepository } = await import(
      "../../grouped/repository/grouped-listings.repository"
    );
    const group = await safeRead(() => groupedListingsRepository.findById(groupId), {
      route: "/cart", key: "groupedListings.rules", fallback: null,
    });
    return readGroupRules(group);
  }

  /*
   * A product group's rules live on the PARENT, and `sample` is an arbitrary
   * member — so the parent has to be fetched unless the sample happens to BE
   * it. `groupId` is the parent's slug and products are pure slugs
   * (`id === slug`), so `findById` resolves it directly.
   */
  if (sample?.isGroupParent && sample.id === groupId) return readGroupRules(sample);
  const parent = await safeRead(() => productRepository.findById(groupId), {
    route: "/cart", key: "products.groupParentRules", fallback: null,
  });
  return readGroupRules(parent);
}

/** Is this product listed on that `groupedListings` document? */
async function isGroupedListingMember(groupId: string, productId: string): Promise<boolean> {
  const { groupedListingsRepository } = await import(
    "../../grouped/repository/grouped-listings.repository"
  );
  const group = await safeRead(() => groupedListingsRepository.findById(groupId), {
    route: "/cart", key: "groupedListings.findById", fallback: null,
  });
  return Boolean(group?.productIds?.includes(productId));
}

/** Display name for the line. Falls back to the parent product's group title. */
async function resolveGroupTitle(
  groupId: string,
  groupSource: CartGroupSource,
  sample: ProductDocument | null,
): Promise<string> {
  if (groupSource === "grouped-listing") {
    const { groupedListingsRepository } = await import(
      "../../grouped/repository/grouped-listings.repository"
    );
    const group = await safeRead(() => groupedListingsRepository.findById(groupId), {
      route: "/cart", key: "groupedListings.title", fallback: null,
    });
    if (group?.title) return group.title;
  }
  return sample?.groupTitle ?? "Selected items";
}

/**
 * Won-collector-drop lines are non-removable and fixed-quantity — the buyer committed
 * to the purchase by bidding, and letting them delete it would turn every
 * collector drop into a free option. That's already enforced one layer down:
 * `cartRepository.updateItem` / `removeItem` both reject a `locked` line, and
 * collector drop settlement is the only writer that sets `locked: true`. Accepted
 * offers deliberately do NOT set it — declining to buy is the buyer's right,
 * and the offer simply lapses at its `checkoutDeadline`.
 */
export async function updateCartItem(
  userId: string,
  itemId: string,
  input: UpdateCartItemInput,
): Promise<CartDocument> {
  return cartRepository.updateItem(userId, itemId, input);
}

/**
 * Replace a grouped line's member quantities. A member set to 0 is dropped;
 * dropping the last one removes the line (enforced in the repository so a
 * forgetful caller can't leave an empty ghost line behind).
 */
export async function updateCartGroupMembers(
  userId: string,
  itemId: string,
  input: UpdateCartGroupMembersInput,
): Promise<CartDocument> {
  return cartRepository.updateGroupMembers(userId, itemId, input);
}

export async function removeCartItem(
  userId: string,
  itemId: string,
): Promise<CartDocument> {
  return cartRepository.removeItem(userId, itemId);
}

export async function clearCart(userId: string): Promise<CartDocument> {
  return cartRepository.clearCart(userId);
}

export async function mergeGuestCart(
  userId: string,
  items: Array<{ productId: string; quantity: number }>,
): Promise<void> {
  await cartRepository.getOrCreate(userId);

  for (const item of items) {
    const product = await productRepository.findById(item.productId);
    if (!product || product.status !== "published") continue;
    /*
     * A made-to-order row survives the guest-cart merge at its full requested
     * quantity. Dropping it (or clamping it to 0) would silently delete the
     * line a signed-out visitor had chosen, which reads as the cart losing
     * items on login — and there is no stock level for the clamp to clamp to.
     */
    const unlimited = product.madeToOrder === true;
    if (!unlimited && product.availableQuantity < 1) continue;

    const safeQty = unlimited
      ? item.quantity
      : Math.min(item.quantity, product.availableQuantity);

    const storeName = await resolveStoreName(product.storeId, product.storeName);
    await cartRepository.addItem(userId, {
      productId: product.id,
      productTitle: product.title,
      productImage: product.images?.[0]?.url ?? "",
      price: product.price,
      currency: product.currency ?? getDefaultCurrency(),
      quantity: safeQty,
      storeId: product.storeId,
      storeName,
      listingType: normalizeListingType(product),
    });
  }

  serverLogger.info("mergeGuestCart completed", {
    userId,
    itemCount: items.length,
  });
}

export async function getCart(userId: string): Promise<CartDocument | null> {
  return cartRepository.findByUserId(userId);
}

export async function updateCartItemShipping(
  userId: string,
  itemId: string,
  providerId: string,
  fee: number,
): Promise<CartDocument> {
  if (!itemId || !providerId) throw new ValidationError("itemId and providerId are required");
  if (!Number.isFinite(fee) || fee < 0) {
    throw new ValidationError("fee must be a non-negative number");
  }
  return cartRepository.updateItemShipping(userId, itemId, providerId, fee);
}
