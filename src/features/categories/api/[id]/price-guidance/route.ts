/**
 * feat-categories — GET /api/categories/[id]/price-guidance
 *
 * The seller-facing price hint `description-template/route.ts`'s own
 * docstring names as "C1's job, from a surface that knows who is asking" —
 * this is that surface. It is deliberately a SEPARATE endpoint rather than a
 * field added back to the public, CDN-cached template route: that route's
 * whole point is that anyone can fetch it, and `priceGuidance` is withheld
 * from signed-out visitors for the same reason a listing's own price is
 * (CLAUDE.md § "Guest price gating") — publishing the competitor-derived
 * market band on an unauthenticated, publicly-cacheable response would be
 * exactly the "a neighbouring surface publishes the range" leak that gate
 * exists to close, even though the number is advisory rather than a real
 * price.
 *
 * Consumer stub:
 * ```ts
 * // src/app/api/categories/[id]/price-guidance/route.ts
 * export { categoryPriceGuidanceGET as GET } from "@mohasinac/appkit";
 * ```
 *
 * ## What this does NOT resolve
 *
 * `PriceGuidanceBasis.gstRate` — "the rate that will be written onto this
 * listing, resolved the same way `deriveTaxonomy` resolves it" — is left
 * `undefined` here on purpose. `deriveTaxonomy` is a private method on
 * `ProductRepository`, tightly coupled to the product WRITE path (it also
 * applies `DEFAULT_GST_RATE` as a last resort, which is correct for a
 * document being saved and would be a guess presented as fact on a read-only
 * hint). `describePriceGuidanceBasis` already handles an unresolved rate
 * correctly and safely: for the common case (a seller whose prices already
 * include GST — the schema default), the rate is never consulted at all, so
 * this omission costs nothing. Only an EXCLUSIVE-pricing seller sees the
 * honest "could not be resolved" note instead of a converted figure — which
 * is the behaviour `price-guidance.ts`'s own docstring prescribes for exactly
 * this situation, not a half-measure standing in for the real resolution.
 */

import { NextResponse } from "next/server.js";
import { normalizeError } from "../../../../../errors/normalize";
import { serverLogger } from "../../../../../monitoring";
import { createRouteHandler } from "../../../../../next/api/routeHandler";
import { getProviders } from "../../../../../contracts";
import { categoriesRepository } from "../../../repository/categories.repository";
import { isAdminUser } from "../../../../auth/role-predicates";
import {
  priceGuidanceOnSellerBasis,
  describePriceGuidanceBasis,
} from "../../../../../_internal/shared/features/categories/price-guidance";
import {
  resolveInheritedGuidance,
  type GuidanceLeafDoc,
} from "../../../../../_internal/server/features/categories/price-guidance-resolve";

export const GET = createRouteHandler<unknown, { id: string }>({
  roles: ["seller", "admin", "moderator"],
  handler: async ({ user, params }): Promise<NextResponse> => {
    try {
      const categoryId = params?.id;
      if (!categoryId) {
        return NextResponse.json({ success: false, error: "Missing category id" }, { status: 400 });
      }

      const leafDoc = await categoriesRepository.findById(categoryId);
      if (!leafDoc) {
        return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
      }

      const guidance = await resolveInheritedGuidance(leafDoc as GuidanceLeafDoc);
      if (!guidance) {
        return NextResponse.json({ success: true, data: { guidance: null, basisNote: null } });
      }

      /*
       * One read, admin exempted (no store to look up). `pricesIncludeGst`
       * absent means `true` — matching the schema default and the store
       * route's own `?? true` (see `PriceGuidanceBasis.sellerIncludesGst`'s
       * docstring for why this must stay consistent everywhere it's read).
       */
      let sellerIncludesGst: boolean | undefined;
      if (!isAdminUser(user)) {
        const { db } = getProviders();
        const storesRepo = db?.getRepository<{ pricesIncludeGst?: boolean }>("stores");
        const result = await storesRepo?.findAll({ filters: `ownerId==${user!.uid}`, pageSize: 1 });
        sellerIncludesGst = result?.data[0]?.pricesIncludeGst;
      }

      const basis = { sellerIncludesGst, gstRate: undefined };
      const onSellerBasis = priceGuidanceOnSellerBasis(guidance, basis);
      const basisNote = describePriceGuidanceBasis(basis);

      return NextResponse.json(
        { success: true, data: { guidance: onSellerBasis, basisNote } },
        {
          // Per-seller basis, so never shared across callers.
          headers: { "Cache-Control": "private, max-age=3600" },
        },
      );
    } catch (err) {
      const e = normalizeError(err);
      serverLogger.error("price-guidance read failed", { message: e.message });
      return NextResponse.json(
        { success: false, error: "Could not load price guidance" },
        { status: 500 },
      );
    }
  },
});
