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
import { safeRead } from "../../../../errors/safe-read";
import { bidRepository, productRepository, userRepository, siteSettingsRepository } from "../../../../repositories";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { placeBidActionSchema } from "../../../shared/features/collector-drops/schema";
import {
  assertCollectorDropActive,
  assertBidAmount,
  assertNotCollectorDropOwner,
  shouldAutoExtend,
  computeExtendedEndDate,
} from "./service";
import { ValidationError } from "../../../shared/errors/index";
import type { FirestoreDocument } from "@mohasinac/appkit";

export async function placeBidAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
      const parsed = placeBidActionSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid bid input");
    
      const { collectorDropId, amount } = parsed.data;
      const product = await assertCollectorDropActive(collectorDropId);
      assertNotCollectorDropOwner(product, user.uid);
      const settings = await siteSettingsRepository.getSingleton();
      assertBidAmount(product, amount, settings.collectorDropConfig?.bidIncrementTiers ?? []);
    
      const profile = await safeRead(() => userRepository.findById(user.uid), {
        route: "collectorDrop:placeBid",
        key: "collectorDrops.placeBid.bidderProfile",
        fallback: null,
      });
      const userName = profile?.displayName ?? user.name ?? "Anonymous";

      // (Removed: a `setWinningBid("__placeholder__", collectorDropId)` call whose
      // rejection was swallowed. It accomplished NOTHING. setWinningBid builds a
      // single batch — mark every bid for the product `outbid`, then update the
      // winning bid's own doc — and `__placeholder__` is not a real bid id, so
      // `batch.commit()` always threw and DISCARDED the whole batch, outbid
      // marking included. It cost a full-collection query and an exception per
      // bid placed, and the real `setWinningBid(bid.id, …)` below already marks
      // every other bid for this product as outbid.)

      const bid = await bidRepository.createBid({
        productId: collectorDropId,
        productTitle: (product as any).title ?? collectorDropId,
        userId: user.uid,
        userName,
        userEmail: user.email ?? "",
        bidAmount: amount,
        currency: (product as any).currency ?? "INR",
        bidDate: new Date(),
      });
    
      // Now set this new bid as the winning bid
      await bidRepository.setWinningBid(bid.id, collectorDropId);
    
      // `bidsHaveStarted` and `leadingBidderId` are set by the primary bid path
      // (`features/collector-drops/actions/bid-actions.ts`) but were missing here, so a
      // bid placed through this legacy entrypoint left both mirrors stale —
      // CLAUDE.md Root Cause #42.
      const updates: FirestoreDocument = {
        currentBid: amount,
        bidCount: ((product as any).bidCount ?? 0) + 1,
        leadingBidderId: user.uid,
        bidsHaveStarted: true,
      };
      if (shouldAutoExtend(product)) {
        updates.collectorDropEndDate = computeExtendedEndDate(product);
        if (!(product as any).collectorDropOriginalEndDate) {
          updates.collectorDropOriginalEndDate = (product as any).collectorDropEndDate;
        }
      }
      await productRepository.update(collectorDropId, updates as any);
    
      return bid;
  });
}
