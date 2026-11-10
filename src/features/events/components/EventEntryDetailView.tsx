"use client";

/**
 * ONE contest entry on its own page — the second surface of the owner's
 * *"listing layout with cards with detail pages per entry and lightbox"*.
 *
 * ## Why an entry needs its own URL at all
 *
 * A contest is shared. An entrant links the thing they made, not the gallery
 * it is somewhere inside — and a gallery URL cannot carry "look at mine". This
 * is also where the full media set lives: the card shows `media[0]` as its
 * cover, and up to three more items are reachable only here or in the
 * lightbox.
 *
 * ## 🛑 COMPOSED from `DetailViewShell`
 *
 * The DETAIL shape, per `A19r` — the same shell product, order, blog-post and
 * event pages use, in `layout="narrow"`. Nothing here is an entry-specific
 * layout mechanism.
 *
 * ## 🛑 Config decides what renders
 *
 * `ranking.allowsDislike` and `votingEnabled` gate the vote controls exactly as
 * they do on the card, from the same resolved rule-set row — so an entry's own
 * page cannot offer a control its card does not, or state a different rule.
 *
 * @tag domain:events
 * @tag layer:component
 */

import { useState } from "react";
import { Badge } from "../../../ui/components/Badge";
import { DetailViewShell } from "../../../ui/components/DetailViewShell";
import { Div } from "../../../ui/components/Div";
import { Grid, Row, Stack } from "../../../ui/components/Layout";
import { ImageLightbox, type LightboxImage } from "../../../ui/components/ImageLightbox";
import { TextLink } from "../../../ui/components/TextLink";
import { Heading, Text } from "../../../ui/components/Typography";
import { EntryMediaThumb } from "./EntryMediaThumb";
import { EntryVoteButtons } from "./EntryVoteButtons";
import { useEntryVoteCaster } from "../hooks/useEntryVote";
import type { PublicEntryRanking, PublicEventEntryItem } from "../types";

export interface EventEntryDetailLabels {
  back?: string;
  entrantFallback?: string;
  submittedPrefix?: string;
  rankPrefix?: string;
}

const DEFAULT_LABELS: Required<EventEntryDetailLabels> = {
  back: "All entries",
  entrantFallback: "Participant",
  submittedPrefix: "Submitted",
  rankPrefix: "Rank",
};

export interface EventEntryDetailViewProps {
  /** The id or slug this host's URLs use. */
  eventId: string;
  entry: PublicEventEntryItem;
  ranking: PublicEntryRanking;
  votingEnabled: boolean;
  canVote: boolean;
  signInHref?: string;
  /** Back to the gallery. A STRING — never a builder function (React #441). */
  backHref?: string;
  /** How many entries are in the contest, for "Rank 3 of 12". */
  total?: number;
  labels?: EventEntryDetailLabels;
  className?: string;
}

export function EventEntryDetailView({
  eventId,
  entry,
  ranking,
  votingEnabled,
  canVote,
  signInHref,
  backHref,
  total,
  labels,
  className = "",
}: EventEntryDetailViewProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const castVote = useEntryVoteCaster(eventId);

  const entrant = entry.userDisplayName ?? copy.entrantFallback;

  const images: LightboxImage[] = entry.media.map((item) => ({
    src: item.url,
    ...(item.alt ? { alt: item.alt } : {}),
    kind: item.type,
    badge: `#${entry.rank}`,
    ...(entry.note ? { caption: entry.note } : {}),
    sub: entrant,
  }));

  /*
   * `submittedAt` is rendered with `toLocaleDateString` on the CLIENT, which
   * means the string differs between the server-rendered HTML and the
   * hydrated output for a visitor whose locale differs from the server's.
   * `suppressHydrationWarning` on the one element that carries it is the
   * narrow fix; formatting it on the server instead would print the SERVER's
   * locale to everyone, which is worse and is what the date fields on the
   * event header already avoid.
   */
  const submitted = entry.submittedAt
    ? new Date(entry.submittedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  const header = (
    <Stack gap="xs">
      {backHref ? (
        <TextLink href={backHref} size="sm">
          ← {copy.back}
        </TextLink>
      ) : null}
      <Row align="center" gap="sm" className="flex-wrap">
        <Heading level={1} size="xl" weight="semibold">
          {entrant}
        </Heading>
        <Badge variant="default">
          {copy.rankPrefix} {entry.rank}
          {typeof total === "number" && total > 0 ? ` / ${total}` : ""}
        </Badge>
      </Row>
      {submitted ? (
        <Text size="xs" color="faint" suppressHydrationWarning>
          {copy.submittedPrefix} {submitted}
        </Text>
      ) : null}
    </Stack>
  );

  const gallery = (
    <Stack gap="sm">
      {/*
        The cover at full width, the rest as a strip. Clicking any of them
        opens `ImageLightbox` at that index — which already handles image AND
        video plus per-item badge and caption, so there is no second lightbox
        and no video special-casing here.
      */}
      <button
        type="button"
        onClick={() => setActiveIndex(0)}
        aria-label={`Open ${entrant}'s entry full size`}
        className="relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-xl border border-[var(--appkit-color-border)] p-0"
      >
        <EntryMediaThumb item={entry.media[0]} fallbackAlt={`Entry by ${entrant}`} />
      </button>

      {entry.media.length > 1 ? (
        <Grid cols={3} gap="sm">
          {entry.media.slice(1).map((item, index) => (
            <button
              key={`${item.url}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index + 1)}
              aria-label={`Open item ${index + 2} of ${entry.media.length}`}
              className="relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-lg border border-[var(--appkit-color-border)] p-0"
            >
              <EntryMediaThumb item={item} fallbackAlt={`Entry by ${entrant}`} />
              {item.type === "video" ? (
                <Div className="pointer-events-none absolute bottom-1 right-1">
                  <Badge variant="default">▶</Badge>
                </Div>
              ) : null}
            </button>
          ))}
        </Grid>
      ) : null}
    </Stack>
  );

  const body = (
    <Stack gap="md">
      {entry.note ? <Text color="muted">{entry.note}</Text> : null}

      {votingEnabled ? (
        <Stack gap="xs">
          <EntryVoteButtons
            likes={entry.likes}
            dislikes={entry.dislikes}
            myVote={entry.myVote}
            allowsDislike={ranking.allowsDislike}
            canVote={canVote}
            {...(signInHref ? { signInHref } : {})}
            onVote={(value) => castVote(entry.id, value)}
          />
          {/*
            The rule, from the same row that produced this entry's rank. It is
            printed on BOTH surfaces on purpose: the detail page is what gets
            shared, so it has to carry the rules it is being judged by.
          */}
          {ranking.publicWording ? (
            <Text size="xs" color="faint">
              {ranking.publicWording}
            </Text>
          ) : null}
        </Stack>
      ) : (
        <Text size="sm" color="faint">
          {entry.likes} {entry.likes === 1 ? "like" : "likes"}
        </Text>
      )}
    </Stack>
  );

  return (
    <>
      <DetailViewShell
        layout="narrow"
        className={className}
        mainSlots={[header, gallery, body]}
      />
      <ImageLightbox
        images={images}
        activeIndex={activeIndex}
        onClose={() => setActiveIndex(null)}
        showThumbnails={images.length > 1}
      />
    </>
  );
}
