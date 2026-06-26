"use client"
import { useState } from "react";
import { Button, Div, Heading, IconButton, Modal, RichText, Row, Stack, Text } from "../../../ui";
import { StarRating } from "../../../ui";
import type { Review } from "../types";
import { maskName } from "../../../security";
import { THEMED_TEXT_SUCCESS } from "../../../_internal/shared/styles/themed";
import { getDefaultLocale } from "../../../core/baseline-resolver";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";

// --- ViewReviewModal ----------------------------------------------------------

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

  const displayName = maskName(review.userName);
  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString(getDefaultLocale(), {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Review Details">
      <Stack gap="md">
        {/* Author + rating */}
        <Row gap="3">
          {review.userAvatar ? (
            <img
              src={review.userAvatar}
              alt={displayName}
              className="h-10 w-10 flex-shrink-0 object-cover rounded-full"
            />
          ) : (
            <Row textWeight="medium" textSize="sm" className="h-10 w-10 flex-shrink-0 bg-neutral-200 text-neutral-600 dark:text-neutral-400" align="center" justify="center" rounded="full">
              {displayName.charAt(0).toUpperCase()}
            </Row>
          )}
          <Div>
            <Row gap="sm">
              <Text color="inverse" className="text-neutral-900 dark:text-neutral-100 dark:" weight="medium">
                {displayName}
              </Text>
              {review.verified && (
                <Text className={THEMED_TEXT_SUCCESS} size="xs">
                  ✓ Verified purchase
                </Text>
              )}
            </Row>
            <Row className="mt-0.5" gap="sm">
              <StarRating value={review.rating} size="sm" readOnly />
              {date && (
                <Text size="xs" color="faint">
                  {date}
                </Text>
              )}
            </Row>
          </Div>
        </Row>

        {/* Title + comment */}
        {review.title && (
          <Heading color="inverse" 
            level={4}
            className="text-neutral-900 dark:text-neutral-100 dark:" weight="semibold"
          >
            {review.title}
          </Heading>
        )}
        {review.comment && (
          <RichText
            html={normalizeRichTextHtml(review.comment)}
            proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
            className="text-sm leading-relaxed text-neutral-600 dark:text-zinc-400"
          />
        )}

        {/* Images */}
        {review.images && review.images.length > 0 && (
          <Row wrap gap="sm">
            {review.images.map((img, i) => (
              <button
                key={i}
                type="button"
                aria-label={`View image ${i + 1}`}
                onClick={() => setLightboxIdx(i)}
                className={`h-20 w-20 rounded-lg border overflow-hidden transition hover:opacity-80 p-0 flex-shrink-0 ${lightboxIdx === i ? "ring-2 ring-primary-500" : "border-neutral-100 dark:border-zinc-700"}`}
              >
                <img src={img.thumbnailUrl ?? img.url} alt={`Review thumbnail ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </Row>
        )}

        {/* Helpful */}
        {(review.helpfulCount ?? 0) > 0 && (
          <Text size="xs" color="faint">
            {review.helpfulCount} people found this helpful
          </Text>
        )}

        <Row justify="end" padding="t-xs">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </Row>
      </Stack>
    </Modal>
  );
}
