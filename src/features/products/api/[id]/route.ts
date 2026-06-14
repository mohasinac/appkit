/**
 * feat-products — single-item route handlers (GET/PATCH/DELETE /api/products/[id])
 *
 * Consuming projects can create a 2-line stub:
 *
 * ```ts
 * // app/api/products/[id]/route.ts
 * export { productItemGET as GET, productItemPATCH as PATCH, productItemDELETE as DELETE }
 *   from "@mohasinac/feat-products";
 * ```
 */

import { NextResponse } from "next/server.js";
import { z } from "zod";
import { getProviders } from "../../../../contracts";
import { createRouteHandler } from "../../../../next";
import type { ProductItem } from "../../types/index";
import { mediaFieldSchema } from "../../../media/types/index";
import { storeRepository } from "../../../stores/repository/store.repository";
// SB-UNI-V — bundlesRepository deleted; bundle stock-sync moves to the
// `onProductStockChange` Firebase Function (see functions/src/bundle-stock-sync.ts).
import { sanitizeProductForPublic } from "../../utils/sanitize";
import { serverLogger } from "../../../../monitoring/server-logger";
import { isAdminUser, isModeratorUser } from "../../../auth/role-predicates";

import { normalizeError } from "../../../../errors/normalize";
const ERR_DB_NOT_REGISTERED = "Database provider not registered";
const ERR_PRODUCT_NOT_FOUND = "Product not found";

const UNAVAILABLE_PRODUCT_STATUSES = new Set<string>([
  "archived",
]);

// SB-UNI-V — `syncBundlesForUnavailableProduct` removed. Bundle stock
// state is recomputed by the `onProductStockChange` Firebase Function
// (Firestore onWrite trigger on products), which reads
// `partOfBundleCategoryIds[]` on the product and recomputes each bundle
// category's `bundleStockStatus`. No fire-and-forget call from the API
// route is needed.

type RouteContext = { params: Promise<{ id: string }> };

type ProductRecord = ProductItem & {
  storeId?: string;
};

function getRepo() {
  const { db } = getProviders();
  if (!db) return null;
  return db.getRepository<ProductRecord>("products");
}

const productUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(10000).optional(),
    price: z.number().positive().optional(),
    originalPrice: z.number().positive().optional(),
    currency: z.string().length(3).optional(),
    category: z.string().optional(),
    status: z
      .enum([
        "draft",
        "published",
        "in_review",
        "archived",
      ])
      .optional(),
    mainImage: z.string().optional(),
    images: z.array(z.any()).optional(), // audit-z-any-ok: extending-apps pass MediaField | string | their own image shape
    tags: z.array(z.string()).optional(),
    featured: z.boolean().optional(),
    isPromoted: z.boolean().optional(),
    listingType: z
      .enum(["standard", "auction", "pre-order", "prize-draw", "bundle", "classified", "digital-code", "live"])
      .optional(),
    media: z.array(mediaFieldSchema).optional(),
  })
  .passthrough();

// --- GET /api/products/[id] ---------------------------------------------------

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const repo = getRepo();
    if (!repo) {
      return NextResponse.json(
        { success: false, error: ERR_DB_NOT_REGISTERED },
        { status: 503 },
      );
    }

    // Support both Firestore document ID and URL slug
    let item = await repo.findById(id);
    if (!item) {
      // Slug fallback: search by slug==id, status==published
      const slugResult = await repo.findAll({
        filters: `slug==${id},status==published`,
        perPage: 1,
      });
      item = slugResult.data[0] ?? null;
    }
    if (!item) {
      return NextResponse.json(
        { success: false, error: ERR_PRODUCT_NOT_FOUND },
        { status: 404 },
      );
    }

    const sanitized = sanitizeProductForPublic(
      item as unknown as Record<string, unknown>,
    );
    return NextResponse.json({ success: true, data: sanitized });
  } catch (error) {
    void normalizeError(error);
    console.error("[feat-products] GET /api/products/[id] failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}

// --- PATCH /api/products/[id] -------------------------------------------------
// Auth required; the caller must be the owner, a moderator, or an admin.

export const PATCH = createRouteHandler<
  z.infer<typeof productUpdateSchema>,
  { id: string }
>({
  auth: true,
  schema: productUpdateSchema,
  handler: async ({ user, body, params }) => {
    const { id } = params!;
    const repo = getRepo();
    if (!repo) {
      return NextResponse.json(
        { success: false, error: ERR_DB_NOT_REGISTERED },
        { status: 503 },
      );
    }

    const product = await repo.findById(id);
    if (!product) {
      return NextResponse.json(
        { success: false, error: ERR_PRODUCT_NOT_FOUND },
        { status: 404 },
      );
    }

    const ownerStore = product.storeId ? await storeRepository.findByOwnerId(user?.uid ?? "") : null;
    const isOwner = !!ownerStore && ownerStore.id === product.storeId;
    const isModerator = isModeratorUser(user);
    const isAdmin = isAdminUser(user);

    if (!isOwner && !isModerator && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Not authorized to update this product" },
        { status: 403 },
      );
    }

    // SB4 — once any prize in a prize-draw listing has been won, the listing
    // is frozen. Sellers can no longer edit it; admins inherit the same lock
    // (anything they need to change should go through a new listing or a
    // dedicated remediation script).
    const prizeItems =
      (product as { prizeDrawItems?: { isWon?: boolean }[] }).prizeDrawItems ??
      [];
    const anyPrizeWon = prizeItems.some((it) => it?.isWon);
    if (
      (product as { listingType?: string }).listingType === "prize-draw" &&
      anyPrizeWon
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This prize-draw listing is locked because at least one prize has been revealed. Clone it into a new listing if you want to rerun the draw.",
        },
        { status: 409 },
      );
    }

    const updated = await repo.update(id, {
      ...(body as Partial<ProductItem>),
      updatedAt: new Date().toISOString(),
    });

    // SB1-H stock-sync — if this PATCH transitioned the product to an
    // unavailable status, propagate `isSold` to every bundle that lists it.
    const beforeStatus = product.status as string | undefined;
    const afterStatus = (body as { status?: string } | null)?.status;
    const becameUnavailable =
      typeof afterStatus === "string" &&
      UNAVAILABLE_PRODUCT_STATUSES.has(afterStatus) &&
      beforeStatus !== afterStatus;
    // SB-UNI-V — bundle stock-sync moved to onProductStockChange Function;
    // the API route no longer fires fire-and-forget. The product write
    // triggers the Function via Firestore onWrite. Reference to
    // `becameUnavailable` retained for telemetry callers.
    void becameUnavailable;

    return NextResponse.json({ success: true, data: updated });
  },
});

// --- DELETE /api/products/[id] ------------------------------------------------
// Soft-delete (sets status to "archived"). Auth required.

export const DELETE = createRouteHandler<never, { id: string }>({
  auth: true,
  handler: async ({ user, params }) => {
    const { id } = params!;
    const repo = getRepo();
    if (!repo) {
      return NextResponse.json(
        { success: false, error: ERR_DB_NOT_REGISTERED },
        { status: 503 },
      );
    }

    const product = await repo.findById(id);
    if (!product) {
      return NextResponse.json(
        { success: false, error: ERR_PRODUCT_NOT_FOUND },
        { status: 404 },
      );
    }

    const ownerStore = product.storeId ? await storeRepository.findByOwnerId(user?.uid ?? "") : null;
    const isOwner = !!ownerStore && ownerStore.id === product.storeId;
    const isModerator = isModeratorUser(user);
    const isAdmin = isAdminUser(user);

    if (!isOwner && !isModerator && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Not authorized to delete this product" },
        { status: 403 },
      );
    }

    await repo.update(id, {
      status: "archived" as ProductItem["status"],
      updatedAt: new Date().toISOString(),
    });

    // SB-UNI-V — bundle stock-sync handled by onProductStockChange Function.
    return NextResponse.json({ success: true });
  },
});

export {
  GET as productItemGET,
  PATCH as productItemPATCH,
  DELETE as productItemDELETE,
};
