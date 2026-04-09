// appkit/src/seed/factories/review.factory.ts
let _seq = 1;

// Realistic rating distribution: mostly 4–5 stars with occasional lower ratings
const RATING_DIST = [5, 5, 4, 5, 4, 3, 5, 4, 5, 2] as const;

const REVIEW_TITLES = [
  "Excellent quality!", "Beautifully crafted", "Worth every rupee",
  "Exceeded expectations", "Good value for money", "Authentic and unique",
  "Some quality issues", "Lovely gift option", "Super fast delivery", "Not as described",
] as const;

const REVIEW_COMMENTS = [
  "The craftsmanship is outstanding. Exactly as shown in the pictures. Will buy again!",
  "Beautiful product, very well made. Received many compliments. Packaging was also great.",
  "Good quality for the price. Shipping was quick. Overall satisfied with the purchase.",
  "Absolutely love it! The artisan detail is incredible. Highly recommend to everyone.",
  "Product is good but took a bit longer to arrive. Quality is as expected.",
  "Looks authentic and well-crafted. My family loved it as a gift.",
  "Minor colour variation from the photos but still beautiful in person.",
  "Perfect for home decor. Sturdy and packed well. Very happy with this purchase.",
  "Fast shipping, product matches description. Good seller.",
  "The quality could be better for this price. Average experience overall.",
] as const;

function pick<T>(arr: readonly T[], n: number): T {
  return arr[n % arr.length];
}

function irand(n: number, min: number, max: number): number {
  return min + (((n * 2_654_435_761) >>> 0) % (max - min + 1));
}

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
    rating: overrides.rating ?? (pick(RATING_DIST, n) as 1 | 2 | 3 | 4 | 5),
    title: overrides.title ?? pick(REVIEW_TITLES, n),
    comment: overrides.comment ?? pick(REVIEW_COMMENTS, n),
    images: overrides.images ?? [],
    status: overrides.status ?? "published",
    helpfulCount: overrides.helpfulCount ?? irand(n, 0, 47),
    verified: overrides.verified ?? (n % 5 !== 0), // 80% verified
    createdAt: overrides.createdAt ?? now,
    ...overrides,
  };
}
