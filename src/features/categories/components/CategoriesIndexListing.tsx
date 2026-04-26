"use client";
import React, { useState, useMemo } from "react";
import { useCategoriesList } from "../hooks/useCategories";
import { ROUTES } from "../../../next";
import {
  Container,
  Grid,
  Input,
  Main,
  Section,
  SlottedListingView,
  SortDropdown,
  Stack,
  Text,
} from "../../../ui";
import { CategoryCard } from "./CategoryGrid";
import type { CategoryItem } from "../types";
import { Pagination } from "../../../ui";

const PAGE_SIZE = 24;

export interface CategoriesIndexListingProps {
  initialData?: CategoryItem[];
}

export function CategoriesIndexListing({ initialData }: CategoriesIndexListingProps) {
  const { categories, isLoading } = useCategoriesList({ initialData });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = [...categories];
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description ?? "").toLowerCase().includes(q),
      );
    }
    result.sort((a, b) => {
      if (sort === "-productCount") {
        return ((b as any).productCount ?? 0) - ((a as any).productCount ?? 0);
      }
      if (sort === "-name") {
        return b.name.localeCompare(a.name);
      }
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [categories, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  return (
    <Section>
      <Container size="xl">
        <SlottedListingView
          portal="public"
          manageSearch={false}
          manageSort={false}
          inlineToolbar
          renderSearch={() => (
            <Input
              value={search}
              onChange={(e) => handleSearch((e.target as HTMLInputElement).value)}
              placeholder="Search categories..."
              className="max-w-sm"
            />
          )}
          renderSort={() => (
            <SortDropdown
              value={sort}
              onChange={(v) => { setSort(v); setPage(1); }}
              options={[
                { value: "name", label: "Name A–Z" },
                { value: "-name", label: "Name Z–A" },
                { value: "-productCount", label: "Most Products" },
              ]}
            />
          )}
          renderTable={() =>
            paginated.length === 0 && !isLoading ? (
              <Stack align="center" gap="3" className="justify-center py-24 text-center">
                <Text className="text-xl font-medium text-zinc-900 dark:text-zinc-50">
                  No categories found
                </Text>
                {search && (
                  <Text className="text-sm text-zinc-500">
                    No results for &ldquo;{search}&rdquo;
                  </Text>
                )}
              </Stack>
            ) : (
              <Grid cols={4} gap="md">
                {paginated.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    href={String(ROUTES.PUBLIC.CATEGORY_DETAIL(category.slug))}
                  />
                ))}
              </Grid>
            )
          }
          renderPagination={() =>
            totalPages > 1 ? (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            ) : null
          }
          total={filtered.length}
          isLoading={isLoading}
        />
      </Container>
    </Section>
  );
}
