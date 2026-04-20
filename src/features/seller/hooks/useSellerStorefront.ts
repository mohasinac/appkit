import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { ProductItem } from "../../products";
import type {
  PublicUserProfile,
  SellerReviewsData,
  ProductsApiResponse,
} from "../../account/hooks/usePublicProfile";
import {
  ACCOUNT_ENDPOINTS,
  PROFILE_STATS_ENDPOINTS,
} from "../../../constants/api-endpoints";

export { SellerReviewsData, ProductsApiResponse };

export function useSellerStorefront(
  sellerId: string,
  options?: {
    initialSeller?: PublicUserProfile;
    profileEndpoint?: string;
    productsEndpoint?: string;
    reviewsEndpoint?: string;
  },
) {
  const profileEndpoint =
    options?.profileEndpoint ?? ACCOUNT_ENDPOINTS.SELLER_PROFILE(sellerId);
  const productsEndpoint =
    options?.productsEndpoint ?? PROFILE_STATS_ENDPOINTS.PRODUCTS(sellerId);
  const reviewsEndpoint =
    options?.reviewsEndpoint ?? ACCOUNT_ENDPOINTS.SELLER_REVIEWS(sellerId);

  const initialProfileData: { user: PublicUserProfile } | undefined =
    options?.initialSeller ? { user: options.initialSeller } : undefined;

  const {
    data: sellerData,
    isLoading: loading,
    error: fetchError,
  } = useQuery<{ user: PublicUserProfile }>({
    queryKey: ["seller-profile", sellerId],
    queryFn: async () => {
      const user = await apiClient.get<PublicUserProfile>(profileEndpoint);
      return { user };
    },
    enabled: !!sellerId,
    initialData: initialProfileData,
  });

  const seller = sellerData?.user;
  const fetchErrorMsg: string | null = (fetchError as Error)?.message ?? null;
  const notSellerError =
    seller && seller.role !== "seller" && seller.role !== "admin"
      ? "notFound"
      : null;
  const profileError = fetchErrorMsg ?? notSellerError;

  const isReady = !!seller && !profileError && !!sellerId;

  const { data: productsData, isLoading: productsLoading } =
    useQuery<ProductsApiResponse>({
      queryKey: ["storefront-products", sellerId],
      queryFn: async () => {
        const result = await apiClient.get<{
          items: ProductItem[];
          total: number;
          page: number;
          pageSize: number;
        }>(productsEndpoint);
        return {
          data: result.items,
          meta: {
            total: result.total,
            page: result.page,
            pageSize: result.pageSize,
          },
        };
      },
      enabled: isReady,
      staleTime: 60_000,
    });

  const { data: reviewsData, isLoading: reviewsLoading } =
    useQuery<SellerReviewsData>({
      queryKey: ["storefront-reviews", sellerId],
      queryFn: () =>
        apiClient.get<SellerReviewsData>(reviewsEndpoint),
      enabled: isReady,
      staleTime: 60_000,
    });

  return {
    seller,
    loading,
    profileError,
    productsData,
    productsLoading,
    reviewsData,
    reviewsLoading,
  };
}
