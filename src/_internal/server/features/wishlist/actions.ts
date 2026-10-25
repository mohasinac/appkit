"use server";
import { normalizeError } from "../../../../errors/normalize";

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
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { wishlistRepository, WishlistFullError } from "../../../../features/wishlist/repository/user-wishlist.repository";
// 🛑 ALIASED re-export: `repositories/index.ts:164` exports this as
// `type UserWishlistItem as WishlistItem`. The defining module names it
// UserWishlistItem, so the local name has to be restored here.
import type { UserWishlistItem as WishlistItem } from "../../../../features/wishlist/repository/user-wishlist.repository";
import { WISHLIST_MAX } from "../../../shared/features/wishlist/config";
import { WishlistCapError } from "../../../shared/features/wishlist/errors";

export async function addToWishlistAction(
  productId: string,
  extras?: {
    productType?: WishlistItem["productType"];
    priceAtAdd?: number;
    productSnapshot?: WishlistItem["productSnapshot"];
  },
): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
      try {
        return await wishlistRepository.addItem(user.uid, productId, extras);
      } catch (err) {
        if (err instanceof WishlistFullError) {
          throw new WishlistCapError(err.current, WISHLIST_MAX);
        }
        throw err;
      }
  });
}

export async function removeFromWishlistAction(productId: string): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
      await wishlistRepository.removeItem(user.uid, productId);
  });
}

export async function mergeGuestWishlistAction(
  guestItems: Array<{
    productId: string;
    productType?: WishlistItem["productType"];
    priceAtAdd?: number;
    productSnapshot?: WishlistItem["productSnapshot"];
  }>,
): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
      const merged: string[] = [];
    
      for (const item of guestItems) {
        try {
          await wishlistRepository.addItem(user.uid, item.productId, {
            productType: item.productType,
            priceAtAdd: item.priceAtAdd,
            productSnapshot: item.productSnapshot,
          });
          merged.push(item.productId);
        } catch (err) {
          void normalizeError(err);
          if (err instanceof WishlistFullError) break;
        }
      }
    
      return merged;
  });
}
