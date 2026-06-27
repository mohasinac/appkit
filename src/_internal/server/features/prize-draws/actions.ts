"use server";

import { wrapAction, type ActionResult } from "@mohasinac/appkit/server";
import { productRepository } from "../../../../repositories";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { assertPrizeDrawOpen } from "./service";

export async function enterPrizeDrawAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
    const { prizeDrawId } = input as { prizeDrawId: string };
    if (!prizeDrawId) throw new Error("prizeDrawId is required.");

    const product = await productRepository.findByIdOrSlug(prizeDrawId).catch(() => null);
    if (!product) throw new Error("Prize draw not found.");

    assertPrizeDrawOpen(product);

    // Increment the entry count — server-side only, not exposed to the client adapter.
    await productRepository.update(prizeDrawId, {
      prizeCurrentEntries: ((product as any).prizeCurrentEntries ?? 0) + 1,
    } as any);

    return { entryRecorded: true, userId: user.uid };
  });
}
