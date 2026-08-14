import { CATALOGUE_IMAGE_FRESHNESS_DAYS } from "../schemas/firestore";
import { ValidationError } from "../../../errors";

/**
 * Shared gate for both the seller "List" action and the buyer "Request to
 * sell" action — photos older than CATALOGUE_IMAGE_FRESHNESS_DAYS (30) must
 * be refreshed before a catalogue item can become a real listing. Checked
 * once at write time against the repository-stamped `lastImageUpdateAt`, not
 * re-derived per image at read time.
 */
export function assertCatalogueImagesFresh(item: { lastImageUpdateAt: Date }): void {
  const ageDays = (Date.now() - new Date(item.lastImageUpdateAt).getTime()) / 86_400_000;
  if (ageDays > CATALOGUE_IMAGE_FRESHNESS_DAYS) {
    throw new ValidationError(
      `Photos for this item are ${Math.floor(ageDays)} days old — upload fresh photos (within ${CATALOGUE_IMAGE_FRESHNESS_DAYS} days) before listing it.`,
    );
  }
}
