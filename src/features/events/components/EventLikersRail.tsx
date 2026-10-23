"use client";

/**
 * "Liked by" — the last ten faces, then a way to see the rest.
 *
 * @tag domain:events
 * @tag layer:component
 */

import React, { useCallback, useState } from "react";
import { AvatarGroup, Button, Modal, Row, Stack, Text, Span, Avatar } from "../../../ui";
import type { PublicLiker } from "../schemas/likes";
import { LIKERS_PAGE_SIZE } from "../schemas/likes";
import { normalizeError } from "../../../errors/normalize";

export interface EventLikersRailProps {
  /** The most recent likers, server-rendered. */
  likers: PublicLiker[];
  /** The event's total like count — usually larger than `likers.length`. */
  totalCount: number;
  /** True when more exist past the preview. */
  hasMore: boolean;
  /** Fetches one more page for the modal. */
  loadMore?: (offset: number) => Promise<{ likers: PublicLiker[]; hasMore: boolean }>;
  className?: string;
}

/** "Aarav, Riya and 7 others" — names first, count only for the remainder. */
function summarise(likers: PublicLiker[], total: number): string {
  if (likers.length === 0) return "";
  const shown = likers.slice(0, 2).map((l) => l.displayName);
  const others = Math.max(0, total - shown.length);
  if (others === 0) return shown.join(" and ");
  return `${shown.join(", ")} and ${others} other${others === 1 ? "" : "s"}`;
}

export function EventLikersRail({
  likers,
  totalCount,
  hasMore,
  loadMore,
  className = "",
}: EventLikersRailProps) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState<PublicLiker[]>(likers);
  const [more, setMore] = useState(hasMore);
  const [loading, setLoading] = useState(false);

  const handleLoadMore = useCallback(() => {
    if (!loadMore || loading) return;
    setLoading(true);
    void loadMore(all.length)
      .then((page) => {
        setAll((prev) => [...prev, ...page.likers]);
        setMore(page.hasMore);
      })
      .catch((err) => {
        void normalizeError(err);
        // Stop offering a button that is not working, rather than letting it
        // sit there doing nothing on every press.
        setMore(false);
      })
      .finally(() => setLoading(false));
  }, [loadMore, loading, all.length]);

  /*
   * Nothing to show. Deliberately renders null rather than "Be the first to
   * like this" — an empty social proof row advertises that nobody has, which
   * is worse for the event than saying nothing at all. The like BUTTON is
   * still there; this is only the rail beside it.
   */
  if (likers.length === 0) return null;

  return (
    <>
      <Row align="center" gap="sm" className={className}>
        {/* 🛑 AvatarGroup's own overflow chip is a static `+N` span, not a
            control — so `max` is set to the full list and the "view all"
            affordance is the button beside it, which is a real button. */}
        <AvatarGroup
          size="sm"
          max={likers.length}
          avatars={likers.map((l) => ({ src: l.photoURL, name: l.displayName, alt: l.displayName }))}
        />
        <Text size="sm" color="muted">
          Liked by <Span weight="medium">{summarise(likers, totalCount)}</Span>
        </Text>
        {(hasMore || totalCount > likers.length) && (
          <Button type="button" variant="link" size="sm" onClick={() => setOpen(true)}>
            View all
          </Button>
        )}
      </Row>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={`Liked by ${totalCount}`}>
        <Stack gap="sm">
          {all.map((l) => (
            <Row key={l.uid} align="center" gap="sm">
              <Avatar size="sm" src={l.photoURL} name={l.displayName} alt={l.displayName} />
              <Text size="sm">{l.displayName}</Text>
            </Row>
          ))}
          {more && loadMore && (
            <Button type="button" variant="outline" size="sm" onClick={handleLoadMore} isLoading={loading}>
              Show {LIKERS_PAGE_SIZE} more
            </Button>
          )}
        </Stack>
      </Modal>
    </>
  );
}
