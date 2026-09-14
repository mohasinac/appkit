import { normalizeError } from "../../../errors/normalize";
import {
  increment,
  arrayUnion,
  arrayRemove,
} from "../../../contracts/field-ops";
import { DatabaseError } from "../../../errors";
import {
  BaseRepository,
  prepareForFirestore,
  parseSieveDateValue,
  type FirebaseSieveFields,
  type FirebaseSieveResult,
  type SieveModel,
} from "../../../providers/db-firebase";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import {
  CATEGORY_FIELDS,
  CATEGORIES_COLLECTION,
  MIN_ITEMS_FOR_FEATURED,
  buildCategoryTree,
  calculateCategoryFields,
  canBeFeatured,
  createCategoryId,
  isValidCategoryMove,
  type CategoryCreateInput,
  type CategoryDocument,
  type CategoryMoveInput,
  type CategoryTreeNode,
} from "../schemas";
import type { FirestoreDocument } from "@mohasinac/appkit";

/** One pending document write, for `commitChunked`. */
type CategoryWrite = { id: string; data: FirestoreDocument };

export class CategoriesRepository extends BaseRepository<CategoryDocument> {
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    name: { canFilter: true, canSort: true },
    slug: { canFilter: true, canSort: false },
    tier: { canFilter: true, canSort: true },
    isActive: { canFilter: true, canSort: false },
    isFeatured: { canFilter: true, canSort: false },
    isBrand: { canFilter: true, canSort: false },
    categoryType: { canFilter: true, canSort: false },
    isSearchable: { canFilter: true, canSort: false },
    parentId: { canFilter: true, canSort: false, path: "parentIds" },
    order: { canFilter: true, canSort: true },
    "metrics.productCount": {
      path: "metrics.productCount",
      canFilter: true,
      canSort: true,
    },
    "metrics.totalItemCount": {
      path: "metrics.totalItemCount",
      canFilter: true,
      canSort: true,
    },
    "metrics.auctionCount": {
      path: "metrics.auctionCount",
      canFilter: true,
      canSort: true,
    },
    id: { canFilter: true, canSort: false },
    isLeaf: { canFilter: true, canSort: false },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
  };

  constructor() {
    super(CATEGORIES_COLLECTION);
  }

  async list(
    model: SieveModel,
  ): Promise<FirebaseSieveResult<CategoryDocument>> {
    return this.sieveQuery<CategoryDocument>(
      model,
      CategoriesRepository.SIEVE_FIELDS,
    );
  }

  async createWithHierarchy(
    input: CategoryCreateInput,
  ): Promise<CategoryDocument> {
    try {
      let parentCategory: CategoryDocument | null = null;
      let rootCategory: CategoryDocument | null = null;
      const parentIds =
        input.parentIds ?? (input.parentId ? [input.parentId] : []);

      if (parentIds.length > 0) {
        const parentId = parentIds[parentIds.length - 1];
        parentCategory = await this.findById(parentId);

        if (parentIds[0] !== parentId) {
          rootCategory = await this.findById(parentIds[0]);
        }
      }

      const newCategoryId = createCategoryId(
        input.name,
        parentCategory?.name,
        rootCategory?.name,
      );

      const hierarchyFields = calculateCategoryFields(
        parentCategory,
        input.name,
        newCategoryId,
      );

      const categoryData: Omit<CategoryDocument, "id"> = {
        ...input,
        ...hierarchyFields,
        metrics: {
          productCount: 0,
          productIds: [],
          auctionCount: 0,
          auctionIds: [],
          totalProductCount: 0,
          totalAuctionCount: 0,
          totalItemCount: 0,
          lastUpdated: new Date(),
        },
        childrenIds: [],
        isLeaf: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.db
        .collection(this.collection)
        .doc(newCategoryId)
        .set(prepareForFirestore(categoryData));

      if (parentCategory) {
        await this.db
          .collection(this.collection)
          .doc(parentCategory.id)
          .update({
            childrenIds: [...parentCategory.childrenIds, newCategoryId],
            isLeaf: false,
            updatedAt: new Date(),
          });
      }

      return this.findByIdOrFail(newCategoryId);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to create category: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getCategoryBySlug(slug: string): Promise<CategoryDocument | null> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(CATEGORY_FIELDS.SLUG, "==", slug)
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      return this.mapDoc<CategoryDocument>(snapshot.docs[0]);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve category by slug: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getRootCategories(): Promise<CategoryDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(CATEGORY_FIELDS.TIER, "==", 0)
        .where(CATEGORY_FIELDS.IS_ACTIVE, "==", true)
        .orderBy(CATEGORY_FIELDS.ORDER, "asc")
        .get();

      return snapshot.docs
        .map((doc) => this.mapDoc<CategoryDocument>(doc))
        .filter((category) => !category.isBrand);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve root categories: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getLeafCategories(): Promise<CategoryDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(CATEGORY_FIELDS.IS_LEAF, "==", true)
        .where(CATEGORY_FIELDS.IS_ACTIVE, "==", true)
        .limit(500)
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<CategoryDocument>(doc));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve leaf categories: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getCategoriesByTier(tier: number): Promise<CategoryDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(CATEGORY_FIELDS.TIER, "==", tier)
        .where(CATEGORY_FIELDS.IS_ACTIVE, "==", true)
        .orderBy(CATEGORY_FIELDS.ORDER, "asc")
        .get();

      return snapshot.docs
        .map((doc) => this.mapDoc<CategoryDocument>(doc))
        .filter((category) => !category.isBrand);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve categories by tier: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getCategoriesByRootId(rootId: string): Promise<CategoryDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(CATEGORY_FIELDS.ROOT_ID, "==", rootId)
        .orderBy(CATEGORY_FIELDS.TIER, "asc")
        .orderBy(CATEGORY_FIELDS.ORDER, "asc")
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<CategoryDocument>(doc));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve categories by rootId: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getChildren(parentId: string): Promise<CategoryDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("parentIds", "array-contains", parentId)
        .orderBy(CATEGORY_FIELDS.ORDER, "asc")
        .limit(100)
        .get();

      return snapshot.docs
        .map((doc) => this.mapDoc<CategoryDocument>(doc))
        .filter(
          (category) =>
            category.parentIds[category.parentIds.length - 1] === parentId,
        );
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve children categories: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * IDs of every descendant category at any depth (not just direct
   * children) — `parentIds` stores the full ancestor chain, so a single
   * array-contains query on that field already returns the whole subtree
   * with no recursion needed. Used to expand a parent category's product
   * listing/count to include products filed under any of its children.
   */
  async getDescendantIds(categoryId: string): Promise<string[]> {
    const docs = await this.getDescendants(categoryId);
    return docs.map((d) => d.id);
  }

  /**
   * Every descendant DOCUMENT at any depth.
   *
   * 🛑 PAGINATED, DELIBERATELY. This query used to carry a bare `.limit(100)`,
   * which silently truncated the subtree — acceptable-ish for a display list,
   * and corrupting for `reparentSubtree`, which rewrites exactly what this
   * returns. A move that saw 100 of 130 descendants would leave the other 30
   * pointing at the old ancestors with no error anywhere. A partial answer to
   * "what is beneath this node" is worse than a slow one.
   */
  async getDescendants(categoryId: string): Promise<CategoryDocument[]> {
    try {
      const out: CategoryDocument[] = [];
      const pageSize = 300;
      let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;

      for (;;) {
        let q = this.db
          .collection(this.collection)
          .where("parentIds", "array-contains", categoryId)
          .orderBy("__name__")
          .limit(pageSize);
        if (cursor) q = q.startAfter(cursor);

        const page = await q.get();
        if (page.empty) break;

        for (const doc of page.docs) out.push(this.mapDoc<CategoryDocument>(doc));
        if (page.size < pageSize) break;
        cursor = page.docs[page.docs.length - 1];
      }

      return out;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve descendant categories: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getFeaturedCategories(): Promise<CategoryDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(CATEGORY_FIELDS.IS_FEATURED, "==", true)
        .where(CATEGORY_FIELDS.IS_ACTIVE, "==", true)
        .orderBy("featuredPriority", "asc")
        .get();

      return snapshot.docs
        .map((doc) => this.mapDoc<CategoryDocument>(doc))
        .filter((category) => !category.isBrand);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve featured categories: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getBrandCategories(limit = 0): Promise<CategoryDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("isBrand", "==", true)
        .where(CATEGORY_FIELDS.IS_ACTIVE, "==", true)
        .orderBy(CATEGORY_FIELDS.ORDER, "asc")
        .get();

      const brands = snapshot.docs.map((doc) =>
        this.mapDoc<CategoryDocument>(doc),
      );
      return limit > 0 ? brands.slice(0, limit) : brands;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve brand categories: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Move `categoryId` under `newParentId`, rewriting the WHOLE subtree.
   *
   * 🛑 THE DESCENDANTS ARE THE POINT. The previous `moveCategory` rewrote only
   * the moved node's own hierarchy fields, so after a move every descendant
   * still claimed its OLD ancestors — which breaks the `array-contains` subtree
   * query, the category page's own listing, and `ProductRepository.deriveTaxonomy`
   * (it reads the leaf's `parentIds` to build each product's `categorySlugs`
   * chain). That is a data-corruption bug wearing the costume of a stale count.
   *
   * 🛑 AND THE METRIC DELTAS LIVE HERE, NOT IN A TRIGGER. `onCategoryWrite` is a
   * `categories` trigger that writes `categories`, and it is safe only because
   * every write it makes is gated on `parentIds` CHANGING — a structural guard.
   * A `metrics.*` write is not covered by that gate, so putting rollup
   * maintenance there is the Root Cause 92 shape that recursed 1,017,548 times
   * in 24 hours. Doing it in the same batch as the structural change has no
   * cycle to guard against in the first place.
   *
   * Returns the ids it rewrote, so a caller can log or verify the blast radius.
   */
  async reparentSubtree(
    categoryId: string,
    newParentId: string | null,
  ): Promise<string[]> {
    const node = await this.findByIdOrFail(categoryId);

    const newParent = newParentId
      ? await this.findByIdOrFail(newParentId)
      : null;

    const oldParentId = node.parentIds[node.parentIds.length - 1] ?? null;
    if (oldParentId === newParentId) return [];

    const descendants = await this.getDescendants(categoryId);

    /*
     * Cycle check. `isValidCategoryMove` only catches self-parenting and
     * direct-child-as-parent, so a move onto a DEEPER descendant slips past it
     * and detaches that whole branch from the forest with no error.
     */
    if (newParentId && descendants.some((d) => d.id === newParentId)) {
      throw new DatabaseError(
        `Invalid category move: ${newParentId} is a descendant of ${categoryId}`,
      );
    }
    if (!isValidCategoryMove(categoryId, newParentId, node)) {
      throw new DatabaseError(
        "Invalid category move: circular reference detected",
      );
    }

    const now = new Date();
    const writes: CategoryWrite[] = [];

    /*
     * Recompute top-down. A descendant's IMMEDIATE parent never changes when an
     * ancestor moves, so each node's new fields derive from its parent's new
     * fields — one pass in tier order, no recursion and no re-reads.
     */
    const rebuilt = new Map<string, CategoryDocument>();
    const movedFields = calculateCategoryFields(newParent, node.name, categoryId);
    rebuilt.set(categoryId, { ...node, ...movedFields });
    writes.push({ id: categoryId, data: { ...movedFields, updatedAt: now } });

    for (const child of [...descendants].sort((a, b) => a.tier - b.tier)) {
      const parentId = child.parentIds[child.parentIds.length - 1] ?? "";
      const parent = rebuilt.get(parentId);
      // A descendant whose parent is missing from the subtree means the chain is
      // already broken; leave it alone rather than writing a guess over it.
      if (!parent) continue;
      const fields = calculateCategoryFields(parent, child.name, child.id);
      rebuilt.set(child.id, { ...child, ...fields });
      writes.push({ id: child.id, data: { ...fields, updatedAt: now } });
    }

    /*
     * Rollup deltas, NETTED PER ANCESTOR.
     *
     * The old and new chains usually share ancestors (a move within one root),
     * and Firestore rejects two updates to the same document in one batch — so a
     * naive `-total` on the old chain followed by `+total` on the new one either
     * throws or double-counts. Net them first and drop the zeros; for a move
     * between siblings that leaves only two documents to touch.
     *
     * The delta is the moved node's own ROLLUP, not a subtree rescan: O(depth).
     * The moved node's own counts do not change — only its ancestors' rollups.
     */
    const m = node.metrics ?? ({} as CategoryDocument["metrics"]);
    const dProducts = m?.totalProductCount ?? 0;
    const dAuctions = m?.totalAuctionCount ?? 0;

    if (dProducts !== 0 || dAuctions !== 0) {
      const oldChain = node.parentIds;
      const newChain = newParent ? [...newParent.parentIds, newParent.id] : [];
      const net = new Map<string, number>();
      for (const id of oldChain) net.set(id, (net.get(id) ?? 0) - 1);
      for (const id of newChain) net.set(id, (net.get(id) ?? 0) + 1);

      for (const [id, sign] of net) {
        if (sign === 0) continue;
        writes.push({
          id,
          data: {
            "metrics.totalProductCount": increment(dProducts * sign),
            "metrics.totalAuctionCount": increment(dAuctions * sign),
            "metrics.totalItemCount": increment((dProducts + dAuctions) * sign),
            "metrics.lastUpdated": now,
            updatedAt: now,
          },
        });
      }
    }

    if (oldParentId) {
      writes.push({
        id: oldParentId,
        data: { childrenIds: arrayRemove(categoryId), updatedAt: now },
      });
    }
    if (newParentId) {
      writes.push({
        id: newParentId,
        data: {
          childrenIds: arrayUnion(categoryId),
          isLeaf: false,
          updatedAt: now,
        },
      });
    }

    try {
      await this.commitChunked(writes);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to move category ${categoryId}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    /*
     * A parent that just lost its last child becomes a leaf again. Done after the
     * commit because `childrenIds` is an arrayRemove above — reading it before
     * would see the stale array.
     */
    if (oldParentId) {
      const oldParent = await this.findById(oldParentId);
      if (oldParent && (oldParent.childrenIds?.length ?? 0) === 0) {
        await this.db
          .collection(this.collection)
          .doc(oldParentId)
          .update({ isLeaf: true, updatedAt: new Date() });
      }
    }

    await this.rewriteProductChains(rebuilt, categoryId);

    return writes.map((w) => w.id);
  }

  /**
   * Re-derive `categorySlugs` for every product inside a moved subtree.
   *
   * 🛑 WITHOUT THIS THE MOVE IS ONLY HALF DONE. `categorySlugs` is a
   * DENORMALISED COPY of the ancestor chain, written by
   * `ProductRepository.deriveTaxonomy` at product-write time. Moving a category
   * changes its descendants' chains but writes no product, so every product in
   * the subtree keeps pointing at the OLD ancestors — it stays listed under the
   * category it left and never appears under the one it joined. That is the same
   * unreachable-listing bug the move is supposed to fix, one level down.
   *
   * Metric-neutral, and that is load-bearing: `onProductWrite` keys its re-file
   * branch on the LEAF (`categorySlugs[0]`), which does not change when an
   * ancestor moves. So these writes early-return in the trigger and apply no
   * delta — the rollup was already moved by `reparentSubtree`. If this ever
   * started changing the leaf, it would double-count.
   *
   * Reads `products` through `this.db` rather than importing ProductRepository:
   * no repository in this codebase imports another feature's, because that is
   * the import chain that drags firebase-admin into a client bundle.
   */
  private async rewriteProductChains(
    rebuilt: Map<string, CategoryDocument>,
    movedId: string,
  ): Promise<void> {
    /*
     * ONE query for the whole subtree, matched on `categorySlugs` — NOT N queries
     * on the scalar `category`.
     *
     * 🛑 MEASURED 2026-09-14: `category` is unset on all 95 production products.
     * It is written by deriveTaxonomy, but every product here came from the seed,
     * which hand-writes `categorySlugs` only — so an equality query on that
     * scalar matched nothing and this rewrite silently did nothing at all. The
     * array field is the one that actually exists, and matching the MOVED node
     * gets the entire subtree in a single read because `categorySlugs` holds the
     * full ancestor chain.
     */
    const snap = await this.db
      .collection("products")
      .where(PRODUCT_FIELDS.CATEGORY_SLUGS, "array-contains", movedId)
      .get();

    const writes: CategoryWrite[] = [];

    for (const doc of snap.docs) {
      const current = (doc.data() as { categorySlugs?: string[] }).categorySlugs ?? [];
      const leaf = current[0];
      const cat = leaf ? rebuilt.get(leaf) : undefined;
      // A product whose leaf is outside the moved subtree has nothing to re-derive.
      if (!leaf || !cat) continue;

      // Self first, root last — byte-identical to what deriveTaxonomy produces.
      const chain = [leaf, ...(cat.parentIds ?? []).slice().reverse()];
      /*
       * Byte-identical to what deriveTaxonomy produces, INCLUDING the falsy
       * filter — these two must agree, or a product's names chain would differ
       * depending on whether it was last touched by a product write or a
       * category move, and nothing would report the difference.
       */
      const names = [
        cat.name,
        ...(cat.ancestors ?? []).map((a) => a?.name).reverse(),
      ].filter((n): n is string => !!n);

      if (chain.join(">") === current.join(">")) continue; // nothing moved for this row

      writes.push({
        id: doc.id,
        data: { categorySlugs: chain, categoryNames: names, updatedAt: new Date() },
      });
    }

    if (!writes.length) return;

    const products = this.db.collection("products");
    for (let i = 0; i < writes.length; i += 400) {
      const batch = this.db.batch();
      for (const w of writes.slice(i, i + 400)) {
        batch.update(products.doc(w.id), w.data);
      }
      await batch.commit();
    }
  }

  /**
   * Commit `writes` in chunks. Firestore caps a batch at 500 operations, and a
   * subtree rewrite plus its ancestor deltas can exceed that on a deep forest.
   */
  private async commitChunked(
    writes: CategoryWrite[],
    chunkSize = 400,
  ): Promise<void> {
    const colRef = this.db.collection(this.collection);
    for (let i = 0; i < writes.length; i += chunkSize) {
      const batch = this.db.batch();
      for (const w of writes.slice(i, i + chunkSize)) {
        batch.update(colRef.doc(w.id), w.data);
      }
      await batch.commit();
    }
  }

  /**
   * The public move. Everything real lives in `reparentSubtree` so the
   * delete-cascade path and this share one implementation — two copies of a
   * subtree rewrite would drift, and only one of them would be the one anybody
   * tested.
   */
  async moveCategory(input: CategoryMoveInput): Promise<CategoryDocument> {
    try {
      const { categoryId, newParentId } = input;
      await this.reparentSubtree(categoryId, newParentId ?? null);
      return this.findByIdOrFail(categoryId);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to move category: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async buildTree(rootId?: string): Promise<CategoryTreeNode[]> {
    try {
      let categories: CategoryDocument[];

      if (rootId) {
        categories = await this.getCategoriesByRootId(rootId);
      } else {
        const snapshot = await this.getCollection()
          .where(CATEGORY_FIELDS.IS_ACTIVE, "==", true)
          .orderBy(CATEGORY_FIELDS.TIER, "asc")
          .orderBy(CATEGORY_FIELDS.ORDER, "asc")
          .get();
        categories = snapshot.docs
          .map((doc) => this.mapDoc<CategoryDocument>(doc))
          .filter((category) => !category.isBrand);
      }

      return buildCategoryTree(categories, rootId);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to build category tree: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async toggleFeatured(
    categoryId: string,
    featured: boolean,
  ): Promise<CategoryDocument> {
    try {
      const category = await this.findByIdOrFail(categoryId);

      if (featured && !canBeFeatured(category)) {
        throw new DatabaseError(
          `Category must have at least ${MIN_ITEMS_FOR_FEATURED} items to be featured`,
        );
      }

      await this.db.collection(this.collection).doc(categoryId).update({
        isFeatured: featured,
        updatedAt: new Date(),
      });

      return this.findByIdOrFail(categoryId);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to toggle featured status: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Cloud Functions: stage metric increments into a caller-owned WriteBatch.
   * The caller must have already fetched `parentIds` for the category.
   */
  updateMetricsInBatch(
    batch: import("firebase-admin/firestore").WriteBatch,
    categoryId: string,
    parentIds: string[],
    productDelta: number,
    auctionDelta: number,
    productId?: string,
  ): void {
    const now = new Date();
    const colRef = this.db.collection(this.collection);

    const directRef = colRef.doc(categoryId);
    const directUpdate: FirestoreDocument = {
      "metrics.productCount": increment(productDelta),
      "metrics.auctionCount": increment(auctionDelta),
      "metrics.totalProductCount": increment(productDelta),
      "metrics.totalAuctionCount": increment(auctionDelta),
      "metrics.totalItemCount": increment(productDelta + auctionDelta),
      "metrics.lastUpdated": now,
      updatedAt: now,
    };

    if (productId && productDelta !== 0) {
      directUpdate["metrics.productIds"] =
        productDelta > 0 ? arrayUnion(productId) : arrayRemove(productId);
    }
    if (productId && auctionDelta !== 0) {
      directUpdate["metrics.auctionIds"] =
        auctionDelta > 0 ? arrayUnion(productId) : arrayRemove(productId);
    }

    batch.update(directRef, directUpdate);

    for (const ancestorId of parentIds) {
      batch.update(colRef.doc(ancestorId), {
        "metrics.totalProductCount": increment(productDelta),
        "metrics.totalAuctionCount": increment(auctionDelta),
        "metrics.totalItemCount": increment(productDelta + auctionDelta),
        "metrics.lastUpdated": now,
        updatedAt: now,
      });
    }
  }

  /**
   * Cloud Functions: full-overwrite category metrics (nightly reconciliation).
   *
   * 🛑 THE OWN COUNT AND THE ROLLUP ARE SEPARATE ARGUMENTS, and they must be.
   *
   * This method used to take ONE pair of numbers and write it to both
   * `productCount` and `totalProductCount` — so it could not express the
   * distinction the live trigger (`updateMetricsInBatch`, just above) carefully
   * maintains: `productCount` is the category's OWN items, `totalProductCount`
   * is own + every descendant's. The nightly job therefore overwrote correct
   * values with wrong ones every night:
   *
   *   - on a leaf it was accidentally right (a leaf has no descendants);
   *   - on an ancestor it wrote the DESCENDANT sum into both, so a category
   *     with 5 of its own and 15 below reported `productCount: 15` (should be
   *     5) and `totalProductCount: 15` (should be 20 — its own 5 were never
   *     added, because the caller's aggregate only walked other rows' leaves);
   *   - on a row that is both a leaf and an ancestor, `setMetrics` was called
   *     twice and last-write-won.
   *
   * Measured on production 2026-09-14 before the fix: **19 of 65 category rows
   * disagreed with a recount**, every one of them low — the root read 56 against
   * a true 65. Nothing errored, and no page looked broken; a wrong number is
   * simply a number.
   */
  async setMetrics(
    categoryId: string,
    m: {
      /** Items filed DIRECTLY under this category. */
      productCount: number;
      auctionCount: number;
      /** Own + every descendant's. Equals the own count on a leaf. */
      totalProductCount: number;
      totalAuctionCount: number;
      /** Own only — the ids are used for spot-checking, never for the rollup. */
      productIds: string[];
      auctionIds: string[];
    },
  ): Promise<void> {
    await this.db
      .collection(this.collection)
      .doc(categoryId)
      .update({
        "metrics.productCount": m.productCount,
        "metrics.auctionCount": m.auctionCount,
        "metrics.totalProductCount": m.totalProductCount,
        "metrics.totalAuctionCount": m.totalAuctionCount,
        "metrics.totalItemCount": m.totalProductCount + m.totalAuctionCount,
        "metrics.productIds": m.productIds,
        "metrics.auctionIds": m.auctionIds,
        "metrics.lastUpdated": new Date(),
        updatedAt: new Date(),
      });
  }

  /** SB-UNI — discriminator-keyed listing (sublistings, brands, bundles). */
  async listByType(
    type: import("../types").CategoryType,
    opts: { limit?: number; activeOnly?: boolean } = {},
  ): Promise<CategoryDocument[]> {
    let q: FirebaseFirestore.Query = this.db
      .collection(this.collection)
      .where(CATEGORY_FIELDS.CATEGORY_TYPE, "==", type);
    if (opts.activeOnly) q = q.where(CATEGORY_FIELDS.IS_ACTIVE, "==", true);
    if (opts.limit) q = q.limit(opts.limit);
    const snap = await q.get();
    return snap.docs.map((d) => this.mapDoc<CategoryDocument>(d));
  }

  /** SB-UNI — locate a category by slug, optionally constrained by discriminator. */
  async findBySlugAndType(
    slug: string,
    type?: import("../types").CategoryType,
  ): Promise<CategoryDocument | null> {
    let q: FirebaseFirestore.Query = this.db
      .collection(this.collection)
      .where(CATEGORY_FIELDS.SLUG, "==", slug)
      .limit(1);
    if (type) q = q.where(CATEGORY_FIELDS.CATEGORY_TYPE, "==", type);
    const snap = await q.get();
    if (snap.empty) return null;
    return this.mapDoc<CategoryDocument>(snap.docs[0]);
  }

  /**
   * SB-UNI-B — fetch products linked to a sublisting category (legacy
   * sublistingCategoryId field on ProductDocument), ordered by price asc.
   * Used by /api/sublisting-categories/[slug]/listings.
   */
  async getSublistingListings(
    sublistingId: string,
    limit = 20,
  ): Promise<FirestoreDocument[]> {
    const snap = await this.db
      .collection("products")
      .where("sublistingCategoryId", "==", sublistingId)
      .where(PRODUCT_FIELDS.STATUS, "==", "published")
      .orderBy(PRODUCT_FIELDS.PRICE, "asc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  /**
   * SB-UNI-B — delete a sublisting category and unlink all products
   * that referenced it. Mirrors the cascade behavior of the old
   * SublistingCategoriesRepository.delete().
   */
  async deleteWithSublistingUnlink(categoryId: string): Promise<void> {
    const batch = this.db.batch();
    const productsSnap = await this.db
      .collection("products")
      .where("sublistingCategoryId", "==", categoryId)
      .get();
    for (const doc of productsSnap.docs) {
      batch.update(doc.ref, { sublistingCategoryId: null, updatedAt: new Date() });
    }
    batch.delete(this.db.collection(this.collection).doc(categoryId));
    await batch.commit();
  }

  /**
   * SB-UNI-C — list active brand categories ordered by displayOrder.
   * Replaces the old `brandsRepository.findActive()` call site.
   */
  async findActiveBrands(): Promise<CategoryDocument[]> {
    const snap = await this.db
      .collection(this.collection)
      .where(CATEGORY_FIELDS.CATEGORY_TYPE, "==", "brand")
      .where(CATEGORY_FIELDS.IS_ACTIVE, "==", true)
      .orderBy(CATEGORY_FIELDS.ORDER, "asc")
      .get();
    return snap.docs.map((d) => this.mapDoc<CategoryDocument>(d));
  }

  /**
   * SB-UNI-B — derive the canonical `sublisting-{slug}` ID from a
   * human-entered category name.
   */
  async incrementViewCount(categoryId: string): Promise<void> {
    try {
      await this.db
        .collection(this.collection)
        .doc(categoryId)
        .update({ [CATEGORY_FIELDS.VIEW_COUNT]: increment(1) });
      // Fire-and-forget analytics: a lost view increment changes nothing that
      // renders, so it must never break the category read path it rides along
      // with — the count is approximate by design.
    } catch (_err) {
      void normalizeError(_err);
    }
  }

  generateSublistingId(name: string): string {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return base.startsWith("sublisting-") ? base : `sublisting-${base}`;
  }
}

export const categoriesRepository = new CategoriesRepository();
