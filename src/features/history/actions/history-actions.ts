/**
 * History Domain Actions (appkit) — pure business functions; no auth/rate-limit here.
 */
import { ValidationError } from "../../../errors";
import {
  historyRepository,
  type HistoryProductType,
  type HistoryItemSnapshot,
  type UserHistoryItem,
} from "../repository/user-history.repository";

export async function trackHistoryView(
  userSlug: string,
  args: {
    productId: string;
    productType: HistoryProductType;
    snapshot?: HistoryItemSnapshot;
  },
): Promise<{ count: number }> {
  if (!args.productId || typeof args.productId !== "string")
    throw new ValidationError("productId is required");
  const count = await historyRepository.track(userSlug, {
    productId: args.productId,
    productType: args.productType,
    productSnapshot: args.snapshot,
  });
  return { count };
}

export async function getHistoryForUser(userSlug: string): Promise<{
  items: UserHistoryItem[];
  meta: { total: number };
}> {
  const items = await historyRepository.getHistory(userSlug);
  return { items, meta: { total: items.length } };
}

export async function removeHistoryItem(
  userSlug: string,
  productId: string,
): Promise<void> {
  if (!productId) throw new ValidationError("productId is required");
  await historyRepository.removeOne(userSlug, productId);
}

export async function clearHistory(userSlug: string): Promise<void> {
  await historyRepository.clearForUser(userSlug);
}

export async function mergeGuestHistory(
  userSlug: string,
  incoming: Array<{
    productId: string;
    productType: HistoryProductType;
    viewedAt?: Date | string;
    snapshot?: HistoryItemSnapshot;
  }>,
): Promise<{ count: number }> {
  const normalised = incoming
    .filter((i) => i?.productId)
    .map((i) => ({
      productId: i.productId,
      productType: i.productType,
      viewedAt:
        i.viewedAt instanceof Date
          ? i.viewedAt
          : typeof i.viewedAt === "string"
            ? new Date(i.viewedAt)
            : undefined,
      productSnapshot: i.snapshot,
    }));
  const count = await historyRepository.merge(userSlug, normalised);
  return { count };
}
