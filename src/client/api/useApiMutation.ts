"use client";

import * as React from "react";
import {
  useMutation,
  type MutationFunctionContext,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useToast } from "../../ui/components/Toast";
import { surfaceError } from "./surface-error";
import { ApiError } from "./ApiError";

/**
 * Wrap @tanstack/react-query's useMutation so every mutation failure surfaces
 * automatically — toast by default, inline field error when the error code
 * maps to a form field via ERROR_DISPLAY_MAP.
 *
 * The default `onError` runs FIRST and the caller's `onError` runs after so
 * extension semantics work: the user always sees something; the caller can
 * still do optimistic rollback / analytics.
 *
 * `loadingMessage` shows a pinned "loading" toast on mutate that resolves to
 * success / error variant on settle. Use for the few ops > ~1s.
 */
export interface UseApiMutationOptions<TData, TError, TVariables, TContext>
  extends UseMutationOptions<TData, TError, TVariables, TContext> {
  /** When set, a `loading` toast is shown on mutate and finalized on settle. */
  loadingMessage?: string;
  successMessage?: string;
  /** Translation function (next-intl style); falls back to raw message. */
  translate?: (key: string) => string;
  /** Form field error setter (FormShell context). Optional. */
  setFieldError?: (field: string, message: string) => void;
  /** Client-error reporter (workstream 13). Optional. */
  reportClientError?: (payload: {
    code: string;
    message: string;
    stack?: string;
    requestId?: string;
  }) => void;
}

export function useApiMutation<
  TData = unknown,
  TError = ApiError,
  TVariables = void,
  TContext = unknown,
>(
  options: UseApiMutationOptions<TData, TError, TVariables, TContext>,
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { showToast, updateToast } = useToast();
  const loadingIdRef = React.useRef<string | null>(null);

  const {
    loadingMessage,
    successMessage,
    translate,
    setFieldError,
    reportClientError,
    onMutate,
    onError,
    onSuccess,
    onSettled,
    ...rest
  } = options;

  return useMutation<TData, TError, TVariables, TContext>({
    ...rest,
    onMutate: (async (variables: TVariables, ctx: MutationFunctionContext) => {
      if (loadingMessage) {
        loadingIdRef.current = showToast(loadingMessage, "loading", 0);
      }
      return (await onMutate?.(variables, ctx)) as TContext;
    }) as UseMutationOptions<TData, TError, TVariables, TContext>["onMutate"],
    onError: (err, variables, context, ctx) => {
      surfaceError(err, {
        showToast,
        setFieldError,
        translate,
        report: reportClientError,
      });
      onError?.(err, variables, context, ctx);
    },
    onSuccess: (data, variables, context, ctx) => {
      if (successMessage) {
        if (loadingIdRef.current) {
          updateToast(loadingIdRef.current, "success", successMessage);
          loadingIdRef.current = null;
        } else {
          showToast(successMessage, "success");
        }
      }
      onSuccess?.(data, variables, context, ctx);
    },
    onSettled: (data, err, variables, context, ctx) => {
      if (loadingIdRef.current) {
        if (err) {
          updateToast(loadingIdRef.current, "error", err instanceof Error ? err.message : "Action failed");
        } else if (!successMessage) {
          updateToast(loadingIdRef.current, "success", "Done");
        }
        loadingIdRef.current = null;
      }
      onSettled?.(data, err, variables, context, ctx);
    },
  });
}
