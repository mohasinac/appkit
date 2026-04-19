"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { BlogListResponse } from "../../blog/types";
import { BLOG_ENDPOINTS } from "../../../constants/api-endpoints";

const MIN_BLOG_COUNT = 4;

export interface BlogListResult {
  posts: BlogListResponse["posts"];
  meta: { total: number; page: number; pageSize: number };
}

export function useBlogArticles() {
  return useQuery<BlogListResult>({
    queryKey: ["blog", "featured"],
    queryFn: async () => {
      const featuredResult = await apiClient.get<BlogListResponse>(
        BLOG_ENDPOINTS.FEATURED(MIN_BLOG_COUNT),
      );
      const featured = featuredResult.posts;

      if (featured.length >= MIN_BLOG_COUNT) {
        return featuredResult;
      }

      const remaining = MIN_BLOG_COUNT - featured.length;
      const latestResult = await apiClient.get<BlogListResponse>(
        `${BLOG_ENDPOINTS.SORTED("-publishedAt")}&perPage=${MIN_BLOG_COUNT + remaining}`,
      );

      const existingIds = new Set(featured.map((p) => p.id));
      const filler = latestResult.posts
        .filter((p) => !existingIds.has(p.id))
        .slice(0, remaining);

      const posts = [...featured, ...filler];
      return {
        posts,
        meta: { total: posts.length, page: 1, pageSize: posts.length },
      };
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
