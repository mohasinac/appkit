"use client";

/**
 * Vote controls for a contest entry.
 *
 * 🛑 WHAT RENDERS IS DECIDED BY CONFIG, NOT BY THIS FILE.
 *
 * `allowsDislike` comes from the event's `entryRanking` rule set. A like-only
 * popularity contest and a net-score vote are the same component with a
 * different rule row — the dislike button is ABSENT, not disabled, when the
 * rule does not use it, so there is nothing to click and nothing in the DOM.
 *
 * 🛑 COUNTS ONLY. This never receives or renders who voted. The voter list is
 * admin-only and comes from a different handler; the public summary type does
 * not carry it, so a leak here would be a compile error.
 *
 * Optimistic, with a revert. A vote is a single click on a page that may be
 * showing forty entries, so waiting for a round trip before the number moves
 * feels broken — but a failed request puts the previous state back rather than
 * leaving a number the server disagrees with.
 */

import { useCallback, useState } from "react";
import { Button } from "../../../ui/components/Button";
import { Div } from "../../../ui/components/Div";
import { Span } from "../../../ui/components/Typography";
import { useReturnTo } from "../../../react/hooks/useReturnTo";
import type { EntryVoteValue } from "../schemas/entry-votes";

export interface EntryVoteButtonsProps {
  likes: number;
  dislikes: number;
  /** How the signed-in user has already voted, if at all. */
  myVote: EntryVoteValue | null;
  /** From the rule set. When false, no dislike control is rendered at all. */
  allowsDislike: boolean;
  /** Signed-out visitors see counts and a prompt, never a dead button. */
  canVote: boolean;
  /** Returns the authoritative counts; the component reverts if it throws. */
  onVote: (value: EntryVoteValue) => Promise<{ likes: number; dislikes: number; myVote: EntryVoteValue | null }>;
  signInHref?: string;
}

export function EntryVoteButtons({
  likes,
  dislikes,
  myVote,
  allowsDislike,
  canVote,
  onVote,
  signInHref,
}: EntryVoteButtonsProps) {
  const [state, setState] = useState({ likes, dislikes, myVote });
  const [busy, setBusy] = useState(false);

  /*
   * 🛑 "Sign in to vote" has to come BACK to this gallery, and the page that
   * supplies `signInHref` is a SERVER component that cannot know the URL.
   *
   * It is resolved here instead: this component is already `"use client"`, so
   * `window.location.href` is available and the answer is a plain string. The
   * alternative — a `() => string` prop so the page can build it — is the exact
   * shape that took two content hosts down for a week (RSC #441 at hydration);
   * see `next/routing/section-routes.ts`.
   *
   * Without this the visitor signed in and landed on the identity provider's
   * configured default, which on the measured deployment is a different site
   * entirely — so the vote they clicked for was unreachable from where they
   * ended up.
   */
  const signInWithReturn = useReturnTo(signInHref ?? "");

  const cast = useCallback(
    async (value: EntryVoteValue) => {
      if (!canVote || busy) return;
      const previous = state;

      /*
       * Mirror the server's own rules so the optimistic number matches what
       * the transaction will do: pressing the same button again RETRACTS, and
       * switching sides moves both counters.
       */
      const retracting = state.myVote === value;
      const next = {
        likes:
          state.likes +
          (value === "like" ? (retracting ? -1 : 1) : 0) +
          (!retracting && state.myVote === "like" ? -1 : 0),
        dislikes:
          state.dislikes +
          (value === "dislike" ? (retracting ? -1 : 1) : 0) +
          (!retracting && state.myVote === "dislike" ? -1 : 0),
        myVote: retracting ? null : value,
      };
      setState({ ...next, likes: Math.max(0, next.likes), dislikes: Math.max(0, next.dislikes) });
      setBusy(true);

      try {
        // The server's numbers win — it read the row inside a transaction.
        setState(await onVote(value));
      } catch {
        setState(previous);
      } finally {
        setBusy(false);
      }
    },
    [busy, canVote, onVote, state],
  );

  if (!canVote) {
    return (
      <Div className="flex items-center gap-2">
        <Span>♥ {state.likes}</Span>
        {allowsDislike ? <Span>♡ {state.dislikes}</Span> : null}
        {signInWithReturn ? (
          <Span>
            <a href={signInWithReturn}>Sign in to vote</a>
          </Span>
        ) : null}
      </Div>
    );
  }

  return (
    <Div className="flex items-center gap-2">
      <Button
        variant={state.myVote === "like" ? "primary" : "secondary"}
        size="sm"
        disabled={busy}
        onClick={() => void cast("like")}
        aria-pressed={state.myVote === "like"}
        aria-label={state.myVote === "like" ? "Remove your like" : "Like this entry"}
      >
        ♥ {state.likes}
      </Button>
      {/*
        Absent, not disabled, when the ranking rule does not use dislikes —
        the platform rule everywhere else, and it keeps a like-only contest
        from showing a control that would change nothing.
      */}
      {allowsDislike ? (
        <Button
          variant={state.myVote === "dislike" ? "primary" : "secondary"}
          size="sm"
          disabled={busy}
          onClick={() => void cast("dislike")}
          aria-pressed={state.myVote === "dislike"}
          aria-label={state.myVote === "dislike" ? "Remove your dislike" : "Dislike this entry"}
        >
          ♡ {state.dislikes}
        </Button>
      ) : null}
    </Div>
  );
}
