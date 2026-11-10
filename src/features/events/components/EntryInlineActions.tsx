"use client";

/**
 * INLINE edit + delete, ON the entry card itself.
 *
 * Owner, 2026-11-10:
 *   *"allow users who have already added entries to see the edit their entry
 *   option"* · *"the user can delete their entries as well"* · *"for admin
 *   accounts show inline options to directly edit the entries or the cards or
 *   delete the entries"*.
 *
 * ## 🛑 INLINE, not a separate admin screen
 *
 * There IS an admin entries screen (`AdminEventEntriesView`), and it is the
 * moderation queue — review status, points, export. This is the other thing the
 * owner asked for: the controls live where the thing is, so an entrant managing
 * their own photo and a moderator removing spam both act on the card in front
 * of them rather than navigating to a table and finding the row again.
 *
 * ## 🛑 WHO SEES IT, AND WHY THAT IS NOT THE GATE
 *
 * Rendered when the row says `mine` (the viewer's own entry) or the response
 * says `canModerate` (the viewer holds `admin:event-entries:write`, resolved
 * through the PERMISSION REGISTRY — never a `role === "admin"` comparison).
 *
 * Both are SERVER-resolved hints for rendering. `PATCH`/`DELETE
 * /api/events/:id/entries/:entryId` re-resolve the same two gates against the
 * stored document on every request, because a hidden button is not a
 * permission — the endpoint is reachable with curl regardless of what this
 * component chooses to draw.
 *
 * ## 🛑 NO FUNCTION PROPS COME IN FROM A SERVER PAGE
 *
 * Everything configurable here is a STRING or a boolean: the two media
 * endpoints, the event id, the entry id. The callbacks (`onSaved`, `onDeleted`)
 * are passed by `EventEntriesListView`, which is itself a `"use client"`
 * component — a function arriving from a SERVER page is React error #441, a
 * 200 with complete HTML and a browser that dies at hydration.
 *
 * @tag domain:events
 * @tag layer:component
 */

import { useCallback, useEffect, useState } from "react";
import { Button } from "../../../ui/components/Button";
import { ConfirmDeleteModal } from "../../../ui/components/ConfirmDeleteModal";
import { Modal } from "../../../ui/components/Modal";
import { Row, Stack } from "../../../ui/components/Layout";
import { Textarea } from "../../../ui/components/Textarea";
import { Label, Text } from "../../../ui/components/Typography";
import { normalizeError } from "../../../errors/normalize";
import { EVENT_ENDPOINTS } from "../../../constants/api-endpoints";
import type { MediaField } from "../../media/types/index";
import { EntryMediaUploadField } from "./EntryMediaUploadField";
import {
  checkEntryMedia,
  checkEntryNote,
  countNoteWords,
  ENTRY_NOTE_MAX_WORDS,
  type EventEntryMediaLimits,
} from "../schemas/firestore";
import type { PublicEntryMedia } from "../types";

/**
 * The SUBSET of an entry these controls actually touch.
 *
 * 🛑 Structurally narrower than `PublicEventEntryItem` on purpose. A
 * `PublicEventEntryItem` satisfies it, so the gallery card passes its row
 * unchanged — but the PARTICIPATE page's own "your entries" panel does NOT
 * have a `rank`, `likes` or `myVote` to supply (its rows come from a private
 * per-user read, not from the ranked public window), and inventing them to
 * satisfy a type would be fiction in the one place it matters: a rank of 0
 * rendered as "#0".
 *
 * ⚠ `mine` is still required. These controls say different things on your own
 * entry than on a stranger's, and defaulting it would pick the wrong one
 * silently.
 */
export interface EntryInlineActionsEntry {
  id: string;
  note?: string | undefined;
  media: PublicEntryMedia[];
  mine: boolean;
}

/** Overridable copy — DEFAULT TEMPLATES, per "we ship the default templates". */
export interface EntryInlineActionsLabels {
  edit?: string;
  delete?: string;
  save?: string;
  cancel?: string;
  editTitle?: string;
  noteLabel?: string;
  notePlaceholder?: string;
  deleteTitle?: string;
  deleteMessage?: string;
  moderatorBadge?: string;
}

const DEFAULT_LABELS: Required<EntryInlineActionsLabels> = {
  edit: "Edit",
  delete: "Delete",
  save: "Save changes",
  cancel: "Cancel",
  editTitle: "Edit entry",
  noteLabel: "Your note",
  notePlaceholder: "Tell us about your entry…",
  deleteTitle: "Delete this entry?",
  deleteMessage:
    "The entry and its votes are removed for good. This cannot be undone.",
  moderatorBadge: "Moderating",
};

export interface EntryInlineActionsProps {
  /** The id or slug this host's URLs use — the API accepts either. */
  eventId: string;
  entry: EntryInlineActionsEntry;
  /** The viewer holds `admin:event-entries:write`. Server-resolved. */
  canModerate: boolean;
  /**
   * This event's per-entry media caps, straight off its document. Unset means
   * the PLATFORM defaults apply — which include `requireImage: true`, so an
   * edit that removes the last photo is refused by the same rule the submit
   * path enforces.
   */
  entryMedia?: EventEntryMediaLimits;
  /** Only used to derive the SEO filename the media host stamps on an upload. */
  eventTitle: string;
  /** Media proxy endpoints on THIS host. STRINGS, so a server page may pass them. */
  signEndpoint?: string;
  finalizeEndpoint?: string;
  /** Called with the saved entry's new media/note so the list can update in place. */
  onSaved?: (patch: { media: PublicEntryMedia[]; note: string }) => void;
  /** Called after a successful delete so the list can drop the row. */
  onDeleted?: () => void;
  labels?: EntryInlineActionsLabels;
}

/** `PublicEntryMedia` (what the gallery serves) → `MediaField` (what the uploader edits). */
function toMediaFields(media: readonly PublicEntryMedia[]): MediaField[] {
  return media.map((item) => ({
    url: item.url,
    type: item.type,
    ...(item.alt ? { alt: item.alt } : {}),
  }));
}

/** The reverse, narrowed to the three fields the API schema accepts. */
function toPublicMedia(media: readonly MediaField[]): PublicEntryMedia[] {
  return media.map((item) => ({
    url: item.url,
    type: item.type === "video" ? ("video" as const) : ("image" as const),
    ...(item.alt ? { alt: item.alt } : {}),
  }));
}

export function EntryInlineActions({
  eventId,
  entry,
  canModerate,
  entryMedia,
  eventTitle,
  signEndpoint,
  finalizeEndpoint,
  onSaved,
  onDeleted,
  labels,
}: EntryInlineActionsProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };

  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(entry.note ?? "");
  const [media, setMedia] = useState<MediaField[]>(() => toMediaFields(entry.media));

  /*
   * Re-seed from the row whenever the dialog OPENS, not on every prop change.
   *
   * 🛑 The difference matters: the list refetches on pagination and after a
   * vote, so a `[entry]` dependency would discard whatever the editor had
   * typed the moment someone else's vote arrived. Seeding on open is also what
   * makes "Cancel" mean cancel — the next open starts from the stored values
   * again rather than from the abandoned draft.
   */
  useEffect(() => {
    if (!editing) return;
    setNote(entry.note ?? "");
    setMedia(toMediaFields(entry.media));
    setError(null);
  }, [editing, entry.note, entry.media]);

  const words = countNoteWords(note);

  const save = useCallback(async () => {
    /*
     * 🛑 The SAME rules the server will apply, applied here first — and from
     * the SAME functions. `checkEntryMedia` and `checkEntryNote` are appkit's
     * server validators; calling them rather than re-expressing them is what
     * makes the message the editor shows and the message the PATCH returns
     * identical by construction.
     *
     * It is NOT the enforcement. `updateEventEntry` re-checks against the event
     * document on every request, because a form that disables a button is a
     * courtesy and the endpoint is still reachable.
     */
    const mediaProblem = checkEntryMedia(toPublicMedia(media), entryMedia);
    if (mediaProblem) {
      setError(mediaProblem);
      return;
    }
    const noteProblem = checkEntryNote(note);
    if (noteProblem) {
      setError(noteProblem);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(EVENT_ENDPOINTS.ENTRY(eventId, entry.id), {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        /*
         * Both fields, always. The API treats an omitted field as "leave it"
         * and `""` as "clear it" — so sending only what changed would make
         * clearing a note unexpressible, and sending `undefined` would be
         * dropped by `JSON.stringify` into the same ambiguity.
         */
        body: JSON.stringify({ media: toPublicMedia(media), note }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        message?: string;
      };
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error ?? "Could not save the entry");
      }
      onSaved?.({ media: toPublicMedia(media), note });
      setEditing(false);
    } catch (err) {
      void normalizeError(err);
      setError(err instanceof Error ? err.message : "Could not save the entry");
    } finally {
      setBusy(false);
    }
  }, [eventId, entry.id, media, note, entryMedia, onSaved]);

  const remove = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(EVENT_ENDPOINTS.ENTRY(eventId, entry.id), {
        method: "DELETE",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error ?? "Could not remove the entry");
      }
      setConfirming(false);
      onDeleted?.();
    } catch (err) {
      void normalizeError(err);
      setError(err instanceof Error ? err.message : "Could not remove the entry");
      /*
       * The confirm dialog stays OPEN on failure, with the reason in it. Closing
       * it would leave the row on screen with no explanation, which reads as the
       * delete having silently done nothing.
       */
    } finally {
      setBusy(false);
    }
  }, [eventId, entry.id, onDeleted]);

  return (
    <>
      <Row gap="xs" align="center" className="flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditing(true)}
          disabled={busy}
        >
          {copy.edit}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setConfirming(true)}
          disabled={busy}
        >
          {copy.delete}
        </Button>
        {/*
          Said out loud when the viewer is acting on SOMEONE ELSE's entry. A
          moderator holding `admin:event-entries:write` sees these controls on
          every card, and a control that looks identical on your own entry and
          on a stranger's is how an accidental removal happens.
        */}
        {!entry.mine && canModerate ? (
          <Text size="xs" color="faint">
            {copy.moderatorBadge}
          </Text>
        ) : null}
      </Row>

      {/*
        ⚠ Rendered OUTSIDE the row, and only while open. `Modal` portals itself,
        but mounting the uploader behind a closed dialog would run
        `useMediaUpload` once per card on a 24-card gallery.
      */}
      {editing ? (
        <Modal
          isOpen
          onClose={() => (busy ? undefined : setEditing(false))}
          title={copy.editTitle}
          size="lg"
          actions={
            <Row gap="sm" justify="end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={busy}
              >
                {copy.cancel}
              </Button>
              <Button type="button" variant="primary" onClick={save} disabled={busy}>
                {busy ? "Saving…" : copy.save}
              </Button>
            </Row>
          }
        >
          <Stack gap="md">
            <EntryMediaUploadField
              limits={entryMedia}
              eventTitle={eventTitle}
              value={media}
              onChange={setMedia}
              disabled={busy}
              {...(signEndpoint ? { signEndpoint } : {})}
              {...(finalizeEndpoint ? { finalizeEndpoint } : {})}
            />

            <Stack gap="xs">
              <Label className="block" size="sm" weight="medium">
                {copy.noteLabel}
              </Label>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={copy.notePlaceholder}
                rows={4}
                disabled={busy}
              />
              {/*
                🛑 The count is SHOWN, from the same constant the server
                enforces. The cap used to live only inside a `.refine()` in the
                POST route's zod schema, so no form could display the limit it
                was being judged by — and an over-long note arrived as a failed
                round trip rather than as a rule.
              */}
              <Text size="xs" color={words > ENTRY_NOTE_MAX_WORDS ? "error" : "faint"}>
                {words} / {ENTRY_NOTE_MAX_WORDS} words
              </Text>
            </Stack>

            {error ? (
              <Text size="sm" color="error">
                {error}
              </Text>
            ) : null}
          </Stack>
        </Modal>
      ) : null}

      {confirming ? (
        <ConfirmDeleteModal
          isOpen
          onClose={() => (busy ? undefined : setConfirming(false))}
          onConfirm={() => void remove()}
          title={copy.deleteTitle}
          message={error ?? copy.deleteMessage}
          isDeleting={busy}
          variant="danger"
        />
      ) : null}
    </>
  );
}
