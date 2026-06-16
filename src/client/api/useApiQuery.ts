"use client";

import * as React from "react";
import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useToast } from "../../ui/components/Toast";
import { ApiError } from "./ApiError";
import { getErrorDisplay } from "../../errors/error-display-map";

/**
 * Wrap @tanstack/react-query's useQuery so background refetch failures are
 * never silent. Initial-load failures bubble to error boundary (via the
 * default Suspense behavior); background refetch errors fire a quiet
 * "warning" toast so the user knows the data they're looking at is stale.
 */
export interface UseApiQueryOptions<TQueryFnData, TError, TData, TQueryKey extends readonly unknown[]>
  extends UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> {
  /** Suppress the background-failure toast for this query. */
  silentBackgroundFailures?: boolean;
  translate?: (key: string) => string;
  reportClientError?: (payload: {
    code: string;
    message: string;
    stack?: string;
    requestId?: string;
  }) => void;
}

export function useApiQuery<
  TQueryFnData = unknown,
  TError = ApiError,
  TData = TQueryFnData,
  TQueryKey extends readonly unknown[] = readonly unknown[],
>(
  options: UseApiQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): UseQueryResult<TData, TError> {
  const { showToast } = useToast();
  const { silentBackgroundFailures, translate, reportClientError, ...rest } =
    options;
  const result = useQuery<TQueryFnData, TError, TData, TQueryKey>(rest);

  const lastReportedErrorRef = React.useRef<unknown>(null);

  React.useEffect(() => {
    if (!result.isError || !result.error || silentBackgroundFailures) return;
    if (result.error === lastReportedErrorRef.current) return;
    lastReportedErrorRef.current = result.error;

    // Initial-load failures: let the error boundary handle it (don't toast on first paint).
    // Background refetch failures: toast a quiet warning.
    if (result.isFetching || !result.data) return;

    // audit-unknown-ok: TS structural escape
    const err = result.error as unknown;
    if (err instanceof ApiError) {
      const display = getErrorDisplay(err.code);
      const message = translate?.(display.messageKey) ?? err.message;
      showToast(`Couldn't refresh latest data: ${message}`, "warning");
      if (reportClientError) {
        try {
          reportClientError({
            code: err.code,
            message: err.message,
            requestId: err.requestId,
          });
        } catch {
          /* never propagate from the reporter */
        }
      }
    } else {
      const message =
        err instanceof Error ? err.message : "Unknown error";
      showToast(`Couldn't refresh latest data: ${message}`, "warning");
    }
  }, [
    result.isError,
    result.error,
    result.isFetching,
    result.data,
    showToast,
    silentBackgroundFailures,
    translate,
    reportClientError,
  ]);

  return result;
}
