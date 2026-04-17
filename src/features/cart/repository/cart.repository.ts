import "server-only";
import { randomUUID } from "crypto";
import type { DocumentSnapshot } from "../../../providers/db-firebase";
import { DatabaseError, NotFoundError } from "../../../errors";
import {
  BaseRepository,
  prepareForFirestore,
} from "../../../providers/db-firebase";
import { decryptPii } from "../../../security";
import {
  CART_COLLECTION,
  type AddToCartInput,
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
        sellerName:
          typeof item.sellerName === "string"
            ? (decryptPii(item.sellerName) ?? item.sellerName)
            : item.sellerName,
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
          sellerId: input.sellerId,
          sellerName: input.sellerName,
          isAuction: input.isAuction ?? false,
          isPreOrder: input.isPreOrder ?? false,
          ...(input.isOffer !== undefined && { isOffer: input.isOffer }),
          ...(input.offerId !== undefined && { offerId: input.offerId }),
          ...(input.lockedPrice !== undefined && {
            lockedPrice: input.lockedPrice,
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
      if (itemIndex < 0) throw new NotFoundError("Cart item not found");

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
      if (!itemExists) throw new NotFoundError("Cart item not found");

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
}

export const cartRepository = new CartRepository();
