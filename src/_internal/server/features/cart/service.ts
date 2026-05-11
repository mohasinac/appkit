import { cartRepository } from "../../../../repositories";
import { CART_MAX_ITEMS } from "../../../shared/features/cart/config";
import { CartFullError, CartQuantityError } from "../../../shared/features/cart/errors";
import type { z } from "zod";
import type { addToCartSchema } from "../../../shared/features/cart/schema";
type AddToCartInput = z.infer<typeof addToCartSchema>;

export async function assertCartCapacity(userId: string, addingQty: number): Promise<void> {
  const cart = await cartRepository.findByUserId(userId).catch(() => null);
  const currentItemCount = cart ? (cart.items ?? []).length : 0;
  if (currentItemCount + addingQty > CART_MAX_ITEMS) {
    throw new CartFullError(CART_MAX_ITEMS);
  }
}

export function assertValidQuantity(quantity: number): void {
  if (quantity < 1 || quantity > 99) {
    throw new CartQuantityError(`Quantity must be between 1 and 99, got ${quantity}`);
  }
}

export async function upsertCartItem(
  userId: string,
  item: AddToCartInput,
): Promise<void> {
  assertValidQuantity(item.quantity);
  await assertCartCapacity(userId, 1);
  await cartRepository.addItem(userId, item);
}

export async function mergeGuestItems(
  userId: string,
  guestItems: AddToCartInput[],
): Promise<void> {
  for (const item of guestItems) {
    await cartRepository.addItem(userId, item).catch(() => null);
  }
}
