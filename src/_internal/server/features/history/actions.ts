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
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { historyRepository } from "../../../../features/history/repository/user-history.repository";
import type { UserHistoryItem, HistoryProductType } from "../../../../features/history/repository/user-history.repository";

export async function trackProductViewAction(
  productId: string,
  productType: HistoryProductType,
  productSnapshot?: UserHistoryItem["productSnapshot"],
): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
      await historyRepository.track(user.uid, {
        productId,
        productType,
        productSnapshot,
      });
  });
}

export async function mergeGuestHistoryAction(
  guestItems: Array<{
    productId: string;
    productType: HistoryProductType;
    viewedAt?: Date;
    productSnapshot?: UserHistoryItem["productSnapshot"];
  }>,
): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
      return historyRepository.merge(user.uid, guestItems);
  });
}
