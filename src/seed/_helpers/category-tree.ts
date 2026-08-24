/*
 * WHY: `CategoryDocument` requires nine interlocking structural fields on every
 *      row — rootId, parentIds (the FULL ancestor chain), childrenIds, tier,
 *      path, isLeaf, ancestors, position and subtreeSize. Hand-writing those
 *      across a real tree guarantees mistakes, and the seed already had them:
 *      the old root claimed `subtreeSize: 4` at `position: 0` while all four of
 *      its children ALSO sat at positions 0-3, which is not a valid DFS
 *      pre-order numbering.
 * WHAT: Declare the tree once as a nested literal; derive every structural
 *       field from it. Purely deterministic — no Math.random, no Date.now — so
 *       reseeding is idempotent (Root Cause #25).
 *
 * EXPORTS:
 *   CategoryTreeNode  — the authoring shape (id/name/... plus `children`)
 *   buildCategoryTree — nested literal -> flat Partial<CategoryDocument>[]
 *
 * `position`/`subtreeSize` are DFS pre-order coordinates: a node's subtree
 * occupies exactly `[position, position + subtreeSize - 1]`, which is what lets
 * `onCategoryWrite` shift ranges on insert/delete. Seeding them correctly means
 * that Function has nothing to repair on first write.
 *
 * @tag domain:categories
 * @tag layer:seed
 * @tag pattern:derived
 * @tag access:server-only
 * @tag consumers:seed/categories-seed-data.ts
 * @tag sideEffects:none
 */

import type { CategoryDocument } from "../../features/categories/schemas";

/** The authoring shape — only the fields a human should have to write. */
export interface CategoryTreeNode {
  /** Doc id AND slug; they are always equal for categories (`id === slug`). */
  id: string;
  name: string;
  description: string;
  /** Per-row extras: display, seo, highlights, faqs, isFeatured, … */
  extra?: Partial<CategoryDocument>;
  children?: CategoryTreeNode[];
}

export interface BuildCategoryTreeOptions {
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  /** Applied to every row unless the node's own `extra` overrides it. */
  defaults?: Partial<CategoryDocument>;
}

/**
 * Flatten a forest of nested nodes into seed rows with every structural field
 * computed.
 *
 * Traversal is DFS pre-order, and `position` is a single counter running across
 * ALL roots — the numbering is global to the collection, not per-tree, which is
 * what `onCategoryWrite`'s range shifting assumes.
 */
export function buildCategoryTree(
  roots: CategoryTreeNode[],
  opts: BuildCategoryTreeOptions,
): Partial<CategoryDocument>[] {
  const rows: Partial<CategoryDocument>[] = [];
  let position = 0;

  function visit(
    node: CategoryTreeNode,
    rootId: string,
    /** Ancestors nearest-last, matching how `parentIds` is read elsewhere. */
    ancestors: { id: string; name: string; tier: number }[],
    tier: number,
    parentPath: string,
    order: number,
  ): number {
    const myPosition = position++;
    // The slug segment is the id minus its `category-` prefix, so
    // `spinning-tops/beyblade-burst/burst-parts` reads as a real path.
    const segment = node.id.replace(/^category-/, "");
    const path = parentPath ? `${parentPath}/${segment}` : segment;
    const children = node.children ?? [];

    // `seo` and `display` are REQUIRED on CategoryDocument, so synthesise
    // sensible ones rather than make every row hand-write a block. A node that
    // wants a real icon/cover/keywords overrides via `extra`, which is spread
    // last.
    const seo: CategoryDocument["seo"] = {
      title: `${node.name} | LetItRip`,
      description: node.description,
      keywords: node.name.toLowerCase().split(/\s+/).filter(Boolean),
    };
    const display: CategoryDocument["display"] = {
      // Deeper rows are navigational, not menu-worthy: showing all four tiers
      // in the header menu would drown it.
      showInMenu: tier <= 1,
      showInFooter: false,
    };

    const row: Partial<CategoryDocument> = {
      ...opts.defaults,
      seo,
      display,
      id: node.id,
      slug: node.id,
      name: node.name,
      description: node.description,
      rootId,
      parentIds: ancestors.map((a) => a.id),
      childrenIds: children.map((c) => c.id),
      ancestors: ancestors.map((a) => ({ ...a })),
      tier,
      path,
      order,
      isLeaf: children.length === 0,
      position: myPosition,
      createdBy: opts.createdBy,
      createdAt: opts.createdAt,
      updatedAt: opts.updatedAt,
      ...node.extra,
    };
    rows.push(row);

    const nextAncestors = [
      ...ancestors,
      { id: node.id, name: node.name, tier },
    ];
    let descendants = 0;
    children.forEach((child, index) => {
      descendants += visit(
        child,
        rootId,
        nextAncestors,
        tier + 1,
        path,
        index + 1,
      );
    });

    // A node's subtree spans itself plus everything beneath it.
    row.subtreeSize = descendants + 1;
    return row.subtreeSize;
  }

  for (const [index, root] of roots.entries()) {
    visit(root, root.id, [], 0, "", index + 1);
  }

  return rows;
}
