/**
 * Blog Posts Firestore Document Types & Constants
 */

import { generateBlogPostId } from "../../../utils/id-generators";
import type { MediaFieldInput, MediaField } from "../../media/types";
import type { BlogPostStatus, BlogPostCategory } from "../types";

export interface BlogPostDocument {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: MediaFieldInput;
  contentImages?: MediaField[];
  additionalImages?: MediaField[];
  category: BlogPostCategory;
  tags: string[];
  isFeatured: boolean;
  status: BlogPostStatus;
  publishedAt?: Date;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  readTimeMinutes: number;
  views: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const BLOG_POSTS_COLLECTION = "blogPosts" as const;

export const BLOG_POSTS_INDEXED_FIELDS = [
  "status",
  "publishedAt",
  "isFeatured",
  "category",
  "slug",
] as const;

export const BLOG_POST_FIELDS = {
  ID: "id",
  TITLE: "title",
  SLUG: "slug",
  EXCERPT: "excerpt",
  CONTENT: "content",
  COVER_IMAGE: "coverImage",
  CONTENT_IMAGES: "contentImages",
  ADDITIONAL_IMAGES: "additionalImages",
  CATEGORY: "category",
  TAGS: "tags",
  IS_FEATURED: "isFeatured",
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
  byCategory: (category: BlogPostCategory) =>
    ["category", "==", category] as const,
  bySlug: (slug: string) => ["slug", "==", slug] as const,
  byAuthor: (authorId: string) => ["authorId", "==", authorId] as const,
} as const;

export function createBlogPostId(title: string, category = "news"): string {
  return generateBlogPostId({ title, category });
}
