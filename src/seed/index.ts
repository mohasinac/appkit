// appkit/src/seed/index.ts
export type { SeedCollection, SeedConfig, SeedResult } from "./types";
export { runSeed } from "./runner";

// Factories
export type { SeedCategoryDocument } from "./factories/category.factory";
export { makeCategory } from "./factories/category.factory";

export type { SeedBaseProductDocument } from "./factories/product.factory";
export { makeProduct } from "./factories/product.factory";

export type { SeedBaseUserDocument } from "./factories/user.factory";
export { makeUser } from "./factories/user.factory";

export type { SeedBaseOrderDocument, SeedBaseOrderItem } from "./factories/order.factory";
export { makeOrder } from "./factories/order.factory";

export type { SeedReviewDocument } from "./factories/review.factory";
export { makeReview } from "./factories/review.factory";

export type { SeedBlogPostDocument } from "./factories/blog-post.factory";
export { makeBlogPost } from "./factories/blog-post.factory";

export type { SeedFaqDocument } from "./factories/faq.factory";
export { makeFaq } from "./factories/faq.factory";

export type { SeedCarouselSlideDocument } from "./factories/carousel.factory";
export { makeCarouselSlide } from "./factories/carousel.factory";

export type {
  SeedHomepageSectionDocument,
  HomepageSectionType,
} from "./factories/homepage-section.factory";
export { makeHomepageSection } from "./factories/homepage-section.factory";

export type { SeedBaseStoreDocument } from "./factories/store.factory";
export { makeStore } from "./factories/store.factory";

// Defaults
export { DEFAULT_CATEGORIES } from "./defaults/categories";
export { DEFAULT_FAQS } from "./defaults/faqs";
export { DEFAULT_HOMEPAGE_SECTIONS } from "./defaults/homepage-sections";
