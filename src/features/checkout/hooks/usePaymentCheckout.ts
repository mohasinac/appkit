"use client";
import "client-only";

import { useCallback, useRef, useState } from "react";
import type {
  IClientPaymentGateway,
  GatewayPaymentResponse,
  OpenGatewayOptions,
} from "../../../contracts/client-payment-gateway";
import { getClientPaymentGateway } from "../../../contracts/client-payment-gateway";
import type {
  CreatePaymentOrderResponse,
  PlaceOrderResponse,
} from "../hooks/useCheckoutApi";
import { useCheckout as useCheckoutApi } from "../hooks/useCheckoutApi";
import {
  usePaymentEvent,
  type UsePaymentEventOptions,
} from "../../payments/hooks/usePaymentEvent";
import type { PaymentGateway } from "../../payments/schemas";

// ─── Types ─────────────────────────────────────────────────────────────────

export type PaymentCheckoutStep =
  | "idle"
  | "preflight"
  | "creating_order"
  | "awaiting_payment"
  | "verifying"
  | "success"
  | "error"
  | "cancelled";

export interface PaymentCheckoutState {
  step: PaymentCheckoutStep;
  error: string | null;
  orderIds: string[] | null;
  total: number | null;
  itemCount: number | null;
}

export interface UsePaymentCheckoutOptions {
  /** Payment gateway to use. Consumer registers the adapter via `registerClientPaymentGateway`. */
  gateway: PaymentGateway;

  /** Override the gateway adapter instance (skips registry lookup). */
  gatewayAdapter?: IClientPaymentGateway;

  /** Merchant display name for the payment modal. */
  merchantName?: string;

  /** Logo URL for the payment modal. */
  logoUrl?: string;

  /** Theme color for the payment modal. */
  themeColor?: string;

  /** Realtime event options for tracking payment completion via RTDB. */
  realtimeEventOptions?: UsePaymentEventOptions;

  /** Custom API endpoints (passed to useCheckoutApi). */
  endpoints?: {
    addresses?: string;
    cart?: string;
    preflight?: string;
    placeOrder?: string;
    paymentCreateOrder?: string;
    paymentVerify?: string;
  };

  /** Called after successful order placement (COD or online). */
  onSuccess?: (result: PlaceOrderResponse) => void;

  /** Called on any checkout error. */
  onError?: (error: Error) => void;

  /** Called when user cancels payment modal. */
  onCancel?: () => void;
}

export interface UsePaymentCheckoutReturn {
  /** Current checkout step/state. */
  state: PaymentCheckoutState;

  /** Address and cart query results from useCheckoutApi. */
  addressQuery: ReturnType<typeof useCheckoutApi>["addressQuery"];
  cartQuery: ReturnType<typeof useCheckoutApi>["cartQuery"];

  /** Run preflight stock check. */
  preflight: (addressId: string) => Promise<boolean>;

  /** Place a COD / UPI-manual order (no gateway interaction). */
  placeCodOrder: (params: {
    addressId: string;
    paymentMethod: "cod" | "upi_manual";
    notes?: string;
    excludedProductIds?: string[];
  }) => Promise<PlaceOrderResponse | null>;

  /**
   * Full online payment flow:
   * 1. Create payment order on server
   * 2. Open gateway modal
   * 3. Verify payment on server
   */
  payOnline: (params: {
    addressId: string;
    amount: number;
    currency?: string;
    notes?: string;
    excludedProductIds?: string[];
    prefill?: OpenGatewayOptions["prefill"];
  }) => Promise<PlaceOrderResponse | null>;

  /** Payment event tracking (RTDB). */
  paymentEvent: ReturnType<typeof usePaymentEvent>;

  /** Reset checkout state back to idle. */
  reset: () => void;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

const INITIAL_STATE: PaymentCheckoutState = {
  step: "idle",
  error: null,
  orderIds: null,
  total: null,
  itemCount: null,
};

export function usePaymentCheckout(
  options: UsePaymentCheckoutOptions,
): UsePaymentCheckoutReturn {
  const [state, setState] = useState<PaymentCheckoutState>(INITIAL_STATE);
  const abortRef = useRef(false);

  const {
    gateway,
    gatewayAdapter,
    merchantName,
    logoUrl,
    themeColor,
    endpoints,
    onSuccess,
    onError,
    onCancel,
  } = options;

  const checkout = useCheckoutApi({
    addressesEndpoint: endpoints?.addresses,
    cartEndpoint: endpoints?.cart,
    preflightEndpoint: endpoints?.preflight,
    placeOrderEndpoint: endpoints?.placeOrder,
    paymentCreateOrderEndpoint: endpoints?.paymentCreateOrder,
    paymentVerifyEndpoint: endpoints?.paymentVerify,
  });

  const paymentEvent = usePaymentEvent(options.realtimeEventOptions);

  const getAdapter = useCallback((): IClientPaymentGateway => {
    return gatewayAdapter ?? getClientPaymentGateway(gateway);
  }, [gateway, gatewayAdapter]);

  const setError = useCallback(
    (error: Error) => {
      setState((s) => ({ ...s, step: "error", error: error.message }));
      onError?.(error);
    },
    [onError],
  );

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    abortRef.current = false;
    paymentEvent.reset();
  }, [paymentEvent]);

  const preflight = useCallback(
    async (addressId: string): Promise<boolean> => {
      setState((s) => ({ ...s, step: "preflight", error: null }));
      try {
        const result = await checkout.preflightMutation.mutateAsync(addressId);
        if (result.unavailable.length > 0) {
          setState((s) => ({
            ...s,
            step: "error",
            error: `${result.unavailable.length} item(s) unavailable`,
          }));
          return false;
        }
        setState((s) => ({ ...s, step: "idle" }));
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Preflight check failed"),
        );
        return false;
      }
    },
    [checkout.preflightMutation, setError],
  );

  const placeCodOrder = useCallback(
    async (params: {
      addressId: string;
      paymentMethod: "cod" | "upi_manual";
      notes?: string;
      excludedProductIds?: string[];
    }): Promise<PlaceOrderResponse | null> => {
      setState((s) => ({ ...s, step: "verifying", error: null }));
      try {
        const result = await checkout.placeCodOrderMutation.mutateAsync({
          addressId: params.addressId,
          paymentMethod: params.paymentMethod,
          notes: params.notes,
          excludedProductIds: params.excludedProductIds,
        });
        setState({
          step: "success",
          error: null,
          orderIds: result.orderIds,
          total: result.total,
          itemCount: result.itemCount,
        });
        onSuccess?.(result);
        return result;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Order placement failed"),
        );
        return null;
      }
    },
    [checkout.placeCodOrderMutation, onSuccess, setError],
  );

  const payOnline = useCallback(
    async (params: {
      addressId: string;
      amount: number;
      currency?: string;
      notes?: string;
      excludedProductIds?: string[];
      prefill?: OpenGatewayOptions["prefill"];
    }): Promise<PlaceOrderResponse | null> => {
      abortRef.current = false;

      // Step 1: Create payment order on server
      setState((s) => ({ ...s, step: "creating_order", error: null }));
      let orderResponse: CreatePaymentOrderResponse;
      try {
        orderResponse = await checkout.createPaymentOrderMutation.mutateAsync({
          amount: params.amount,
          currency: params.currency,
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to create payment order"),
        );
        return null;
      }

      if (abortRef.current) return null;

      // Step 2: Open gateway modal
      setState((s) => ({ ...s, step: "awaiting_payment" }));
      let gatewayResponse: GatewayPaymentResponse;
      try {
        const adapter = getAdapter();
        await adapter.loadScript();
        gatewayResponse = await adapter.openPayment({
          gatewayOrderId: orderResponse.gatewayOrderId,
          publicKey: orderResponse.keyId,
          amount: orderResponse.amount,
          currency: orderResponse.currency,
          merchantName,
          logoUrl,
          prefill: params.prefill,
          theme: themeColor ? { color: themeColor } : undefined,
        });
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.toLowerCase().includes("cancel")
        ) {
          setState((s) => ({ ...s, step: "cancelled", error: null }));
          onCancel?.();
          return null;
        }
        setError(
          err instanceof Error ? err : new Error("Payment gateway error"),
        );
        return null;
      }

      if (abortRef.current) return null;

      // Step 3: Verify payment on server
      setState((s) => ({ ...s, step: "verifying" }));
      try {
        const result = await checkout.verifyPaymentMutation.mutateAsync({
          gateway_order_id: gatewayResponse.gatewayOrderId,
          gateway_payment_id: gatewayResponse.gatewayPaymentId,
          gateway_signature: gatewayResponse.gatewaySignature ?? "",
          addressId: params.addressId,
          notes: params.notes,
          excludedProductIds: params.excludedProductIds,
        });
        setState({
          step: "success",
          error: null,
          orderIds: result.orderIds,
          total: result.total,
          itemCount: result.itemCount,
        });
        onSuccess?.(result);
        return result;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Payment verification failed"),
        );
        return null;
      }
    },
    [
      checkout.createPaymentOrderMutation,
      checkout.verifyPaymentMutation,
      getAdapter,
      merchantName,
      logoUrl,
      themeColor,
      onSuccess,
      onCancel,
      setError,
    ],
  );

  return {
    state,
    addressQuery: checkout.addressQuery,
    cartQuery: checkout.cartQuery,
    preflight,
    placeCodOrder,
    payOnline,
    paymentEvent,
    reset,
  };
}
