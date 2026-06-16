import { normalizeError } from "../../../../errors/normalize";
import type { JsonValue } from "@mohasinac/appkit";
/**
 * Core: maintain DFS `position` + `subtreeSize` on every category write.
 * CREATE → insert into parent's subtree + shift later siblings;
 * DELETE → shift back; MOVE → mark `positionDirty` so the nightly reconcile
 * job rebuilds.
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
  const isCreate = !before && !!after;
  const isDelete = !!before && !after;
  const isUpdate = !!before && !!after;

  try {
    if (isCreate) {
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
