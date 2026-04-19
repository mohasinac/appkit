"use client";

import { useEffect, useState } from "react";
import { logger } from "../../../core/Logger";
import { BID_ENDPOINTS } from "../../../constants/api-endpoints";

export interface RealtimeBidData {
  currentBid: number;
  bidCount: number;
  lastBid: {
    amount: number;
    bidderName: string;
    timestamp: number;
  } | null;
  updatedAt: number;
}

export interface UseRealtimeBidsReturn {
  /** Current highest bid — most recent value pushed from the server */
  currentBid: number | null;
  /** Total active bid count */
  bidCount: number | null;
  /** Info about the most recent bid placed */
  lastBid: RealtimeBidData["lastBid"];
  /** Whether the SSE connection is live */
  connected: boolean;
  /** Last time the data was updated (epoch ms) */
  updatedAt: number | null;
}

/**
 * useRealtimeBids
 *
 * Subscribes to live auction bid updates via Server-Sent Events (SSE).
 *
 * Uses a streaming route that keeps a server-side listener open and pushes
 * updates to the browser via text/event-stream. No Firebase client SDK required.
 *
 * @param productId - The auction product ID to subscribe to, or null to disable
 * @param getEndpoint - Optional: override the SSE endpoint URL builder.
 *   Defaults to `/api/realtime/bids/{productId}`.
 *
 * @example
 * const { currentBid, bidCount, connected } = useRealtimeBids(productId);
 */
export function useRealtimeBids(
  productId: string | null,
  getEndpoint: (id: string) => string = BID_ENDPOINTS.REALTIME,
): UseRealtimeBidsReturn {
  const [data, setData] = useState<RealtimeBidData | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!productId || typeof EventSource === "undefined") {
      setConnected(false);
      return;
    }

    const url = getEndpoint(productId);
    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          type: string;
          data?: RealtimeBidData | null;
        };
        if (msg.type === "connected") {
          setConnected(true);
        } else if (msg.type === "update") {
          setData(msg.data ?? null);
          setConnected(true);
        } else if (msg.type === "error") {
          setConnected(false);
        }
      } catch {
        logger.warn("[useRealtimeBids] Failed to parse SSE message");
      }
    };

    es.onerror = () => {
      // EventSource will attempt to reconnect automatically.
      setConnected(false);
      logger.warn("[useRealtimeBids] SSE connection error — will retry");
    };

    return () => {
      es.close();
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  return {
    currentBid: data?.currentBid ?? null,
    bidCount: data?.bidCount ?? null,
    lastBid: data?.lastBid ?? null,
    connected,
    updatedAt: data?.updatedAt ?? null,
  };
}
