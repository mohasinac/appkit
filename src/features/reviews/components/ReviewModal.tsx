"use client";

import React, { useState } from "react";
import {
  Button,
  Div,
  Heading,
  IconButton,
  Modal,
  Row,
  Text,
} from "@mohasinac/ui";
import { StarRating } from "@mohasinac/ui";
import type { Review } from "../types";

// ─── ViewReviewModal ──────────────────────────────────────────────────────────

export interface ViewReviewModalProps {
  review: Review | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ViewReviewModal — full review details in a Modal overlay.
 * Shows all images, the full comment, and seller response if present.
 */
export function ViewReviewModal({
  review,
  isOpen,
  onClose,
}: ViewReviewModalProps) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (!review) return null;

  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Review Details">
      <Div className="space-y-4">
        {/* Author + rating */}
        <Div className="flex items-center gap-3">
          {review.userAvatar ? (
            <Div
              role="img"
              aria-label={review.userName}
              className="h-10 w-10 flex-shrink-0 rounded-full bg-center bg-cover"
              style={{ backgroundImage: `url(${review.userAvatar})` }}
            />
          ) : (
            <Div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-medium text-neutral-600 dark:bg-zinc-700 dark:text-zinc-300">
              {review.userName.charAt(0).toUpperCase()}
            </Div>
          )}
          <Div>
            <Div className="flex items-center gap-2">
              <Text className="font-medium text-neutral-900 dark:text-white">
                {review.userName}
              </Text>
              {review.verified && (
                <Text className="text-xs text-green-600 dark:text-green-400">
                  ✓ Verified purchase
                </Text>
              )}
            </Div>
            <Div className="flex items-center gap-2 mt-0.5">
              <StarRating value={review.rating} size="sm" readOnly />
              {date && (
                <Text className="text-xs text-neutral-400 dark:text-zinc-500">
                  {date}
                </Text>
              )}
            </Div>
          </Div>
        </Div>

        {/* Title + comment */}
        {review.title && (
          <Heading
            level={4}
            className="font-semibold text-neutral-900 dark:text-white"
          >
            {review.title}
          </Heading>
        )}
        {review.comment && (
          <Text className="text-sm leading-relaxed text-neutral-600 dark:text-zinc-400">
            {review.comment}
          </Text>
        )}

        {/* Images */}
        {review.images && review.images.length > 0 && (
          <Row wrap gap="sm">
            {review.images.map((img, i) => (
              <IconButton
                key={i}
                aria-label={`View image ${i + 1}`}
                onClick={() => setLightboxIdx(i)}
                variant="ghost"
                className={`h-20 w-20 rounded-lg border bg-center bg-cover transition hover:opacity-80 p-0 ${lightboxIdx === i ? "ring-2 ring-primary-500" : "border-neutral-100 dark:border-zinc-700"}`}
                style={{
                  backgroundImage: `url(${img.thumbnailUrl ?? img.url})`,
                }}
                icon={<Div />}
              />
            ))}
          </Row>
        )}

        {/* Helpful */}
        {(review.helpfulCount ?? 0) > 0 && (
          <Text className="text-xs text-neutral-400 dark:text-zinc-500">
            {review.helpfulCount} people found this helpful
          </Text>
        )}

        <Div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </Div>
      </Div>
    </Modal>
  );
}
