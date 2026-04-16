"use client";

import { useMutation } from "@tanstack/react-query";

export interface UseContactSubmitOptions<TInput, TResult> {
  submit: (data: TInput) => Promise<TResult>;
}

export function useContactSubmit<TInput, TResult>(
  options: UseContactSubmitOptions<TInput, TResult>,
) {
  return useMutation<TResult, Error, TInput>({
    mutationFn: (data) => options.submit(data),
  });
}
