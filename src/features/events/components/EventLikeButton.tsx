"use client";

/**
 * The like toggle. Optimistic, signed-in only, and safe to double-click.
 *
 * @tag domain:events
 * @tag layer:component
 */

import React, { useCallback, useState, useTransition } from "react";
import { Button, Row, Span, Icon } from "../../../ui";
import { PressScale } from "../../../ui/components/Motion";
import { useOptionalSession } from "../../auth/hooks/useOptionalSession";
import { LoginRequiredModal } from "../../auth/components/LoginRequiredModal";
import { normalizeError } from "../../../errors/normalize";

export interface EventLikeButtonProps {
  eventId: string;
  /** Server-rendered starting state. */
  initialLiked: boolean;
  initialCount: number;
  /** POSTs the toggle and resolves with the authoritative new state. */
  onToggle: (eventId: string) => Promise<{ liked: boolean; likeCount: number }>;
  size?: "sm" | "md";
  className?: string;
}

export function EventLikeButton({
  eventId,
  initialLiked,
  initialCount,
  onToggle,
  size = "md",
  className = "",
}: EventLikeButtonProps) {
  const session = useOptionalSession();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [showLogin, setShowLogin] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleClick = useCallback(() => {
    /*
     * 🛑 THREE STATES, NOT TWO. `SessionProvider` mounts `initialUser={null}`
     * because the root locale layout must stay static (Root Cause #82), so
     * `loading` is true on every hard load FOR SIGNED-IN USERS TOO. Testing
     * only `!user` would open the sign-in modal at a buyer who is already
     * signed in, on every first click after a page load — the exact defect
     * Root Cause #79 records for the wishlist heart.
     */
    if (session?.loading) return;
    if (!session?.user?.uid) {
      setShowLogin(true);
      return;
    }

    // Optimistic: flip now, reconcile from the server response. A like is
    // cheap to be briefly wrong about and the latency is what people notice.
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));

    startTransition(() => {
      void onToggle(eventId)
        .then((res) => {
          // The server is authoritative — it holds the real count, which may
          // have moved for other reasons between paint and click.
          setLiked(res.liked);
          setCount(res.likeCount);
        })
        .catch((err) => {
          void normalizeError(err);
          // Roll back rather than leaving a lie on screen.
          setLiked(liked);
          setCount(initialCount);
        });
    });
  }, [session, liked, initialCount, eventId, onToggle]);

  const label = liked ? "Liked" : "Like";

  return (
    <>
      <PressScale>
        <Button
          type="button"
          variant={liked ? "primary" : "outline"}
          size={size}
          onClick={handleClick}
          isLoading={pending}
          aria-pressed={liked}
          aria-label={`${label} this event — ${count} ${count === 1 ? "person likes" : "people like"} it`}
          className={className}
        >
          <Row align="center" gap="xs">
            <Icon name="wishlist" filled={liked} />
            <Span weight="medium">{label}</Span>
            {/* `numeric` is tabular figures, so the width does not jump as the
                count ticks between 9 and 10 under the user's own click. */}
            <Span numeric>{count}</Span>
          </Row>
        </Button>
      </PressScale>

      <LoginRequiredModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        message="Sign in to like this event and see who else has."
      />
    </>
  );
}
