"use server";

import { wrapAction, type ActionResult } from "@mohasinac/appkit/server";
import { safeRead } from "../../../../errors/safe-read";
import { bidRepository, productRepository, userRepository, siteSettingsRepository } from "../../../../repositories";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { placeBidActionSchema } from "../../../shared/features/auctions/schema";
import {
  assertAuctionActive,
  assertBidAmount,
  assertNotAuctionOwner,
  shouldAutoExtend,
  computeExtendedEndDate,
} from "./service";
import { ValidationError } from "../../../shared/errors/index";
import type { FirestoreDocument } from "@mohasinac/appkit";

export async function placeBidAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["buyer", "seller", "admin"]);
      const parsed = placeBidActionSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid bid input");
    
      const { auctionId, amount } = parsed.data;
      const product = await assertAuctionActive(auctionId);
      assertNotAuctionOwner(product, user.uid);
      const settings = await siteSettingsRepository.getSingleton();
      assertBidAmount(product, amount, settings.auctionConfig?.bidIncrementTiers ?? []);
    
      const profile = await safeRead(() => userRepository.findById(user.uid), {
        route: "auction:placeBid",
        key: "auctions.placeBid.bidderProfile",
        fallback: null,
      });
      const userName = profile?.displayName ?? user.name ?? "Anonymous";

      // (Removed: a `setWinningBid("__placeholder__", auctionId)` call whose
      // rejection was swallowed. It accomplished NOTHING. setWinningBid builds a
      // single batch — mark every bid for the product `outbid`, then update the
      // winning bid's own doc — and `__placeholder__` is not a real bid id, so
      // `batch.commit()` always threw and DISCARDED the whole batch, outbid
      // marking included. It cost a full-collection query and an exception per
      // bid placed, and the real `setWinningBid(bid.id, …)` below already marks
      // every other bid for this product as outbid.)

      const bid = await bidRepository.create({
        productId: auctionId,
        productTitle: (product as any).title ?? auctionId,
        userId: user.uid,
        userName,
        userEmail: user.email ?? "",
        bidAmount: amount,
        currency: (product as any).currency ?? "INR",
        bidDate: new Date(),
      });
    
      // Now set this new bid as the winning bid
      await bidRepository.setWinningBid(bid.id, auctionId);
    
      // `bidsHaveStarted` and `leadingBidderId` are set by the primary bid path
      // (`features/auctions/actions/bid-actions.ts`) but were missing here, so a
      // bid placed through this legacy entrypoint left both mirrors stale —
      // CLAUDE.md Root Cause #42.
      const updates: FirestoreDocument = {
        currentBid: amount,
        bidCount: ((product as any).bidCount ?? 0) + 1,
        leadingBidderId: user.uid,
        bidsHaveStarted: true,
      };
      if (shouldAutoExtend(product)) {
        updates.auctionEndDate = computeExtendedEndDate(product);
        if (!(product as any).auctionOriginalEndDate) {
          updates.auctionOriginalEndDate = (product as any).auctionEndDate;
        }
      }
      await productRepository.update(auctionId, updates as any);
    
      return bid;
  });
}
