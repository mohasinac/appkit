/*
 * WHY: Part rendering is embarrassingly parallel but its COMPLETION is not —
 *      exactly one finalizer must run, once, after the last shard. Cloud
 *      Functions guarantee at-least-once delivery, so "the last shard spawns
 *      the finalizer" is wrong the moment a shard is redelivered.
 * WHAT: Shard-task creation, and the transactional counter that elects the
 *       finalizer exactly once.
 *
 * 🛑 TWO MECHANISMS, and BOTH are required. Either alone is broken:
 *
 * 1. The counter is incremented inside `runTransaction`. A read-then-write
 *    would let two shards finishing together both read N-1 and both believe
 *    they were last.
 * 2. The finalize task is created with `.create()` at the FIXED doc id
 *    `{runId}__finalize`. A redelivered shard that increments again (or a
 *    transaction retried after its commit landed) would otherwise elect a
 *    second finalizer, which double-renders every part and double-charges the
 *    Storage write budget.
 *
 * The second is what makes the first safe under redelivery, and a duplicate
 * `create()` failing is the DESIGNED outcome — it is caught and reported as
 * "already elected", never as an error.
 *
 * 🛑 Tasks are consumed by a `documentCreated` trigger, NEVER
 * `documentWritten`. A write trigger on a collection its own shards write back
 * into is Root Cause #92: 1,017,548 invocations in 24h against a 2M/month free
 * quota, with a billing page as the only symptom.
 *
 * EXPORTS: planShards, createShardTasks, completeShardAndMaybeElectFinalizer,
 *   finalizeTaskId, shardTaskId
 *
 * @tag domain:sticker-trace
 * @tag layer:server
 * @tag pattern:none
 * @tag access:server
 * @tag consumers:coordinator,shard
 * @tag sideEffects:firestore
 */

import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";
import { getAdminDb } from "../../../../providers/db-firebase";
import {
  STICKER_TRACE_TASKS_COLLECTION,
  type StickerTraceTaskDocument,
} from "../../../../features/sticker-trace/schemas/firestore";

export function shardTaskId(runId: string, shardIndex: number): string {
  return `${runId}__part__${shardIndex}`;
}

export function finalizeTaskId(runId: string): string {
  return `${runId}__finalize`;
}

/**
 * Split ordinals into shards.
 *
 * 🛑 Bounded by SHARD COUNT, not by a fixed slice size. `maxInstances` is 8, so
 * more shards than that queue rather than run — and a degenerate scan that
 * segments into hundreds of specks would otherwise create hundreds of task
 * documents, each a Firestore write and an invocation, to render parts the
 * minimum-area filter already rejected.
 */
export function planShards(
  partOrdinals: readonly number[],
  maxShards: number,
): number[][] {
  if (partOrdinals.length === 0) return [];
  const shards = Math.max(1, Math.min(maxShards, partOrdinals.length));
  const out: number[][] = Array.from({ length: shards }, () => []);
  // Round-robin rather than contiguous slices: part sizes vary by an order of
  // magnitude on these sheets, so contiguous blocks give one shard every large
  // sticker and the wall-clock is that shard.
  for (let i = 0; i < partOrdinals.length; i++) {
    out[i % shards]!.push(partOrdinals[i]!);
  }
  return out;
}

/** Write the shard tasks. Each `documentCreated` fires one shard function. */
export async function createShardTasks(input: {
  runId: string;
  sheetId: string;
  mode: StickerTraceTaskDocument["mode"];
  shards: readonly number[][];
}): Promise<number> {
  const db = getAdminDb();
  const batch = db.batch();
  const now = new Date();

  input.shards.forEach((partOrdinals, shardIndex) => {
    const ref = db
      .collection(STICKER_TRACE_TASKS_COLLECTION)
      .doc(shardTaskId(input.runId, shardIndex));
    // fanout-idempotent-ok: fixed doc id derived from runId + shardIndex, so a
    // redelivered coordinator overwrites the same task rather than adding one.
    batch.set(ref, {
      runId: input.runId,
      sheetId: input.sheetId,
      kind: "part",
      mode: input.mode,
      shardIndex,
      partOrdinals,
      createdAt: now,
      updatedAt: now,
    });
  });

  await batch.commit();
  return input.shards.length;
}

export interface ShardCompletion {
  /** How many shards have now reported, after this one. */
  shardsDone: number;
  /** True when THIS call elected the finalizer. Exactly one caller sees true. */
  electedFinalizer: boolean;
  /** True when the finalize task already existed — a redelivery, not a fault. */
  alreadyElected: boolean;
}

/**
 * Report one shard done and, if it was the last, elect the finalizer.
 *
 * The counter lives on the TASK document rather than the run: a shard already
 * holds its own task id, so incrementing there needs no extra read, and the run
 * document stays owned by the progress writer alone — two writers on one doc is
 * how a status flip and an event append start clobbering each other.
 */
export async function completeShardAndMaybeElectFinalizer(input: {
  runId: string;
  sheetId: string;
  shardIndex: number;
  shardCount: number;
  mode: StickerTraceTaskDocument["mode"];
}): Promise<ShardCompletion> {
  const db = getAdminDb();
  const counterRef = db
    .collection(STICKER_TRACE_TASKS_COLLECTION)
    .doc(`${input.runId}__counter`);

  /*
   * 🛑 The increment MUST be inside the transaction. Two shards finishing in
   * the same millisecond would both read shardCount-1 and both think they were
   * last — the classic lost update, and the symptom is two finalizers, which
   * is twice the Storage writes and a race on the run's terminal status.
   */
  const shardsDone = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const done = ((snap.exists ? snap.data()?.shardsDone : 0) ?? 0) + 1;
    tx.set(counterRef, { runId: input.runId, shardsDone: done }, { merge: true });
    return done;
  });

  if (shardsDone < input.shardCount) {
    return { shardsDone, electedFinalizer: false, alreadyElected: false };
  }

  /*
   * 🛑 `.create()`, not `.set()`. This is the second half of the guarantee: a
   * redelivered shard re-runs the transaction, reaches the threshold again, and
   * arrives here — and `create()` on an existing doc THROWS, which is the
   * designed outcome. `set()` would silently rewrite the task and fire a second
   * documentCreated trigger.
   */
  const finalizeRef = db
    .collection(STICKER_TRACE_TASKS_COLLECTION)
    .doc(finalizeTaskId(input.runId));
  const now = new Date();

  try {
    // fanout-idempotent-ok: create() at a fixed doc id is the election; a
    // duplicate throws and is reported as alreadyElected, never as a failure.
    await finalizeRef.create({
      runId: input.runId,
      sheetId: input.sheetId,
      kind: "finalize",
      mode: input.mode,
      partOrdinals: [],
      createdAt: now,
      updatedAt: now,
    });
    return { shardsDone, electedFinalizer: true, alreadyElected: false };
  } catch (err) {
    const n = normalizeError(err);
    /*
     * Logged at INFO, not warn: under at-least-once delivery this is expected
     * traffic, and warning on it would train the operator to ignore the log
     * that also carries real finalizer failures.
     */
    serverLogger.info("Sticker trace finalizer already elected (redelivery)", {
      runId: input.runId,
      shardIndex: input.shardIndex,
      message: n.message,
    });
    return { shardsDone, electedFinalizer: false, alreadyElected: true };
  }
}
