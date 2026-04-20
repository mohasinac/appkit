import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import { useCheckoutReadQueries } from "../../cart";
import {
  ACCOUNT_ENDPOINTS,
  CART_ENDPOINTS,
  CHECKOUT_ENDPOINTS,
  PAYMENT_ENDPOINTS,
} from "../../../constants/api-endpoints";

export interface AddressListResponse<TAddress = any> {
  data: TAddress[];
}

export interface CartApiResponse<TCart = any> {
  cart: TCart;
  itemCount: number;
  subtotal: number;
}

export interface PlaceOrderResponse {
  orderIds: string[];
  total: number;
  itemCount: number;
  unavailableItems?: UnavailableItem[];
}

export interface UnavailableItem {
  productId: string;
  productTitle: string;
  requestedQty: number;
  availableQty: number;
}

export interface PreflightResponse {
  available: any[];
  unavailable: UnavailableItem[];
}

/** @deprecated Use `CreatePaymentOrderResponse` instead. */
export type CreateRazorpayOrderResponse = CreatePaymentOrderResponse;

export interface CreatePaymentOrderResponse {
  gatewayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  platformFee?: number;
}

interface PlaceOrderPayload {
  addressId: string;
  paymentMethod: "cod" | "online" | "upi_manual";
  notes?: string;
  excludedProductIds?: string[];
}

interface CreatePaymentOrderPayload {
  amount: number;
  currency?: string;
  receipt?: string;
}

interface VerifyPaymentPayload {
  gateway_order_id: string;
  gateway_payment_id: string;
  gateway_signature: string;
  addressId: string;
  notes?: string;
  excludedProductIds?: string[];
}

interface UseCheckoutOptions<TAddress = any, TCart = any> {
  addressesEndpoint?: string;
  cartEndpoint?: string;
  preflightEndpoint?: string;
  placeOrderEndpoint?: string;
  paymentCreateOrderEndpoint?: string;
  paymentVerifyEndpoint?: string;
  onPlaceCodOrderSuccess?: (result: PlaceOrderResponse) => void;
  onPlaceCodOrderError?: () => void;
  enabled?: boolean;
  initialAddresses?: TAddress[];
  initialCart?: CartApiResponse<TCart>;
}

export function useCheckout<TAddress = any, TCart = any>(
  options?: UseCheckoutOptions<TAddress, TCart>,
) {
  const queryClient = useQueryClient();

  const {
    addressesEndpoint = ACCOUNT_ENDPOINTS.ADDRESSES,
    cartEndpoint = CART_ENDPOINTS.GET,
    preflightEndpoint = CHECKOUT_ENDPOINTS.PREFLIGHT,
    placeOrderEndpoint = CHECKOUT_ENDPOINTS.PLACE_ORDER,
    paymentCreateOrderEndpoint = PAYMENT_ENDPOINTS.CREATE_ORDER,
    paymentVerifyEndpoint = PAYMENT_ENDPOINTS.VERIFY,
  } = options ?? {};

  const { addressQuery, cartQuery } = useCheckoutReadQueries<
    TAddress,
    CartApiResponse<TCart>
  >({
    addressesEndpoint,
    cartEndpoint,
    addressesQueryKey: ["addresses"],
    cartQueryKey: ["cart"],
    enabled: options?.enabled,
    initialAddresses: options?.initialAddresses,
    initialCart: options?.initialCart,
  });

  const preflightMutation = useMutation<PreflightResponse, Error, string>({
    mutationFn: (addressId) => apiClient.post(preflightEndpoint, { addressId }),
  });

  const placeCodOrderMutation = useMutation<
    PlaceOrderResponse,
    Error,
    PlaceOrderPayload
  >({
    mutationFn: (data) => apiClient.post(placeOrderEndpoint, data),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      options?.onPlaceCodOrderSuccess?.(result);
    },
    onError: options?.onPlaceCodOrderError,
  });

  const createPaymentOrderMutation = useMutation<
    CreatePaymentOrderResponse,
    Error,
    CreatePaymentOrderPayload
  >({
    mutationFn: (data) => apiClient.post(paymentCreateOrderEndpoint, data),
  });

  const verifyPaymentMutation = useMutation<
    PlaceOrderResponse,
    Error,
    VerifyPaymentPayload
  >({
    mutationFn: (data) => apiClient.post(paymentVerifyEndpoint, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  return {
    addressQuery,
    cartQuery,
    preflightMutation,
    placeCodOrderMutation,
    createPaymentOrderMutation,
    verifyPaymentMutation,
  };
}
