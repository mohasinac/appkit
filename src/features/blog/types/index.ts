import type { MediaField, MediaFieldInput } from "../../media/types/index";

export type BlogPostCategory =
  | "news"
  | "tips"
  | "guides"
  | "updates"
  | "community";

export type BlogPostStatus = "draft" | "published" | "archived";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  coverImage?: MediaFieldInput;
  contentImages?: MediaField[];
  additionalImages?: MediaField[];
  category: BlogPostCategory;
  tags?: string[];
  isFeatured?: boolean;
  status: BlogPostStatus;
  publishedAt?: string;
  authorId?: string;
  authorName?: string;
  authorAvatar?: string;
  readTimeMinutes?: number;
  views?: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BlogListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface BlogListResponse {
  posts: BlogPost[];
  meta: BlogListMeta;
}

export interface BlogListParams {
  category?: BlogPostCategory;
  tags?: string;
  q?: string;
  page?: number;
  perPage?: number;
  sort?: string;
  featured?: boolean;
}
