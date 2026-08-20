"use client"
import { useState } from "react";
import { Button, Div, Heading, Modal, RichText, Row, Stack, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
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
            <Div className="relative h-10 w-10 flex-shrink-0" rounded="full" overflow="hidden">
              <MediaImage src={review.userAvatar} alt={displayName} size="avatar" />
            </Div>
          ) : (
            <Row textWeight="medium" textSize="sm" className="h-10 w-10 flex-shrink-0 bg-neutral-200 text-[var(--appkit-color-text-muted)]" align="center" justify="center" rounded="full">
              {displayName.charAt(0).toUpperCase()}
            </Row>
          )}
          <Div>
            <Row gap="sm">
              <Text color="inverse" className="text-[var(--appkit-color-text)] dark:" weight="medium">
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
            className="text-[var(--appkit-color-text)] dark:" weight="semibold"
          >
            {review.title}
          </Heading>
        )}
        {review.comment && (
          <RichText
            html={normalizeRichTextHtml(review.comment)}
            proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
            className="text-[length:var(--appkit-text-sm)] leading-relaxed text-[var(--appkit-color-text-muted)] text-[var(--appkit-color-text-muted)]"
          />
        )}

        {/* Images */}
        {review.images && review.images.length > 0 && (
          <Row wrap gap="sm">
            {review.images.map((img, i) => (
              <Button
                variant="ghost"
                key={i}
                type="button"
                aria-label={`View image ${i + 1}`}
                onClick={() => setLightboxIdx(i)}
                rounded="lg"
                paddingX="none"
                paddingY="none"
                className={`h-20 w-20 overflow-hidden transition hover:opacity-80 flex-shrink-0 ${lightboxIdx === i ? "ring-2 ring-primary-500" : "border-neutral-100 border-[var(--appkit-color-border)]"}`}
              >
                <MediaImage src={img} alt={`Review thumbnail ${i + 1}`} size="thumbnail" />
              </Button>
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
