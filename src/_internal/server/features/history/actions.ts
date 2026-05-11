"use server";

import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import {
  historyRepository,
  type UserHistoryItem,
  type HistoryProductType,
} from "../../../../repositories";

export async function trackProductViewAction(
  productId: string,
  productType: HistoryProductType,
  productSnapshot?: UserHistoryItem["productSnapshot"],
) {
  const user = await requireRoleUser(["buyer", "seller", "admin"]);
  await historyRepository.track(user.uid, {
    productId,
    productType,
    productSnapshot,
  });
}

export async function mergeGuestHistoryAction(
  guestItems: Array<{
    productId: string;
    productType: HistoryProductType;
    viewedAt?: Date;
    productSnapshot?: UserHistoryItem["productSnapshot"];
  }>,
) {
  const user = await requireRoleUser(["buyer", "seller", "admin"]);
  return historyRepository.merge(user.uid, guestItems);
}
