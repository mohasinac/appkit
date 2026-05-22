import { randomUUID } from "crypto";
import type { DocumentReference } from "firebase-admin/firestore";
import type { DocumentSnapshot } from "../../../providers/db-firebase";
import { DatabaseError, NotFoundError, ValidationError } from "../../../errors";

const ERR_CART_ITEM_NOT_FOUND = "Cart item not found";
const ERR_CART_ITEM_LOCKED = "This item requires payment and cannot be removed or modified.";

import {
  BaseRepository,
  prepareForFirestore,
} from "../../../providers/db-firebase";
import { decryptPii } from "../../../security";
import {
  CART_COLLECTION,
  type AddToCartInput,
  type CartAppliedCoupon,
  type CartDocument,
  type CartItemDocument,
  type UpdateCartItemInput,
} from "../schemas";

export class CartRepository extends BaseRepository<CartDocument> {
  constructor() {
    super(CART_COLLECTION);
  }

  protected override mapDoc<D = CartDocument>(snap: DocumentSnapshot): D {
    const raw = super.mapDoc<CartDocument>(snap);
    return {
      ...raw,
      items: (raw.items ?? []).map((item) => ({
        ...item,
        storeName:
          typeof item.storeName === "string"
            ? (decryptPii(item.storeName) ?? item.storeName)
            : item.storeName,
      })),
    } as unknown as D;
  }

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
          prepareForFirestore(cartData as unknown as Record<string, unknown>),
        );

      return cartData;
    } catch (error) {
      throw new DatabaseError("Failed to create cart", error);
    }
  }

  async addItem(userId: string, input: AddToCartInput): Promise<CartDocument> {
    try {
      const cart = await this.getOrCreate(userId);
      const items = [...cart.items];

      if (input.offerId) {
        const alreadyAdded = items.some(
          (item) => item.offerId === input.offerId,
        );
        if (alreadyAdded) return cart;
      }

      const existingIndex = input.offerId
        ? -1
        : items.findIndex(
            (item) => item.productId === input.productId && !item.offerId,
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
          ...(input.lockedPrice !== undefined && {
            lockedPrice: input.lockedPrice,
          }),
          // SB-UNI-4 2026-05-13 — propagate bundle identifiers when present.
          ...(input.bundleCategorySlug !== undefined && {
            bundleCategorySlug: input.bundleCategorySlug,
          }),
          ...(input.bundleProductIds !== undefined && {
            bundleProductIds: input.bundleProductIds,
          }),
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
            updatedCart as unknown as Record<string, unknown>,
          ),
        );

      return updatedCart;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError("Failed to add item to cart", error);
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
            updatedCart as unknown as Record<string, unknown>,
          ),
        );

      return updatedCart;
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError("Failed to update cart item", error);
    }
  }

  async removeItem(userId: string, itemId: string): Promise<CartDocument> {
    try {
      const cart = await this.findByUserId(userId);
      if (!cart) throw new NotFoundError("Cart not found");

      const itemExists = cart.items.some((item) => item.itemId === itemId);
      if (!itemExists) throw new NotFoundError(ERR_CART_ITEM_NOT_FOUND);

      const items = cart.items.filter((item) => item.itemId !== itemId);

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
            updatedCart as unknown as Record<string, unknown>,
          ),
        );

      return updatedCart;
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError("Failed to remove cart item", error);
    }
  }

  async clearCart(userId: string): Promise<CartDocument> {
    try {
      const cart = await this.getOrCreate(userId);

      const clearedCart: CartDocument = {
        ...cart,
        items: [],
        updatedAt: new Date(),
      };

      await this.db
        .collection(this.collection)
        .doc(userId)
        .set(
          prepareForFirestore(
            clearedCart as unknown as Record<string, unknown>,
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

  async updateItemShipping(
    userId: string,
    itemId: string,
    providerId: string,
    feeInPaise: number,
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
        chosenShippingFeeInPaise: feeInPaise,
        updatedAt: new Date(),
      };

      const updatedCart: CartDocument = { ...cart, items, updatedAt: new Date() };
      await this.db
        .collection(this.collection)
        .doc(userId)
        .set(prepareForFirestore(updatedCart as unknown as Record<string, unknown>));

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
   * Cloud Functions: return refs of stale carts not updated within TTL.
   */
  async getStaleRefs(ttlDays = 30): Promise<DocumentReference[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ttlDays);
    const snap = await this.db
      .collection(this.collection)
      .where("updatedAt", "<", cutoff)
      .limit(500)
      .get();
    return snap.docs.map((d) => d.ref as DocumentReference);
  }
}

export const cartRepository = new CartRepository();
