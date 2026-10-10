import { notifyRevalidate } from "./revalidateNotify";
import { normalizeError } from "../../../../errors/normalize";
import type { JsonValue } from "@mohasinac/appkit";
/**
 * Core: maintain DFS `position` + `subtreeSize` on every category write.
 * CREATE → insert into parent's subtree + shift later siblings;
 * DELETE → shift back; MOVE → mark `positionDirty` so the nightly reconcile
 * job rebuilds.
 *
 * trigger-self-write-ok: terminates at depth 1 — the only branch that writes is
 * gated on `parentIds` CHANGING, and none of this handler's own writes touch
 * `parentIds`.
 *
 * 🛑 WHY THAT IS SAFE, SPELLED OUT — this is a `documentWritten` trigger on
 * `categories` that writes back to `categories`, including to the triggering
 * document (L110). That is the shape of Root Cause #92, which logged 1,017,548
 * invocations in 24 hours, so it deserves an explicit argument rather than trust:
 *
 *   CREATE writes → sibling `position`s, own `position`/`subtreeSize`, ancestor
 *                   `subtreeSize`. Every one re-enters as an UPDATE.
 *   DELETE writes → sibling `position`s, ancestor `subtreeSize`. Same.
 *   UPDATE        → writes ONLY when `beforeParent !== afterParent`. None of the
 *                   writes above change `parentIds`, so the re-entry compares
 *                   equal and does nothing. The cascade stops.
 *   MOVE          → writes `positionDirty`, which is also not `parentIds`, so its
 *                   own re-entry likewise does nothing. One extra hop, then stop.
 *
 * The guard is STRUCTURAL, not a value comparison — that is what makes it stronger
 * than #92's. `onShipmentHeaderWrite` recomputed and rewrote the same derived field
 * every time and relied on `JSON.stringify` equality to notice it had not changed;
 * key-order sensitivity made that comparison always false, so it re-triggered
 * forever. Here there is nothing to compare: the handler cannot write the field it
 * branches on.
 *
 * 🛑 If you ever make this handler write `parentIds`, it becomes a true loop. Do
 * not — a move is deliberately deferred to the nightly reconcile for this reason.
 *
 * Not free, though: creating one category writes to its siblings, its ancestors and
 * itself, and each of those writes spawns a no-op invocation. A full reseed of the
 * 58-category forest therefore costs on the order of thousands of invocations, all
 * of them terminating. That is a cost worth knowing before a reseed, not a runaway.
 *
 * 🛑 AND THAT COST IS QUADRATIC, which is why the CREATE branch now has a
 * precomputed-coordinates escape hatch (see the block at the top of `isCreate`).
 * ~n²/4 writes: 58 nodes ≈ 840, 330 ≈ 27,000, 1,500 ≈ 560,000 — the last two
 * being 1.4x and 28x the 20k/day Firestore write budget. A seed that already
 * carries correct DFS coordinates skips the branch entirely.
 */

import { FieldValue } from "firebase-admin/firestore";
import { BATCH_LIMIT } from "../handlers/messages";
import type { JobContext } from "../runtime/types";

const CATEGORIES = "categories";

async function shiftPositions(
  ctx: JobContext,
  threshold: number,
  delta: number,
  excludeId?: string,
): Promise<number> {
  const snap = await ctx.db.collection(CATEGORIES).where("position", ">=", threshold).get();
  const docs = snap.docs.filter(
    (d) => d.id !== excludeId && (d.data().position as number) >= threshold,
  );
  if (docs.length === 0) return 0;
  for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
    const batch = ctx.db.batch();
    for (const doc of docs.slice(i, i + BATCH_LIMIT)) {
      batch.update(doc.ref, {
        position: (doc.data().position as number) + delta,
        updatedAt: new Date(),
      });
    }
    await batch.commit();
  }
  return docs.length;
}

async function adjustAncestorSubtreeSize(
  ctx: JobContext,
  ancestorIds: string[],
  delta: number,
): Promise<void> {
  if (ancestorIds.length === 0) return;
  for (let i = 0; i < ancestorIds.length; i += BATCH_LIMIT) {
    const batch = ctx.db.batch();
    for (const id of ancestorIds.slice(i, i + BATCH_LIMIT)) {
      batch.update(ctx.db.collection(CATEGORIES).doc(id), {
        subtreeSize: FieldValue.increment(delta),
        updatedAt: new Date(),
      });
    }
    await batch.commit();
  }
}

async function getMaxPosition(ctx: JobContext, excludeId?: string): Promise<number> {
  const snap = await ctx.db
    .collection(CATEGORIES)
    .orderBy("position", "desc")
    .limit(excludeId ? 2 : 1)
    .get();
  for (const doc of snap.docs) {
    if (doc.id === excludeId) continue;
    return (doc.data().position as number) ?? 0;
  }
  return 0;
}

export type CategoryDoc = Record<string, JsonValue>;

export interface HandleCategoryWriteInput {
  categoryId: string;
  before: CategoryDoc | null;
  after: CategoryDoc | null;
}

export async function handleCategoryWrite(
  input: HandleCategoryWriteInput,
  ctx: JobContext,
): Promise<void> {
  const { categoryId, before, after } = input;

  // Drop the ISR entries for this category/brand/bundle page and the listings
  // that link it. Folded into the existing trigger rather than given its own —
  // see the note in onProductWrite. No Firestore write here (Root Cause #92).
  await notifyRevalidate({ collection: "categories", id: categoryId }, ctx);
  const isCreate = !before && !!after;
  const isDelete = !!before && !after;
  const isUpdate = !!before && !!after;

  try {
    if (isCreate) {
      /*
       * 🛑 BULK-WRITE ESCAPE HATCH — skip everything when the writer already
       * computed valid DFS coordinates.
       *
       * The branch below is O(n) reads + O(n) writes PER CATEGORY CREATED:
       * `shiftPositions` runs an unbounded `where("position", ">=", t)` and
       * rewrites every row it returns, because a new node is inserted as its
       * parent's FIRST child and everything after it moves. Averaged over a
       * build that is ~n/2 rows shifted per insert, so seeding N categories
       * costs Σ(i/2) ≈ n²/4 writes:
       *
       *     58 nodes  ->    ~840 writes   (tolerable, and what we pay today)
       *    330 nodes  -> ~27,000 writes   (above the 20k/day Firestore budget)
       *  1,500 nodes  -> ~560,000 writes  (28x the daily budget, in one run)
       *
       * `buildCategoryTree` already computes `position` and `subtreeSize` as
       * a correct global DFS pre-order — the exact numbering this handler
       * would otherwise recompute one insert at a time. Worse than wasteful:
       * the CREATE branch OVERWRITES that work with `subtreeSize: 1` and a
       * locally-derived position, leaving the collection wrong until the
       * nightly reconcile repairs it.
       *
       * So a document that arrives already numbered is left alone.
       *
       * The test is `position >= 1`, which is unambiguous because BOTH
       * writers of a precomputed position are 1-based: `buildCategoryTree`
       * and `positionsReconcile`. A category created through the admin/store
       * routes carries `position: 0` (the `createWithHierarchy` default) and
       * therefore still gets the full treatment.
       *
       * 🛑 This is NOT the Root Cause #92 shape. It is not a value-equality
       * guard on a field this handler writes — it is a precondition on the
       * INCOMING document, and the handler takes no action at all when it
       * holds. There is nothing to compare and nothing to re-trigger.
       */
      const precomputedPosition = (after as CategoryDoc).position;
      const precomputedSubtree = (after as CategoryDoc).subtreeSize;
      if (
        typeof precomputedPosition === "number" &&
        precomputedPosition >= 1 &&
        typeof precomputedSubtree === "number" &&
        precomputedSubtree >= 1
      ) {
        ctx.logger.info("Category created with precomputed DFS coords — skipping position assignment", {
          categoryId,
          position: precomputedPosition,
          subtreeSize: precomputedSubtree,
        });
        return;
      }

      const parentIds = ((after as CategoryDoc).parentIds as string[]) ?? [];
      const parentId = parentIds.length > 0 ? parentIds[parentIds.length - 1] : null;

      let insertPosition: number;
      if (parentId) {
        const parentSnap = await ctx.db.collection(CATEGORIES).doc(parentId).get();
        if (!parentSnap.exists) {
          ctx.logger.warn("Parent not found, appending at end", { categoryId, parentId });
          insertPosition = (await getMaxPosition(ctx, categoryId)) + 1;
        } else {
          const p = parentSnap.data()!;
          const parentPos = (p.position as number) ?? 0;
          const parentSize = (p.subtreeSize as number) ?? 1;
          insertPosition = parentPos + parentSize;
        }
      } else {
        insertPosition = (await getMaxPosition(ctx, categoryId)) + 1;
      }

      const shifted = await shiftPositions(ctx, insertPosition, +1, categoryId);
      await ctx.db.collection(CATEGORIES).doc(categoryId).update({
        position: insertPosition,
        subtreeSize: 1,
        updatedAt: new Date(),
      });
      await adjustAncestorSubtreeSize(ctx, parentIds, +1);
      ctx.logger.info("Category created — position assigned", {
        categoryId,
        position: insertPosition,
        parentId,
        shifted,
      });
    } else if (isDelete) {
      const deletedPos = ((before as CategoryDoc).position as number) ?? 0;
      const deletedSize = ((before as CategoryDoc).subtreeSize as number) ?? 1;
      const parentIds = ((before as CategoryDoc).parentIds as string[]) ?? [];
      if (deletedPos === 0) {
        ctx.logger.warn("Deleted category had no position — skipping shift", { categoryId });
        return;
      }
      const shifted = await shiftPositions(ctx, deletedPos + deletedSize, -deletedSize);
      await adjustAncestorSubtreeSize(ctx, parentIds, -deletedSize);
      ctx.logger.info("Category deleted — positions shifted", {
        categoryId,
        position: deletedPos,
        subtreeSize: deletedSize,
        shifted,
      });
    } else if (isUpdate) {
      const beforeParents = ((before as CategoryDoc).parentIds as string[]) ?? [];
      const afterParents = ((after as CategoryDoc).parentIds as string[]) ?? [];
      const beforeParent = beforeParents[beforeParents.length - 1] ?? null;
      const afterParent = afterParents[afterParents.length - 1] ?? null;
      if (beforeParent !== afterParent) {
        await ctx.db
          .collection(CATEGORIES)
          .doc(categoryId)
          .update({ positionDirty: true, updatedAt: new Date() });
        ctx.logger.warn("Category moved — positionDirty flagged for nightly reconcile", {
          categoryId,
          fromParent: beforeParent,
          toParent: afterParent,
        });
      }
    }
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("Position update failed (non-fatal — will heal on next reconcile)", err, {
      categoryId,
    });
  }
}
