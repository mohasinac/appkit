"use server";

import { wrapAction, type ActionResult } from "@mohasinac/appkit/server";
import { catalogueRepository, productRepository, storeRepository } from "../../../repositories";
import { requireRoleUser } from "../../../providers/auth-firebase/helpers";
import { ValidationError, AuthorizationError } from "../../../errors";
import { assertCatalogueImagesFresh } from "../utils/freshness";

/**
 * Seller path — turns a catalogue item directly into a real listing under
 * the seller's own store. No admin step. Freshness-gated (req: photos must
 * be < 30 days old) — see `assertCatalogueImagesFresh`.
 */
export async function listFromCatalogueAction(itemId: string): Promise<ActionResult<{ productId: string; productSlug: string }>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["seller", "admin"]);
    const item = await catalogueRepository.findById(itemId);
    if (!item) throw new ValidationError("Catalogue item not found");
    if (item.ownerId !== user.uid) throw new AuthorizationError("You do not own this catalogue item");
    if (item.listingStatus === "listed") throw new ValidationError("This item is already listed");

    assertCatalogueImagesFresh(item);

    const store = await storeRepository.findByOwnerId(user.uid);
    if (!store) throw new ValidationError("You need a store before listing from your catalogue");

    const product = await productRepository.create({
      title: item.title,
      description: item.description || `Listed from ${user.name ?? "seller"}'s personal catalogue.`,
      categorySlugs: item.categorySlugs ?? [],
      brandSlug: item.brandSlug,
      price: item.price ?? 0,
      currency: "INR",
      stockQuantity: item.quantity,
      mainImage: item.mainImage ?? item.images[0] ?? "",
      images: item.images,
      status: "published",
      storeId: store.id,
      featured: false,
      tags: [],
      condition: item.condition,
      listingType: "standard",
      sourceCatalogueItemId: item.id,
      sourceCatalogueOwnerId: item.ownerId,
    } as never);

    await catalogueRepository.update(itemId, {
      listingStatus: "listed",
      linkedProductId: product.id,
      linkedProductSlug: product.slug ?? product.id,
    });

    return { productId: product.id, productSlug: product.slug ?? product.id };
  });
}
