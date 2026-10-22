"use server";

/*
 * 🛑 From the DEFINING module, never "@mohasinac/appkit/server".
 *
 * appkit importing its own public server barrel is a self-reference that drags
 * the whole server surface in behind it — `dist/server.js` reaches next/og,
 * next/navigation, next/headers and driver.js. Twenty `actions.ts` files did
 * this for two symbols, and because `obligationSweep` reaches one of them, the
 * Firebase Functions tsup bundle (noExternal: appkit) had to resolve Next:
 * it failed on two `react-server-dom-webpack/*` requires and two @vercel/og
 * .wasm files, naming none of the responsible files. Root Cause #18.
 */
import { wrapAction, type ActionResult } from "../../../shared/types/action-result";
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
  /*
   * 🛑 `display` IS NOT WRITTEN HERE ANY MORE — IT WAS DESTRUCTIVE.
   *
   * This read `out.display = { coverImage, showInMenu: false, showInFooter:
   * false }`, and `BaseRepository.update` calls Firestore's `doc().update()`,
   * which REPLACES a nested map rather than merging into it. So saving a
   * brand's cover image deleted every other `display` key — `icon`, `color`,
   * `mosaicImages` — and additionally forced `showInMenu` and `showInFooter`
   * to `false`, silently removing the brand from the menu and the footer for
   * anyone who touched its image.
   *
   * This is the identical defect Phase 0 found and fixed on the CATEGORY
   * editor (which sent `display: { showInMenu }` and wiped the cover image,
   * emoji, colour and a bundle's `mosaicImages` collage on every save). Both
   * sublisting routes already merged correctly; the category route was fixed;
   * the BRAND path was never looked at — the same root cause in a third place,
   * found only because this file was open for an unrelated field.
   *
   * The merge now happens in `updateBrandAction`, which has the stored
   * document in hand. Create still writes the full map, which is correct:
   * there is nothing to preserve, and the caller's defaults are the record.
   */
  if (input.isActive !== undefined) out.isActive = input.isActive;
  if (input.displayOrder !== undefined) out.order = input.displayOrder;
  /*
   * 🛑 Both written as TOP-LEVEL arrays, not nested under `display` — so the
   * replace-vs-merge hazard that this function's `display` note is about does
   * not apply to them. `update()` replaces an array wholesale, which is the
   * correct semantics for a list the form submits in full.
   *
   * And `!== undefined` rather than a truthiness test: an EMPTY array is a
   * real instruction ("remove every highlight"), and `if (input.highlights)`
   * would silently decline to carry it, leaving the admin unable to clear a
   * list they can see.
   */
  if (input.highlights !== undefined) out.highlights = input.highlights;
  if (input.faqs !== undefined) out.faqs = input.faqs;
  return out;
}

export async function createBrandAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    // Sellers create brands inline from the product form's brand picker
    // (BrandInlineSelect -> BrandQuickCreateForm); there is no /store/brands
    // page. Mirrors ROLES_STORE_WRITE on the only caller,
    // src/app/api/admin/brands/route.ts. Kept as a gate rather than dropped:
    // this is a "use server" export and is independently callable.
    const actor = await requireRoleUser(["admin", "seller"]);
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
        /*
         * Written in FULL here, and that is correct on create: there is no
         * stored map to preserve, so these defaults ARE the record. The
         * mapper no longer supplies it — see the note there on why merging
         * belongs in the update path.
         *
         * 🛑 `icon` is deliberately left UNSET rather than given a value.
         * `resolveTaxonomyVisual` checks `icon` BEFORE `coverImage`, and the
         * seed convention puts an EMOJI there — so an icon set here would win
         * over the real logo the admin just uploaded (`brand-rows.ts` trap 2).
         */
        display: {
          coverImage: parsed.data.logoURL,
          showInMenu: false,
          showInFooter: false,
        },
        ancestors: [],
        createdBy: actor.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...fields,
      } as Parameters<typeof categoriesRepository.createWithId>[1]);
  });
}

export async function updateBrandAction(brandId: string, input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    await requireRoleUser("admin");
      await assertBrandExists(brandId);
      const parsed = brandUpdateSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid brand input");

      const fields = brandInputToCategoryFields(parsed.data);

      /*
       * 🛑 `display` MERGED OVER WHAT IS STORED, never replaced. `update()`
       * replaces a nested map, so a payload carrying a partial `display`
       * deletes every key it omits — which is how a cover-image save used to
       * destroy a brand's `icon`, `color` and `mosaicImages` and force it out
       * of the menu and footer.
       *
       * Same shape and same fix as `PATCH /api/admin/categories/[id]`.
       * Merged rather than written as `display.x` DOT PATHS for the reason
       * recorded there: `categoriesRepository.update` is typed
       * `Partial<CategoryDocument>`, which a dot-path key does not satisfy.
       *
       * 🛑 The read is only taken when there is something to merge, so a save
       * that does not touch the image still costs no extra Firestore read —
       * `assertBrandExists` above does not hand back the document.
       */
      if (parsed.data.logoURL !== undefined) {
        const existing = await categoriesRepository.findById(brandId);
        fields.display = {
          ...((existing?.display ?? {}) as Record<string, JsonValue>),
          coverImage: parsed.data.logoURL,
        };
      }

      return categoriesRepository.update(brandId, fields);
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
