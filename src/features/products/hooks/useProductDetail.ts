import { useQuery } from "@tanstack/react-query";
import { apiClient, ApiClientError } from "../../../http";
import type { ProductItem } from "../types";
import { PRODUCT_ENDPOINTS } from "../../../constants/api-endpoints";

interface UseProductDetailOptions<TProduct = ProductItem> {
  initialData?: TProduct;
  enabled?: boolean;
  endpoint?: string;
  queryKeyPrefix?: string;
  transform?: (item: ProductItem) => TProduct;
}

export function useProductDetail<TProduct = ProductItem>(
  slug: string,
  options?: UseProductDetailOptions<TProduct>,
) {
  const endpoint = options?.endpoint ?? PRODUCT_ENDPOINTS.BY_SLUG(slug);
  const queryKeyPrefix = options?.queryKeyPrefix ?? "product";

  const { data, isLoading, error, refetch } = useQuery<ProductItem | null>({
    queryKey: [queryKeyPrefix, slug],
    queryFn: async () => {
      try {
        return await apiClient.get<ProductItem>(endpoint);
      } catch (e) {
        if (e instanceof ApiClientError && e.status === 404) return null;
        throw e;
      }
    },
    enabled: (options?.enabled ?? true) && Boolean(slug),
    initialData:
      (options?.initialData as ProductItem | null | undefined) ?? undefined,
  });

  const product = data
    ? options?.transform
      ? options.transform(data as ProductItem)
      : (data as TProduct)
    : null;

  return { product, isLoading, error, refetch };
}
