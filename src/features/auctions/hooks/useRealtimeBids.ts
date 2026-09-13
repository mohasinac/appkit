"use client"
import { normalizeError } from "../../../errors/normalize";
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

interface ChannelState {
  data: RealtimeBidData | null;
  connected: boolean;
}

interface Channel extends ChannelState {
  es: EventSource;
  refCount: number;
  subscribers: Set<(state: ChannelState) => void>;
  closeTimer: ReturnType<typeof setTimeout> | null;
}

/**
 * One EventSource per SSE URL, shared by every hook instance that asks for it.
 *
 * 🛑 THIS SHARING IS LOAD-BEARING, NOT AN OPTIMISATION.
 *
 * `/api/realtime/bids/[id]` holds a serverless invocation open for its full
 * 45s TTL per connection (route `maxDuration = 50`, `STREAM_TTL_MS = 45_000`),
 * then self-closes so the browser reconnects. So a connection is not a cheap
 * socket — it is a continuously-billed function.
 *
 * This hook is consumed by `useLiveAuctionBid`, which `LiveBidPrice`,
 * `LiveMinIncrement` and `PlaceBidFormClient` each call independently — and
 * `AuctionDetailPageView` mounts those five times over. Before this map, one
 * auction page view opened FIVE concurrent EventSources to the same URL and
 * therefore pinned five held-open functions, all pushing byte-identical data.
 * That was a material share of the Fluid Active CPU that paused the Vercel
 * account (2026-09-14).
 *
 * Keyed on the resolved URL rather than on productId: `getEndpoint` is an
 * override, and two callers pointing at different endpoints for the same
 * product must not be handed each other's stream.
 */
const channels = new Map<string, Channel>();

/**
 * Grace period before a zero-ref channel is actually closed.
 *
 * Without it, any remount — a React StrictMode double-invoke in dev, a tab
 * switch inside the page, a re-render that swaps the subtree — tears the
 * stream down and immediately builds a new one, which costs a fresh function
 * invocation each time. The route's own header comment records that an
 * uncontrolled reconnect loop is exactly the failure this endpoint has already
 * had once.
 */
const CHANNEL_CLOSE_GRACE_MS = 1_000;

function notify(channel: Channel): void {
  const snapshot: ChannelState = {
    data: channel.data,
    connected: channel.connected,
  };
  for (const subscriber of channel.subscribers) subscriber(snapshot);
}

function openChannel(url: string): Channel {
  const es = new EventSource(url);
  const channel: Channel = {
    es,
    refCount: 0,
    subscribers: new Set(),
    closeTimer: null,
    data: null,
    connected: false,
  };

  es.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string) as {
        type: string;
        data?: RealtimeBidData | null;
      };
      if (msg.type === "connected") {
        channel.connected = true;
      } else if (msg.type === "update") {
        channel.data = msg.data ?? null;
        channel.connected = true;
      } else if (msg.type === "error") {
        channel.connected = false;
      } else {
        return;
      }
      notify(channel);
    } catch (_err) {
      void normalizeError(_err);
      logger.warn("[useRealtimeBids] Failed to parse SSE message");
    }
  };

  es.onerror = () => {
    // EventSource reconnects on its own, including after the route's
    // deliberate 45s self-close. Report disconnected; do NOT close here, or
    // the built-in reconnect is lost and the stream dies permanently.
    channel.connected = false;
    notify(channel);
    logger.warn("[useRealtimeBids] SSE connection error — will retry");
  };

  return channel;
}

function subscribe(
  url: string,
  onState: (state: ChannelState) => void,
): () => void {
  let channel = channels.get(url);
  if (!channel) {
    channel = openChannel(url);
    channels.set(url, channel);
  }
  if (channel.closeTimer) {
    clearTimeout(channel.closeTimer);
    channel.closeTimer = null;
  }
  channel.refCount += 1;
  channel.subscribers.add(onState);

  // Hand the newcomer whatever the channel already knows, so a component that
  // mounts mid-stream renders the live value immediately instead of showing
  // its SSR fallback until the next push (which may be a whole bid away).
  onState({ data: channel.data, connected: channel.connected });

  return () => {
    const active = channels.get(url);
    if (!active) return;
    active.subscribers.delete(onState);
    active.refCount -= 1;
    if (active.refCount > 0) return;

    active.closeTimer = setTimeout(() => {
      // Re-read: a new subscriber may have arrived during the grace window,
      // in which case the entry in the map is live again and must survive.
      const current = channels.get(url);
      if (!current || current.refCount > 0) return;
      current.es.close();
      channels.delete(url);
    }, CHANNEL_CLOSE_GRACE_MS);
  };
}

/**
 * useRealtimeBids
 *
 * Subscribes to live auction bid updates via Server-Sent Events (SSE).
 *
 * Uses a streaming route that keeps a server-side listener open and pushes
 * updates to the browser via text/event-stream. No Firebase client SDK required.
 *
 * Multiple instances pointed at the same URL share ONE underlying connection —
 * see the `channels` map above for why that matters.
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
  const [state, setState] = useState<ChannelState>({
    data: null,
    connected: false,
  });

  useEffect(() => {
    if (!productId || typeof EventSource === "undefined") {
      setState({ data: null, connected: false });
      return;
    }

    const unsubscribe = subscribe(getEndpoint(productId), setState);
    return () => {
      unsubscribe();
      setState((prev) => ({ ...prev, connected: false }));
    };
    // `getEndpoint` is deliberately excluded: callers pass an inline arrow in
    // several places, so including it would resubscribe on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  return {
    currentBid: state.data?.currentBid ?? null,
    bidCount: state.data?.bidCount ?? null,
    lastBid: state.data?.lastBid ?? null,
    connected: state.connected,
    updatedAt: state.data?.updatedAt ?? null,
  };
}
