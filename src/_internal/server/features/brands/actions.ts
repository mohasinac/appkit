"use server";

import { brandsRepository } from "../../../../repositories";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { brandInputSchema, brandUpdateSchema } from "../../../shared/features/brands/schema";
import { assertBrandExists, assertBrandSlugUnique } from "./service";
import { ValidationError } from "../../../shared/errors/index";

export async function createBrandAction(input: unknown) {
  await requireRoleUser("admin");
  const parsed = brandInputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0]?.message ?? "Invalid brand input");
  await assertBrandSlugUnique(parsed.data.slug);
  return brandsRepository.createWithId(parsed.data.slug, parsed.data);
}

export async function updateBrandAction(brandId: string, input: unknown) {
  await requireRoleUser("admin");
  await assertBrandExists(brandId);
  const parsed = brandUpdateSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0]?.message ?? "Invalid brand input");
  return brandsRepository.update(brandId, parsed.data);
}

export async function deleteBrandAction(brandId: string) {
  await requireRoleUser("admin");
  await assertBrandExists(brandId);
  return brandsRepository.delete(brandId);
}

export async function toggleBrandActiveAction(brandId: string, isActive: boolean) {
  await requireRoleUser("admin");
  await assertBrandExists(brandId);
  return brandsRepository.update(brandId, { isActive });
}
