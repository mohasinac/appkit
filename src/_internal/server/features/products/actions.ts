"use server";

import { wrapAction, type ActionResult } from "@mohasinac/appkit/server";
import { productRepository } from "../../../../repositories";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { isAdminUser } from "../../../../features/auth/role-predicates";
import { productInputSchema, productUpdateSchema, auctionInputSchema, preOrderInputSchema, setFeaturedSchema, setStatusSchema } from "../../../shared/features/products/schema";
import {
  assertProductOwnership,
  assertStatusTransition,
  assertPrizeDrawNotLocked,
  assertPrizeDrawWonItemsImmutable,
} from "./service";
import { ValidationError } from "../../../shared/errors/index";
import { NotFoundError } from "../../../../errors";
import { storeRepository } from "../../../../features/stores/repository/store.repository";
import type { PrizeDrawItem } from "../../../../features/products/schemas/firestore";

/**
 * The store fields every listing must carry, resolved from the acting seller.
 *
 * All three create actions used to write `storeId: user.uid` — an Auth UID,
 * where every query in the codebase expects the store SLUG (`storeId` IS the
 * store slug; see the store-identity note in CLAUDE.md). So a listing created
 * here was filed under an id no store page, cart grouping or payout ever
 * matches, and carried no `storeName` for a card to render.
 *
 * `storeName`/`storeSlug` are denormalized here because the public browse query
 * never reads `storeRepository` — a card can only show a seller if the product
 * document already names one.
 */
async function sellerStoreFields(ownerId: string) {
  const store = await storeRepository.findByOwnerId(ownerId);
  if (!store) {
    throw new NotFoundError("No store found for this account. Create your store first.");
  }
  return {
    storeId: store.storeSlug,
    storeName: store.storeName,
    storeSlug: store.storeSlug,
  };
}

export async function createProductAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["seller", "admin"]);
      const parsed = productInputSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      return productRepository.create({
        ...(parsed.data as any),
        ...(await sellerStoreFields(user.uid)),
        status: "draft",
        listingType: "standard",
        featured: false,
      } as any);
  });
}

export async function createAuctionAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["seller", "admin"]);
      const parsed = auctionInputSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      return productRepository.create({
        ...(parsed.data as any),
        ...(await sellerStoreFields(user.uid)),
        status: "draft",
        listingType: "auction",
        featured: false,
      } as any);
  });
}

export async function createPreOrderAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["seller", "admin"]);
      const parsed = preOrderInputSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      return productRepository.create({
        ...(parsed.data as any),
        ...(await sellerStoreFields(user.uid)),
        status: "draft",
        listingType: "pre-order",
        featured: false,
      } as any);
  });
}

export async function updateProductAction(productId: string, input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["seller", "admin"]);
      const product = await assertProductOwnership(productId, user.uid);
      const parsed = productUpdateSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      assertPrizeDrawWonItemsImmutable(product, (parsed.data as { prizeDrawItems?: PrizeDrawItem[] }).prizeDrawItems);
      return productRepository.update(productId, parsed.data as any);
  });
}

export async function deleteProductAction(productId: string): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["seller", "admin"]);
      const product = await assertProductOwnership(productId, user.uid);
      assertPrizeDrawNotLocked(product, "deleted");
      return productRepository.delete(productId);
  });
}

export async function setProductStatusAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["seller", "admin"]);
      const parsed = setStatusSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      const product = await assertProductOwnership(parsed.data.productId, user.uid);
      assertStatusTransition(product.status, parsed.data.status);
      if (parsed.data.status !== "published") {
        assertPrizeDrawNotLocked(product, "unpublished or archived");
      }

      // SB-UNI-O — live listings must be admin-verified before a seller can publish them.
      if (
        parsed.data.status === "published" &&
        (product.listingType ?? "standard") === "live" &&
        !product.liveItem?.vendorVerified &&
        !isAdminUser(user)
      ) {
        throw new ValidationError(
          "Live listings require admin verification before publishing. Contact support to request verification.",
        );
      }
    
      return productRepository.update(parsed.data.productId, { status: parsed.data.status });
  });
}

export async function setProductFeaturedAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    await requireRoleUser("admin");
      const parsed = setFeaturedSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      return productRepository.update(parsed.data.productId, { featured: parsed.data.featured });
  });
}
