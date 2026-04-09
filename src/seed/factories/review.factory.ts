// appkit/src/seed/factories/review.factory.ts
let _seq = 1;

export interface SeedReviewDocument {
  id: string;
  productId: string;
  userId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  comment: string;
  images: string[];
  status: "published" | "pending" | "rejected";
  helpfulCount: number;
  verified: boolean;
  createdAt: Date;
}

export function makeReview(
  overrides: Partial<SeedReviewDocument> = {},
): SeedReviewDocument {
  const n = _seq++;
  const now = new Date();
  return {
    id: overrides.id ?? `review-${n}`,
    productId: overrides.productId ?? "product-1",
    userId: overrides.userId ?? "user-1",
    rating: overrides.rating ?? 5,
    title: overrides.title ?? `Review ${n}`,
    comment: overrides.comment ?? "Great product, highly recommended.",
    images: overrides.images ?? [],
    status: overrides.status ?? "published",
    helpfulCount: overrides.helpfulCount ?? 0,
    verified: overrides.verified ?? true,
    createdAt: overrides.createdAt ?? now,
    ...overrides,
  };
}
