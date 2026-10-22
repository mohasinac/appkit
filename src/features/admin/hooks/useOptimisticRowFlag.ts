"use client";

/*
 * WHY: Eight listing views grew the same per-row "flip one field" control in
 *      one change — homepage sections (`enabled`), carousel slides (`active`),
 *      the six seller listing-type pages (`status`), seller bundles, grouped
 *      listings, store categories, shipping configs and payout methods
 *      (`isActive`). Every one needs an optimistic override so the switch
 *      moves under the finger, a PATCH, an invalidate, and a rollback.
 *
 *      That is well past the Duplication Framework's Rule of Three, and the
 *      bug-fix multiplier is the real argument: the rollback is subtly wrong
 *      in the shape everyone writes first.
 *
 * 🛑 THE ROLLBACK BUG THIS EXISTS TO MAKE UNREPEATABLE
 *
 * The obvious implementation captures the previous override and writes it
 * back on failure:
 *
 *     const prev = overrides[id];              // `undefined` on a row's
 *     setOverrides((o) => ({...o, [id]: v}));  // FIRST toggle
 *     catch { setOverrides((o) => ({...o, [id]: prev})); }
 *
 * `prev` is `undefined` the first time any given row is toggled, and writing
 * `undefined` back is not the same as removing the key — a reader doing
 * `overrides[id] ?? row.value` gets `undefined`, which for a boolean renders
 * as `false`. So a FAILED toggle of a row the server holds as `true` leaves
 * the UI asserting the opposite of the truth, which is worse than not having
 * rolled back at all. `AdminProductsView.tsx` has this shape.
 *
 * The fix is to DELETE the key, which is what `clear` below does.
 *
 * 🛑 The key is cleared on SUCCESS too, and only AFTER the invalidation has
 * settled. `invalidateQueries` resolves once active refetches finish, so by
 * then `mapRows` is already reading the fresh server value and there is no
 * visible flip-back-then-forward. An override that is never cleared pins the
 * row forever and masks every later server-side change to it.
 *
 * EXPORTS: useOptimisticRowFlag, UseOptimisticRowFlagOptions
 *
 * @tag domain:admin,seller
 * @tag layer:hook
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:AdminSectionsView,AdminCarouselView,SellerListingTypeView,SellerBundlesView,SellerGroupedListingsView,SellerStoreCategoriesView,SellerShippingConfigsView,SellerPayoutMethodsView
 * @tag sideEffects:network
 */

import React from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useToast } from "../../../ui";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";

export interface UseOptimisticRowFlagOptions<T> {
  /**
   * Performs the write. Receives the row id and the value being set.
   *
   * 🛑 Send ONLY the field being changed. Several of this hook's consumers sit
   * over repositories that merge a `config`/nested object by READING the
   * document first; omitting that field short-circuits the read, so a toggle
   * costs one write and no read.
   */
  mutate: (id: string, next: T) => Promise<unknown>;
  /**
   * Query keys to invalidate. Pass every key that renders this field —
   * several of these records are read by a PUBLIC surface under a key of its
   * own, and forgetting it leaves the storefront stale until its own TTL.
   */
  invalidate: readonly QueryKey[];
  /** Toast copy. Receives the value that was set. */
  successMessage: (next: T) => string;
  /** Fallback when the thrown error carries no message. */
  errorMessage?: string;
}

export interface UseOptimisticRowFlagReturn<T> {
  /** `overrides[id] ?? row.value` — the value to render. */
  overrides: Record<string, T>;
  /** Resolve a row's current value against any pending override. */
  resolve: (id: string, serverValue: T) => T;
  /** The id currently being written, for a per-row disabled state. */
  pendingId: string | null;
  /** Fire the change. Safe to call from an `onChange` without awaiting. */
  set: (id: string, next: T) => Promise<void>;
}

export function useOptimisticRowFlag<T>({
  mutate,
  invalidate,
  successMessage,
  errorMessage = "Could not save that change.",
}: UseOptimisticRowFlagOptions<T>): UseOptimisticRowFlagReturn<T> {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [overrides, setOverrides] = React.useState<Record<string, T>>({});
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const clear = React.useCallback((id: string) => {
    setOverrides((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      // DELETE, never write back a captured value — see the header.
      delete next[id];
      return next;
    });
  }, []);

  const set = React.useCallback(
    async (id: string, next: T) => {
      setOverrides((prev) => ({ ...prev, [id]: next }));
      setPendingId(id);
      try {
        await mutate(id, next);
        await Promise.all(
          invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        );
        clear(id);
        showToast(successMessage(next), "success");
      } catch (err) {
        const normalized = normalizeError(err);
        clear(id);
        showToast(toUserMessage(normalized.code, undefined, { fallback: errorMessage }), "error");
      } finally {
        setPendingId(null);
      }
    },
    [mutate, invalidate, queryClient, clear, showToast, successMessage, errorMessage],
  );

  const resolve = React.useCallback(
    (id: string, serverValue: T) => (id in overrides ? overrides[id] : serverValue),
    [overrides],
  );

  return { overrides, resolve, pendingId, set };
}
