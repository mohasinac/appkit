import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { ProductItem } from "../../products/types";
import type {
  PublicUserProfile,
  SellerReviewsData,
  ProductsApiResponse,
} from "../../account/hooks/usePublicProfile";
import {
  ACCOUNT_ENDPOINTS,
  PROFILE_STATS_ENDPOINTS,
} from "../../../constants/api-endpoints";
import { isSellerUser, isAdminUser } from "../../auth/role-predicates";

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
  /*
   * ── Is this profile a storefront at all? (1.44) ──────────────────────────
   *
   * 🛑 Was `seller.role !== "seller" && seller.role !== "admin"`, reading a
   * single scalar off the PUBLIC profile payload. Two real failures:
   *
   *   1. A seller who also holds `employee` resolved to the higher-ranked
   *      scalar, so `!== "seller"` was true and their live store page 404'd.
   *   2. A `tester` owns a real auto-approved store (that is the whole point of
   *      `isSellerUser` admitting testers) and was 404'd outright.
   *
   * `isSellerUser` reads the role SET and includes testers; admin is kept
   * explicit because admin sees everything, everywhere. `USER_PUBLIC_FIELDS`
   * now projects `roles`, so the set is actually present in this payload —
   * without that projection this would have silently fallen back to the scalar.
   */
  const notSellerError =
    seller && !isSellerUser(seller) && !isAdminUser(seller)
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
