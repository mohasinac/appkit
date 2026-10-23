/**
 * Profile Domain Actions (appkit)
 *
 * Pure business functions for profile CRUD, seller stats, and session reads.
 * Auth, rate-limiting, and Next.js specifics are handled by the consumer.
 */

import { cache } from "react";

import { maskPublicReview } from "../../../security";
import { safeRead } from "../../../errors/safe-read";
import { finalizeStagedMediaField } from "../../media/finalize";
import { userRepository } from "../repository/user.repository";
import { sessionRepository } from "../repository/session.repository";
import { productRepository } from "../../products/repository/products.repository";
import { ProductStatusValues } from "../../products/schemas";
import { reviewRepository } from "../../reviews/repository/reviews.repository";
import { orderRepository } from "../../orders/repository/orders.repository";
import { storeRepository } from "../../stores/repository/store.repository";
import type { UserDocument } from "../schemas";
import type { Review } from "../../reviews/types";

export type UpdateProfileInput = {
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  photoURL?: string;
  avatarMetadata?: {
    url: string;
    position: { x: number; y: number };
    zoom: number;
  };
};

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<UserDocument> {
  const finalPhotoURL = await finalizeStagedMediaField(input.photoURL);
  const data =
    finalPhotoURL !== undefined ? { ...input, photoURL: finalPhotoURL } : input;
  return userRepository.updateProfileWithVerificationReset(userId, data);
}

export async function getUserProfile(
  userId: string,
): Promise<UserDocument | null> {
  return userRepository.findById(userId);
}

export async function getUserSessions(userId: string) {
  return sessionRepository.findAllByUser(userId);
}

/**
 * What an account has actually DONE, counted from the collections that record
 * it rather than read off `users/{uid}.stats`.
 *
 * 🛑 `users/{uid}.stats.*` HAS NO WRITER. Measured 2026-10-23: every occurrence
 * of `stats.totalOrders` / `auctionsWon` / `itemsSold` / `reviewsCount` across
 * both repos is a READ, and the only `stats.itemsSold` write in the codebase is
 * `StoreRepository`'s, on the STORE document. So the stored numbers are
 * whatever `users-seed-data.ts` hardcoded — the admin persona ships
 * `{ totalOrders: 20, auctionsWon: 2, itemsSold: 200 }` — and a real signup gets
 * `DEFAULT_USER_DATA.stats`, all zeros, which stay zero after twenty orders.
 *
 * A number nobody maintains is worse than no number: it is indistinguishable
 * from a maintained one at every call site. These are counted live instead.
 *
 * ## Cost
 *
 * Three Firestore AGGREGATIONS, in parallel — billed at one read per 1000 index
 * entries matched, so ~3 reads for any real account and flat as history grows.
 * That is what makes this affordable on `GET /api/user/profile`, which the
 * session hits on every page load. Never replace one with `findByUser(...).length`:
 * that downloads the whole history to learn its size.
 *
 * ## Failure is `undefined`, never 0
 *
 * A failed count means "unknown", and 0 means "none" — Root Cause #72's rule.
 * Callers render nothing for `undefined`, so a transient Firestore error hides
 * a tile rather than telling a buyer with 30 orders that they have none.
 */
export interface BuyerActivityStats {
  /** Orders this account placed, all lanes. */
  totalOrders?: number;
  /** Orders that came from winning (or buying out) an auction. */
  auctionsWon?: number;
  /** Reviews this account WROTE — the set `/user/reviews` lists. */
  reviewsCount?: number;
}

/**
 * 🛑 React.cache-wrapped: `/api/user/profile` and the public profile page can
 * both ask for the same uid inside one request, and three aggregations is a
 * cost worth paying once.
 */
export const getBuyerActivityStats = cache(async function getBuyerActivityStats(
  uid: string,
): Promise<BuyerActivityStats> {
  const route = "profile:buyer-activity-stats";
  const [totalOrders, auctionsWon, reviewsCount] = await Promise.all([
    safeRead(() => orderRepository.countForUser(uid), {
      route,
      key: "orders:total",
      fallback: undefined as number | undefined,
    }),
    safeRead(() => orderRepository.countForUser(uid, "auction"), {
      route,
      key: "orders:auction",
      fallback: undefined as number | undefined,
    }),
    safeRead(() => reviewRepository.countByUser(uid), {
      route,
      key: "reviews:written",
      fallback: undefined as number | undefined,
    }),
  ]);
  return { totalOrders, auctionsWon, reviewsCount };
});

/**
 * Buyer activity plus, for an account that owns a store, the one SELLER number
 * that is genuinely maintained.
 *
 * `stores/{storeId}.stats.itemsSold` has real writers — `incrementItemsSold`
 * from the fulfilment trigger and `setStats` from the nightly reconciliation —
 * unlike its namesake on the user document. It is read here, from the store, so
 * a seller's PUBLIC profile can keep showing it honestly.
 *
 * It deliberately does NOT reach the sidebar's own profile block, which is the
 * buyer's view of their own account: see `AppLayoutShell`.
 */
export async function getProfileStats(
  user: Pick<UserDocument, "uid" | "id" | "storeId">,
): Promise<BuyerActivityStats & { itemsSold?: number }> {
  const uid = user.uid ?? user.id;
  const [activity, itemsSold] = await Promise.all([
    getBuyerActivityStats(uid),
    user.storeId
      ? safeRead(
          async () =>
            (await storeRepository.findById(user.storeId as string))?.stats
              ?.itemsSold,
          {
            route: "profile:store-items-sold",
            key: "store:itemsSold",
            fallback: undefined as number | undefined,
          },
        )
      : Promise.resolve(undefined),
  ]);
  return { ...activity, itemsSold };
}

/**
 * Resolve a profile by slug, then document id, then Auth uid.
 *
 * ONE function because the page and `GET /api/profile/[userId]` had already
 * diverged: the page fell back to `findByUid`, the route did not, so the same
 * identifier resolved on one surface and 404'd on the other. Adding slug
 * resolution to each of them separately would have made that three variants.
 *
 * Order matters. The slug is the canonical public identifier, so it is tried
 * first; `id` is next because for every app-created account `id === uid`, which
 * makes the third lookup a no-op for them. The uid fallback exists for seeded
 * personas (whose document id is a `user-*` slug, not their uid) and for links
 * shared before slugs existed — dropping it would 404 URLs already in the wild,
 * including ones inside sent notification emails.
 */
export async function resolveProfileUser(
  identifier: string,
): Promise<UserDocument | null> {
  const bySlug = await userRepository.findBySlug(identifier);
  if (bySlug) return bySlug;
  const byId = await userRepository.findById(identifier);
  if (byId) return byId;
  return userRepository.findByUid(identifier);
}

/**
 * 🛑 React.cache-wrapped because a page and its generateMetadata both read it.
 *
 * `resolveProfileUser` tries up to THREE lookups (slug, id, uid), and
 * `profile/[userId]/page.tsx` called this once in generateMetadata and again in
 * the page body — so an uncached profile view cost up to six Firestore reads to
 * answer one question. `sellers/[id]` had the same pair.
 *
 * This is the rule the SSR guide already states: every data-fetch exposed to a
 * page + generateMetadata pair is memoised per argument list, so the second call
 * is free. Note it caches the NARROW public projection, which is what both
 * callers want; anything needing the whole document still goes to the repository.
 *
 * 🛑 `stats` is DERIVED by `getProfileStats`, not `user.stats`. The stored field
 * has no writer and is seed fiction — see `getBuyerActivityStats`. It is derived
 * here as well as on the session endpoint deliberately: fixing only the sidebar
 * would have left a signed-in user reading real counts in the nav and seeded
 * ones on their own public profile, which is a worse state than both being wrong.
 */
export const getPublicUserProfile = cache(async function getPublicUserProfile(
  userId: string,
): Promise<
  | (Pick<
      UserDocument,
      | "id"
      | "slug"
      | "displayName"
      | "photoURL"
      | "role"
      | "createdAt"
      | "storeId"
      | "storeSlug"
      | "publicProfile"
    > & { stats: BuyerActivityStats & { itemsSold?: number } })
  | null
> {
  const user = await resolveProfileUser(userId);
  if (!user) return null;
  return {
    id: user.id,
    slug: user.slug,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: user.role,
    createdAt: user.createdAt,
    storeId: user.storeId,
    storeSlug: user.storeSlug,
    publicProfile: user.publicProfile,
    stats: await getProfileStats(user),
  };
});

/** Fetch approved reviews for a store. storeId === storeSlug in this project. */
export async function getSellerReviews(storeId: string) {
  const snapshot = await safeRead(
    () => reviewRepository.findApprovedByStore(storeId),
    { route: "/profile/[userId]", key: "reviews.findApprovedByStore", fallback: [] },
  );
  return snapshot.map((r): Review => ({
    id: r.id,
    productId: r.productId,
    productTitle: r.productTitle,
    userId: r.userId,
    /*
     * 🛑 `maskedReview`, not `maskPublicReview`.
     *
     * `maskPublicReview` calls `maskName`, which refuses a ciphertext input by
     * design and answers "Anonymous". Since `ReviewRepository.mapDoc` stopped
     * decrypting, `r.userName` IS ciphertext — so this rendered every reviewer
     * on every public profile as "Anonymous". `maskedReview` decrypts first,
     * then masks, which is the whole reason it exists.
     */
    userName: reviewRepository.maskedReview(r).userName,
    userAvatar: r.userAvatar,
    rating: r.rating as Review["rating"],
    title: r.title,
    comment: r.comment,
    images: r.images,
    status: r.status,
    helpfulCount: r.helpfulCount,
    reportCount: r.reportCount,
    verified: r.verified,
    featured: r.featured,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : undefined,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : undefined,
    storeSlug: r.storeId,
    storeName: r.storeName,
  }));
}

export async function getProfileStoreProducts(storeId: string) {
  const products = await productRepository.findByStore(storeId);
  return products.filter((p) => p.status === ProductStatusValues.PUBLISHED);
}

/** Approved product reviews written by this user as a buyer. Excludes seller→buyer ratings. */
export async function getReviewsAuthoredBy(userId: string) {
  const all = await safeRead(
    () => reviewRepository.findApprovedByUser(userId),
    { route: "/profile/[userId]", key: "reviews.findApprovedByUser", fallback: [] },
  );
  // reviewerRole:"seller" means this user rated a buyer — not a product review
  const snapshot = all.filter((r) => r.reviewerRole !== "seller");
  return snapshot.map((r): Review => ({
    id: r.id,
    productId: r.productId,
    productTitle: r.productTitle,
    userId: r.userId,
    /*
     * 🛑 `maskedReview`, not `maskPublicReview`.
     *
     * `maskPublicReview` calls `maskName`, which refuses a ciphertext input by
     * design and answers "Anonymous". Since `ReviewRepository.mapDoc` stopped
     * decrypting, `r.userName` IS ciphertext — so this rendered every reviewer
     * on every public profile as "Anonymous". `maskedReview` decrypts first,
     * then masks, which is the whole reason it exists.
     */
    userName: reviewRepository.maskedReview(r).userName,
    userAvatar: r.userAvatar,
    rating: r.rating as Review["rating"],
    title: r.title,
    comment: r.comment,
    images: r.images,
    status: r.status,
    helpfulCount: r.helpfulCount,
    reportCount: r.reportCount,
    verified: r.verified,
    featured: r.featured,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : undefined,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : undefined,
    storeSlug: r.storeId,
    storeName: r.storeName,
  }));
}

/** Approved seller→buyer reviews received by this buyer. */
export async function getReviewsReceivedBy(userId: string) {
  const snapshot = await safeRead(
    () => reviewRepository.findByReviewee(userId),
    { route: "/profile/[userId]", key: "reviews.findByReviewee", fallback: [] },
  );
  return snapshot.map((r): Review => ({
    id: r.id,
    productId: r.productId,
    productTitle: r.productTitle,
    userId: r.userId,
    /*
     * 🛑 `maskedReview`, not `maskPublicReview`.
     *
     * `maskPublicReview` calls `maskName`, which refuses a ciphertext input by
     * design and answers "Anonymous". Since `ReviewRepository.mapDoc` stopped
     * decrypting, `r.userName` IS ciphertext — so this rendered every reviewer
     * on every public profile as "Anonymous". `maskedReview` decrypts first,
     * then masks, which is the whole reason it exists.
     */
    userName: reviewRepository.maskedReview(r).userName,
    userAvatar: r.userAvatar,
    rating: r.rating as Review["rating"],
    title: r.title,
    comment: r.comment,
    images: r.images,
    status: r.status,
    helpfulCount: r.helpfulCount,
    reportCount: r.reportCount,
    verified: r.verified,
    featured: r.featured,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : undefined,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : undefined,
    storeSlug: r.storeId,
    storeName: r.storeName,
  }));
}
