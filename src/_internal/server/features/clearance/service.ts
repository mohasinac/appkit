import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import { ValidationError, CapacityError, ExpiredError } from "../../../shared/errors/index";

/** Assert the clearance draw is accepting entries (published, reveal not started, slots not exhausted). */
export function assertClearanceOpen(product: ProductDocument): void {
  if (product.listingType !== "clearance") {
    throw new ValidationError("Not a clearance listing.");
  }
  if (product.status !== "published") {
    throw new ValidationError("Clearance draw is not active.");
  }
  const max = (product as any).prizeMaxEntries ?? null;
  const current = (product as any).prizeCurrentEntries ?? 0;
  if (typeof max === "number" && current >= max) {
    throw new CapacityError("Clearance draw is fully subscribed.");
  }
  const reveal = (product as any).prizeRevealWindowStart;
  if (reveal && new Date(reveal) <= new Date()) {
    throw new ExpiredError("Clearance entry window");
  }
}
