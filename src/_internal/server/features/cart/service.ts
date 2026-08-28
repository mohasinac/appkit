import { cartRepository } from "../../../../repositories";
import { CART_MAX_ITEMS } from "../../../shared/features/cart/config";
import { CartFullError, CartQuantityError } from "../../../shared/features/cart/errors";
import type { z } from "zod";
import type { addToCartSchema } from "../../../shared/features/cart/schema";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring/server-logger";
type AddToCartActionInput = z.infer<typeof addToCartSchema>;

export async function assertCartCapacity(userId: string, addingQty: number): Promise<void> {
  // No catch. Swallowing to null made `currentItemCount` 0, so a Firestore
  // failure silently DISABLED the cart cap and let the add through — a guard
  // that fails open. A throw is caught by the action envelope and recorded.
  const cart = await cartRepository.findByUserId(userId);
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
  item: AddToCartActionInput,
): Promise<void> {
  assertValidQuantity(item.quantity);
  await assertCartCapacity(userId, 1);
  await cartRepository.addItem(userId, item);
}

export async function mergeGuestItems(
  userId: string,
  guestItems: AddToCartActionInput[],
): Promise<void> {
  for (const item of guestItems) {
    // A WRITE, not a read — safeRead does not apply. Guest-merge is
    // best-effort per item so one bad line cannot lose the whole cart, but a
    // dropped item must be visible rather than silent.
    await cartRepository.addItem(userId, item).catch((err: unknown) => {
      void normalizeError(err);
      serverLogger.warn("cart.mergeGuestCart: item dropped", { userId, err });
    });
  }
}
