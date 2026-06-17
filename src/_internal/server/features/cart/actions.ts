"use server";

import { wrapAction, type ActionResult } from "@mohasinac/appkit/server";
import { cartRepository } from "../../../../repositories";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import {
  addToCartSchema,
  updateCartItemSchema,
  removeFromCartSchema,
  mergeGuestCartSchema,
} from "../../../shared/features/cart/schema";
import { upsertCartItem, mergeGuestItems } from "./service";
import { ValidationError } from "../../../shared/errors/index";

// audit-unknown-ok: callback entry point — accepts arbitrary payload value
export async function addToCartAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["buyer", "seller", "admin"]);
      const parsed = addToCartSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid cart input");
      await upsertCartItem(user.uid, parsed.data);
      return { success: true };
  });
}

// audit-unknown-ok: callback entry point — accepts arbitrary payload value
export async function removeFromCartAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["buyer", "seller", "admin"]);
      const parsed = removeFromCartSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      await cartRepository.removeItem(user.uid, parsed.data.productId);
      return { success: true };
  });
}

export async function clearCartAction(): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["buyer", "seller", "admin"]);
      await cartRepository.clearCart(user.uid);
      return { success: true };
  });
}

// audit-unknown-ok: callback entry point — accepts arbitrary payload value
export async function mergeGuestCartAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["buyer", "seller", "admin"]);
      const parsed = mergeGuestCartSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid cart data");
      await mergeGuestItems(user.uid, parsed.data.guestItems);
      return { success: true };
  });
}
