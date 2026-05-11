"use server";

import { bidRepository, productRepository, userRepository } from "../../../../repositories";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { placeBidSchema } from "../../../shared/features/auctions/schema";
import {
  assertAuctionActive,
  assertBidAmount,
  assertNotAuctionOwner,
  shouldAutoExtend,
  computeExtendedEndDate,
} from "./service";
import { ValidationError } from "../../../shared/errors/index";

export async function placeBidAction(input: unknown) {
  const user = await requireRoleUser(["buyer", "seller", "admin"]);
  const parsed = placeBidSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0]?.message ?? "Invalid bid input");

  const { auctionId, amount } = parsed.data;
  const product = await assertAuctionActive(auctionId);
  assertNotAuctionOwner(product, user.uid);
  assertBidAmount(product, amount);

  const profile = await userRepository.findById(user.uid).catch(() => null);
  const userName = profile?.displayName ?? user.name ?? "Anonymous";

  // Mark all current bids for this auction as outbid, then set new winning bid
  await bidRepository.setWinningBid("__placeholder__", auctionId).catch(() => null);

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

  const updates: Record<string, unknown> = {
    currentBid: amount,
    bidCount: ((product as any).bidCount ?? 0) + 1,
  };
  if (shouldAutoExtend(product)) {
    updates.auctionEndDate = computeExtendedEndDate(product);
    if (!(product as any).auctionOriginalEndDate) {
      updates.auctionOriginalEndDate = (product as any).auctionEndDate;
    }
  }
  await productRepository.update(auctionId, updates as any);

  return bid;
}
