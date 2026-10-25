/*
 * WHY: The tracer ends at extracted geometry and a promoted run's full-size
 *      part PNGs. This is what makes that worth doing — the whole sheet becomes
 *      one listing, each unique cut becomes its own, and they are grouped so a
 *      buyer takes any mix ("the sheet, no; six of B; one of D").
 * WHAT: `promoteStickerSheetToListings` — sheet → one parent product + N child
 *       products in one product group.
 *
 * 🛑 DISTINCT FROM `promoteRun`, and the names are close enough to matter.
 *   · `POST .../runs/{runId}/promote`  → `promoteRun`: run → SHEET. Renders
 *     full-res parts and exports, sets `activeRunId`. Stays inside the tracer.
 *   · `POST .../promote-to-listings`   → this: SHEET → MARKETPLACE. Creates
 *     products. Runs once per sheet, after the above.
 * Calling this without the first is refused, because `SheetPart.assetPath` is
 * only written by the `mode: "full"` shard path.
 *
 * 🛑 ZERO BYTES ARE COPIED for the watermarked display image. A `mediaAssets`
 * row pointing at the EXISTING private part PNG is enough: the row is what
 * mints `/media/{shortId}`, and the proxy watermarks on read because the row is
 * written with `watermarkedAt` absent. Clean original for the cut file,
 * watermarked copy for the marketplace, one object. Object count is metered
 * separately from bytes, which is the whole reason the thumb atlas exists.
 *
 * EXPORTS: PromoteToListingsInput, PromoteToListingsResult,
 *          promoteStickerSheetToListings
 *
 * @tag domain:sticker-trace,products
 * @tag layer:server
 * @tag pattern:none
 * @tag access:server
 * @tag consumers:api/admin/sticker-sheets
 * @tag sideEffects:firestore
 */

import { ValidationError } from "../../../../errors/validation-error";
import { serverLogger } from "../../../../monitoring/server-logger";
import { normalizeError } from "../../../../errors/normalize";
import { productRepository } from "../../../../features/products/repository/products.repository";
import { mediaAssetsRepository } from "../../../../features/media/repository/media-assets.repository";
import { stickerSheetsRepository } from "../../../../features/sticker-trace/repository/sticker-sheets.repository";
import type {
  SheetPart,
  StickerSheetDocument,
} from "../../../../features/sticker-trace/schemas/firestore";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export interface PromoteToListingsInput {
  sheetId: string;
  /** Owning store. The admin picks it; there is no sensible default. */
  storeId: string;
  /**
   * ONE price for every part, in rupees.
   *
   * 🛑 Deliberately flat rather than per-part or area-derived. A cut sticker
   * costs about the same to print whatever its size, so a size-scaled price
   * would be a fabricated precision — and a per-part form for a 60-part sheet
   * is 60 inputs nobody fills in honestly. Each child is an ordinary product
   * afterwards and repriceable in the normal editor.
   */
  partPrice: number;
  /** The whole sheet's price, in rupees. */
  sheetPrice: number;
  /** Auth UID, for the `mediaAssets` row's `uploadedBy`. */
  actorUid: string;
}

export interface PromoteToListingsResult {
  parentId: string;
  childIds: string[];
  /** Parts skipped as confirmed duplicates of another part. */
  skippedDuplicates: number;
}

/** A part that becomes its own listing: unique, and actually rendered. */
function isListableUniquePart(part: SheetPart): boolean {
  /*
   * `duplicateOf` is proposed by perceptual hash and CONFIRMED BY A HUMAN, so
   * trusting it is safe by design — that confirmation step exists precisely so
   * this decision can be mechanical. Two stickers that merely look alike at
   * thumbnail size are common on these sheets.
   */
  return part.duplicateOf === undefined;
}

/**
 * Refuse loudly, before writing anything, if the sheet is not ready.
 *
 * 🛑 A half-promoted sheet is the "wrong data, no error" failure this whole
 * plan exists to avoid: some parts listed, some silently missing, and nothing
 * anywhere saying so. Every precondition is therefore checked UP FRONT and the
 * whole promotion refused — not checked per part inside the loop, which would
 * leave the first N written.
 */
function assertPromotable(sheet: StickerSheetDocument): SheetPart[] {
  if (!sheet.activeRunId) {
    throw new ValidationError(
      `"${sheet.title}" has no accepted run yet. Accept a run first, then promote it to listings.`,
    );
  }

  const parts = sheet.parts ?? [];
  if (parts.length === 0) {
    throw new ValidationError(
      `"${sheet.title}" has no parts. Trace it and accept a run first.`,
    );
  }

  const unique = parts.filter(isListableUniquePart);
  if (unique.length === 0) {
    throw new ValidationError(
      `Every part on "${sheet.title}" is marked a duplicate of another, so there is nothing to list.`,
    );
  }

  /*
   * `assetPath` absent means the accepted run was never PROMOTED — the
   * full-resolution PNGs do not exist. Naming the parts rather than saying
   * "not ready": the admin's next action is different depending on whether it
   * is all of them (promote the run) or a few (the shard that rendered those
   * failed, so retry).
   */
  const unrendered = unique.filter((p) => !p.assetPath);
  if (unrendered.length > 0) {
    throw new ValidationError(
      `${unrendered.length} of ${unique.length} parts on "${sheet.title}" have no full-resolution image yet` +
        ` (${unrendered.slice(0, 5).map((p) => `#${p.ordinal}`).join(", ")}${unrendered.length > 5 ? ", …" : ""}).` +
        ` Accept & render the run before promoting it to listings.`,
    );
  }

  return unique;
}

/**
 * Register the public, WATERMARKED display copy of one part.
 *
 * Reuses an existing row when the part already has one, so re-promoting a sheet
 * does not mint a second slug for the same object and orphan the first.
 */
async function ensurePartMediaSlug(
  sheet: StickerSheetDocument,
  part: SheetPart,
  actorUid: string,
): Promise<string | undefined> {
  if (part.mediaShortId) return part.mediaShortId;
  if (!part.assetPath) return undefined;

  try {
    const asset = await mediaAssetsRepository.createAsset(
      /*
       * A content-derived slug, matching every other media slug in the app.
       * `createAsset` appends a random suffix on collision, so two sheets with
       * the same title cannot overwrite each other's parts.
       */
      `sticker-part-${sheet.id}-${String(part.ordinal).padStart(3, "0")}`,
      {
        /*
         * 🛑 The SAME path as the clean original. This is the no-byte-copy
         * mechanism, and it is only safe because of the two fields below.
         */
        storagePath: part.assetPath,
        uploadedBy: actorUid,
        contentType: "image/png",
        /*
         * Not measured. The row's `size` is used by the media usage meter, not
         * for serving, and reading the object's metadata here would cost a
         * Storage round trip per part — 60 on a full sheet — for a number the
         * sticker feature already reports from `measureSheetBytes`.
         */
        size: 0,
        isPublic: true,
        status: "finalized",
        contextType: "sticker-part",
        /*
         * 🛑 `watermarkedAt` is DELIBERATELY ABSENT, and it is the whole design.
         * The proxy skips its sharp composite only when that field is set — so
         * leaving it unset means `/media/{shortId}` watermarks this object on
         * every read, while `assetPath` behind a signed URL stays clean. Set it
         * here and the marketplace would serve the unwatermarked printable
         * original, which is the one outcome this must never produce.
         */
      },
    );
    return asset.id;
  } catch (err) {
    const e = normalizeError(err);
    /*
     * Non-fatal. A part with no public slug still lists — it falls back to no
     * image rather than blocking the whole promotion — and the admin can
     * re-promote to fill it in. Failing the sheet over one media row would be
     * the worse trade.
     */
    serverLogger.warn("sticker-promote: media row failed for part", {
      sheetId: sheet.id,
      ordinal: part.ordinal,
      error: e.message,
    });
    return undefined;
  }
}

export async function promoteStickerSheetToListings(
  input: PromoteToListingsInput,
): Promise<PromoteToListingsResult> {
  const sheet = await stickerSheetsRepository.findByIdOrFail(input.sheetId);
  const unique = assertPromotable(sheet);
  const allParts = sheet.parts ?? [];

  /*
   * Media rows first, before any product write.
   *
   * The images are what a listing is FOR, so resolving them up front means a
   * product is never created pointing at nothing. Sequential rather than
   * `Promise.all`: `createAsset` does a read-then-write collision check, and 60
   * of those in parallel is 120 concurrent operations against Rule #6's budget
   * for an admin action that is not latency-sensitive.
   */
  const slugByOrdinal = new Map<number, string>();
  for (const part of unique) {
    const slug = await ensurePartMediaSlug(sheet, part, input.actorUid);
    if (slug) slugByOrdinal.set(part.ordinal, slug);
  }

  const partImage = (part: SheetPart): string => {
    const slug = slugByOrdinal.get(part.ordinal);
    return slug ? `/media/${slug}` : "";
  };

  /*
   * The parent: the whole sheet.
   *
   * 🛑 `madeToOrder: true`. A sheet that has been cut into parts has no stock
   * of its own — it is printed when ordered — so without the flag the parent is
   * unbuyable at quantity 0 and vanishes from the default availability scope,
   * taking the group's entry point with it.
   */
  const parent = (await productRepository.create({
    title: sheet.title,
    description:
      `The complete ${sheet.title} sheet. Individual stickers from this sheet are listed separately — ` +
      `pick any mix from the group below.`,
    categorySlugs: [],
    price: input.sheetPrice,
    currency: "INR",
    stockQuantity: 0,
    madeToOrder: true,
    mainImage: unique[0] ? partImage(unique[0]) : "",
    images: unique.slice(0, 4).map(partImage).filter(Boolean),
    status: "draft",
    storeId: input.storeId,
    featured: false,
    tags: ["stickers"],
    condition: "new",
    listingType: "stickers",
    groupTitle: sheet.title,
    sourceStickerSheetId: sheet.id,
  } as never)) as ProductDocument;

  /*
   * `startGroup` sets `groupId = slug`, so the group id IS the parent's slug —
   * which is why the parent must exist before any child can name it.
   */
  const parentSlug = parent.slug ?? parent.id;
  await productRepository.startGroup(parent.id, parentSlug);

  const children: ProductDocument[] = [];
  for (const part of unique) {
    const child = (await productRepository.create({
      title: `${sheet.title} — ${part.name}`,
      description: `A single kiss-cut sticker from the ${sheet.title} sheet.`,
      categorySlugs: [],
      price: input.partPrice,
      currency: "INR",
      stockQuantity: 0,
      // Same reasoning as the parent: a cut sticker is printed on order.
      madeToOrder: true,
      mainImage: partImage(part),
      images: [partImage(part)].filter(Boolean),
      status: "draft",
      storeId: input.storeId,
      featured: false,
      tags: ["stickers"],
      condition: "new",
      listingType: "stickers",
      sourceStickerSheetId: sheet.id,
      sourceStickerPartOrdinal: part.ordinal,
    } as never)) as ProductDocument;
    children.push(child);
  }

  /*
   * 🛑 ONE batch link, via `linkChildrenToGroup`. Calling `linkChildToGroup` in
   * a loop was the bug this phase had to fix first: it spread the CALLER's
   * in-memory `parent.groupChildSlugs`, so N children produced exactly one
   * entry — every iteration computing `[...stale, child]` from the same
   * pre-loop snapshot, last write winning. Each child still got its own
   * `groupId`, so nothing errored and `findAllByGroupId` found them all while
   * the parent claimed one member.
   */
  await productRepository.linkChildrenToGroup({ ...parent, groupId: parentSlug }, children);

  /*
   * Write the slugs back onto the sheet so a re-promote reuses them.
   *
   * 🛑 Mapped over ALL parts, keyed on `ordinal`, never on array index — and
   * `assertPromotable` filtered to unique parts, so a plain `.map()` over
   * `unique` here would DROP every duplicate part from the sheet. The duplicate
   * rows carry `duplicateOf` and real geometry and must survive.
   */
  const updatedParts: SheetPart[] = allParts.map((p) => {
    const slug = slugByOrdinal.get(p.ordinal);
    return slug ? { ...p, mediaShortId: slug } : p;
  });
  await stickerSheetsRepository.update(sheet.id, { parts: updatedParts } as never);

  serverLogger.info("sticker-promote: sheet promoted to listings", {
    sheetId: sheet.id,
    parentId: parent.id,
    children: children.length,
    skippedDuplicates: allParts.length - unique.length,
  });

  return {
    parentId: parent.id,
    childIds: children.map((c) => c.id),
    skippedDuplicates: allParts.length - unique.length,
  };
}
