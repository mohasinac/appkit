import { normalizeError } from "../../errors/normalize";
// Types only — `encrypted.ts` has no runtime imports (Root Cause #24).
import type { Plaintext } from "../../security/encrypted";
import type { FirestoreDocument } from "../../schemas/types";
import type {
  CollectionReference,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  Query,
  Transaction,
  WriteBatch,
} from "firebase-admin/firestore";
import { DatabaseError, NotFoundError } from "../../errors";
import { serverLogger } from "../../monitoring";
import {
  applySieveToFirestore,
  countSieveMatches,
  type FirebaseSieveFields,
  type FirebaseSieveOptions,
  type FirebaseSieveResult,
  type SieveModel,
} from "./sieve";
import { deserializeTimestamps, prepareForFirestore } from "./helpers";
import { getAdminDb } from "./admin";
import { encryptPiiFields, piiIndicesFor, decryptValue } from "../../security/pii-encrypt";
import { isPiiEncrypted } from "../../security/pii-mask";
import {
  BLIND_INDEX_KEY_VERSION_FIELD,
  CURRENT_BLIND_INDEX_KEY_VERSION,
} from "../../security/blind-index-tokens";
import { piiPolicyFor } from "../../security/pii-registry";
import type { JsonValue } from "../../schemas/types";

/**
 * The underlying failure's message, for interpolation into a DatabaseError.
 *
 * Every wrap below used to read `"Failed to update document: abc123"` and
 * nothing else, so the persisted serverErrors row — whose `message` is what the
 * admin list renders — said only which method failed, never why. `cause` now
 * carries the stack, but a human scanning the list needs the reason on the row.
 */
function detailOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export abstract class BaseRepository<T extends DocumentData> {
  protected collection: string;

  constructor(collectionName: string) {
    this.collection = collectionName;
  }

  protected get db(): Firestore {
    return getAdminDb();
  }

  protected getCollection() {
    return this.db.collection(this.collection);
  }

  protected mapDoc<D = T>(snap: DocumentSnapshot): D {
    return deserializeTimestamps({
      id: snap.id,
      ...(snap.data() ?? {}),
    }) as unknown as D;
  }

  /**
   * How a row is mapped on a LIST read (anything through `sieveQuery`).
   *
   * Defaults to `mapDoc`, so a repository that overrides `mapDoc` to decrypt,
   * project or normalise now gets that on list reads too — Sieve used to map
   * documents itself and never call `mapDoc` at all, which is why
   * `/api/admin/users` served ciphertext emails.
   *
   * It is a SEPARATE hook because a list is not a detail read. A repository
   * whose `mapDoc` decrypts a secret must not hand that secret to a list —
   * `StoreRepository` overrides this to drop the WhatsApp token, since
   * `listStores(activeOnly)` backs the PUBLIC /stores page.
   */
  protected mapDocForList<D = T>(snap: DocumentSnapshot): D {
    return this.mapDoc<D>(snap);
  }

  async findById(id: string): Promise<T | null> {
    try {
      const doc = await this.getCollection().doc(id).get();

      if (!doc.exists) {
        return null;
      }

      return this.mapDoc(doc);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to find document by ID: ${id}: ${detailOf(error)}`, error);
    }
  }

  async findByIdOrFail(id: string): Promise<T> {
    const doc = await this.findById(id);

    if (!doc) {
      throw new NotFoundError(`Document not found: ${id}`);
    }

    return doc;
  }

  async findBy(field: string, value: unknown): Promise<T[]> {
    try {
      const snapshot = await this.getCollection()
        .where(field, "==", value)
        .get();

      return snapshot.docs.map((doc) => this.mapDoc(doc));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to find documents by ${field}: ${detailOf(error)}`, error);
    }
  }

  async findOneBy(field: string, value: unknown): Promise<T | null> {
    try {
      const snapshot = await this.getCollection()
        .where(field, "==", value)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return this.mapDoc(snapshot.docs[0]);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to find document by ${field}: ${detailOf(error)}`, error);
    }
  }

  async findAll(limit?: number): Promise<T[]> {
    try {
      let query = this.getCollection();

      if (limit) {
        query = query.limit(limit) as typeof query;
      }

      const snapshot = await query.get();
      return snapshot.docs.map((doc) => this.mapDoc(doc));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to fetch all documents: ${detailOf(error)}`, error);
    }
  }

  /**
   * PII fields for this collection, encrypted on every write path below.
   *
   * Declare it in the subclass instead of overriding `create`/`update` by hand.
   * There were no encryption hooks here at all, so encryption was opt-in per
   * method per repository — which meant `createWithId`, `update`, and the whole
   * `*InTx` / `*InBatch` family were silent bypasses in any repo that had only
   * overridden `create`. `sessions.deviceInfo.ip` sat in plaintext for exactly
   * that reason.
   */
  protected piiFields: readonly string[] = [];

  /** Blind-index map (plaintext field → index field) for equality lookups. */
  protected piiIndexMap: Record<string, string> = {};

  /**
   * Build this document's `searchTxt` tokens. Return `null` to leave the field
   * alone (the default), so a collection opts in by overriding this.
   *
   * MUST NOT include PII: `searchTxt` stores readable fragments of the source
   * text, so indexing an encrypted field would undo the encryption.
   */
  protected buildSearchTxtFor(_data: Record<string, JsonValue>): string[] | null {
    return null;
  }

  /**
   * Build this document's `*TokensIndex` fields — whole-word HMAC digests
   * over PII, for admin search without decryption. Return `null` to leave
   * the document alone (the default).
   *
   * Mirrors `buildSearchTxtFor`'s shape exactly, and for the reason that
   * shape exists: a hook run from `applyWriteHooks` reaches EVERY write path
   * — create, createWithId, update, the `*InTx`/`*InBatch` family, and a
   * seed load, which goes through the same repository methods. A one-off
   * backfill script cannot reach any of those; it only catches documents
   * that already existed when it ran.
   *
   * 🛑 This is NOT `buildSearchTxtFor`'s inverse rule. `searchTxt` must never
   * carry PII; this hook exists FOR PII, and runs in the only place that
   * sees the plaintext before `encryptPiiFields` replaces it. See
   * `security/blind-index-tokens.ts` for why the tokens are whole-word only.
   *
   * Return shape is `{ fieldName: digests[] }` rather than a single array,
   * because a document can carry more than one token field (a payout has
   * `sellerTokensIndex`, nothing else does yet, but the hook is general).
   */
  protected buildTokensIndexFor(
    _data: Record<string, JsonValue>,
  ): Record<string, string[]> | null {
    return null;
  }

  /**
   * The one place writes are transformed. Every write path routes through here
   * so a new method cannot silently skip encryption.
   *
   * `encryptPiiFields` is idempotent (it skips anything already carrying the
   * `enc:v1:` prefix), so a subclass that still encrypts by hand before calling
   * super is harmless rather than double-encrypted.
   */
  /**
   * `piiIndexMap` restricted to fields whose incoming value is still PLAINTEXT.
   *
   * ## 🛑 THE BUG THIS CLOSES, MEASURED 2026-11-11
   *
   * `piiIndicesFor` hashes whatever it is given, and `applyWriteHooks` hands it
   * `data`. When `data` is ALREADY HOOKED — which happens whenever a subclass
   * calls `applyWriteHooks` itself and then delegates to `super.update` — the
   * mapped index is recomputed as `HMAC(ciphertext)` and **overwrites the
   * correct digest**. The derived `` `${field}Index` `` sibling is safe because
   * `encryptPiiFields` skips a value already carrying `enc:v1:`; the MAPPED
   * path had no such guard.
   *
   * Proven in isolation:
   *
   *     pass 1 emailIndex == findByEmail digest : true
   *     pass 2 emailIndex == findByEmail digest : false
   *     pass 2 == hmac(ciphertext)              : true
   *
   * Four repositories pre-hooked and then delegated —
   * `UserRepository.update`, `AddressesRepository.update`/`createWithId`,
   * `PayoutRepository.update`, `ReviewRepository.update` — so
   * `userRepository.update(uid, { email })` wrote a garbage `emailIndex` and
   * `findByEmail` then **could not find that user**, with nothing logged and
   * the plaintext still perfectly recoverable. Same shape for
   * `reviews.userNameIndex` (the admin review search) and
   * `payouts.sellerEmailIndex`.
   *
   * The redundant calls are removed, but this guard stays: those overrides were
   * each individually reasonable-looking, and the next one would reintroduce
   * it. Skipping a ciphertext source also leaves the EXISTING correct digest in
   * place, because it rides along in `data`.
   */
  private plaintextOnlyIndexMap(data: object): Record<string, string> {
    const access = data as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [source, indexField] of Object.entries(this.piiIndexMap)) {
      const value = access[source];
      if (typeof value === "string" && isPiiEncrypted(value)) continue;
      out[source] = indexField;
    }
    return out;
  }

  protected applyWriteHooks<D extends object>(
    data: D,
    opts?: { partial?: boolean },
  ): D {
    let out: D = data;

    if (this.piiFields.length > 0) {
      out = {
        ...encryptPiiFields(out, [...this.piiFields]),
        // Indices are derived from the PLAINTEXT source and must not carry it
        // along — see piiIndicesFor's docstring for the bug that caused.
        ...piiIndicesFor(data, this.plaintextOnlyIndexMap(data)),
      } as D;
    }

    const searchTxt = this.buildSearchTxtFor(out as Record<string, JsonValue>);
    if (searchTxt) (out as Record<string, JsonValue>).searchTxt = searchTxt;

    /*
     * 🛑 A PARTIAL patch that carries only SOME of the token index's sources
     * writes NO token index at all.
     *
     * The index is an HMAC over several plaintext fields together, so building
     * it from a subset produces a SHORTER valid-looking array — and the
     * difference between "stale" and "truncated" is the difference between a
     * recoverable state and an undetectable one. `update()` resolves this
     * properly by reading the stored document and merging (see
     * `mergedTokensIndexFor`); `updateInTx` / `updateInBatch` CANNOT, because
     * they are synchronous and Firestore forbids a read after a write inside a
     * transaction. So they leave the stored index alone and
     * `scripts/pii-backfill.mjs` can repair it, instead of shrinking it where
     * nothing would ever notice.
     *
     * Not applied to `create`/`createWithId`: there an absent source is a
     * document that genuinely has no value for it (a user with no email), and
     * indexing the fields that ARE present is correct. Only the caller knows
     * which case it is, which is why this is an argument rather than a guess.
     */
    if (opts?.partial) {
      const sources = this.tokensIndexSources();
      const touched = sources.filter((f) => f in (data as Record<string, unknown>));
      if (sources.length > 0 && touched.length > 0 && touched.length < sources.length) {
        return out;
      }
    }

    /*
     * 🛑 REFUSE to tokenise a source that is ALREADY CIPHERTEXT.
     *
     * `data` is supposed to be the plaintext, but nothing in the type system
     * says so, and a caller that has already run the hooks hands over
     * `enc:v1:…`. `buildTokensIndex` would then hash base64 fragments of the
     * ciphertext — digests of nothing, stored in the field admin search reads.
     *
     * MEASURED, 2026-11-11, and this was live: `UserRepository.createWithId`
     * called `applyWriteHooks` itself and then delegated to
     * `super.createWithId`, which applies them AGAIN. `encryptPiiFields` is
     * idempotent so the encryption was fine, but the token index is NOT — the
     * second pass rebuilt it from the ciphertext email and OVERWROTE the
     * correct one. For `Proof Tester` / `proof.tester@example.com`: 4 correct
     * digests became 7, of which only 2 were real. Searching that user by
     * their email domain matched nothing, and five junk digests sat in the
     * document looking exactly like valid ones.
     *
     * The redundant call is removed, but the guard stays: a silent wrong index
     * is undetectable, and this makes the whole class unrepresentable rather
     * than fixed in one caller.
     */
    const tokenSources = this.tokensIndexSources();
    const sourceIsCiphertext = tokenSources.some((field) => {
      const value = (data as Record<string, unknown>)[field];
      return typeof value === "string" && isPiiEncrypted(value);
    });
    if (sourceIsCiphertext) return out;

    /*
     * `data`, not `out` — the plaintext source, same as `piiIndicesFor`
     * above. By this point `out` may already hold ciphertext, and hashing
     * ciphertext would make the index meaningless.
     */
    const tokensIndex = this.buildTokensIndexFor(data as Record<string, JsonValue>);
    if (tokensIndex) {
      Object.assign(out as Record<string, JsonValue>, tokensIndex, {
        [BLIND_INDEX_KEY_VERSION_FIELD]: CURRENT_BLIND_INDEX_KEY_VERSION,
      });
    }

    return out;
  }

  /**
   * The PLAINTEXT fields this collection's token index is hashed from, read
   * from the ONE registry rather than re-declared here.
   *
   * 🛑 Deliberately NOT a new `protected tokensIndexSources` the subclass
   * declares beside `buildTokensIndexFor()`. That would be a SECOND list of
   * the same thing, one method body away from the first, and
   * `security/pii-registry.ts` exists precisely because five copies of this
   * policy drifted. `scripts/audit-pii-registry.mjs` already polices the
   * registry against the repositories, so reading `tokensIndex.from` here puts
   * the merge logic under an existing guard instead of inventing a new
   * unguarded one.
   *
   * Returns `[]` for every collection with no token index — which is all but
   * three — and that empty list is what makes `update()` free for them.
   */
  private tokensIndexSources(): readonly string[] {
    return piiPolicyFor(this.collection)?.tokensIndex?.from ?? [];
  }

  /**
   * Rebuild the `*TokensIndex` from the STORED document merged under a PARTIAL
   * patch — or `null` when no read is needed.
   *
   * ## 🛑 THE DEFECT THIS CLOSES
   *
   * `applyWriteHooks` builds the token index from the data it is handed, which
   * on `update()` is the PATCH. `buildTokensIndexFor` then sees only the fields
   * that happen to be in the patch, so
   *
   *     update(uid, { displayName })
   *
   * rewrote `nameTokensIndex` with the digests of the NAME ALONE and silently
   * dropped every email-derived token. The index does not break — it SHRINKS,
   * on exactly the users who edited their profile, and the symptom is an admin
   * search that stops finding someone it used to find. Production was
   * backfilled 2026-11-11 to add these indices; this would have undone that one
   * user at a time, invisibly.
   *
   * ## WHEN IT READS, AND WHY THAT IS NOT EVERY UPDATE
   *
   * A fetch on every `update()` would put one extra document read on the
   * hottest write path in the platform. Three conditions gate it, and each
   * removes a case that provably cannot need it:
   *
   *   1. **No token index declared** → return immediately. True for 17 of the
   *      20 registered collections and for every collection that is not in the
   *      registry at all, i.e. the overwhelming majority of `update()` calls.
   *      Zero reads, zero behaviour change.
   *   2. **The patch touches no source field** → `buildTokensIndexFor(patch)`
   *      returns `null` anyway, so the stored index is already left alone.
   *   3. **The patch carries EVERY source field** → it is self-sufficient and
   *      `applyWriteHooks` already built the complete index from it. This is
   *      the whole of `addresses` (`from: ["fullName"]`, a single source), so
   *      that collection never pays a read either.
   *
   * What is left is the real case: a patch touching SOME but not all sources.
   * `users` (`displayName` + `email`) and `payouts` (`sellerName` +
   * `sellerEmail`) — one extra read on a profile edit, which already writes.
   *
   * ## 🛑 IT DECRYPTS, AND FAILS CLOSED IF IT CANNOT
   *
   * The stored values are CIPHERTEXT. Hashing them would produce digests of
   * base64 — an index that matches nothing, which is the exact defect recorded
   * against the deleted `backfill-blind-index.mjs` (it claimed to read through
   * the repository and read `doc.data()` raw). So the missing sources are
   * decrypted first.
   *
   * If any of them will not decrypt — wrong key, a settings-encrypted value, a
   * corrupt row — this returns `null` and the stored index is left exactly as
   * it was. `decryptPiiFields` is fail-soft and yields `""` for an unreadable
   * value, and `""` contributes no tokens: taking that path would SHRINK the
   * index, which is the thing this method exists to prevent. Leaving a stale
   * index is recoverable by `scripts/pii-backfill.mjs`; silently truncating one
   * is not detectable at all.
   */
  protected async mergedTokensIndexFor(
    id: string,
    patch: Record<string, JsonValue>,
  ): Promise<Record<string, JsonValue> | null> {
    const sources = this.tokensIndexSources();
    if (sources.length === 0) return null;

    const touched = sources.filter((f) => f in patch);
    if (touched.length === 0) return null;
    if (touched.length === sources.length) return null;

    /*
     * 🛑 A patch whose own source value is ALREADY CIPHERTEXT is not a
     * plaintext patch, so merging it would hash base64. Leave the stored index
     * alone — the same fail-closed choice as the undecryptable case below, and
     * the same guard `applyWriteHooks` applies. This is reachable whenever a
     * caller hands over an already-hooked object.
     */
    for (const field of touched) {
      const value = patch[field];
      if (typeof value === "string" && isPiiEncrypted(value)) return null;
    }

    const snap = await this.getCollection().doc(id).get();
    if (!snap.exists) return null;
    const stored = (snap.data() ?? {}) as Record<string, unknown>;

    const merged: Record<string, JsonValue> = {};
    for (const field of sources) {
      if (field in patch) {
        merged[field] = patch[field];
        continue;
      }
      const value = stored[field];
      if (typeof value !== "string" || !value) continue;
      if (!isPiiEncrypted(value)) {
        merged[field] = value;
        continue;
      }
      try {
        merged[field] = decryptValue(value);
      } catch {
        // Fail closed — see the docstring. Never a partial index.
        return null;
      }
    }

    const tokensIndex = this.buildTokensIndexFor(merged);
    if (!tokensIndex) return null;
    return {
      ...(tokensIndex as unknown as Record<string, JsonValue>),
      [BLIND_INDEX_KEY_VERSION_FIELD]: CURRENT_BLIND_INDEX_KEY_VERSION,
    };
  }

  /**
   * Apply the SAME patch to many documents in ONE atomic batch — C4.
   *
   * 🛑 TWO defects this closes, and the second one is why the obvious fix is
   * not enough on its own.
   *
   * **Atomicity.** Both bulk-location routes did
   * `Promise.all(ids.map((id) => repo.update(id, patch)))` — 50 independent
   * writes, not batched and not transactional. A failure part-way leaves a
   * PARTIAL result and the route still returned `{ updated: ids.length }`,
   * i.e. a count it had not achieved, with no way for the caller to learn
   * which half landed. `batchCreate` and `batchDelete` have existed here all
   * along; the update case was simply missing, so every bulk edit reached for
   * `Promise.all`.
   *
   * **`searchTxt`.** A raw `batch.update()` writes the fields it is given and
   * nothing else, while `update()` routes through `applyWriteHooks` and
   * re-derives the index. So converting a bulk route to a plain batch is an
   * atomicity win and a silent SEARCH REGRESSION in the same change: the rows
   * a seller just filed to a bin become exactly the rows the search cannot
   * find. That failure is invisible in the usual way — the field is stored,
   * the column renders, nothing errors, and only a query comes back empty.
   *
   * Hence the caller passes the DOCUMENTS it already holds. Every bulk route
   * fetches them for the ownership check, so this costs no extra read, and
   * `applyWriteHooks` can then run against the merged shape — which also
   * means PII encryption and blind indices apply, exactly as on a single
   * write. A collection that overrides nothing behaves like a plain batch.
   *
   * `null` entries are skipped rather than throwing: the ownership check
   * upstream already rejects the request on a missing document, so a `null`
   * here means a concurrent delete, and failing the whole batch for it would
   * turn a race into an error the seller cannot act on.
   */
  async batchUpdateMany(
    docs: ReadonlyArray<T | null | undefined>,
    patch: Partial<T>,
  ): Promise<number> {
    const present = docs.filter((d): d is T => !!d);
    if (present.length === 0) return 0;
    /*
     * 🛑 Firestore caps a WriteBatch at 500 operations. Throwing rather than
     * looping commits is deliberate: a loop of commits is NOT atomic, so it
     * would quietly reintroduce the partial-write problem this method exists
     * to remove. The real bound belongs at the route, which already caps at
     * 50 (Rule #6).
     */
    if (present.length > 500) {
      throw new Error(
        `batchUpdateMany: ${present.length} documents exceeds Firestore's 500-operation batch limit; chunk at the call site`,
      );
    }

    const batch: WriteBatch = this.db.batch();
    const now = new Date();
    for (const doc of present) {
      const id = (doc as unknown as { id?: string }).id;
      if (!id) continue;
      const merged = { ...(doc as object), ...(patch as object) };
      const hooked = this.applyWriteHooks(merged) as Record<string, JsonValue>;
      /*
       * Only the patched keys plus whatever the hooks derived are written —
       * never the whole merged document. Writing it back wholesale would
       * resurrect any field a concurrent writer had changed since this
       * document was read, which is a lost update dressed up as a bulk edit.
       */
      const payload: Record<string, JsonValue> = { updatedAt: now as unknown as JsonValue };
      for (const key of Object.keys(patch as object)) payload[key] = hooked[key];
      if (hooked.searchTxt) payload.searchTxt = hooked.searchTxt;
      batch.update(this.getCollection().doc(id), prepareForFirestore(payload));
    }
    await batch.commit();
    return present.length;
  }

  /**
   * Same atomic single-batch write as `batchUpdateMany`, but with a PER-DOCUMENT
   * patch.
   *
   * 🛑 It exists because not every bulk edit is one value applied N times. A
   * bulk STOCK edit is the forcing case: `availableQuantity` carries each
   * product's own outstanding reservation forward
   * (`resolveStockResync`), so the figure written differs per row even when the
   * seller typed one number. `batchUpdateMany` would have to be called once per
   * distinct patch, which is one batch per row — i.e. not atomic, which is the
   * whole property these two methods exist to provide.
   *
   * Hooks, the patched-keys-only write and the 500-op refusal are identical to
   * `batchUpdateMany`; see its comments for why each is that way.
   */
  async batchUpdateEach(
    entries: ReadonlyArray<{ doc: T | null | undefined; patch: Partial<T> }>,
  ): Promise<number> {
    const present = entries.filter(
      (e): e is { doc: T; patch: Partial<T> } => !!e.doc && Object.keys(e.patch as object).length > 0,
    );
    if (present.length === 0) return 0;
    if (present.length > 500) {
      throw new Error(
        `batchUpdateEach: ${present.length} documents exceeds Firestore's 500-operation batch limit; chunk at the call site`,
      );
    }

    const batch: WriteBatch = this.db.batch();
    const now = new Date();
    for (const { doc, patch } of present) {
      const id = (doc as unknown as { id?: string }).id;
      if (!id) continue;
      const merged = { ...(doc as object), ...(patch as object) };
      const hooked = this.applyWriteHooks(merged) as Record<string, JsonValue>;
      const payload: Record<string, JsonValue> = { updatedAt: now as unknown as JsonValue };
      for (const key of Object.keys(patch as object)) payload[key] = hooked[key];
      if (hooked.searchTxt) payload.searchTxt = hooked.searchTxt;
      batch.update(this.getCollection().doc(id), prepareForFirestore(payload));
    }
    await batch.commit();
    return present.length;
  }

  /*
   * 🛑 Accepts the PLAINTEXT shape, because this method ENCRYPTS.
   *
   * `applyWriteHooks` runs `encryptPiiFields` over the subclass's `piiFields`,
   * so a caller legitimately hands over a real email and Firestore holds
   * ciphertext. Typing this `Partial<T>` demanded `Encrypted<string>` from
   * every caller once the PII fields were branded — and the only way to make
   * one without encrypting is `asEncrypted(value)`, which labels plaintext as
   * ciphertext and is the misuse that helper's docstring forbids. The
   * alternative was a cast at each of the dozens of write sites across
   * fourteen repositories; one honest signature here is that change made once.
   *
   * `Plaintext<T>` is the identity on a document with no branded member, so
   * this is a no-op for every repository holding no PII.
   */
  async create(
    data: Partial<Plaintext<T>> | FirestoreDocument,
  ): Promise<T> {
    try {
      const cleanData = prepareForFirestore({
        ...this.applyWriteHooks(data as object),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const docRef = await this.getCollection().add(cleanData);
      const doc = await docRef.get();
      return this.mapDoc(doc);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to create document: ${detailOf(error)}`, error);
    }
  }

  /**
   * Write a document at a CALLER-CHOSEN id.
   *
   * 🛑 **This OVERWRITES. It is an upsert, not a create**, despite the name —
   * `.set()` with no merge option replaces the whole document, and there is no
   * existence check. Writing an id that already exists silently discards
   * everything that was there and returns a success.
   *
   * That is **deliberate and load-bearing for most of its 28 callers**, which
   * are genuine upserts keyed on a deterministic id:
   *
   *   - `testerChecklistResponses` — one doc per (tester, case), re-answered
   *     every time a verdict changes. CLAUDE.md records that this upsert is
   *     *"what makes Yes/No answers + comments + screenshots survive a page
   *     reload"*, so a create-only variant here would break verdict recording.
   *   - `sessions`, analytics rollups, `priceIndex` — all rewritten by design.
   *
   * 🛑 **So do NOT "fix" this to `.create()`.** I was about to: the plan carried
   * it as a severity-1 silent-overwrite risk for products, on the reasoning that
   * two physical units of one model would derive the same slug and the second
   * would destroy the first. **Measured, that is false** —
   * `ProductRepository.create` OVERRIDES this method and runs `generateUniqueId`
   * with a real `findById` probe, so units get `-1`, `-2`, … and never collide.
   * A blanket `.create()` would have broken the tester harness to fix a defect
   * products do not have.
   *
   * **A caller that needs create-only semantics must probe first**, the way
   * `ProductRepository.create` does. The hazard this docstring removes is the
   * NAME: `createWithId` reads as "create" and behaves as "replace", and that
   * gap is what made the wrong conclusion so easy to reach.
   */
  // Plaintext<T> — these methods ENCRYPT via applyWriteHooks; see `create`.
  async createWithId(id: string, data: Partial<Plaintext<T>>): Promise<T> {
    try {
      const now = new Date();
      const cleanData = prepareForFirestore({
        ...this.applyWriteHooks(data as object),
        createdAt: now,
        updatedAt: now,
      });

      // No success-path logging. This emitted one debug + one info line for
      // EVERY document written, against Rule #6's ~4 KB/s log budget, and the
      // failure path below already carries everything the success path did.
      await this.getCollection().doc(id).set(cleanData);

      const doc = await this.getCollection().doc(id).get();
      return this.mapDoc(doc);
    } catch (error) {
      void normalizeError(error);
      // No serverLogger.error here either — this method was the only one of the
      // ten wraps that logged AND rethrew, so its failures were recorded twice
      // (once here, once by createRouteHandler), the first copy strictly less
      // informative. The DatabaseError below now carries the same detail.
      throw new DatabaseError(`Failed to create document with ID: ${id}: ${detailOf(error)}`, error);
    }
  }

  /** Accepts the PLAINTEXT shape — see `create` for why. */
  async update(id: string, data: Partial<Plaintext<T>>): Promise<T> {
    try {
      /*
       * 🛑 The token index is rebuilt from the STORED document merged under the
       * patch, not from the patch alone. `applyWriteHooks` can only see what it
       * is handed, so on a single-field update it would truncate the index to
       * the sources that happen to be in the patch. See
       * `mergedTokensIndexFor` for the measured defect and for why this costs
       * no read on all but two collections.
       */
      const merged = await this.mergedTokensIndexFor(
        id,
        data as unknown as Record<string, JsonValue>,
      );
      const cleanData = prepareForFirestore({
        ...this.applyWriteHooks(data as object, { partial: true }),
        ...(merged ?? {}),
        updatedAt: new Date(),
      });

      await this.getCollection().doc(id).update(cleanData);

      return this.findByIdOrFail(id);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to update document: ${id}: ${detailOf(error)}`, error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.getCollection().doc(id).delete();
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to delete document: ${id}: ${detailOf(error)}`, error);
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const doc = await this.getCollection().doc(id).get();
      return doc.exists;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to check document existence: ${id}: ${detailOf(error)}`, error);
    }
  }

  /**
   * Server-side aggregation — never a full read.
   *
   * This used to be `getCollection().get()` then `.size`, which downloads every
   * document in the collection to learn how many there are. On `products` or
   * `orders` that is the entire collection billed as reads, and the payload is
   * discarded immediately. Straight Rule #6 violation, and it scales with the
   * data rather than staying flat.
   *
   * `count()` is a Firestore aggregation query: the server returns a number,
   * billed at one read per 1000 documents matched rather than one per document.
   */
  async count(): Promise<number> {
    try {
      const snapshot = await this.getCollection().count().get();
      return snapshot.data().count;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to count documents: ${detailOf(error)}`, error);
    }
  }

  protected async sieveQuery<TResult extends DocumentData = T>(
    model: SieveModel,
    fields: FirebaseSieveFields,
    options?: FirebaseSieveOptions & {
      baseQuery?: CollectionReference | Query;
    },
  ): Promise<FirebaseSieveResult<TResult>> {
    const { baseQuery, ...sieveOptions } = options ?? {};
    return applySieveToFirestore<TResult>({
      baseQuery: baseQuery ?? this.getCollection(),
      model,
      fields,
      options: sieveOptions,
      // Load-bearing. Without this every Sieve-backed read silently skips the
      // subclass's mapDoc — decryption, projection and normalisation all lost.
      // audit-repository-fields asserts this argument stays here, because one
      // edit removing it would unwire all 14 affected repositories at once
      // while the per-file rule still passed.
      mapDoc: (snap) => this.mapDocForList<TResult>(snap),
    });
  }

  /**
   * Count matches for a Sieve model without reading any documents.
   *
   * Prefer this over `sieveQuery({ pageSize: 1 }).total` whenever only the
   * number is wanted — that idiom pays for a wasted document read per call,
   * which matters once a surface issues one query per union member.
   */
  protected async sieveCount(
    model: SieveModel,
    fields: FirebaseSieveFields,
    options?: FirebaseSieveOptions & {
      baseQuery?: CollectionReference | Query;
    },
  ): Promise<number> {
    const { baseQuery, ...sieveOptions } = options ?? {};
    return countSieveMatches({
      baseQuery: baseQuery ?? this.getCollection(),
      model,
      fields,
      options: sieveOptions,
    });
  }

  /**
   * How many documents match each value of a discriminator field, given a
   * shared base filter — the "N rows of each type" behind every faceted tab
   * bar and filter chip group.
   *
   * One `.count()` aggregation per value, all in parallel. A value whose query
   * fails maps to `undefined`, NOT to 0: callers hide a facet at zero, and a
   * swallowed failure that reads as "none of these exist" would hide a facet
   * holding real rows (Root Cause #59). `undefined` means "unknown", and every
   * caller is expected to keep the facet visible in that case.
   *
   * `values` may contain a pipe-joined OR-group (`"art|stickers"`) — it is
   * passed through untouched so the enhanced adapter upgrades it to a
   * Firestore `in` query, exactly as it does on the list path.
   */
  protected async facetCounts(
    field: string,
    values: readonly string[],
    fields: FirebaseSieveFields,
    options?: FirebaseSieveOptions & {
      baseQuery?: CollectionReference | Query;
      /** Sieve clauses ANDed into every count (e.g. `status==published`). */
      baseFilters?: string;
    },
  ): Promise<Record<string, number | undefined>> {
    const { baseFilters, ...rest } = options ?? {};
    const entries = await Promise.all(
      values.map(async (value) => {
        // Sieve ANDs clauses with a comma; see utils/sieve-builder.ts.
        const filters = [baseFilters, `${field}==${value}`]
          .filter(Boolean)
          .join(",");
        try {
          return [value, await this.sieveCount({ filters }, fields, rest)] as const;
        } catch (error) {
          void normalizeError(error);
          // ERROR, not warn, and WITH the error object. A count failing here is
          // almost always a missing composite index — a permanent, silent
          // degradation of every facet on the listing page, not a transient
          // blip. Logging it at warn with no error attached meant the actual
          // FAILED_PRECONDITION (which names the index to create) was discarded.
          serverLogger.error(
            `facetCounts: count failed for ${this.collection}.${field}==${value}; facet will stay visible`,
            { collection: this.collection, field, value, error },
          );
          return [value, undefined] as const;
        }
      }),
    );
    return Object.fromEntries(entries);
  }

  async findByIdInTx(tx: Transaction, id: string): Promise<T | null> {
    const docRef = this.getCollection().doc(id);
    const snap = await tx.get(docRef);
    if (!snap.exists) return null;
    return this.mapDoc(snap);
  }

  async findByIdOrFailInTx(tx: Transaction, id: string): Promise<T> {
    const doc = await this.findByIdInTx(tx, id);
    if (!doc) throw new NotFoundError(`Document not found: ${id}`);
    return doc;
  }

  createInTx(
    tx: Transaction,
    data: Partial<Plaintext<T>> | FirestoreDocument,
  ): DocumentReference {
    const docRef = this.getCollection().doc();
    const now = new Date();
    tx.set(
      docRef as FirebaseFirestore.DocumentReference,
      prepareForFirestore({
        ...this.applyWriteHooks(data as object),
        createdAt: now,
        updatedAt: now,
      }) as DocumentData,
    );
    return docRef as DocumentReference;
  }

  createWithIdInTx(
    tx: Transaction,
    id: string,
    data: Partial<Plaintext<T>> | FirestoreDocument,
  ): DocumentReference {
    const docRef = this.getCollection().doc(id);
    const now = new Date();
    tx.set(
      docRef as FirebaseFirestore.DocumentReference,
      prepareForFirestore({
        ...this.applyWriteHooks(data as object),
        createdAt: now,
        updatedAt: now,
      }) as DocumentData,
    );
    return docRef as DocumentReference;
  }

  /*
   * Plaintext<T> — these methods ENCRYPT via applyWriteHooks; see `create`.
   *
   * ⚠ `partial: true`, and unlike `update()` this one cannot then repair the
   * token index: it is synchronous, and Firestore forbids a read after a write
   * inside a transaction. So a patch touching only some of a token index's
   * sources leaves the stored index STALE rather than truncating it — see the
   * block comment in `applyWriteHooks`. Use `update()` when the index must be
   * current, or follow up with `scripts/pii-backfill.mjs`.
   */
  updateInTx(tx: Transaction, id: string, data: Partial<Plaintext<T>>): void {
    const docRef = this.getCollection().doc(id);
    tx.update(
      docRef,
      prepareForFirestore({ ...this.applyWriteHooks(data as object, { partial: true }), updatedAt: new Date() }) as DocumentData,
    );
  }

  deleteInTx(tx: Transaction, id: string): void {
    const docRef = this.getCollection().doc(id);
    tx.delete(docRef);
  }

  createInBatch(
    batch: WriteBatch,
    data: Partial<Plaintext<T>> | FirestoreDocument,
  ): DocumentReference {
    const docRef = this.getCollection().doc();
    const now = new Date();
    batch.set(
      docRef as FirebaseFirestore.DocumentReference,
      prepareForFirestore({
        ...this.applyWriteHooks(data as object),
        createdAt: now,
        updatedAt: now,
      }) as DocumentData,
    );
    return docRef as DocumentReference;
  }

  createWithIdInBatch(
    batch: WriteBatch,
    id: string,
    data: Partial<Plaintext<T>> | FirestoreDocument,
  ): void {
    const docRef = this.getCollection().doc(id);
    const now = new Date();
    batch.set(
      docRef as FirebaseFirestore.DocumentReference,
      prepareForFirestore({
        ...this.applyWriteHooks(data as object),
        createdAt: now,
        updatedAt: now,
      }) as DocumentData,
    );
  }

  /*
   * Plaintext<T> — these methods ENCRYPT via applyWriteHooks; see `create`.
   * ⚠ `partial: true` with the same consequence as `updateInTx` — a stale
   * token index rather than a truncated one.
   */
  updateInBatch(batch: WriteBatch, id: string, data: Partial<Plaintext<T>>): void {
    const docRef = this.getCollection().doc(id);
    batch.update(
      docRef,
      prepareForFirestore({ ...this.applyWriteHooks(data as object, { partial: true }), updatedAt: new Date() }) as DocumentData,
    );
  }

  deleteInBatch(batch: WriteBatch, id: string): void {
    const docRef = this.getCollection().doc(id);
    batch.delete(docRef);
  }
}
