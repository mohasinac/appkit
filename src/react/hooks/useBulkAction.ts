"use client"
import { useState, useCallback, useRef } from "react";

// ---------------------------------------------------------------------------
// Shared types — safe to use in any project consuming @mohasinac/react
// ---------------------------------------------------------------------------

export interface BulkActionItemFailure {
  id: string;
  reason: string;
}

export interface BulkActionSummary {
  total: number;
  succeeded: number;
  skipped: number;
  failed: number;
}

export interface BulkActionResult<TData = Record<string, unknown>> {
  action: string;
  summary: BulkActionSummary;
  succeeded: string[];
  skipped: string[];
  failed: BulkActionItemFailure[];
  data?: TData;
}

export interface BulkActionPayload {
  action: string;
  ids: string[];
}

// ---------------------------------------------------------------------------
// useBulkAction
// ---------------------------------------------------------------------------

export interface UseBulkActionOptions<
  TPayload extends BulkActionPayload,
  TData = Record<string, unknown>,
> {
  /**
   * Async function that POSTs to the bulk endpoint.
   * Must return `Promise<BulkActionResult<TData>>`.
   */
  mutationFn: (payload: TPayload) => Promise<BulkActionResult<TData>>;
  /**
   * Called when `mutationFn` resolves (even for partial failures).
   * Inspect `result.summary` to build feedback.
   */
  onSuccess?: (
    result: BulkActionResult<TData>,
    payload: TPayload,
  ) => void | Promise<void>;
  /**
   * Called when `mutationFn` rejects.
   */
  onError?: (error: Error, payload: TPayload) => void;
  /**
   * When `true`, `execute()` parks the payload in `pendingPayload` instead of
   * running immediately. The caller renders a confirm modal wired to
   * `confirmAndExecute` / `cancelConfirm`.
   */
  requiresConfirm?: boolean;
}

export interface UseBulkActionReturn<
  TPayload extends BulkActionPayload,
  TData = Record<string, unknown>,
> {
  execute: (payload: TPayload) => Promise<void>;
  isLoading: boolean;
  result: BulkActionResult<TData> | null;
  error: Error | null;
  reset: () => void;
  pendingPayload: TPayload | null;
  confirmAndExecute: () => Promise<void>;
  cancelConfirm: () => void;
}

/**
 * useBulkAction
 *
 * Generic mutation hook for any `/bulk` endpoint.
 * Handles loading state, partial-success result tracking, and an optional
 * confirmation flow for destructive operations.
 *
 * Pair with `useBulkSelection` and a `BulkActionBar` component for the
 * full admin list pattern.
 */
export function useBulkAction<
  TPayload extends BulkActionPayload = BulkActionPayload,
  TData = Record<string, unknown>,
>(
  options: UseBulkActionOptions<TPayload, TData>,
): UseBulkActionReturn<TPayload, TData> {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BulkActionResult<TData> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [pendingPayload, setPendingPayload] = useState<TPayload | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const runMutation = useCallback(async (payload: TPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await optionsRef.current.mutationFn(payload);
      setResult(res);
      await optionsRef.current.onSuccess?.(res, payload);
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error((err as { message?: string })?.message ?? "Unexpected error");
      setError(error);
      optionsRef.current.onError?.(error, payload);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const execute = useCallback(
    async (payload: TPayload) => {
      if (optionsRef.current.requiresConfirm) {
        setPendingPayload(payload);
        return;
      }
      await runMutation(payload);
    },
    [runMutation],
  );

  const confirmAndExecute = useCallback(async () => {
    if (!pendingPayload) return;
    const payload = pendingPayload;
    setPendingPayload(null);
    await runMutation(payload);
  }, [pendingPayload, runMutation]);

  const cancelConfirm = useCallback(() => setPendingPayload(null), []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setPendingPayload(null);
  }, []);

  return {
    execute,
    isLoading,
    result,
    error,
    reset,
    pendingPayload,
    confirmAndExecute,
    cancelConfirm,
  };
}
