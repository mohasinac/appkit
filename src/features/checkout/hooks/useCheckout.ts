"use client"
import { useState, useCallback } from "react";
import type {
  CheckoutState,
  CheckoutStep,
  UserAddress,
  ShippingOption,
  PaymentGateway,
} from "../types";

export function useCheckout(initial?: Partial<CheckoutState>) {
  const [state, setState] = useState<CheckoutState>({
    step: "address",
    ...initial,
  });

  const setStep = useCallback((step: CheckoutStep) => {
    setState((s) => ({ ...s, step }));
  }, []);

  const setAddress = useCallback((address: UserAddress) => {
    setState((s) => ({ ...s, address, step: "shipping" }));
  }, []);

  const setShipping = useCallback((option: ShippingOption) => {
    setState((s) => ({ ...s, shippingOption: option, step: "payment" }));
  }, []);

  const setPayment = useCallback((gateway: PaymentGateway) => {
    setState((s) => ({ ...s, paymentGateway: gateway, step: "review" }));
  }, []);

  const setCoupon = useCallback((code: string) => {
    setState((s) => ({ ...s, couponCode: code }));
  }, []);

  return { state, setStep, setAddress, setShipping, setPayment, setCoupon };
}
