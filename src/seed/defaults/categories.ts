// appkit/src/seed/defaults/categories.ts
import { makeCategory, type SeedCategoryDocument } from "../factories/category.factory";

export const DEFAULT_CATEGORIES: SeedCategoryDocument[] = [
  makeCategory({ id: "cat-clothing", name: "Clothing", slug: "clothing", sortOrder: 1 }),
  makeCategory({ id: "cat-electronics", name: "Electronics", slug: "electronics", sortOrder: 2 }),
  makeCategory({ id: "cat-home", name: "Home & Living", slug: "home-living", sortOrder: 3 }),
  makeCategory({ id: "cat-beauty", name: "Beauty & Personal Care", slug: "beauty", sortOrder: 4 }),
  makeCategory({ id: "cat-sports", name: "Sports & Outdoors", slug: "sports", sortOrder: 5 }),
  makeCategory({ id: "cat-books", name: "Books", slug: "books", sortOrder: 6 }),
  makeCategory({ id: "cat-toys", name: "Toys & Games", slug: "toys", sortOrder: 7 }),
  makeCategory({ id: "cat-food", name: "Food & Grocery", slug: "food", sortOrder: 8 }),
];
