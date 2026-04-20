import type { IClientRealtimeProvider } from "../../../contracts/client-realtime";
import {
  RealtimeEventType,
  useRealtimeEvent,
  type RTDBEventPayload,
  type RealtimeEventMessages,
  type RealtimeEventStatus,
  type BulkActionItemFailure,
  type BulkActionResult,
  type BulkActionSummary,
} from "../../../react";

export type { RealtimeEventStatus as BulkEventStatus };

export interface UseBulkEventOptions<TData = Record<string, unknown>> {
  realtimeProvider?: IClientRealtimeProvider;
  rtdbPath: string;
  timeoutMs?: number;
  messages?: RealtimeEventMessages;
  onLogError?: (message: string, error: unknown) => void;
  extractData?: (raw: RTDBEventPayload) => BulkActionResult<TData> | null;
}

export interface UseBulkEventReturn<TData = Record<string, unknown>> {
  status: RealtimeEventStatus;
  error: string | null;
  result: BulkActionResult<TData> | null;
  subscribe: (jobId: string, customToken: string) => void;
  reset: () => void;
}

const BULK_EVENT_TIMEOUT_MS = 10 * 60 * 1000;

function extractBulkResult(
  raw: RTDBEventPayload,
): BulkActionResult<unknown> | null {
  if (typeof raw.action !== "string" || !raw.summary) return null;

  const result: BulkActionResult<unknown> = {
    action: raw.action,
    summary: raw.summary as BulkActionSummary,
    succeeded: (raw.succeeded as string[] | undefined) ?? [],
    skipped: (raw.skipped as string[] | undefined) ?? [],
    failed: (raw.failed as BulkActionItemFailure[] | undefined) ?? [],
  };

  if (raw.data !== undefined) {
    result.data = raw.data;
  }

  return result;
}

export function useBulkEvent<TData = Record<string, unknown>>(
  options: UseBulkEventOptions<TData>,
): UseBulkEventReturn<TData> {
  const {
    status,
    error,
    data: result,
    subscribe,
    reset,
  } = useRealtimeEvent<BulkActionResult<TData>>({
    type: RealtimeEventType.BULK,
    rtdbPath: options.rtdbPath,
    realtimeProvider: options.realtimeProvider,
    timeoutMs: options.timeoutMs ?? BULK_EVENT_TIMEOUT_MS,
    onLogError: options.onLogError,
    extractData: (options.extractData ?? extractBulkResult) as (
      raw: RTDBEventPayload,
    ) => BulkActionResult<TData> | null,
    messages: {
      tokenFailure:
        "Failed to initialise bulk operation tracking. Please try again.",
      connectionLost:
        "Bulk operation tracking connection lost. Please check if the changes were applied.",
      timedOut:
        "Bulk operation timed out. Please check if the changes were applied.",
      failure: "The bulk operation did not complete. Please try again.",
      ...(options.messages ?? {}),
    },
  });

  return { status, error, result, subscribe, reset };
}
