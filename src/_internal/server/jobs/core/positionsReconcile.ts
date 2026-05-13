/**
 * Core: rebuild `position` + `subtreeSize` for every category via
 * DFS pre-order from the roots. Heals drift left by the trigger's
 * `positionDirty` flag and any failed real-time updates.
 */

import { BATCH_LIMIT } from "../handlers/messages";
import type { JobContext } from "../runtime/types";

const CATEGORIES = "categories";

interface CategoryNode {
  id: string;
  parentId: string | null;
  order: number;
  position: number;
  subtreeSize: number;
  positionDirty?: boolean;
}

function dfsAssign(
  nodeId: string,
  childMap: Map<string, CategoryNode[]>,
  counter: number,
  result: Map<string, { position: number; subtreeSize: number }>,
): number {
  const position = counter;
  counter++;
  const children = (childMap.get(nodeId) ?? []).sort((a, b) => a.order - b.order);
  for (const child of children) {
    counter = dfsAssign(child.id, childMap, counter, result);
  }
  const subtreeSize = counter - position;
  result.set(nodeId, { position, subtreeSize });
  return counter;
}

export async function runPositionsReconcile(ctx: JobContext): Promise<void> {
  const snap = await ctx.db.collection(CATEGORIES).get();
  const nodes: CategoryNode[] = snap.docs.map((doc) => {
    const d = doc.data();
    const parentIds = (d.parentIds as string[]) ?? [];
    return {
      id: doc.id,
      parentId: parentIds.length > 0 ? parentIds[parentIds.length - 1] : null,
      order: (d.order as number) ?? 0,
      position: (d.position as number) ?? 0,
      subtreeSize: (d.subtreeSize as number) ?? 1,
      positionDirty: (d.positionDirty as boolean) ?? false,
    };
  });

  if (nodes.length === 0) {
    ctx.logger.info("No categories — nothing to reconcile");
    return;
  }

  const childMap = new Map<string, CategoryNode[]>();
  const roots: CategoryNode[] = [];
  for (const node of nodes) {
    if (node.parentId === null) {
      roots.push(node);
    } else {
      const siblings = childMap.get(node.parentId) ?? [];
      siblings.push(node);
      childMap.set(node.parentId, siblings);
    }
  }

  const computed = new Map<string, { position: number; subtreeSize: number }>();
  let counter = 1;
  for (const root of roots.sort((a, b) => a.order - b.order)) {
    counter = dfsAssign(root.id, childMap, counter, computed);
  }

  const orphans = nodes.filter((n) => !computed.has(n.id));
  for (const orphan of orphans) {
    counter = dfsAssign(orphan.id, childMap, counter, computed);
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const toUpdate: Array<{ id: string; position: number; subtreeSize: number }> = [];
  for (const [id, { position, subtreeSize }] of computed) {
    const current = nodeMap.get(id);
    if (!current || current.position !== position || current.subtreeSize !== subtreeSize || current.positionDirty) {
      toUpdate.push({ id, position, subtreeSize });
    }
  }

  if (toUpdate.length === 0) {
    ctx.logger.info("Positions already correct", { scanned: nodes.length });
    return;
  }

  for (let i = 0; i < toUpdate.length; i += BATCH_LIMIT) {
    const batch = ctx.db.batch();
    for (const { id, position, subtreeSize } of toUpdate.slice(i, i + BATCH_LIMIT)) {
      batch.update(ctx.db.collection(CATEGORIES).doc(id), {
        position,
        subtreeSize,
        positionDirty: false,
        updatedAt: new Date(),
      });
    }
    await batch.commit();
  }

  ctx.logger.info("Positions reconciled", {
    scanned: nodes.length,
    updated: toUpdate.length,
    orphans: orphans.length,
  });
}
