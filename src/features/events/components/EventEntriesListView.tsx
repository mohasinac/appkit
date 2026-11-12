"use client";

/**
 * The CARD LISTING of a contest's published entries.
 *
 * Owner spec, 2026-11-10: *"listing layout with cards with detail pages per
 * entry and lightbox"* — this is the first of those three surfaces.
 *
 * ## 🛑 COMPOSED, not invented
 *
 * `A19r` in the plan: *there are no fixed view pages; one composed view per
 * SHAPE of thing*, never one per type — measured against 281 `*View.tsx` files
 * totalling 77,151 lines. An entry listing is the LISTING shape, so this is
 * `BaseListingCard` (the shared card chassis every listing surface uses) in the
 * canonical `Grid cols="cards"` ladder, with `Pagination`, `EmptyState` and
 * `ImageLightbox`.
 *
 * ⚠ `ListingsView` / `EntityDetailsView` — the two views `A19r` names — DO NOT
 * EXIST in the tree yet; a search for either returns nothing. So "compose from
 * them" is not available, and this composes from the primitives they would
 * themselves be built out of. Nothing here is an entry-specific layout
 * mechanism: it is the shared card, the shared grid, the shared pager and the
 * shared lightbox, arranged.
 *
 * ## 🛑 CONFIG DECIDES WHAT RENDERS. There is no `event.type ===` anywhere.
 *
 *  - `ranking.publicWording` is the rules sentence — printed, never written
 *    here, so the stated rule and the computed order cannot drift.
 *  - `ranking.allowsDislike` decides whether a dislike control exists at all
 *    (absent, not disabled).
 *  - `votingEnabled` — the event TYPE's `entryVoting` mechanism — decides
 *    whether vote controls render at all, so a submission event without voting
 *    shows its gallery with counts and no buttons.
 *  - An unimplemented ranking rule arrives with an EMPTY `publicWording` and
 *    `allowsDislike: false`, so this renders a plain gallery rather than
 *    asserting a rule it cannot compute. Unknown values degrade, never throw.
 *
 * ## 🛑 `entryHrefPrefix` IS A STRING, AND THAT IS LOAD-BEARING
 *
 * A `buildHref: (id) => string` prop on a view a SERVER page renders is React
 * error #441: a function cannot be serialised into the flight payload, React
 * writes an error row at that prop position, and the browser dies
 * deserialising it at hydration — 200, complete HTML, dead page, uncatchable
 * by any `<Suspense fallback>`. It cost this app a week of downtime. A string
 * prefix carries the same information and serialises.
 *
 * @tag domain:events
 * @tag layer:component
 */

import { useCallback, useMemo, useState } from "react";
import { BaseListingCard } from "../../../ui/components/BaseListingCard";
import { Badge } from "../../../ui/components/Badge";
import { Div } from "../../../ui/components/Div";
import { EmptyState } from "../../../ui/components/EmptyState";
import { Grid, Row, Stack } from "../../../ui/components/Layout";
import { ImageLightbox, type LightboxImage } from "../../../ui/components/ImageLightbox";
import { Pagination } from "../../../ui/components/Pagination";
import { TextLink } from "../../../ui/components/TextLink";
import { Text } from "../../../ui/components/Typography";
import { normalizeError } from "../../../errors/normalize";
import { EVENT_ENDPOINTS } from "../../../constants/api-endpoints";
import { EntryMediaThumb } from "./EntryMediaThumb";
import { EntryVoteButtons } from "./EntryVoteButtons";
import { useEntryVoteCaster } from "../hooks/useEntryVote";
import { EntryInlineActions } from "./EntryInlineActions";
import { resolveEntryMediaLimits, type EventEntryMediaLimits } from "../schemas/firestore";
import type { PublicEventEntriesResponse, PublicEventEntryItem } from "../types";

/** Overridable copy — DEFAULT TEMPLATES, per "we ship the default templates". */
export interface EventEntriesListLabels {
  emptyTitle?: string;
  emptyDescription?: string;
  enterCta?: string;
  viewDetails?: string;
  entrantFallback?: string;
  truncatedNotice?: (shown: number, total: number) => string;
  countLabel?: (total: number) => string;
  signInToVote?: string;
}

const DEFAULT_LABELS: Required<
  Omit<EventEntriesListLabels, "truncatedNotice" | "countLabel">
> & {
  truncatedNotice: NonNullable<EventEntriesListLabels["truncatedNotice"]>;
  countLabel: NonNullable<EventEntriesListLabels["countLabel"]>;
} = {
  emptyTitle: "No entries yet",
  emptyDescription:
    "Nobody has entered yet — the first entry will appear here as soon as it is submitted.",
  enterCta: "Enter now",
  viewDetails: "View details",
  entrantFallback: "Participant",
  signInToVote: "Sign in to vote",
  truncatedNotice: (shown, total) =>
    `Showing the top ${shown} of ${total} entries.`,
  countLabel: (total) => `${total} ${total === 1 ? "entry" : "entries"}`,
};

export interface EventEntriesListViewProps {
  /** The id or slug this host's URLs use — both the API and links accept it. */
  eventId: string;
  /** Server-rendered first page. The component pages from here on its own. */
  initialData: PublicEventEntriesResponse;
  /**
   * Prefix for a single entry's page, e.g. `"/diwali-photo-contest/entries"`.
   * A STRING, never a builder function — see this file's header.
   */
  entryHrefPrefix?: string;
  /** Signed-in viewers get live buttons; everyone else gets counts + a prompt. */
  canVote: boolean;
  signInHref?: string;
  /** Offered on the empty state, when the event is still open. */
  participateHref?: string;
  /**
   * ── INLINE EDIT / DELETE ON THE CARD ──────────────────────────────────────
   *
   * Owner, 2026-11-10: *"allow users who have already added entries to see the
   * edit their entry option … the user can delete their entries as well … for
   * admin accounts show inline options to directly edit the entries or the
   * cards or delete the entries"*.
   *
   * Which cards get controls is decided per ROW by `entry.mine` and per
   * RESPONSE by `initialData.canModerate` — both server-resolved, and both
   * re-resolved by the PATCH/DELETE routes. This flag only says whether the
   * host wants the affordance at all (a read-only embed may not), and defaults
   * to `true` because an entrant who cannot manage their own entry is the
   * defect being fixed.
   */
  allowInlineEdit?: boolean;
  /**
   * This event's per-entry media caps, straight off its document — so the edit
   * form offers the same slots and enforces the same rules as the submit form.
   *
   * ⚠ Unset is NOT "no media". `resolveEntryMediaLimits` fills every missing
   * field from the PLATFORM default, which includes `requireImage: true`.
   */
  entryMedia?: EventEntryMediaLimits;
  /** Only used to derive the SEO filename the media host stamps on an upload. */
  eventTitle?: string;
  /** Media proxy endpoints on THIS host. Strings — a server page may pass them. */
  signEndpoint?: string;
  finalizeEndpoint?: string;
  labels?: EventEntriesListLabels;
  className?: string;
}

/** An entry's media as lightbox items. `badge` carries the entry's rank. */
function toLightboxImages(entry: PublicEventEntryItem): LightboxImage[] {
  return entry.media.map((item, index) => ({
    src: item.url,
    ...(item.alt ? { alt: item.alt } : {}),
    kind: item.type,
    badge: `#${entry.rank}`,
    ...(index === 0 && entry.note ? { caption: entry.note } : {}),
    ...(entry.userDisplayName ? { sub: entry.userDisplayName } : {}),
  }));
}

export function EventEntriesListView({
  eventId,
  initialData,
  entryHrefPrefix,
  canVote,
  signInHref,
  participateHref,
  allowInlineEdit = true,
  entryMedia,
  eventTitle,
  signEndpoint,
  finalizeEndpoint,
  labels,
  className = "",
}: EventEntriesListViewProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };
  const [data, setData] = useState(initialData);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Which entry's media the lightbox is showing, and at which item. */
  const [lightbox, setLightbox] = useState<{ entryId: string; index: number } | null>(
    null,
  );

  const castVote = useEntryVoteCaster(eventId);

  /*
   * Pagination refetches the same public route rather than pushing a URL.
   *
   * 🛑 Deliberately NOT `useSearchParams()`. In a prerendered client subtree
   * that hook bails the whole subtree to CSR, and with no real `<Suspense
   * fallback>` above it the HTML ships EMPTY — it has already produced three
   * blank-but-200 pages in this codebase, including auth's login form. A
   * gallery that paginates in place cannot hit it.
   */
  const goToPage = useCallback(
    (page: number) => {
      if (page === data.page || busy) return;
      setBusy(true);
      setLoadError(null);
      const url = `${EVENT_ENDPOINTS.ENTRIES(eventId)}?page=${page}&pageSize=${data.pageSize}`;
      void fetch(url, { credentials: "same-origin" })
        .then(async (response) => {
          const payload = (await response.json()) as {
            success?: boolean;
            error?: string;
            data?: PublicEventEntriesResponse;
          };
          if (!response.ok || payload.success === false || !payload.data) {
            throw new Error(payload.error ?? `Failed to load page ${page}`);
          }
          setData(payload.data);
          setLightbox(null);
        })
        .catch((err: unknown) => {
          void normalizeError(err);
          // Keep the page that IS on screen. Replacing a working gallery with
          // an error state loses the rows the visitor was already reading.
          setLoadError(err instanceof Error ? err.message : "Failed to load entries");
        })
        .finally(() => setBusy(false));
    },
    [busy, data.page, data.pageSize, eventId],
  );

  /*
   * ── AFTER AN INLINE EDIT: PATCH THE ROW IN PLACE ──────────────────────────
   *
   * 🛑 Not a refetch. The server has already accepted the change, and a refetch
   * would re-run the ranked read — on a contest ranked by likes, an unrelated
   * vote landing between the save and the refetch would REORDER the gallery
   * under the person who just pressed Save, which reads as the edit having
   * moved someone else's entry. Patching the one row shows exactly the change
   * that was made and nothing else.
   *
   * ⚠ `rank`, `likes` and `total` are deliberately untouched: nothing about an
   * edit changes them, and recomputing a rank here would be a second owner of
   * the ranking rule (see `entry-gallery.ts`).
   */
  const applyEntryPatch = useCallback(
    (entryId: string, patch: Pick<PublicEventEntryItem, "media" | "note">) => {
      setData((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === entryId
            ? { ...item, media: patch.media, ...(patch.note ? { note: patch.note } : { note: undefined }) }
            : item,
        ),
      }));
      setLightbox(null);
    },
    [],
  );

  /*
   * ── AFTER A DELETE: DROP THE ROW AND CORRECT THE TOTAL ────────────────────
   *
   * 🛑 `total` is decremented here too, and that is the point of the whole
   * stats fix: the number above the gallery and the rows inside it must agree.
   * The server has already decremented `event.stats` (floored at zero) in the
   * same request, so this is the client half of one change rather than an
   * optimistic guess.
   *
   * ⚠ The page is NOT re-paginated. Deleting the last row of page 3 leaves an
   * empty page 3 rather than silently jumping the viewer somewhere else; the
   * pager is still there and page 2 is one click away. Jumping would lose the
   * place of a moderator working through a gallery.
   */
  const dropEntry = useCallback((entryId: string) => {
    setData((current) => {
      const items = current.items.filter((item) => item.id !== entryId);
      const removed = items.length !== current.items.length;
      return {
        ...current,
        items,
        total: removed ? Math.max(0, current.total - 1) : current.total,
      };
    });
    setLightbox(null);
  }, []);

  const lightboxEntry = useMemo(
    () => data.items.find((item) => item.id === lightbox?.entryId),
    [data.items, lightbox?.entryId],
  );
  const lightboxImages = useMemo(
    () => (lightboxEntry ? toLightboxImages(lightboxEntry) : []),
    [lightboxEntry],
  );

  if (data.items.length === 0) {
    return (
      <Stack gap="md" className={className}>
        {data.ranking.publicWording ? (
          <Text size="sm" color="muted">
            {data.ranking.publicWording}
          </Text>
        ) : null}
        <EmptyState
          title={copy.emptyTitle}
          description={copy.emptyDescription}
          {...(participateHref
            ? { actionLabel: copy.enterCta, actionHref: participateHref }
            : {})}
        />
      </Stack>
    );
  }

  return (
    <Stack gap="md" className={className}>
      {/*
        🛑 THE RULE, PRINTED FROM THE SAME ROW THE SORT USED.
        `publicWording` comes off the resolved `entryRanking` rule set that
        produced the order above it, so the sentence and the sequence cannot
        disagree. Empty string = a rule this deploy does not implement, and
        then nothing is claimed.
      */}
      <Row align="center" justify="between" gap="sm" className="flex-wrap">
        {data.ranking.publicWording ? (
          <Text size="sm" weight="medium" color="muted">
            {data.ranking.publicWording}
          </Text>
        ) : (
          <span />
        )}
        {/*
          The `wrap` PROP, not the raw wrapping class — the surface-props audit
          flags the class form, and the pre-publish gate caught this exact line
          as the one violation this change introduced.

          ⚠ The literal class string is deliberately not written out above
          either: these audits are regexes over SOURCE, so they cannot tell a
          comment from an attribute. A comment quoting the banned token trips
          the check it was written to explain — the same shape as the brand
          leaks that keep shipping inside the comments describing them.

          The Row one level out still uses the class form; that is pre-existing
          and left attributable rather than swept in here.
        */}
        <Row align="center" gap="sm" wrap>
          <Text size="xs" color="faint">
            {copy.countLabel(data.total)}
          </Text>
          {/*
            ── 🛑 THE WAY IN, ON THE POPULATED GALLERY TOO ────────────────────
            Owner, 2026-11-12: *"normal registered guys don't get the submit
            entry"*.

            `participateHref` reached exactly ONE place: the `EmptyState` in
            the zero-entries branch above. Its own prop doc said so — *"offered
            on the empty state, when the event is still open"* — so the contest
            advertised a way to enter only while nobody had entered, and the
            FIRST submission removed the invitation for everyone after it.

            That left the "Participate" tab in the event tab strip as the only
            route to the form on the whole site. An admin never notices,
            because `EventAdminBar` gives them a visible control block on the
            same page and they already know the URL; a participant arriving on
            a shared gallery link sees other people's entries and nothing to
            press. The CTA is the single most important control on this
            surface and it was conditional on the surface being empty.

            🛑 Still gated on `participateHref` being PASSED, which the host
            does only while `eventIsActive(event)` — so a finished contest
            keeps its gallery (the result) and loses the invitation, which is
            the correct asymmetry and is unchanged.

            ⚠ NOT gated on whether this viewer has entries left. That needs
            the session, and this view is rendered inside a CDN-cached page.
            The participate page itself resolves the count server-side and
            answers "you have reached the maximum of N" with the state of the
            entries already filed — so a returning entrant lands on the
            surface built for them rather than on a dead end.
          */}
          {participateHref ? (
            <TextLink
              variant="bare"
              href={participateHref}
              rounded="xl"
              size="sm"
              weight="semibold"
              paddingX="xl"
              paddingY="sm"
              className="inline-block bg-primary text-white hover:bg-primary-600"
            >
              {copy.enterCta}
            </TextLink>
          ) : null}
        </Row>
      </Row>

      {/*
        The window bound, stated. A ranked gallery built from a silently
        truncated set balances while being wrong — the same reasoning the audit
        seam uses for a truncated `refunds[]`.
      */}
      {data.truncated ? (
        <Text size="xs" color="faint">
          {copy.truncatedNotice(data.items.length, data.total)}
        </Text>
      ) : null}

      {loadError ? (
        <Text size="sm" color="error">
          {loadError}
        </Text>
      ) : null}

      <Grid cols="cards" gap="md">
        {data.items.map((entry) => {
          const entrant = entry.userDisplayName ?? copy.entrantFallback;
          /*
           * 🛑 `encodeURIComponent` on the id, and it is not defensive
           * decoration.
           *
           * An entry id is `<eventId>:<userId>:<slot>` — the per-participant
           * SLOT id the submission path uses to make "one entry per person"
           * true by construction. A raw `:` in a path segment is not a valid
           * URL character there, and the deployment's own locale rewrite
           * percent-encodes it on the way in anyway. Encoding here and
           * decoding in the page is the explicit pair; relying on whatever the
           * rewrite happens to do is how the detail page 404'd with a correct
           * `<title>` above it.
           */
          const detailHref = entryHrefPrefix
            ? `${entryHrefPrefix}/${encodeURIComponent(entry.id)}`
            : undefined;
          return (
            <BaseListingCard key={entry.id}>
              <BaseListingCard.Hero aspect="square">
                {/*
                  A button, not a div with onClick — the hero opens a modal
                  lightbox, so it has to be reachable and operable from a
                  keyboard. The listing's navigational link is separate, below.
                */}
                <button
                  type="button"
                  onClick={() => setLightbox({ entryId: entry.id, index: 0 })}
                  aria-label={`Open ${entrant}'s entry`}
                  className="absolute inset-0 h-full w-full cursor-zoom-in p-0"
                >
                  {/*
                    ── 🛑 THE COVER IS CONTAINED, NOT CROPPED ────────────────
                    Owner, 2026-11-12: *"first pic is cover so contain it not
                    span it entirely"*.

                    `EntryMediaThumb` has had a `fit` prop since the entry
                    detail page needed one, and NOTHING EVER PASSED IT — a
                    grep for `fit=` across both call sites returned zero — so
                    every card took its `"cover"` default and filled the square
                    frame by cropping. The event document already carries the
                    answer (`entryMedia.fit`, platform default `"contain"`) and
                    `EventEntryDetailView` already reads it through
                    `resolveEntryMediaLimits`. So the gallery card and the
                    entry page were rendering the same photo under two
                    different rules, and the card was the one most visitors
                    see.

                    🛑 Resolved through the SAME function as the detail view,
                    not a literal. A cropped entry destroys the thing being
                    judged — it is what cut "Diwali" off a Diwali poster — and
                    whether this event's media is contained is a per-event
                    choice, not a component's.

                    ⚠ FLAGGED, not fixed here: `entryMedia.aspect` is still
                    not honoured on the CARD. `BaseListingCard.Hero` accepts
                    only `"square" | "4/3"` — deliberately, because Tailwind's
                    static scanner cannot see an interpolated `aspect-[…]` —
                    so an event configuring `portrait` or `wide` gets a square
                    frame here and its real frame on the entry page. With
                    `fit="contain"` that letterboxes rather than crops, which
                    is the recoverable direction; widening Hero's union needs
                    static classes and is its own change.
                  */}
                  <EntryMediaThumb
                    item={entry.media[0]}
                    fallbackAlt={`Entry by ${entrant}`}
                    fit={resolveEntryMediaLimits(entryMedia).fit}
                  />
                </button>
                <Div className="pointer-events-none absolute left-2 top-2">
                  <Badge variant="default">#{entry.rank}</Badge>
                </Div>
                {entry.media.length > 1 ? (
                  <Div className="pointer-events-none absolute right-2 top-2">
                    <Badge variant="default">{entry.media.length}</Badge>
                  </Div>
                ) : null}
              </BaseListingCard.Hero>

              <BaseListingCard.Info>
                <Text size="sm" weight="semibold" truncate>
                  {entrant}
                </Text>
                {/*
                  ── 🛑 THE NOTE. Owner, 2026-11-10: *"where is the 100 words
                  text?"* ────────────────────────────────────────────────────
                  This branch has been here since the gallery shipped and had
                  never once been reached, because NOTHING COULD PRODUCE A
                  NOTE: `note` was accepted by the POST schema, stored by
                  `enterEvent` and projected by `entry-gallery`, and the
                  participate form had no field for it at all. The missing text
                  was a missing INPUT, three layers away from the component
                  that was blamed for not rendering it.

                  `truncate={3}` rather than 2: 100 words is a paragraph, and
                  the card is the surface most visitors read. The full text is
                  on the entry's own page and in the lightbox caption.
                */}
                {entry.note ? (
                  <Text size="xs" color="muted" truncate={3}>
                    {entry.note}
                  </Text>
                ) : null}

                <Row align="center" justify="between" gap="sm" className="mt-auto pt-2">
                  {/*
                    🛑 `votingEnabled` gates the CONTROL, `allowsDislike` gates
                    the dislike half, and `canVote` gates whether it is live.
                    Three separate config answers, not one boolean — a
                    submission event with voting off still shows its gallery.
                  */}
                  {data.votingEnabled ? (
                    <EntryVoteButtons
                      likes={entry.likes}
                      dislikes={entry.dislikes}
                      myVote={entry.myVote}
                      allowsDislike={data.ranking.allowsDislike}
                      canVote={canVote}
                      {...(signInHref ? { signInHref } : {})}
                      onVote={(value) => castVote(entry.id, value)}
                    />
                  ) : (
                    <Text size="xs" color="faint">
                      {entry.likes} {entry.likes === 1 ? "like" : "likes"}
                    </Text>
                  )}
                  {detailHref ? (
                    <TextLink href={detailHref} size="xs" weight="semibold">
                      {copy.viewDetails}
                    </TextLink>
                  ) : null}
                </Row>

                {/*
                  ── 🛑 INLINE, ON THE CARD ──────────────────────────────────
                  Rendered for the entry's OWNER (`entry.mine`) and for a
                  moderator (`data.canModerate`, which resolves
                  `admin:event-entries:write` through the permission registry —
                  never a role string). Both are server-resolved HINTS: the
                  PATCH and DELETE routes re-resolve the same two gates against
                  the stored document, because a hidden button is not a
                  permission.

                  A signed-out visitor gets `mine: false` on every row and
                  `canModerate: false`, so neither control exists for them —
                  absent, not disabled.
                */}
                {allowInlineEdit && (entry.mine || data.canModerate) ? (
                  <Div className="pt-2">
                    <EntryInlineActions
                      eventId={eventId}
                      entry={entry}
                      canModerate={data.canModerate}
                      {...(entryMedia ? { entryMedia } : {})}
                      eventTitle={eventTitle ?? ""}
                      {...(signEndpoint ? { signEndpoint } : {})}
                      {...(finalizeEndpoint ? { finalizeEndpoint } : {})}
                      onSaved={(patch) => applyEntryPatch(entry.id, patch)}
                      onDeleted={() => dropEntry(entry.id)}
                    />
                  </Div>
                ) : null}
              </BaseListingCard.Info>
            </BaseListingCard>
          );
        })}
      </Grid>

      {data.totalPages > 1 ? (
        <Pagination
          currentPage={data.page}
          totalPages={data.totalPages}
          onPageChange={goToPage}
          disabled={busy}
        />
      ) : null}

      <ImageLightbox
        images={lightboxImages}
        activeIndex={lightbox ? lightbox.index : null}
        onClose={() => setLightbox(null)}
        showThumbnails={lightboxImages.length > 1}
      />
    </Stack>
  );
}
