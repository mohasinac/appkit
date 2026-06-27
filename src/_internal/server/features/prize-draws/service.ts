import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import { ValidationError, CapacityError, ExpiredError } from "../../../shared/errors/index";

/** Assert the prize draw is accepting entries (published, reveal not started, slots not exhausted). */
export function assertPrizeDrawOpen(product: ProductDocument): void {
  if (product.listingType !== "prize-draw") {
    throw new ValidationError("Not a prize draw listing.");
  }
  if (product.status !== "published") {
    throw new ValidationError("Prize draw is not active.");
  }
  const max = (product as any).prizeMaxEntries ?? null;
  const current = (product as any).prizeCurrentEntries ?? 0;
  if (typeof max === "number" && current >= max) {
    throw new CapacityError("Prize draw is fully subscribed.");
  }
  const reveal = (product as any).prizeRevealWindowStart;
  if (reveal && new Date(reveal) <= new Date()) {
    throw new ExpiredError("Prize draw entry window");
  }
}
