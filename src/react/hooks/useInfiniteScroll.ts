"use client";
import { useEffect, useRef, useState } from "react";

/**
 * useInfiniteScroll (Q6 — S13)
 *
 * Lightweight IntersectionObserver wrapper for cursor-based listings.
 * Attach the returned `sentinelRef` to a sentinel `<div />` at the bottom
 * of your list. When that div scrolls into view the hook calls `onLoadMore`.
 *
 * The hook keeps no domain state — callers own items, cursor, hasMore.
 * Concerns it does handle:
 *   - Guard against re-firing while a load is already in flight.
 *   - Auto-disable when `hasMore === false`.
 *   - Disconnect on unmount.
 *
 * Pair with `ListingProcessorResponse.cursor` returned from /api/products.
 *
 * @example
 * const { sentinelRef, isLoadingMore } = useInfiniteScroll({
 *   hasMore: page.hasMore,
 *   onLoadMore: () => fetchNext(page.cursor),
 * });
 * return (
 *   <>
 *     {items.map(...)}
 *     <div ref={sentinelRef} />
 *     {isLoadingMore && <SkeletonCards />}
 *   </>
 * );
 */
export interface UseInfiniteScrollOptions {
  /** Whether more pages are available. Hook short-circuits when false. */
  hasMore: boolean;
  /** Called when the sentinel enters the viewport AND no load is in flight. */
  onLoadMore: () => void | Promise<void>;
  /**
   * Margin around the root before the sentinel is considered "in view".
   * Defaults to "200px" so the next page starts loading before the user
   * actually hits the bottom.
   */
  rootMargin?: string;
  /**
   * Set to true to temporarily pause the observer (e.g. during a hard
   * pagination reset). Re-enables on next render.
   */
  disabled?: boolean;
}

export interface UseInfiniteScrollResult {
  /** Attach to the bottom sentinel `<div />`. */
  sentinelRef: (node: HTMLDivElement | null) => void;
  /** True while `onLoadMore` is in flight. */
  isLoadingMore: boolean;
}

export function useInfiniteScroll(
  opts: UseInfiniteScrollOptions,
): UseInfiniteScrollResult {
  const { hasMore, onLoadMore, rootMargin = "200px", disabled = false } = opts;
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  const sentinelRef = (node: HTMLDivElement | null): void => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node || disabled || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (loadingRef.current) return;
        loadingRef.current = true;
        setIsLoadingMore(true);
        Promise.resolve(onLoadMoreRef.current())
          .catch(() => {
            // Caller surfaces errors; hook only releases the lock.
          })
          .finally(() => {
            loadingRef.current = false;
            setIsLoadingMore(false);
          });
      },
      { rootMargin },
    );
    observerRef.current.observe(node);
  };

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

  return { sentinelRef, isLoadingMore };
}
