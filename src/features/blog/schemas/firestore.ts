/**
 * Blog Posts Firestore Document Types & Constants
 */

import { generateBlogPostId } from "../../../utils/id-generators";
import type { MediaFieldInput, MediaField } from "../../media/types";
import type { BlogPostStatus, BlogPostCategory } from "../types";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";

/** Runtime-accessible blog post status values — use instead of bare string literals. */
export const BlogPostStatusValues = {
  DRAFT: "draft" as BlogPostStatus,
  PUBLISHED: "published" as BlogPostStatus,
  ARCHIVED: "archived" as BlogPostStatus,
} as const;

export interface BlogPostDocument extends BaseDocument {
  /** Normalized edge-n-gram search field — see appkit/src/utils/search-txt.ts. */
  searchTxt?: string[];

  title: string;
  slug: string;
  excerpt: string;

  /** Test-data flag — set on the shared admin-seeded test post; swept by testDataCleanup. */
  isTestData?: boolean;
  /** When isTestData, the cutoff after which testDataCleanup deletes this doc. */
  testDataExpiresAt?: Date;
  content: string;
  coverImage?: MediaFieldInput;
  contentImages?: MediaField[];
  additionalImages?: MediaField[];
  /** YouTube video ID (11 chars, e.g. "dQw4w9WgXcQ") embedded above the article content. */
  youtubeId?: string;
  category: BlogPostCategory;
  tags: string[];
  /**
   * PROMOTIONAL coupons shown below the article for a reader to copy.
   *
   * Mirrors `EventDocument.couponIds` exactly — same name, same shape, same
   * `<AttachedCouponsSection>` renderer, same `getAttachedCoupons` resolver.
   * That symmetry is the point: "attach coupons to content" is one feature
   * with two hosts, not two features that happen to look alike.
   *
   * 🛑 OPTIONAL, unlike `isPinned` above, and for a reason worth keeping
   * straight: `isPinned` had to be required because it is an `orderBy` field
   * and Firestore excludes a document that lacks one (Root Cause #100).
   * `couponIds` is never sorted or filtered on — it is read only after a post
   * has already been fetched by slug — so an absent field costs nothing and
   * needs no backfill across the 21 existing posts.
   */
  couponIds?: string[];
  isFeatured: boolean;
  /**
   * Keeps the post at the top of the blog index and the homepage
   * `blog-articles` section, above newer posts.
   *
   * 🛑 REQUIRED, not optional, and that is load-bearing. The default sort is
   * `-isPinned,-publishedAt`, and Firestore EXCLUDES a document that lacks an
   * `orderBy` field (Root Cause #100) — so an optional `isPinned` would drop
   * every pre-existing post out of its own index, silently, with a 200.
   * A `mapDoc` default cannot rescue it either: that is a read-side fixup and
   * a query never sees it (Root Cause #101). Every row needs a real `false`
   * written, which is why the seed carries it explicitly.
   *
   * Distinct from `isFeatured` on purpose: featured drives the badge and the
   * featured-card treatment, and there are several featured posts. Overloading
   * it would make "featured" and "first" the same decision.
   */
  isPinned: boolean;
  status: BlogPostStatus;
  publishedAt?: Date;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  readTimeMinutes: number;
  views: number;
  metaTitle?: string;
  metaDescription?: string;
}

export const BLOG_POSTS_COLLECTION = "blogPosts" as const;

export const BLOG_POSTS_INDEXED_FIELDS = [
  "searchTxt",
  "status",
  "publishedAt",
  "isFeatured",
  "isPinned",
  "category",
  "slug",
] as const;

/**
 * The default ordering for every PUBLIC blog surface — the `/blog` index, the
 * `/api/blog` route that refetches it, and the homepage `blog-articles` feed.
 *
 * 🛑 ONE constant, three consumers, deliberately. The SSR view hands its result
 * to the listing hook as `initialData`, and that hook sets `staleTime: Infinity`
 * when given SSR data — so if the route's default sort differed from the view's
 * by even a character, the first paint would be frozen in one order while the
 * query key described another (Root Cause #30). Three literals is how that
 * drift happens; one import is how it cannot.
 *
 * `isPinned` leads so pinned posts sit above newer ones. Needs the composite
 * indexes on (status, isPinned DESC, publishedAt DESC) and its category /
 * isFeatured / searchTxt variants — a multi-field sieve sort becomes two
 * `orderBy` calls, and a missing index is a silent FAILED_PRECONDITION that
 * every caller swallows into an empty page (Root Cause #2 / #59).
 */
export const BLOG_DEFAULT_PUBLIC_SORT = "-isPinned,-publishedAt" as const;

export const BLOG_POST_FIELDS = {
  /** Word-prefix search tokens. Derived on write by `buildSearchTxtFor`. */
  SEARCH_TXT: "searchTxt",
  ID: "id",
  TITLE: "title",
  SLUG: "slug",
  EXCERPT: "excerpt",
  CONTENT: "content",
  COVER_IMAGE: "coverImage",
  CONTENT_IMAGES: "contentImages",
  ADDITIONAL_IMAGES: "additionalImages",
  YOUTUBE_ID: "youtubeId",
  CATEGORY: "category",
  TAGS: "tags",
  COUPON_IDS: "couponIds",
  IS_FEATURED: "isFeatured",
  IS_PINNED: "isPinned",
  STATUS: "status",
  PUBLISHED_AT: "publishedAt",
  AUTHOR_ID: "authorId",
  AUTHOR_NAME: "authorName",
  AUTHOR_AVATAR: "authorAvatar",
  READ_TIME_MINUTES: "readTimeMinutes",
  VIEWS: "views",
  META_TITLE: "metaTitle",
  META_DESCRIPTION: "metaDescription",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
  STATUS_VALUES: {
    DRAFT: "draft" as BlogPostStatus,
    PUBLISHED: "published" as BlogPostStatus,
    ARCHIVED: "archived" as BlogPostStatus,
  },
  CATEGORY_VALUES: {
    NEWS: "news" as BlogPostCategory,
    TIPS: "tips" as BlogPostCategory,
    GUIDES: "guides" as BlogPostCategory,
    UPDATES: "updates" as BlogPostCategory,
    COMMUNITY: "community" as BlogPostCategory,
  },
} as const;

export const DEFAULT_BLOG_POST_DATA: Omit<
  BlogPostDocument,
  "id" | "createdAt" | "updatedAt"
> = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "news",
  tags: [],
  isFeatured: false,
  isPinned: false,
  status: "draft",
  authorId: "",
  authorName: "",
  readTimeMinutes: 5,
  views: 0,
};

export const BLOG_POST_PUBLIC_FIELDS: (keyof BlogPostDocument)[] = [
  "id",
  "title",
  "slug",
  "excerpt",
  "content",
  "coverImage",
  "category",
  "tags",
  "isFeatured",
  "isPinned",
  "status",
  "publishedAt",
  "authorName",
  "authorAvatar",
  "readTimeMinutes",
  "views",
  "metaTitle",
  "metaDescription",
  "createdAt",
  "updatedAt",
];

export type BlogPostCreateInput = Omit<
  BlogPostDocument,
  "id" | "views" | "createdAt" | "updatedAt"
> & { views?: number };
export type BlogPostUpdateInput = Partial<
  Omit<BlogPostDocument, "id" | "createdAt" | "updatedAt">
>;

export const blogPostQueryHelpers = {
  published: () => ["status", "==", "published" as BlogPostStatus] as const,
  featured: () => ["isFeatured", "==", true] as const,
  pinned: () => ["isPinned", "==", true] as const,
  byCategory: (category: BlogPostCategory) =>
    ["category", "==", category] as const,
  bySlug: (slug: string) => ["slug", "==", slug] as const,
  byAuthor: (authorId: string) => ["authorId", "==", authorId] as const,
} as const;

export function createBlogPostId(title: string, category = "news"): string {
  return generateBlogPostId({ title, category });
}
