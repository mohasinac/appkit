"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { CategoryItem } from "../types";

export interface UseCategorySelectorOptions {
  categoriesEndpoint?: string;
  createCategoryEndpoint?: string;
  onCreated?: (id: string) => void;
  onCreateError?: (err: Error) => void;
}

export function useCategorySelector(options?: UseCategorySelectorOptions) {
  const categoriesEndpoint =
    options?.categoriesEndpoint ?? "/api/categories?flat=true";
  const createCategoryEndpoint =
    options?.createCategoryEndpoint ?? "/api/categories";

  const {
    data: raw,
    isLoading,
    refetch,
  } = useQuery<CategoryItem[]>({
    queryKey: ["categories"],
    queryFn: () => apiClient.get<CategoryItem[]>(categoriesEndpoint),
  });

  const categories: CategoryItem[] = raw ?? [];

  const { mutate: createCategory, isPending: isCreating } = useMutation<
    CategoryItem,
    Error,
    Record<string, unknown>
  >({
    mutationFn: (data) =>
      apiClient.post<CategoryItem>(createCategoryEndpoint, data),
    onSuccess: (res) => {
      refetch();
      options?.onCreated?.(res?.id ?? "");
    },
    onError: options?.onCreateError,
  });

  return { categories, isLoading, refetch, createCategory, isCreating };
}

export function useCategories(options?: { endpoint?: string }) {
  const endpoint = options?.endpoint ?? "/api/categories?flat=true";
  const {
    data: raw,
    isLoading,
    refetch,
  } = useQuery<CategoryItem[]>({
    queryKey: ["categories"],
    queryFn: () => apiClient.get<CategoryItem[]>(endpoint),
  });

  return {
    categories: raw ?? [],
    isLoading,
    refetch,
  };
}

export function useCreateCategory(options?: {
  endpoint?: string;
  onSuccess?: (res: CategoryItem) => void;
  onError?: (err: Error) => void;
}) {
  const endpoint = options?.endpoint ?? "/api/categories";
  return useMutation<CategoryItem, Error, Record<string, unknown>>({
    mutationFn: (data) => apiClient.post<CategoryItem>(endpoint, data),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}
