"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { BlogListResponse, BlogListParams } from "../types";
import type { BlogPostDetailResponse } from "../api/[slug]/route";

export type { BlogListResponse };

interface UseBlogPostsOptions {
  initialData?: BlogListResponse;
  enabled?: boolean;
}

export function useBlogPosts(
  params: BlogListParams = {},
  opts?: UseBlogPostsOptions,
) {
  const searchParams = new URLSearchParams();
  if (params.category) searchParams.set("category", params.category);
  if (params.q) searchParams.set("q", params.q);
  if (params.tags) searchParams.set("tags", params.tags);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.perPage) searchParams.set("perPage", String(params.perPage));
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.featured !== undefined)
    searchParams.set("featured", String(params.featured));
  const qs = searchParams.toString();

  const query = useQuery<BlogListResponse>({
    queryKey: ["blog", qs],
    queryFn: () =>
      apiClient.get<BlogListResponse>(`/api/blog${qs ? `?${qs}` : ""}`),
    initialData: opts?.initialData,
    enabled: opts?.enabled,
  });

  return {
    posts: query.data?.posts ?? [],
    meta: query.data?.meta,
    total: query.data?.meta?.total ?? 0,
    totalPages: query.data?.meta?.totalPages ?? 1,
    page: query.data?.meta?.page ?? 1,
    isLoading: query.isLoading,
    error: query.error,
  };
}

interface UseBlogPostOptions {
  initialData?: BlogPostDetailResponse;
  enabled?: boolean;
}

export function useBlogPost(slug: string, opts?: UseBlogPostOptions) {
  const query = useQuery<BlogPostDetailResponse>({
    queryKey: ["blog", "post", slug],
    queryFn: () => apiClient.get<BlogPostDetailResponse>(`/api/blog/${slug}`),
    initialData: opts?.initialData,
    enabled: opts?.enabled !== false && !!slug,
  });

  return {
    post: query.data?.post ?? null,
    related: query.data?.related ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
