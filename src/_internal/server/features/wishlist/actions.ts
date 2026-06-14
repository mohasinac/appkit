"use server";
import { normalizeError } from "../../../../errors/normalize";

import { wrapAction, type ActionResult } from "@mohasinac/appkit/server";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import {
  wishlistRepository,
  WishlistFullError,
  type WishlistItem,
} from "../../../../repositories";
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
    const user = await requireRoleUser(["buyer", "seller", "admin"]);
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
    const user = await requireRoleUser(["buyer", "seller", "admin"]);
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
    const user = await requireRoleUser(["buyer", "seller", "admin"]);
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
