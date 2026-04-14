"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../http";

export interface SubscribeNewsletterInput {
  email: string;
  source?: string;
  locale?: string;
}

export interface SubscribeNewsletterResult {
  subscribed: boolean;
  message?: string;
}

export interface UseNewsletterOptions {
  mutationFn?: (
    data: SubscribeNewsletterInput,
  ) => Promise<SubscribeNewsletterResult>;
  endpoint?: string;
}

export function useNewsletter(options?: UseNewsletterOptions) {
  return useMutation<SubscribeNewsletterResult, Error, SubscribeNewsletterInput>({
    mutationFn:
      options?.mutationFn ??
      ((data) =>
        apiClient.post<SubscribeNewsletterResult>(
          options?.endpoint ?? "/api/newsletter/subscribe",
          data,
        )),
  });
}
