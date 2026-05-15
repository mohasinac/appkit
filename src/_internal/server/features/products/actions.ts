"use server";

import { productRepository } from "../../../../repositories";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import {
  productInputSchema,
  productUpdateSchema,
  auctionInputSchema,
  preOrderInputSchema,
  setFeaturedSchema,
  setStatusSchema,
  type ProductInput,
  type ProductUpdate,
  type AuctionInput,
  type PreOrderInput,
} from "../../../shared/features/products/schema";
import { assertProductOwnership, assertStatusTransition } from "./service";
import { ValidationError } from "../../../shared/errors/index";

export async function createProductAction(input: unknown) {
  const user = await requireRoleUser(["seller", "admin"]);
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
  return productRepository.create({
    ...(parsed.data as any),
    storeId: user.uid,
    status: "draft",
    listingType: "standard",
    featured: false,
  } as any);
}

export async function createAuctionAction(input: unknown) {
  const user = await requireRoleUser(["seller", "admin"]);
  const parsed = auctionInputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
  return productRepository.create({
    ...(parsed.data as any),
    storeId: user.uid,
    status: "draft",
    listingType: "auction",
    featured: false,
  } as any);
}

export async function createPreOrderAction(input: unknown) {
  const user = await requireRoleUser(["seller", "admin"]);
  const parsed = preOrderInputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
  return productRepository.create({
    ...(parsed.data as any),
    storeId: user.uid,
    status: "draft",
    listingType: "pre-order",
    featured: false,
  } as any);
}

export async function updateProductAction(productId: string, input: unknown) {
  const user = await requireRoleUser(["seller", "admin"]);
  await assertProductOwnership(productId, user.uid);
  const parsed = productUpdateSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
  return productRepository.update(productId, parsed.data as any);
}

export async function deleteProductAction(productId: string) {
  const user = await requireRoleUser(["seller", "admin"]);
  await assertProductOwnership(productId, user.uid);
  return productRepository.delete(productId);
}

export async function setProductStatusAction(input: unknown) {
  const user = await requireRoleUser(["seller", "admin"]);
  const parsed = setStatusSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
  const product = await assertProductOwnership(parsed.data.productId, user.uid);
  assertStatusTransition(product.status, parsed.data.status);
  return productRepository.update(parsed.data.productId, { status: parsed.data.status });
}

export async function setProductFeaturedAction(input: unknown) {
  await requireRoleUser("admin");
  const parsed = setFeaturedSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
  return productRepository.update(parsed.data.productId, { featured: parsed.data.featured });
}
