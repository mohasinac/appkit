"use client";

/**
 * Casting a vote from the browser.
 *
 * ## 🛑 THE CALLER IS A CLIENT COMPONENT, AND THAT IS NOT INCIDENTAL
 *
 * `EntryVoteButtons` takes `onVote` — a FUNCTION prop. A function may be
 * passed to a client component only BY a client component: React cannot
 * serialise one into the flight payload, so a server page handing one over
 * writes an error row at that prop position and the browser dies
 * *deserialising* it at hydration. That is React #441, it took a week of
 * production downtime on this exact app, and no `<Suspense fallback>` can
 * catch it because the failure is above every boundary in the tree.
 *
 * So the vote transport lives here, in a `"use client"` module, and the entry
 * views that own it are client components. A server page passes DATA —
 * `eventId`, the rows, `allowsDislike` — and never a callback.
 *
 * ## Why `fetch` and not `apiClient`
 *
 * Same-origin, deliberately. The events host owns `/api/events/*`, so the
 * browser talks only to the host it loaded from — which is the pattern that
 * finally resolved the CORS problem here (*"look at how the wiki api works"*).
 * Routing a browser call through an origin registry is what made seven
 * endpoints cross-origin and dead.
 *
 * @tag domain:events
 * @tag layer:hook
 */

import { useCallback } from "react";
import { EVENT_ENDPOINTS } from "../../../constants/api-endpoints";
import type { EntryVoteValue } from "../schemas/entry-votes";

/** What the vote route returns, narrowed to what a button needs. */
export interface EntryVoteResult {
  likes: number;
  dislikes: number;
  myVote: EntryVoteValue | null;
}

/**
 * Returns a caster bound to one event.
 *
 * Throws on any non-success, which is the contract `EntryVoteButtons` relies
 * on: it reverts its optimistic state in `catch`. Swallowing the error would
 * leave a number on screen the server disagrees with — the specific failure
 * that optimistic UI has to get right or not do at all.
 */
export function useEntryVoteCaster(eventId: string) {
  return useCallback(
    async (entryId: string, value: EntryVoteValue): Promise<EntryVoteResult> => {
      const response = await fetch(
        EVENT_ENDPOINTS.ENTRY_VOTE(eventId, entryId),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          /*
           * The session rides in the `__session` cookie, which the route reads
           * directly. `same-origin` is the default for same-origin requests
           * but is stated because the whole route is auth-gated — a silently
           * credential-less request would 401 and look like a signed-out user.
           */
          credentials: "same-origin",
          body: JSON.stringify({ value }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            ok?: boolean;
            error?: string;
            data?: Partial<EntryVoteResult>;
          }
        | null;

      if (!response.ok || payload?.success === false) {
        /*
         * The server's own message, when there is one — the 409 for a dislike
         * on a like-only contest and the 403 for a restricted account both say
         * something a user can act on, and "Vote failed" does not.
         */
        throw new Error(payload?.error ?? `Vote failed (${response.status})`);
      }

      const data = payload?.data ?? {};
      return {
        likes: Number(data.likes ?? 0),
        dislikes: Number(data.dislikes ?? 0),
        myVote: data.myVote ?? null,
      };
    },
    [eventId],
  );
}
