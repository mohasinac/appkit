"use client";

/**
 * The entry's photos and video — driven ENTIRELY by the event's `entryMedia`.
 *
 * ## 🛑 WHY THIS MOVED INTO APPKIT (2026-11-10)
 *
 * It was `appkit/events/src/app/[locale]/[id]/participate/EntryMediaField.tsx`,
 * i.e. inside the consuming app, which was correct while the only surface that
 * uploaded entry media was that one page. The owner then asked for INLINE EDIT
 * on the entry card — *"for admin accounts show inline options to directly
 * edit the entries or the cards or delete the entries"* — and the card is
 * rendered by appkit's `EventEntriesListView`.
 *
 * Reaching the app's component from appkit is impossible, and reaching appkit's
 * card from the app would mean passing a `renderMediaField` FUNCTION from a
 * server page into a client view: React error #441, 200 with complete HTML and
 * a browser that dies at hydration, uncatchable by any `<Suspense fallback>`.
 * That cost this app a week of production downtime.
 *
 * So the field lives here and the two endpoints it needs are STRINGS
 * (`signEndpoint` / `finalizeEndpoint`), which serialise. The consuming app's
 * `EntryMediaField` is now a one-line delegation — ONE owner, not two
 * divergent copies.
 *
 * ## 🛑 NOTHING here is hardcoded to 3 / 1 / 4
 *
 * Every number comes off the event document through `resolveEntryMediaLimits`,
 * which fills unset fields from the platform default. A contest with
 * `{ maxImages: 10, maxVideos: 0 }` gets a different form, different helper
 * text and different client-side validation with no code change.
 *
 * That includes the HELPER TEXT, which is GENERATED from the limits. A literal
 * "Up to 3 photos and 1 video" would be a second owner of the rule and would
 * go stale the first time an admin edits the event — silently, because prose
 * does not fail a typecheck.
 *
 * ## 🛑 Uploads go through the MEDIA subdomain, never to storage directly
 *
 * Owner, 2026-11-10: *"any image uploaded in any of the subdomains, they have
 * to call the media subdomain for the saving and processing, as well as the
 * retrievals."* The defaults point at the HOST's OWN `/api/media/sign` and
 * `/api/media/finalize`, which are thin server-side proxies to the media
 * deployment — so the browser stays same-origin (no CORS to negotiate) and the
 * bytes still go straight from the browser to storage via the signed PUT,
 * bypassing the deployment's function body cap.
 *
 * @tag domain:events
 * @tag layer:component
 */

import { useCallback, useMemo } from "react";
import { useImageCropGate } from "../../media/upload/useImageCropGate";
import { MediaUploadList } from "../../media/upload/MediaUploadList";
import { useMediaUpload } from "../../media/hooks/useMedia";
import type { MediaField } from "../../media/types/index";
/*
 * 🛑 `_internal/shared/media/limits` — the DEFINING module, which is what the
 * published `./media/limits` subpath maps to. The events app imports the
 * subpath because it is an external consumer; from inside appkit that would be
 * a self-reference. Importing defining modules rather than barrels is the same
 * rule Root Cause #18 records.
 */
import {
  EVENT_ENTRY_MEDIA_INDEX_MAX,
  IMAGE_ACCEPT_ATTR,
  VIDEO_ACCEPT_ATTR,
  MIME_TO_EXT,
  classifyMime,
} from "../../../_internal/shared/media/limits";
import {
  resolveEntryMediaLimits,
  type EventEntryMediaLimits,
} from "../schemas/firestore";

/** Default proxy endpoints every host of this field is expected to expose. */
const DEFAULT_SIGN_ENDPOINT = "/api/media/sign";
const DEFAULT_FINALIZE_ENDPOINT = "/api/media/finalize";

/**
 * The rules, as a sentence, GENERATED from the limits.
 *
 * Exported because the submit path validates against the same numbers and
 * shows the same wording — one owner for "what are the rules here", so the
 * message a participant reads before uploading and the message they get if
 * they submit anyway cannot drift.
 */
export function describeEntryMediaRules(
  limits: EventEntryMediaLimits | undefined,
): string {
  const l = resolveEntryMediaLimits(limits);
  const parts: string[] = [];
  parts.push(`Up to ${l.maxImages} photo${l.maxImages === 1 ? "" : "s"}`);
  if (l.maxVideos > 0) {
    parts.push(`and ${l.maxVideos} video${l.maxVideos === 1 ? "" : "s"}`);
  }
  let text = `${parts.join(" ")}, ${l.maxTotal} item${l.maxTotal === 1 ? "" : "s"} in total.`;
  if (l.requireImage) text += " At least one photo is required.";
  return text;
}

export interface EntryMediaUploadFieldProps {
  /** This event's caps, straight off its document. Unset = platform defaults. */
  limits: EventEntryMediaLimits | undefined;
  /** Used only to derive the SEO filename the media host stamps on the object. */
  eventTitle: string;
  value: MediaField[];
  onChange: (media: MediaField[]) => void;
  disabled?: boolean;
  /** Overridable for a host whose media proxies sit elsewhere. STRINGS. */
  signEndpoint?: string;
  finalizeEndpoint?: string;
  /** Overrides the generated label — used by the edit form ("Photos & video"). */
  label?: string;
}

export function EntryMediaUploadField({
  limits,
  eventTitle,
  value,
  onChange,
  disabled = false,
  signEndpoint = DEFAULT_SIGN_ENDPOINT,
  finalizeEndpoint = DEFAULT_FINALIZE_ENDPOINT,
  label,
}: EntryMediaUploadFieldProps) {
  const l = useMemo(() => resolveEntryMediaLimits(limits), [limits]);

  const { upload } = useMediaUpload({
    sign: signEndpoint,
    finalize: finalizeEndpoint,
  });

  const cropGate = useImageCropGate();

  const handleUpload = useCallback(
    async (rawFile: File): Promise<string> => {
      /*
       * ── 🛑 THE CROP STEP ──────────────────────────────────────────────
       *
       * Owner, 2026-11-11: *"keep the crop tool as universal"*. An entrant
       * submits a photo to be JUDGED, so framing it is part of entering —
       * and this field had zero references to the cropper that already
       * shipped in appkit.
       *
       * Images only: a contest video goes straight through, because there is
       * no canvas crop for one. Cancelling uploads the original.
       */
      const crop = await cropGate.beginAsync(rawFile);
      /* 🛑 The ORIGINAL file is uploaded; `crop` is only how it is framed. */
      const file = rawFile;
      /*
       * 🛑 `classifyMime`, the SAME classifier `applyMediaContextGuards` runs
       * server-side — not a `startsWith("video/")` test. The server decides
       * image-vs-video from its own allowlist, so picking the context with a
       * looser rule here is how a file gets signed under a context that then
       * refuses it. `null` means a type the allowlist does not contain, which
       * `useMediaUpload` rejects before any network call; the image branch is
       * the safe landing because `event-entry-image` is image-only and will
       * say so.
       */
      const kind = classifyMime(file.type);
      const isVideo = kind === "video";

      /*
       * The entry's per-TYPE ordinal, which is all this is.
       *
       * 🛑 Counted within its own type so the first video is video-1 rather
       * than inheriting the photo count, and clamped to
       * `EVENT_ENTRY_MEDIA_INDEX_MAX` — the index SPACE of the generated
       * filename, not an allowance. Clamping rather than failing is
       * deliberate: an organiser who sets `maxImages: 40` has made a legal
       * choice, and the right consequence is two photos sharing an SEO slug
       * ordinal, never a 400 from the signer on a number the event document
       * was allowed to contain. Identity comes from the storage path
       * (`tmp/<folder>/<uid>/`), never from this number.
       */
      const sameTypeCount = value.filter((m) =>
        isVideo ? m.type === "video" : m.type === "image",
      ).length;
      const index = Math.min(sameTypeCount + 1, EVENT_ENTRY_MEDIA_INDEX_MAX);

      /*
       * ⚠ `ext` is accepted and then IGNORED by the media host, which
       * re-derives the extension from the DETECTED mime. Passed because the
       * context type declares the field, and taken from `MIME_TO_EXT` rather
       * than a local map so the two cannot disagree about what
       * `video/quicktime` is called.
       */
      return upload(file, "events", true, {
        type: isVideo ? "event-entry-video" : "event-entry-image",
        title: eventTitle,
        index,
        ext: MIME_TO_EXT[file.type.toLowerCase()] ?? "bin",
      }, crop ?? undefined);
    },
    [upload, eventTitle, value],
  );

  return (
    <>
    {/*
      🛑 The crop modal must be mounted, or `beginAsync`'s promise never
      settles and every image upload hangs with a spinner and no way out.
    */}
    {cropGate.modal}
    <MediaUploadList
      /*
       * The label names what this event accepts. It said "Your photos" while
       * `maxVideos` was forced to 0; now that a video slot can exist, a label
       * that omits it would be the same drift the helper text is generated to
       * avoid, one line up.
       */
      label={
        label ??
        `${
          l.maxVideos > 0
            ? `Your photos & video${l.maxVideos === 1 ? "" : "s"}`
            : "Your photos"
        }${l.requireImage ? " *" : ""}`
      }
      value={value}
      onChange={onChange}
      onUpload={handleUpload}
      /*
       * Derived from the limits, every one of them. `maxItems` is the overall
       * ceiling and `maxImages`/`maxVideos` are counted per type.
       *
       * 🛑 `maxTotal` is NOT `maxImages + maxVideos`; the schema says so at the
       * line. Passing the sum would silently remove an organiser's ability to
       * allow 5 photos and 2 videos but cap the entry at 5 items.
       */
      maxItems={l.maxTotal}
      maxImages={l.maxImages}
      maxVideos={l.maxVideos}
      /*
       * 🛑 Both attributes come from appkit's allowlists, never a hand-typed
       * list and never `image/*` / `video/*`. The wildcard admits
       * `image/svg+xml` (an excluded XSS surface) and containers like AVI that
       * the signer 400s — so the picker would accept a file that was never
       * going to upload, and the rule would arrive as a failure.
       *
       * The video half appears only when THIS event allows a video.
       */
      accept={
        l.maxVideos > 0
          ? `${IMAGE_ACCEPT_ATTR},${VIDEO_ACCEPT_ATTR}`
          : IMAGE_ACCEPT_ATTR
      }
      helperText={describeEntryMediaRules(limits)}
      disabled={disabled}
    />
    </>
  );
}
