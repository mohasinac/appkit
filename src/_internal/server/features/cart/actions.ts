"use server";

/*
 * 🛑 From the DEFINING module, never "@mohasinac/appkit/server".
 *
 * appkit importing its own public server barrel is a self-reference that drags
 * the whole server surface in behind it — `dist/server.js` reaches next/og,
 * next/navigation, next/headers and driver.js. Twenty `actions.ts` files did
 * this for two symbols, and because `obligationSweep` reaches one of them, the
 * Firebase Functions tsup bundle (noExternal: appkit) had to resolve Next:
 * it failed on two `react-server-dom-webpack/*` requires and two @vercel/og
 * .wasm files, naming none of the responsible files. Root Cause #18.
 */
import { wrapAction, type ActionResult } from "../../../shared/types/action-result";
import { cartRepository } from "../../../../repositories";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { addToCartSchema, removeFromCartSchema, mergeGuestCartSchema } from "../../../shared/features/cart/schema";
import { upsertCartItem, mergeGuestItems } from "./service";
import { ValidationError } from "../../../shared/errors/index";

export async function addToCartAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
      const parsed = addToCartSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid cart input");
      await upsertCartItem(user.uid, parsed.data);
      return { success: true };
  });
}

export async function removeFromCartAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
      const parsed = removeFromCartSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      await cartRepository.removeItem(user.uid, parsed.data.productId);
      return { success: true };
  });
}

export async function clearCartAction(): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
      await cartRepository.clearCart(user.uid);
      return { success: true };
  });
}

export async function mergeGuestCartAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
      const parsed = mergeGuestCartSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid cart data");
      await mergeGuestItems(user.uid, parsed.data.guestItems);
      return { success: true };
  });
}
