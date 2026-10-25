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
import { productRepository } from "../../../../features/products/repository/products.repository";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { assertPrizeDrawOpen } from "./service";

export async function enterPrizeDrawAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
    const { prizeDrawId } = input as { prizeDrawId: string };
    if (!prizeDrawId) throw new Error("prizeDrawId is required.");

    const product = await productRepository.findByIdOrSlug(prizeDrawId);
    if (!product) throw new Error("Prize draw not found.");

    assertPrizeDrawOpen(product);

    // Increment the entry count — server-side only, not exposed to the client adapter.
    await productRepository.update(prizeDrawId, {
      prizeCurrentEntries: ((product as any).prizeCurrentEntries ?? 0) + 1,
    } as any);

    return { entryRecorded: true, userId: user.uid };
  });
}
