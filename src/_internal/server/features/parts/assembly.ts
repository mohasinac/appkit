/**
 * D13 — assemble a complete bey from component listings, and part one back out.
 *
 * This is the step the whole parts model exists for. Spares arrive, get
 * identified down to colourway, counted into inventory, and assembled into
 * sellable complete beys. Nobody in the fifteen-site crawl does component-level
 * assembly — raikages is the only source with component-level pricing at all
 * (energy rings ₹149–249, tips ₹129–149) and they sell parts without
 * assembling them.
 *
 * ── 🛑 WHY A PART IS A `ProductDocument` AND NOT A NEW COLLECTION ──────────
 *
 * A `partInventory` collection would rebuild everything C3 and C4 shipped. A
 * part here is sellable (the tree has four `*-parts` branches), has stock, has
 * a bin, and needs low-stock alerts — so it is a listing, and it inherits the
 * stock column, the location search in both directions, the bulk-stock action
 * and the reserved-quantity model unchanged.
 *
 * ── 🛑 THE ONE THING THAT MUST NOT BE GOT WRONG: WHICH FIELD IS READ ───────
 *
 * Assembly reads **`availableQuantity`**, never `stockQuantity`. A component
 * with 10 in stock and 3 reserved has **seven** assemblable, and assembling
 * from `stockQuantity` builds a bey out of parts somebody has already bought.
 * `resolveStockResync` encodes the same relationship from the other direction
 * (`reserved = prevStock − prevAvailable`) and A4 existed because getting it
 * wrong leaves a sold-out listing unbuyable.
 *
 * ── 🛑 AND IT RE-READS INSIDE A TRANSACTION ────────────────────────────────
 *
 * Every read happens inside `runTransaction` and before any write. The
 * PhonePe path's `unitOfWork.runBatch` is atomic and does **not** re-read — its
 * quantities come from a snapshot taken earlier, outside any transaction, so it
 * can oversell under concurrency. An assembly that decrements five components
 * from a stale snapshot does that same thing five times at once.
 */
import type { Transaction } from "firebase-admin/firestore";
import { unitOfWork } from "../../../../core/unit-of-work";
import { PRODUCT_COLLECTION } from "../../../../features/products/schemas/firestore";
import { getAdminDb } from "../../../../providers/db-firebase";
import { serverLogger } from "../../../../monitoring/server-logger";
import { ValidationError, ConflictError } from "../../../../errors";

/** One component the assembly consumes. */
export interface AssemblyComponent {
  slotKey: string;
  /** A part LISTING's id — a `ProductDocument`, not a `partGlossary` row. */
  productId: string;
  quantity: number;
}

export interface AssembleInput {
  /** The store doing the assembly. Parts are `storeId`-scoped like any listing. */
  storeId: string;
  /** The complete-bey listing being created or restocked. */
  targetProductId: string;
  components: readonly AssemblyComponent[];
  /** How many complete beys to build. */
  units?: number;
}

export interface AssemblyResult {
  targetProductId: string;
  unitsBuilt: number;
  /** Per component: what it had available, and what it has now. */
  consumed: Array<{ productId: string; before: number; after: number; taken: number }>;
}

/** The hard cap, matching the write schema's `.max(8)` on `assembledFrom`. */
export const MAX_ASSEMBLY_COMPONENTS = 8;

/**
 * 🛑 The fields read inside the transaction, named once.
 *
 * `availableQuantity` is the gate (see the header). `stockQuantity` is read
 * only so the reservation can be CARRIED FORWARD rather than discarded —
 * writing `availableQuantity` without adjusting `stockQuantity` by the same
 * amount would make `reserved` drift by exactly the units consumed, and
 * `resolveStockResync` would then hand those units back to the shelf on the
 * seller's next edit. That is A4's bug arriving through a new door.
 */
interface StockSnapshot {
  stockQuantity: number;
  availableQuantity: number;
  storeId?: string;
}

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** What a planner decided to write, before anything touches Firestore. */
export interface StockWrite {
  productId: string;
  stockQuantity: number;
  availableQuantity: number;
}

export interface AssemblyPlan {
  writes: StockWrite[];
  consumed: AssemblyResult["consumed"];
  /** The complete-bey listing's own new figures. */
  target: StockWrite;
}

/**
 * The whole decision, as a PURE function of the documents and the request.
 *
 * 🛑 Extracted because the arithmetic is the part most likely to be wrong and
 * the transaction is the part hardest to test. A fake Firestore cannot be
 * injected across an ESM namespace boundary — measured: `Object.defineProperty`
 * on the imported namespace throws, so a mock-based harness reported every
 * ordering assertion as green having executed none of them. Rather than
 * weaken the module with a test-only injection seam, the thing worth asserting
 * moved OUT of the transaction: which field gates the build, how the
 * reservation is carried, and what is refused.
 *
 * `direction` is `-1` for an assembly (components are consumed) and `+1` for a
 * part-out (components are produced), so there is ONE implementation of the
 * gate and the carry rather than two that must agree.
 */
export function planAssembly(args: {
  storeId: string;
  /** The complete bey: consumed on part-out, produced on assembly. */
  subject: { productId: string; doc: StockSnapshot | undefined };
  components: ReadonlyArray<{ request: AssemblyComponent; doc: StockSnapshot | undefined }>;
  units: number;
  /** -1 consumes the components (assemble); +1 produces them (part out). */
  direction: -1 | 1;
}): AssemblyPlan {
  const { storeId, subject, components, units, direction } = args;

  if (!subject.doc) {
    throw new ValidationError(
      direction === -1
        ? "The listing being assembled no longer exists."
        : "The listing being parted out no longer exists.",
    );
  }
  if (subject.doc.storeId && subject.doc.storeId !== storeId) {
    throw new ValidationError("That listing belongs to another store.");
  }

  /*
   * 🛑 On a PART-OUT the subject is what gets consumed, so it needs the same
   * availability gate as a component: a bey with 2 in stock and 1 reserved can
   * only have ONE parted out. On an assembly the subject only ever gains, so
   * there is nothing to check.
   */
  const subjectAvailable = num(subject.doc.availableQuantity);
  if (direction === 1 && subjectAvailable < units) {
    throw new ConflictError(
      `Not enough available to part out: needs ${units}, has ${subjectAvailable}.`,
    );
  }

  const consumed: AssemblyResult["consumed"] = [];
  const writes: StockWrite[] = [];

  for (const { request, doc } of components) {
    if (!doc) {
      throw new ValidationError(
        direction === -1
          ? `A component is missing: ${request.productId}`
          : `A destination component is missing: ${request.productId}`,
      );
    }
    /*
     * 🛑 Scoped to the caller's own store. An admin assembling from a seller's
     * bins would be writing another store's inventory; the only legitimate
     * version is `store-letitrip-official` using its OWN stock, which this
     * already allows.
     */
    if (doc.storeId && doc.storeId !== storeId) {
      throw new ValidationError(
        `A component belongs to another store: ${request.productId}`,
      );
    }

    const delta = request.quantity * units * direction;
    const available = num(doc.availableQuantity);

    // 🛑 THE GATE, and it reads `availableQuantity` — see the file header.
    if (direction === -1 && available < -delta) {
      // 409, not 400: the request is well formed and the world changed.
      throw new ConflictError(
        `Not enough available: needs ${-delta}, has ${available}.`,
      );
    }

    consumed.push({
      productId: request.productId,
      before: available,
      after: available + delta,
      taken: -delta,
    });
    writes.push({
      productId: request.productId,
      // Both fields move by the SAME amount, so an outstanding reservation is
      // carried forward exactly rather than handed back to the shelf.
      stockQuantity: Math.max(0, num(doc.stockQuantity) + delta),
      availableQuantity: available + delta,
    });
  }

  const subjectDelta = units * -direction;
  return {
    writes,
    consumed,
    target: {
      productId: subject.productId,
      stockQuantity: Math.max(0, num(subject.doc.stockQuantity) + subjectDelta),
      availableQuantity: subjectAvailable + subjectDelta,
    },
  };
}

/**
 * The input rules, shared by both directions so they cannot drift.
 *
 * Runs before any Firestore access, which is also why it is separable.
 */
export function assertAssemblyInput(
  components: readonly AssemblyComponent[],
  units: number,
): void {
  if (!Number.isInteger(units) || units < 1 || units > 99) {
    throw new ValidationError("Quantity must be a whole number between 1 and 99.");
  }
  if (components.length === 0) {
    throw new ValidationError("An assembly needs at least one component.");
  }
  if (components.length > MAX_ASSEMBLY_COMPONENTS) {
    throw new ValidationError(
      `An assembly may involve at most ${MAX_ASSEMBLY_COMPONENTS} components.`,
    );
  }
  /*
   * 🛑 Two entries for one product id would each be planned against the SAME
   * read value and each subtract from it, so the second would silently
   * overdraw. Refused rather than summed: a caller sending a product twice is
   * describing something it does not mean, and summing would decide for them.
   */
  const seen = new Set<string>();
  for (const c of components) {
    if (seen.has(c.productId)) {
      throw new ValidationError(
        "The same component appears twice. Combine it into one row with the total quantity.",
      );
    }
    seen.add(c.productId);
  }
}

/**
 * Build `units` copies of a complete bey, consuming its components.
 *
 * A thin shell over `planAssembly`: read everything, decide purely, write.
 *
 * Throws rather than partially succeeding —
 * - `ValidationError` — malformed, missing, or another store's listing.
 * - `ConflictError`   — a component does not have enough available. 409 and
 *   not 400: the request is well formed and the seller is not confused, the
 *   world changed under them, so the next action is to restock rather than to
 *   fix a field. Same distinction as removing a booked lottery slot.
 */
export async function assembleFromComponents(
  input: AssembleInput,
): Promise<AssemblyResult> {
  const units = input.units ?? 1;
  assertAssemblyInput(input.components, units);

  const col = getAdminDb().collection(PRODUCT_COLLECTION);

  return unitOfWork.runTransaction(async (tx: Transaction) => {
    // ── EVERY READ FIRST. Firestore requires it, and so does correctness. ──
    const subjectRef = col.doc(input.targetProductId);
    const componentRefs = input.components.map((c) => col.doc(c.productId));
    const [subjectSnap, ...componentSnaps] = await tx.getAll(
      subjectRef,
      ...componentRefs,
    );

    const plan = planAssembly({
      storeId: input.storeId,
      subject: {
        productId: input.targetProductId,
        doc: subjectSnap.exists ? (subjectSnap.data() as StockSnapshot) : undefined,
      },
      components: input.components.map((request, i) => ({
        request,
        doc: componentSnaps[i].exists
          ? (componentSnaps[i].data() as StockSnapshot)
          : undefined,
      })),
      units,
      direction: -1,
    });

    // ── WRITES ONLY AFTER EVERY READ ──────────────────────────────────────
    const now = new Date();
    for (const w of plan.writes) {
      tx.update(col.doc(w.productId), {
        stockQuantity: w.stockQuantity,
        availableQuantity: w.availableQuantity,
        updatedAt: now,
      });
    }
    tx.update(subjectRef, {
      stockQuantity: plan.target.stockQuantity,
      availableQuantity: plan.target.availableQuantity,
      assembledFrom: input.components.map((c) => ({ ...c })),
      updatedAt: now,
    });

    serverLogger.info("assembleFromComponents", {
      storeId: input.storeId,
      targetProductId: input.targetProductId,
      units,
      components: plan.consumed.length,
    });
    return {
      targetProductId: input.targetProductId,
      unitsBuilt: units,
      consumed: plan.consumed,
    };
  });
}

export interface PartOutInput {
  storeId: string;
  /** The complete bey being broken down. */
  sourceProductId: string;
  /** Which component listings receive the parts. */
  components: readonly AssemblyComponent[];
  units?: number;
}

/**
 * The inverse: decrement the bey, increment each component.
 *
 * 🛑 Spares arrive as whole beys too, so this is not a convenience — it is half
 * the workflow. Without it, "part out" would only work on beys this system
 * built, which is none of the current catalogue (GAP-10).
 *
 * Same planner, `direction: 1`. ONE implementation of the gate and the
 * reservation carry rather than two that must agree.
 */
export async function partOutToComponents(
  input: PartOutInput,
): Promise<AssemblyResult> {
  const units = input.units ?? 1;
  assertAssemblyInput(input.components, units);

  const col = getAdminDb().collection(PRODUCT_COLLECTION);

  return unitOfWork.runTransaction(async (tx: Transaction) => {
    const subjectRef = col.doc(input.sourceProductId);
    const componentRefs = input.components.map((c) => col.doc(c.productId));
    const [subjectSnap, ...componentSnaps] = await tx.getAll(
      subjectRef,
      ...componentRefs,
    );

    const plan = planAssembly({
      storeId: input.storeId,
      subject: {
        productId: input.sourceProductId,
        doc: subjectSnap.exists ? (subjectSnap.data() as StockSnapshot) : undefined,
      },
      components: input.components.map((request, i) => ({
        request,
        doc: componentSnaps[i].exists
          ? (componentSnaps[i].data() as StockSnapshot)
          : undefined,
      })),
      units,
      direction: 1,
    });

    const now = new Date();
    for (const w of plan.writes) {
      tx.update(col.doc(w.productId), {
        stockQuantity: w.stockQuantity,
        availableQuantity: w.availableQuantity,
        updatedAt: now,
      });
    }
    tx.update(subjectRef, {
      stockQuantity: plan.target.stockQuantity,
      availableQuantity: plan.target.availableQuantity,
      updatedAt: now,
    });

    serverLogger.info("partOutToComponents", {
      storeId: input.storeId,
      sourceProductId: input.sourceProductId,
      units,
      components: plan.consumed.length,
    });
    return {
      targetProductId: input.sourceProductId,
      unitsBuilt: units,
      consumed: plan.consumed,
    };
  });
}
