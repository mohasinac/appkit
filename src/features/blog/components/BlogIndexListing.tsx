"use client";
import React from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBlogPosts } from "../hooks/useBlog";
import {
  Div,
  Grid,
  Input,
  Pagination,
  SlottedListingView,
  SortDropdown,
  Stack,
  Text,
} from "../../../ui";
import { ROUTES } from "../../../next";
import { BlogCard } from "./BlogListView";
import {
  BlogFilters,
  BLOG_PUBLIC_SORT_OPTIONS,
} from "./BlogFilters";
import type { UrlTable } from "../../filters/FilterPanel";
import type { BlogPostCategory } from "../types";

const PAGE_SIZE = 24;

export interface BlogIndexListingProps {
  initialData?: any;
}

export function BlogIndexListing({ initialData }: BlogIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: "-publishedAt" } });

  const params = {
    q: table.get("q") || undefined,
    category: (table.get("category") || undefined) as BlogPostCategory | undefined,
    sort: table.get("sort") || "-publishedAt",
    page: table.getNumber("page", 1),
    perPage: table.getNumber("pageSize", PAGE_SIZE),
  };

  const { posts, total, totalPages, isLoading } = useBlogPosts(params, {
    initialData,
  });

  const currentPage = table.getNumber("page", 1);

  return (
    <Div className="min-h-screen">
      <SlottedListingView
        portal="public"
        manageSearch
        manageSort
        inlineToolbar
        renderSearch={(search, setSearch) => (
          <Input
            value={search}
            onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Search posts..."
            className="max-w-sm"
          />
        )}
        renderSort={(value, onChange) => (
          <SortDropdown
            value={value}
            onChange={onChange}
            options={BLOG_PUBLIC_SORT_OPTIONS as unknown as Array<{ value: string; label: string }>}
          />
        )}
        renderFilters={() => (
          <BlogFilters table={table as unknown as UrlTable} variant="public" />
        )}
        renderTable={() =>
          posts.length === 0 && !isLoading ? (
            <Stack align="center" gap="3" className="justify-center py-24 text-center">
              <Text className="text-xl font-medium text-zinc-900 dark:text-zinc-50">
                No posts found
              </Text>
            </Stack>
          ) : (
            <Grid cols={3} gap="md">
              {posts.map((post) => (
                <BlogCard
                  key={post.id}
                  post={post}
                  onClick={() => {
                    window.location.href = String(ROUTES.BLOG.ARTICLE(post.slug));
                  }}
                />
              ))}
            </Grid>
          )
        }
        renderPagination={() =>
          totalPages > 1 ? (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => table.setPage(p)}
            />
          ) : null
        }
        total={total}
        isLoading={isLoading}
      />
    </Div>
  );
}
