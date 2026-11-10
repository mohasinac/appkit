"use client";

/**
 * INLINE event editing, for an admin or moderator standing on the event.
 *
 * Owner, 2026-11-10: *"same for the events — the admin or the moderators can
 * immediately edit the events or its configs"*.
 *
 * ## 🛑 WHAT THIS IS, AND WHAT IT IS NOT
 *
 * It is NOT a replacement for `AdminEventEditorView`, the full authoring
 * surface with the type-specific config forms, the media sets and the coupon
 * attachments. That exists and is the right place to build an event.
 *
 * This is the *"immediately"* half: the handful of fields whose wrongness is
 * visible from the public page itself, editable from the public page itself —
 * the title, whether it is running, and the three ENTRY rules an entrant is
 * being judged by (`entryLimit`, `entryApproval`, `entryMedia`). Every one of
 * those is config the owner has already decided belongs to the event instance,
 * and every one of them was previously only reachable by editing Firestore by
 * hand or by navigating to the admin tree and finding the row again.
 *
 * A link to the full editor sits beside it, so "more than this" is one click
 * rather than a dead end.
 *
 * ## 🛑 THE GATE IS SERVER-SIDE, AND IT IS NOT THIS COMPONENT
 *
 * `canEdit` is a server-resolved hint — `admin:events:write` through the
 * PERMISSION REGISTRY, never a `role === "admin"` comparison. The write goes
 * to `PATCH /api/admin/events/:id`, which is gated on the admin/moderator role
 * set independently. Rendering nothing here hides a control; it does not
 * protect the endpoint, and the endpoint is what protects the data.
 *
 * ## 🛑 ONLY WHAT WAS TOUCHED IS SENT
 *
 * The admin event PATCH is `.passthrough()` — by deliberate design, because an
 * event carries open-ended type-specific config this schema cannot enumerate.
 * The consequence is that anything sent is WRITTEN, so sending a whole form
 * state would write defaults over config this form does not know about. That
 * is exactly how `giveawayConfig` came to be carved out of that route with a
 * `z.never()` after it destroyed booked slots. So the body here is built from
 * the fields that actually CHANGED, and nothing else.
 *
 * @tag domain:events
 * @tag layer:component
 */

import { useCallback, useEffect, useState } from "react";
import { Button } from "../../../ui/components/Button";
import { Checkbox } from "../../../ui/components/Checkbox";
import { Input } from "../../../ui/components/Input";
import { Modal } from "../../../ui/components/Modal";
import { Row, Stack } from "../../../ui/components/Layout";
import { Select } from "../../../ui/components/Select";
import { TextLink } from "../../../ui/components/TextLink";
import { Text } from "../../../ui/components/Typography";
import { normalizeError } from "../../../errors/normalize";
import { EventEntryLimitField } from "./EventEntryLimitField";
import {
  resolveEntryLimit,
  resolveEntryMediaLimits,
  type EventEntryMediaLimits,
} from "../schemas/firestore";

export interface EventInlineAdminActionsLabels {
  edit?: string;
  editTitle?: string;
  save?: string;
  cancel?: string;
  fullEditor?: string;
  titleLabel?: string;
  statusLabel?: string;
  approvalLabel?: string;
}

const DEFAULT_LABELS: Required<EventInlineAdminActionsLabels> = {
  edit: "Edit event",
  editTitle: "Edit event",
  save: "Save changes",
  cancel: "Cancel",
  fullEditor: "Open the full editor",
  titleLabel: "Title",
  statusLabel: "Status",
  approvalLabel: "Entry approval",
};

/**
 * The fields this inline form owns.
 *
 * 🛑 `status` is an OPEN string, not a `z.enum`. CLAUDE.md: *a closed `z.enum`
 * is a defect, not a safeguard* — the types we ship are default templates, not
 * the permitted set. The options offered below are the four shipped statuses;
 * a deployment that adds a fifth sets it through the full editor and this form
 * will DISPLAY it rather than refusing to load.
 */
export interface EventInlineEditableFields {
  title: string;
  status: string;
  entryLimit?: number;
  entryApproval?: "auto" | "moderated";
  entryMedia?: EventEntryMediaLimits;
}

export interface EventInlineAdminActionsProps {
  /** The event's document id — the ADMIN route keys on the id, never a slug. */
  eventId: string;
  initial: EventInlineEditableFields;
  /**
   * Does the viewer hold `admin:events:write`? Server-resolved. `false`
   * renders nothing — absent, not disabled, which is what makes a public page
   * identical for a signed-out visitor.
   */
  canEdit: boolean;
  /** Does this event have an entries concept at all? Gates the entry rules. */
  hasEntries?: boolean;
  /** Link to the full authoring surface. A STRING — never a builder function. */
  fullEditorHref?: string;
  /** Called after a successful save, so the host can refresh the surface. */
  onSaved?: (next: EventInlineEditableFields) => void;
  labels?: EventInlineAdminActionsLabels;
  className?: string;
}

/** The four shipped statuses. Default TEMPLATES — see `EventInlineEditableFields`. */
const STATUS_OPTIONS = [
  { value: "draft", label: "Draft — not public" },
  { value: "active", label: "Active — running now" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const APPROVAL_OPTIONS = [
  { value: "auto", label: "Publish immediately" },
  { value: "moderated", label: "Hold for a moderator" },
];

/** A positive integer from a form field, or `undefined` to leave it alone. */
function readCount(raw: string): number | undefined {
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function EventInlineAdminActions({
  eventId,
  initial,
  canEdit,
  hasEntries = true,
  fullEditorHref,
  onSaved,
  labels,
  className = "",
}: EventInlineAdminActionsProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EventInlineEditableFields>(initial);

  /*
   * Seeded on OPEN, not on every prop change — so a revalidation of the page
   * behind the dialog cannot discard what the admin is typing. Same reasoning
   * as `EntryInlineActions`.
   */
  useEffect(() => {
    if (!open) return;
    setForm(initial);
    setError(null);
  }, [open, initial]);

  const media = resolveEntryMediaLimits(form.entryMedia);

  const save = useCallback(async () => {
    if (!form.title.trim()) {
      setError("A title is required");
      return;
    }

    /*
     * 🛑 Only CHANGED fields. The admin PATCH is `.passthrough()`, so anything
     * present in the body is written — see this file's header for the
     * `giveawayConfig` incident that rule exists because of.
     */
    const body: Record<string, unknown> = {};
    if (form.title !== initial.title) body["title"] = form.title.trim();
    if (form.status !== initial.status) body["status"] = form.status;
    if (resolveEntryLimit(form.entryLimit) !== resolveEntryLimit(initial.entryLimit)) {
      body["entryLimit"] = resolveEntryLimit(form.entryLimit);
    }
    if (form.entryApproval !== initial.entryApproval) {
      body["entryApproval"] = form.entryApproval;
    }
    /*
     * `entryMedia` is sent WHOLE when any of its four fields moved, because it
     * is one stored map and a partial write would leave the other three as
     * whatever `prepareForFirestore` makes of `undefined`. Resolved first, so
     * the document ends up holding the numbers the server would have applied
     * anyway rather than a half-specified map.
     */
    const nextMedia = resolveEntryMediaLimits(form.entryMedia);
    const priorMedia = resolveEntryMediaLimits(initial.entryMedia);
    if (
      nextMedia.maxImages !== priorMedia.maxImages ||
      nextMedia.maxVideos !== priorMedia.maxVideos ||
      nextMedia.maxTotal !== priorMedia.maxTotal ||
      nextMedia.requireImage !== priorMedia.requireImage
    ) {
      body["entryMedia"] = nextMedia;
    }

    if (Object.keys(body).length === 0) {
      setOpen(false);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      /*
       * 🛑 The ADMIN route, and it keys on the document ID. A public event URL
       * links by SLUG, so passing whatever is in the address bar would address
       * a document that does not exist — the host passes `eventId` explicitly
       * for this reason.
       */
      const response = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error ?? "Could not save the event");
      }
      onSaved?.({ ...form, entryMedia: nextMedia });
      setOpen(false);
    } catch (err) {
      void normalizeError(err);
      setError(err instanceof Error ? err.message : "Could not save the event");
    } finally {
      setBusy(false);
    }
  }, [eventId, form, initial, onSaved]);

  if (!canEdit) return null;

  return (
    <>
      <Row gap="sm" align="center" className={`flex-wrap ${className}`}>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          {copy.edit}
        </Button>
        {fullEditorHref ? (
          <TextLink href={fullEditorHref} size="xs">
            {copy.fullEditor}
          </TextLink>
        ) : null}
      </Row>

      {open ? (
        <Modal
          isOpen
          onClose={() => (busy ? undefined : setOpen(false))}
          title={copy.editTitle}
          size="lg"
          actions={
            <Row gap="sm" justify="end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
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
            <Input
              label={copy.titleLabel}
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              disabled={busy}
            />

            <Select
              label={copy.statusLabel}
              options={
                /*
                 * A stored status this build does not ship is OFFERED rather
                 * than silently replaced — unknown values degrade, never
                 * throw, and a form that quietly rewrote an unrecognised
                 * status to "draft" would take an event off the site.
                 */
                STATUS_OPTIONS.some((o) => o.value === form.status)
                  ? STATUS_OPTIONS
                  : [...STATUS_OPTIONS, { value: form.status, label: form.status }]
              }
              value={form.status}
              onValueChange={(next) => setForm((prev) => ({ ...prev, status: next }))}
              disabled={busy}
            />

            {hasEntries ? (
              <>
                <EventEntryLimitField
                  value={form.entryLimit}
                  onChange={(next) => setForm((prev) => ({ ...prev, entryLimit: next }))}
                  disabled={busy}
                />

                <Select
                  label={copy.approvalLabel}
                  options={APPROVAL_OPTIONS}
                  value={form.entryApproval ?? "moderated"}
                  onValueChange={(next) =>
                    setForm((prev) => ({
                      ...prev,
                      entryApproval: next === "auto" ? "auto" : "moderated",
                    }))
                  }
                  disabled={busy}
                  helperText="Moderated entries stay out of the public gallery until a moderator approves them."
                />

                <Row gap="sm" className="flex-wrap">
                  <Input
                    label="Max photos"
                    type="number"
                    min={0}
                    value={String(media.maxImages)}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        entryMedia: {
                          ...resolveEntryMediaLimits(prev.entryMedia),
                          maxImages: readCount(event.target.value) ?? media.maxImages,
                        },
                      }))
                    }
                    disabled={busy}
                  />
                  <Input
                    label="Max videos"
                    type="number"
                    min={0}
                    value={String(media.maxVideos)}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        entryMedia: {
                          ...resolveEntryMediaLimits(prev.entryMedia),
                          maxVideos: readCount(event.target.value) ?? media.maxVideos,
                        },
                      }))
                    }
                    disabled={busy}
                  />
                  <Input
                    label="Max items in total"
                    type="number"
                    min={1}
                    value={String(media.maxTotal)}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        entryMedia: {
                          ...resolveEntryMediaLimits(prev.entryMedia),
                          maxTotal: readCount(event.target.value) ?? media.maxTotal,
                        },
                      }))
                    }
                    disabled={busy}
                  />
                </Row>
                {/*
                  🛑 `maxTotal` is NOT `maxImages + maxVideos` and the schema
                  says so at the line — an event may allow 5 photos and 2
                  videos but cap the entry at 5 items. Said here because the
                  three boxes sitting side by side invite the assumption.
                */}
                <Checkbox
                  label="Require at least one photo"
                  checked={media.requireImage}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      entryMedia: {
                        ...resolveEntryMediaLimits(prev.entryMedia),
                        requireImage: event.target.checked,
                      },
                    }))
                  }
                  disabled={busy}
                />
                <Text size="xs" color="faint">
                  “Max items in total” is a separate cap, not the sum of the two
                  above — an event may allow more of each type than one entry
                  may carry.
                </Text>
              </>
            ) : null}

            {error ? (
              <Text size="sm" color="error">
                {error}
              </Text>
            ) : null}
          </Stack>
        </Modal>
      ) : null}
    </>
  );
}
