import { cache } from "react";
import { getAdminDb } from "../../../../providers/db-firebase";
import {
  GROUPED_LISTINGS_COLLECTION,
  type GroupedListingDocument,
} from "../../../../features/grouped/schemas/firestore";
import { productRepository } from "../../../../repositories";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import {
  GROUPED_LISTINGS_FEATURED_LIMIT,
  GROUPED_LISTINGS_PAGE_SIZE,
  GROUPED_LISTINGS_SITEMAP_LIMIT,
} from "../../../shared/features/grouped/config";

function mapDoc(doc: FirebaseFirestore.QueryDocumentSnapshot): GroupedListingDocument {
  const data = doc.data() as Record<string, unknown>;
  const ts = (v: unknown): Date => {
    const d = (v as { toDate?: () => Date } | undefined)?.toDate?.();
    return d ?? (v instanceof Date ? v : new Date());
  };
  return {
    id: doc.id,
    slug: (data.slug as string | undefined) ?? doc.id,
    title: (data.title as string | undefined) ?? "",
    description: data.description as string | undefined,
    productIds: Array.isArray(data.productIds) ? (data.productIds as string[]) : [],
    coverImage: data.coverImage as string | undefined,
    bundlePrice: data.bundlePrice as number | undefined,
    originalPrice: data.originalPrice as number | undefined,
    discountPercent: data.discountPercent as number | undefined,
    currency: ((data.currency as string | undefined) ?? "INR") as "INR",
    isActive: data.isActive === true,
    isFeatured: data.isFeatured === true,
    storeId: data.storeId as string | undefined,
    brandSlug: data.brandSlug as string | undefined,
    categorySlug: data.categorySlug as string | undefined,
    createdBy: (data.createdBy as string | undefined) ?? "",
    createdAt: ts(data.createdAt),
    updatedAt: ts(data.updatedAt),
  };
}

export interface GroupedListingWithItems extends GroupedListingDocument {
  items: ProductDocument[];
}

/** Fetch a grouped listing by slug, deduped per request. */
export const getGroupedListingForDetail = cache(
  async (slug: string): Promise<GroupedListingDocument | null> => {
    try {
      const db = getAdminDb();
      const snap = await db
        .collection(GROUPED_LISTINGS_COLLECTION)
        .where("slug", "==", slug)
        .limit(1)
        .get();
      if (snap.empty) {
        const byId = await db.collection(GROUPED_LISTINGS_COLLECTION).doc(slug).get();
        if (!byId.exists) return null;
        return mapDoc(byId as unknown as FirebaseFirestore.QueryDocumentSnapshot);
      }
      return mapDoc(snap.docs[0]);
    } catch {
      return null;
    }
  },
);

/** Fetch a grouped listing with its member products resolved, deduped per request. */
export const getGroupedListingWithItems = cache(
  async (slug: string): Promise<GroupedListingWithItems | null> => {
    const doc = await getGroupedListingForDetail(slug);
    if (!doc) return null;
    const items: ProductDocument[] = [];
    for (const productId of doc.productIds) {
      const product = await productRepository.findByIdOrSlug(productId).catch(() => null);
      if (product) items.push(product);
    }
    return { ...doc, items };
  },
);

export interface ListGroupedListingsParams {
  limit?: number;
  featuredOnly?: boolean;
  storeId?: string;
  brandSlug?: string;
  categorySlug?: string;
}

/** List active grouped listings, newest first. */
export async function listGroupedListings(
  params: ListGroupedListingsParams = {},
): Promise<GroupedListingDocument[]> {
  try {
    const db = getAdminDb();
    let q: FirebaseFirestore.Query = db
      .collection(GROUPED_LISTINGS_COLLECTION)
      .where("isActive", "==", true);
    if (params.featuredOnly) q = q.where("isFeatured", "==", true);
    if (params.storeId) q = q.where("storeId", "==", params.storeId);
    if (params.brandSlug) q = q.where("brandSlug", "==", params.brandSlug);
    if (params.categorySlug) q = q.where("categorySlug", "==", params.categorySlug);
    const snap = await q
      .orderBy("createdAt", "desc")
      .limit(params.limit ?? GROUPED_LISTINGS_PAGE_SIZE)
      .get();
    return snap.docs.map(mapDoc);
  } catch {
    return [];
  }
}

/** Featured grouped listings for homepage strips. */
export const listFeaturedGroupedListings = cache(
  async (limit = GROUPED_LISTINGS_FEATURED_LIMIT): Promise<GroupedListingDocument[]> => {
    return listGroupedListings({ featuredOnly: true, limit });
  },
);

export interface SitemapGroupedListing {
  slug: string;
  updatedAt: Date;
}

export async function listSitemapGroupedListings(): Promise<SitemapGroupedListing[]> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection(GROUPED_LISTINGS_COLLECTION)
      .where("isActive", "==", true)
      .select("slug", "updatedAt")
      .limit(GROUPED_LISTINGS_SITEMAP_LIMIT)
      .get();
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        slug: (data.slug as string | undefined) ?? d.id,
        updatedAt: (data.updatedAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date(),
      };
    });
  } catch {
    return [];
  }
}
