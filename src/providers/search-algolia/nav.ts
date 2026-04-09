export const ALGOLIA_PAGES_INDEX_NAME =
  process.env.NEXT_PUBLIC_ALGOLIA_PAGES_INDEX_NAME ?? "pages_nav";

export interface AlgoliaNavRecord {
  objectID: string;
  title: string;
  subtitle?: string;
  type: "page" | "category" | "blog" | "event";
  url: string;
  image?: string;
  priority: number;
}
