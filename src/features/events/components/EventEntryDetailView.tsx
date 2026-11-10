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

import { useEffect, useState } from "react";
import { Badge } from "../../../ui/components/Badge";
import { DetailPageGallery } from "../../../ui/components/DetailPageGallery";
import { DetailViewShell } from "../../../ui/components/DetailViewShell";
import { Row, Stack } from "../../../ui/components/Layout";
import { ImageLightbox, type LightboxImage } from "../../../ui/components/ImageLightbox";
import { TextLink } from "../../../ui/components/TextLink";
import { Heading, Text } from "../../../ui/components/Typography";
import { EntryInlineActions } from "./EntryInlineActions";
import { EntryMediaThumb } from "./EntryMediaThumb";
import { EntryVoteButtons } from "./EntryVoteButtons";
import { useEntryVoteCaster } from "../hooks/useEntryVote";
import type { EventEntryMediaLimits } from "../schemas/firestore";
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
  /**
   * ── INLINE EDIT / DELETE, the same controls the gallery card carries ──────
   *
   * The owner asked for them *"on the cards"*; an entry's own page is the other
   * half of the same surface, and an entrant who followed "View details" to
   * look at their photo should not have to navigate back to manage it.
   *
   * `entry.mine` (per row) and `canModerate` (per viewer) are both
   * SERVER-resolved, and the PATCH/DELETE routes re-resolve them from the
   * stored document — a hidden button is not a permission.
   */
  allowInlineEdit?: boolean;
  /** The viewer holds `admin:event-entries:write`. Server-resolved. */
  canModerate?: boolean;
  /** This event's per-entry media caps, so the edit form enforces ITS rules. */
  entryMedia?: EventEntryMediaLimits;
  /** Only used to derive the SEO filename the media host stamps on an upload. */
  eventTitle?: string;
  /** Media proxy endpoints on THIS host. Strings — a server page may pass them. */
  signEndpoint?: string;
  finalizeEndpoint?: string;
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
  allowInlineEdit = true,
  canModerate = false,
  entryMedia,
  eventTitle,
  signEndpoint,
  finalizeEndpoint,
  labels,
  className = "",
}: EventEntryDetailViewProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  /**
   * The entry as it stands AFTER any inline edit in this page session.
   *
   * 🛑 Local, not a refresh. The server has already accepted the change; a
   * `router.refresh()` would re-run the ranked window read, and on a contest
   * ranked by likes an unrelated vote landing in between would change the rank
   * badge above the photo the moment someone pressed Save — which reads as the
   * edit having moved them.
   *
   * ⚠ Seeded from the prop and re-seeded when it changes, so a genuine server
   * re-render (a vote, a navigation) still wins.
   */
  const [live, setLive] = useState(entry);
  useEffect(() => setLive(entry), [entry]);
  const castVote = useEntryVoteCaster(eventId);

  const entrant = live.userDisplayName ?? copy.entrantFallback;

  const images: LightboxImage[] = live.media.map((item) => ({
    src: item.url,
    ...(item.alt ? { alt: item.alt } : {}),
    kind: item.type,
    badge: `#${live.rank}`,
    ...(live.note ? { caption: live.note } : {}),
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
  const submitted = live.submittedAt
    ? new Date(live.submittedAt).toLocaleDateString(undefined, {
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
          {copy.rankPrefix} {live.rank}
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

  /*
   * ── 🛑 A SLIDER, NOT ALL OF THEM AT ONCE ────────────────────────────────
   *
   * Owner, 2026-11-10: *"where is my slider? i do not want the images to be
   * shown all together, they should be like we do on the product details
   * screens / listing details just larger"*.
   *
   * This used to render the cover at full width PLUS every remaining item in a
   * `Grid cols={3}` — i.e. the whole entry at once, which is exactly what the
   * owner reported. It is now `DetailPageGallery`, the primitive the product /
   * collector-drop / pre-order detail pages are built from, at `size="lg"` for
   * the "just larger" half.
   *
   * 🛑 NOT A THIRD GALLERY. `DetailPageGallery` gained `kind` (so a video item
   * renders a `<video>` frame), `resolve="raw"` and the arrows — all opt-in,
   * all defaulting to its previous behaviour. Writing an entry-specific slider
   * here is what `A19r` forbids: one composed view per SHAPE, never one per
   * type.
   *
   * 🛑 `resolve="raw"` is load-bearing on this host. Entry media is stored as
   * a host-agnostic `/media/<shortId>` resolved by the deployment's own
   * rewrite, and the media host is not a configured `next/image` loader domain
   * here — the optimized path refuses it at RUNTIME while compiling perfectly.
   * Same reason `EntryMediaThumb` is a plain `<img>`.
   *
   * `onOpen` hands the active index to `ImageLightbox`, which already handles
   * image AND video with per-item badge and caption — so there is still one
   * lightbox and no video special-casing anywhere in this file.
   */
  const gallery = (
    <DetailPageGallery
      images={live.media.map((item) => ({
        url: item.url,
        alt: item.alt ?? `Entry by ${entrant}`,
        kind: item.type,
      }))}
      title={`Entry by ${entrant}`}
      aspect="square"
      size="lg"
      resolve="raw"
      showArrows
      onOpen={(index) => setActiveIndex(index)}
      fallback={
        <EntryMediaThumb item={undefined} fallbackAlt={`Entry by ${entrant}`} />
      }
    />
  );

  const body = (
    <Stack gap="md">
      {live.note ? <Text color="muted">{live.note}</Text> : null}

      {/*
        ── 🛑 INLINE, on the entry's own page ────────────────────────────────
        Shown for the entry's OWNER or a moderator holding
        `admin:event-entries:write`; absent — not disabled — for everyone else,
        so a signed-out visitor's page is identical to what it always was.

        On DELETE this navigates to the gallery with a FULL page load rather
        than a client push: the gallery's entry count is server-rendered and
        `event.stats` has just been decremented, so a soft navigation would
        show the stale total next to the correct rows — the exact disagreement
        the stats fix exists to remove. `backHref` is unprefixed and this
        deployment uses `localePrefix: "never"`, so it resolves as-is.
      */}
      {allowInlineEdit && (live.mine || canModerate) ? (
        <EntryInlineActions
          eventId={eventId}
          entry={live}
          canModerate={canModerate}
          {...(entryMedia ? { entryMedia } : {})}
          eventTitle={eventTitle ?? ""}
          {...(signEndpoint ? { signEndpoint } : {})}
          {...(finalizeEndpoint ? { finalizeEndpoint } : {})}
          onSaved={(patch) =>
            setLive((current) => ({
              ...current,
              media: patch.media,
              ...(patch.note ? { note: patch.note } : { note: undefined }),
            }))
          }
          onDeleted={() => {
            if (typeof window !== "undefined") {
              window.location.assign(backHref ?? "/");
            }
          }}
        />
      ) : null}

      {votingEnabled ? (
        <Stack gap="xs">
          <EntryVoteButtons
            likes={live.likes}
            dislikes={live.dislikes}
            myVote={live.myVote}
            allowsDislike={ranking.allowsDislike}
            canVote={canVote}
            {...(signInHref ? { signInHref } : {})}
            onVote={(value) => castVote(live.id, value)}
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
          {live.likes} {live.likes === 1 ? "like" : "likes"}
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
