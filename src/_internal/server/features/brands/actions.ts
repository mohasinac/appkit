"use server";

import { wrapAction, type ActionResult } from "@mohasinac/appkit/server";
import type { JsonValue } from "@mohasinac/appkit";
import { categoriesRepository } from "../../../../repositories";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { brandInputSchema, brandUpdateSchema, type BrandInput, type BrandUpdate } from "../../../shared/features/brands/schema";
import { assertBrandExists, assertBrandSlugUnique } from "./service";
import { ValidationError } from "../../../shared/errors/index";

/**
 * Translate the brand-input wire format (logoURL / bannerURL / website /
 * country / founded) to the CategoryDocument storage shape after
 * SB-UNI-C consolidated brands into the categories collection.
 */
function brandInputToCategoryFields(input: BrandInput | BrandUpdate) {
  const out: Record<string, JsonValue> = {};
  if ("name" in input && input.name !== undefined) out.name = input.name;
  if ("slug" in input && input.slug !== undefined) {
    out.slug = input.slug;
    out.path = input.slug;
  }
  if (input.description !== undefined) out.description = input.description;
  if (input.website !== undefined) out.brandWebsite = input.website;
  if (input.country !== undefined) out.brandCountry = input.country;
  if (input.founded !== undefined) out.brandFounded = input.founded;
  if (input.bannerURL !== undefined) out.brandBannerImage = input.bannerURL;
  if (input.logoURL !== undefined) {
    out.display = { coverImage: input.logoURL, showInMenu: false, showInFooter: false };
  }
  if (input.isActive !== undefined) out.isActive = input.isActive;
  if (input.displayOrder !== undefined) out.order = input.displayOrder;
  return out;
}

// audit-unknown-ok: callback entry point — accepts arbitrary payload value
export async function createBrandAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    await requireRoleUser("admin");
      const parsed = brandInputSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid brand input");
      await assertBrandSlugUnique(parsed.data.slug);
      const fields = brandInputToCategoryFields(parsed.data);
      return categoriesRepository.createWithId(parsed.data.slug, {
        id: parsed.data.slug,
        name: parsed.data.name,
        slug: parsed.data.slug,
        categoryType: "brand",
        rootId: parsed.data.slug,
        parentIds: [],
        childrenIds: [],
        tier: 0,
        path: parsed.data.slug,
        position: 0,
        subtreeSize: 1,
        order: parsed.data.displayOrder,
        isLeaf: true,
        isFeatured: false,
        isBrand: true,
        isActive: parsed.data.isActive,
        isSearchable: true,
        metrics: {
          productCount: 0,
          productIds: [],
          auctionCount: 0,
          auctionIds: [],
          totalProductCount: 0,
          totalAuctionCount: 0,
          totalItemCount: 0,
          lastUpdated: new Date(),
        },
        seo: { title: parsed.data.name, description: parsed.data.description ?? "", keywords: [parsed.data.name] },
        ancestors: [],
        createdBy: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        ...fields,
      } as Parameters<typeof categoriesRepository.createWithId>[1]);
  });
}

// audit-unknown-ok: callback entry point — accepts arbitrary payload value
export async function updateBrandAction(brandId: string, input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    await requireRoleUser("admin");
      await assertBrandExists(brandId);
      const parsed = brandUpdateSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid brand input");
      return categoriesRepository.update(brandId, brandInputToCategoryFields(parsed.data));
  });
}

export async function deleteBrandAction(brandId: string): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    await requireRoleUser("admin");
      await assertBrandExists(brandId);
      return categoriesRepository.delete(brandId);
  });
}

export async function toggleBrandActiveAction(brandId: string, isActive: boolean): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    await requireRoleUser("admin");
      await assertBrandExists(brandId);
      return categoriesRepository.update(brandId, { isActive });
  });
}
