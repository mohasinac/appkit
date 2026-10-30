import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import { ValidationError, CapacityError, ExpiredError } from "../../../shared/errors/index";

/** Assert the random lots draw is accepting entries (published, reveal not started, slots not exhausted). */
export function assertPrizeDrawOpen(product: ProductDocument): void {
  if (product.listingType !== "random-lots") {
    throw new ValidationError("Not a random lots listing.");
  }
  if (product.status !== "published") {
    throw new ValidationError("Random lots draw is not active.");
  }
  const max = (product as any).prizeMaxEntries ?? null;
  const current = (product as any).prizeCurrentEntries ?? 0;
  if (typeof max === "number" && current >= max) {
    throw new CapacityError("Random lots draw is fully subscribed.");
  }
  const reveal = (product as any).prizeRevealWindowStart;
  if (reveal && new Date(reveal) <= new Date()) {
    throw new ExpiredError("Random lots entry window");
  }
}
