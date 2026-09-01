import { randomUUID } from "crypto";

import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { DatabaseError, NotFoundError, ValidationError } from "../../../errors";
import { CART_FIELDS } from "../../../constants/field-names";

import { normalizeError } from "../../../errors/normalize";
const ERR_CART_ITEM_NOT_FOUND = "Cart item not found";
const ERR_CART_ITEM_LOCKED = "This item requires payment and cannot be removed or modified.";

import {
  BaseRepository,
  prepareForFirestore,
  parseSieveDateValue,
  type FirebaseSieveResult,
  type SieveModel,
  type SieveFieldConfig,
} from "../../../providers/db-firebase";
import { decryptPii } from "../../../security";
import {
  CART_COLLECTION,
  type AddToCartInput,
  type CartAppliedCoupon,
  type CartDocument,
  type CartStoreAddons,
  type CartItemDocument,
  type CartLineMember,
  type AddGroupLineInput,
  type UpdateCartItemInput,
  type UpdateCartGroupMembersInput,
} from "../schemas";

export class CartRepository extends BaseRepository<CartDocument> {
  // W1-42 — admin-facing Sieve list. Filterable on userId, sessionId, updatedAt;
  // sortable on updatedAt.
  private static readonly SIEVE_FIELDS: Record<string, SieveFieldConfig> = {
    userId: { canFilter: true, canSort: false },
    sessionId: { canFilter: true, canSort: false },
    updatedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
  };

  constructor() {
    super(CART_COLLECTION);
  }

  /** Admin-facing paginated list of carts. */
  async list(model: SieveModel): Promise<FirebaseSieveResult<CartDocument>> {
    return this.sieveQuery<CartDocument>(model, CartRepository.SIEVE_FIELDS);
  }

  /**
   * `mapDoc` is deliberately NOT overridden.
   *
   * It used to decrypt `items[].storeName` on every read — and nothing has
   * ever encrypted that field. `CartRepository` declares no `piiFields`, and
   * `storeName` appears nowhere in pii-schemas.ts. `decryptPii` passes a
   * non-`enc:v1:` string straight through, so the call was a no-op on every
   * document while reading as protection — the most expensive kind of dead
   * code, because it answers the question "is this handled?" wrongly.
   *
   * A store name is not PII: it is the seller's public shopfront name, shown
   * on every listing. If a genuinely private field is added to a cart line,
   * declare it in `piiFields` so `applyWriteHooks` encrypts it on all nine
   * write paths — do not reintroduce a decrypt with no matching encrypt.
   */

  async findByUserId(userId: string): Promise<CartDocument | null> {
    return this.findById(userId);
  }

  async getOrCreate(userId: string): Promise<CartDocument> {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;
    return this.createEmpty(userId);
  }

  async createEmpty(userId: string): Promise<CartDocument> {
    try {
      const now = new Date();
      const cartData: CartDocument = {
        id: userId,
        userId,
        items: [],
        createdAt: now,
        updatedAt: now,
      };

      await this.db
        .collection(this.collection)
        .doc(userId)
        .set(
          prepareForFirestore(cartData),
        );

      return cartData;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError("Failed to create cart", error);
    }
  }

  async addItem(userId: string, input: AddToCartInput): Promise<CartDocument> {
    try {
      const cart = await this.getOrCreate(userId);
      const items = [...cart.items];

      // A locked line (accepted offer / won auction) is identified by its
      // offerId or bidId, never merged by productId — two separate wins on the
      // same listing are two separate obligations, and re-running the
      // settlement sweep must not duplicate a line it already wrote.
      if (input.offerId && items.some((item) => item.offerId === input.offerId)) {
        return cart;
      }
      if (input.bidId && items.some((item) => item.bidId === input.bidId)) {
        return cart;
      }

      // A grouped line is never merged by productId. Two "Add selected"
      // presses are two different selections, and merging them would silently
      // rewrite the buyer's per-member quantities into a copy count. Bundles
      // DO still merge — the same bundle twice genuinely means two copies.
      const isLockedLine = Boolean(input.offerId || input.bidId);
      const existingIndex = isLockedLine || input.lineKind === "group"
        ? -1
        : items.findIndex(
            (item) =>
              item.productId === input.productId &&
              !item.offerId &&
              !item.bidId &&
              item.lineKind !== "group",
          );

      if (existingIndex >= 0) {
        items[existingIndex] = {
          ...items[existingIndex],
          quantity: items[existingIndex].quantity + input.quantity,
          updatedAt: new Date(),
        };
      } else {
        const newItem: CartItemDocument = {
          itemId: randomUUID(),
          productId: input.productId,
          productTitle: input.productTitle,
          productImage: input.productImage,
          price: input.price,
          currency: input.currency,
          quantity: input.quantity,
          storeId: input.storeId,
          storeName: input.storeName,
          listingType: input.listingType,
          ...(input.isOffer !== undefined && { isOffer: input.isOffer }),
          ...(input.offerId !== undefined && { offerId: input.offerId }),
          ...(input.isAuctionWin !== undefined && { isAuctionWin: input.isAuctionWin }),
          ...(input.auctionId !== undefined && { auctionId: input.auctionId }),
          ...(input.bidId !== undefined && { bidId: input.bidId }),
          ...(input.isBuyout !== undefined && { isBuyout: input.isBuyout }),
          ...(input.lockedPrice !== undefined && {
            lockedPrice: input.lockedPrice,
          }),
          ...(input.checkoutDeadline !== undefined && {
            checkoutDeadline: input.checkoutDeadline,
          }),
          ...(input.locked !== undefined && { locked: input.locked }),
          // SB-UNI-4 2026-05-13 — propagate bundle identifiers when present.
          ...(input.bundleCategorySlug !== undefined && {
            bundleCategorySlug: input.bundleCategorySlug,
          }),
          ...(input.bundleProductIds !== undefined && {
            bundleProductIds: input.bundleProductIds,
          }),
          ...(input.lineKind !== undefined && { lineKind: input.lineKind }),
          ...(input.groupSource !== undefined && { groupSource: input.groupSource }),
          ...(input.groupId !== undefined && { groupId: input.groupId }),
          ...(input.groupSlug !== undefined && { groupSlug: input.groupSlug }),
          ...(input.groupTitle !== undefined && { groupTitle: input.groupTitle }),
          ...(input.groupMembers !== undefined && { groupMembers: input.groupMembers }),
          addedAt: new Date(),
          updatedAt: new Date(),
        };
        items.push(newItem);
      }

      const updatedCart: CartDocument = {
        ...cart,
        items,
        updatedAt: new Date(),
      };

      await this.db
        .collection(this.collection)
        .doc(userId)
        .set(
          prepareForFirestore(
            updatedCart,
          ),
        );

      return updatedCart;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError("Failed to add item to cart", error);
    }
  }

  /**
   * Price of ONE COPY of a multi-member line.
   *
   * Private and called at every write of `groupMembers`, so `item.price` cannot
   * drift from the members it is supposed to summarise — no caller sets it, so
   * no caller can forget it. That property is load-bearing well beyond this
   * file: `getSubtotal`, the cart page's per-seller subtotal, and both lane
   * subtotals all compute `price × quantity`, and a grouped line pins
   * `quantity` to 1, so all four stay correct with no changes of their own.
   */
  private deriveLinePrice(members: CartLineMember[]): number {
    const raw = members.reduce((sum, m) => sum + m.unitPrice * m.quantity, 0);
    // audit-money-units-ok: decimal rupees throughout; rounding to 2dp, not paise conversion.
    return Math.round(raw * 100) / 100;
  }

  /**
   * Create a multi-member line. Deliberately never merges into an existing
   * line — see the note in `addItem`.
   */
  async addGroupLine(userId: string, input: AddGroupLineInput): Promise<CartDocument> {
    try {
      if (!input.groupMembers.length) {
        throw new ValidationError("A grouped cart line needs at least one member.");
      }
      const cart = await this.getOrCreate(userId);

      const newItem: CartItemDocument = {
        itemId: randomUUID(),
        productId: input.productId,
        productTitle: input.productTitle,
        productImage: input.productImage,
        price: this.deriveLinePrice(input.groupMembers),
        currency: input.currency,
        quantity: input.quantity,
        storeId: input.storeId,
        storeName: input.storeName,
        listingType: input.listingType,
        groupMembers: input.groupMembers,
        ...(input.lineKind !== undefined && { lineKind: input.lineKind }),
        ...(input.groupSource !== undefined && { groupSource: input.groupSource }),
        ...(input.groupId !== undefined && { groupId: input.groupId }),
        ...(input.groupSlug !== undefined && { groupSlug: input.groupSlug }),
        ...(input.groupTitle !== undefined && { groupTitle: input.groupTitle }),
        ...(input.bundleCategorySlug !== undefined && {
          bundleCategorySlug: input.bundleCategorySlug,
        }),
        addedAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedCart: CartDocument = {
        ...cart,
        items: [...cart.items, newItem],
        updatedAt: new Date(),
      };

      await this.db
        .collection(this.collection)
        .doc(userId)
        .set(prepareForFirestore(updatedCart));

      return updatedCart;
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof ValidationError) throw error;
      throw new DatabaseError("Failed to add grouped line to cart", error);
    }
  }

  /**
   * Replace a grouped line's member quantities.
   *
   * Takes the WHOLE array rather than a per-member delta: the cart is one
   * Firestore document written with `set()`, so N per-member writes would be
   * both a Rule #6 cost and a genuine lost-update race on a fast double-click.
   *
   * A member dropped to 0 is removed, and **a line left with no members is
   * removed entirely** — enforced here rather than in the client, so a caller
   * that forgets cannot leave an empty ghost line in the document.
   *
   * Only quantities move. Prices, titles and images are the snapshots taken
   * server-side at add time and are never re-accepted from a caller; adding a
   * NEW member is an add-to-cart, which has its own eligibility checks.
   */
  async updateGroupMembers(
    userId: string,
    itemId: string,
    input: UpdateCartGroupMembersInput,
  ): Promise<CartDocument> {
    try {
      const cart = await this.findByUserId(userId);
      if (!cart) throw new NotFoundError("Cart not found");

      const itemIndex = cart.items.findIndex((item) => item.itemId === itemId);
      if (itemIndex < 0) throw new NotFoundError(ERR_CART_ITEM_NOT_FOUND);

      const target = cart.items[itemIndex];
      if (target.locked) throw new ValidationError(ERR_CART_ITEM_LOCKED);
      if (!target.groupMembers?.length) {
        throw new ValidationError("This cart line has no members to update.");
      }

      const requested = new Map(input.groupMembers.map((m) => [m.productId, m.quantity]));
      for (const productId of requested.keys()) {
        if (!target.groupMembers.some((m) => m.productId === productId)) {
          throw new ValidationError(
            "That item is not part of this cart line. Add it from the group page instead.",
          );
        }
      }

      const nextMembers = target.groupMembers
        .map((m) => (requested.has(m.productId)
          ? { ...m, quantity: requested.get(m.productId) as number }
          : m))
        .filter((m) => m.quantity > 0);

      if (nextMembers.length === 0) {
        return this.removeItem(userId, itemId);
      }

      const items = [...cart.items];
      items[itemIndex] = {
        ...target,
        groupMembers: nextMembers,
        price: this.deriveLinePrice(nextMembers),
        updatedAt: new Date(),
      };

      const updatedCart: CartDocument = { ...cart, items, updatedAt: new Date() };

      await this.db
        .collection(this.collection)
        .doc(userId)
        .set(prepareForFirestore(updatedCart));

      return updatedCart;
    } catch (error) {
      if (
        error instanceof DatabaseError ||
        error instanceof NotFoundError ||
        error instanceof ValidationError
      ) {
        throw error;
      }
      throw new DatabaseError("Failed to update grouped cart line", error);
    }
  }

  async updateItem(
    userId: string,
    itemId: string,
    input: UpdateCartItemInput,
  ): Promise<CartDocument> {
    try {
      const cart = await this.findByUserId(userId);
      if (!cart) throw new NotFoundError("Cart not found");

      const itemIndex = cart.items.findIndex((item) => item.itemId === itemId);
      if (itemIndex < 0) throw new NotFoundError(ERR_CART_ITEM_NOT_FOUND);
      if (cart.items[itemIndex].locked) throw new ValidationError(ERR_CART_ITEM_LOCKED);
      // A grouped line's quantity is pinned to 1 — the member quantities carry
      // the whole selection, so a copies multiplier on top would double every
      // price, tax and stock decrement. Edit its members instead.
      if (cart.items[itemIndex].lineKind === "group") {
        throw new ValidationError(
          "Change the quantities of the individual items in this group instead.",
        );
      }

      const items = [...cart.items];
      items[itemIndex] = {
        ...items[itemIndex],
        quantity: input.quantity,
        updatedAt: new Date(),
      };

      const updatedCart: CartDocument = {
        ...cart,
        items,
        updatedAt: new Date(),
      };

      await this.db
        .collection(this.collection)
        .doc(userId)
        .set(
          prepareForFirestore(
            updatedCart,
          ),
        );

      return updatedCart;
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError("Failed to update cart item", error);
    }
  }

  /**
   * Re-derive the three item-dependent fields against the items that survive a
   * removal.
   *
   * `removeItem` and `clearCart` both used to write `{ ...cart, items }`, which
   * carries `selectedItemIds`, `appliedCoupons` and `storeAddons` through
   * verbatim — so after a clear the cart still named items that no longer
   * existed. That is not cosmetic: `previewCheckoutPricing`, `createOrderForGroup`
   * and `/api/payment/create-order` all build `new Set(cart.selectedItemIds)`
   * and filter by it, so a stale id set silently narrows a later checkout.
   *
   * `selectedItemIds` is intersected rather than cleared — `undefined` means
   * "all items", so blanking a partial selection would silently re-select
   * everything the buyer had deliberately unticked. An intersection that empties
   * becomes `undefined` for the same reason it started that way: no items left
   * to have a selection about.
   */
  private pruneForItems(
    cart: CartDocument,
    items: CartItemDocument[],
  ): Pick<CartDocument, "selectedItemIds" | "appliedCoupons" | "storeAddons"> {
    const survivingItemIds = new Set(items.map((item) => item.itemId));
    const survivingStoreIds = new Set(items.map((item) => item.storeId));

    const selected = cart.selectedItemIds?.filter((id) => survivingItemIds.has(id));

    return {
      selectedItemIds: selected && selected.length > 0 ? selected : undefined,
      // A coupon is scoped to a store bucket or to the cart as a whole; with no
      // items left there is nothing for either kind to discount.
      appliedCoupons: items.length === 0 ? undefined : cart.appliedCoupons,
      storeAddons: this.pruneAddonsMap(cart.storeAddons, survivingStoreIds),
    };
  }

  private pruneAddonsMap(
    addons: CartDocument["storeAddons"],
    keepStoreIds: ReadonlySet<string>,
  ): CartDocument["storeAddons"] {
    if (!addons) return undefined;
    const kept = Object.entries(addons).filter(([storeId]) => keepStoreIds.has(storeId));
    return kept.length > 0 ? Object.fromEntries(kept) : undefined;
  }

  async removeItem(userId: string, itemId: string): Promise<CartDocument> {
    try {
      const cart = await this.findByUserId(userId);
      if (!cart) throw new NotFoundError("Cart not found");

      const target = cart.items.find((item) => item.itemId === itemId);
      if (!target) throw new NotFoundError(ERR_CART_ITEM_NOT_FOUND);
      if (target.locked) throw new ValidationError(ERR_CART_ITEM_LOCKED);

      const items = cart.items.filter((item) => item.itemId !== itemId);

      const updatedCart: CartDocument = {
        ...cart,
        items,
        ...this.pruneForItems(cart, items),
        updatedAt: new Date(),
      };

      await this.db
        .collection(this.collection)
        .doc(userId)
        .set(
          prepareForFirestore(
            updatedCart,
          ),
        );

      return updatedCart;
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError("Failed to remove cart item", error);
    }
  }

  /**
   * Empty the cart, keeping any locked line.
   *
   * A locked line is a won auction or an accepted offer — settlement put it
   * there and the buyer owes payment on it, so "clear" cannot mean "walk away"
   * (see § Checkout Lanes). Callers must tell the buyer that is what happened;
   * a silently-surviving row reads as a failed clear.
   */
  async clearCart(userId: string): Promise<CartDocument> {
    try {
      const cart = await this.getOrCreate(userId);
      const lockedItems = cart.items.filter((item) => item.locked);

      const clearedCart: CartDocument = {
        ...cart,
        items: lockedItems,
        ...this.pruneForItems(cart, lockedItems),
        updatedAt: new Date(),
      };

      await this.db
        .collection(this.collection)
        .doc(userId)
        .set(
          prepareForFirestore(
            clearedCart,
          ),
        );

      return clearedCart;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError("Failed to clear cart", error);
    }
  }

  getItemCount(cart: CartDocument): number {
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getSubtotal(cart: CartDocument): number {
    return cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  }

  async addCoupon(userId: string, coupon: CartAppliedCoupon): Promise<void> {
    const cart = await this.getOrCreate(userId);
    const existing = cart.appliedCoupons ?? [];
    // Replace if same code already applied (re-apply updates discount amount)
    const filtered = existing.filter((c) => c.code !== coupon.code);
    await this.db
      .collection(this.collection)
      .doc(userId)
      .set(
        { appliedCoupons: [...filtered, coupon], updatedAt: new Date() },
        { merge: true },
      );
  }

  async removeCoupon(userId: string, code: string): Promise<void> {
    const cart = await this.getOrCreate(userId);
    const updated = (cart.appliedCoupons ?? []).filter((c) => c.code !== code);
    await this.db
      .collection(this.collection)
      .doc(userId)
      .set({ appliedCoupons: updated, updatedAt: new Date() }, { merge: true });
  }

  /**
   * Drop every locked line matching a predicate, bypassing the `locked` guard
   * that blocks user-initiated removal.
   *
   * Only the expiry sweeps call this: a locked line whose claim has lapsed must
   * be cleared, or it keeps the buyer's auction/offer lane non-empty forever
   * and the lane gate blocks their ordinary checkout on something they can no
   * longer act on.
   */
  private async removeLockedLines(
    userId: string,
    matches: (item: CartItemDocument) => boolean,
  ): Promise<number> {
    const cart = await this.findByUserId(userId);
    if (!cart) return 0;

    const items = cart.items.filter((item) => !matches(item));
    const removed = cart.items.length - items.length;
    if (removed === 0) return 0;

    await this.db
      .collection(this.collection)
      .doc(userId)
      .set(prepareForFirestore({ ...cart, items, updatedAt: new Date() }));
    return removed;
  }

  /** Clear the cart line created for a specific accepted offer. */
  async removeItemsByOfferId(userId: string, offerId: string): Promise<number> {
    return this.removeLockedLines(userId, (item) => item.offerId === offerId);
  }

  /** Clear the cart line created for a specific won auction bid. */
  async removeItemsByBidId(userId: string, bidId: string): Promise<number> {
    return this.removeLockedLines(userId, (item) => item.bidId === bidId);
  }

  /**
   * Every locked line across all carts whose `checkoutDeadline` has passed.
   * Bounded per Rule #6 — the sweep runs on a schedule, so a backlog drains
   * over successive runs rather than in one unbounded scan.
   */
  async findExpiredLockedLines(
    now: Date,
    limit = 200,
  ): Promise<Array<{ userId: string; item: CartItemDocument }>> {
    const snapshot = await this.getCollection().limit(limit).get();
    const out: Array<{ userId: string; item: CartItemDocument }> = [];
    for (const doc of snapshot.docs) {
      const cart = this.mapDoc<CartDocument>(doc);
      for (const item of cart.items ?? []) {
        if (!item.checkoutDeadline) continue;
        const deadline =
          item.checkoutDeadline instanceof Date
            ? item.checkoutDeadline
            : new Date(item.checkoutDeadline as unknown as string);
        if (deadline <= now) out.push({ userId: cart.userId ?? doc.id, item });
      }
    }
    return out;
  }

  async updateItemShipping(
    userId: string,
    itemId: string,
    providerId: string,
    fee: number,
  ): Promise<CartDocument> {
    try {
      const cart = await this.findByUserId(userId);
      if (!cart) throw new NotFoundError("Cart not found");

      const itemIndex = cart.items.findIndex((item) => item.itemId === itemId);
      if (itemIndex < 0) throw new NotFoundError(ERR_CART_ITEM_NOT_FOUND);

      const items = [...cart.items];
      items[itemIndex] = {
        ...items[itemIndex],
        chosenShippingProviderId: providerId,
        chosenShippingFee: fee,
        updatedAt: new Date(),
      };

      const updatedCart: CartDocument = { ...cart, items, updatedAt: new Date() };
      await this.db
        .collection(this.collection)
        .doc(userId)
        .set(prepareForFirestore(updatedCart));

      return updatedCart;
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) throw error;
      throw new DatabaseError("Failed to update cart item shipping", error);
    }
  }

  async clearAllCoupons(userId: string): Promise<void> {
    await this.db
      .collection(this.collection)
      .doc(userId)
      .set({ appliedCoupons: [], updatedAt: new Date() }, { merge: true });
  }

  async setSelectedItems(
    userId: string,
    itemIds: string[] | null,
  ): Promise<void> {
    // null means "all items selected" — clears the field
    await this.db
      .collection(this.collection)
      .doc(userId)
      .set(
        { selectedItemIds: itemIds ?? null, updatedAt: new Date() },
        { merge: true },
      );
  }

  /**
   * Set (or clear) one store's add-on selections.
   *
   * Scoped to a single storeId so two stores' selections can't clobber each
   * other, and written with a dotted field path so a concurrent write to a
   * different store merges rather than overwriting the whole map.
   *
   * Passing an empty selection deletes the entry outright instead of leaving
   * `{}` behind — an all-false record and an absent record mean the same thing,
   * and keeping both shapes around invites readers that handle only one.
   */
  async setStoreAddons(
    userId: string,
    storeId: string,
    addons: CartStoreAddons | null,
  ): Promise<void> {
    const isEmpty =
      !addons ||
      (!addons.whatsappNotifyAddon &&
        !addons.giftWrapAddon &&
        !addons.shipmentProtectionAddon);

    await this.db
      .collection(this.collection)
      .doc(userId)
      .set(
        {
          storeAddons: {
            [storeId]: isEmpty ? FieldValue.delete() : addons,
          },
          updatedAt: new Date(),
        },
        { merge: true },
      );
  }

  /*
   * `pruneStoreAddons(userId, keepStoreIds)` used to live here. It had zero
   * callers from the day it was written, and `pruneForItems` now does the same
   * job inside the two write paths that actually remove items — with no extra
   * read and no second write, since both already `set()` the whole document.
   * Removed rather than wired up: two ways to prune the same map is the drift
   * this feature was fixing.
   */

  /**
   * Cloud Functions: return refs of stale carts not updated within TTL.
   */
  async getStaleRefs(ttlDays = 30): Promise<DocumentReference[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ttlDays);
    const snap = await this.db
      .collection(this.collection)
      .where(CART_FIELDS.UPDATED_AT, "<", cutoff)
      .limit(500)
      .get();
    return snap.docs.map((d) => d.ref as DocumentReference);
  }
}

export const cartRepository = new CartRepository();
