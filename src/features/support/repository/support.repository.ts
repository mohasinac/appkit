import { firebaseFieldOps } from "../../../providers/db-firebase";
import {
  BaseRepository,
  prepareForFirestore,
  parseSieveDateValue,
} from "../../../providers/db-firebase";
import { normalizeError } from "../../../errors/normalize";
import type {
  FirebaseSieveFields,
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";
import { DatabaseError } from "../../../errors";
import { SUPPORT_TICKET_FIELDS } from "../../../constants/field-names";
import { buildSearchTxt } from "../../../utils/search-txt";
import { planSearchTxt, emptySearchResult } from "../../../utils/search-txt-query";
import { sieveAnd, sieveFilter, SIEVE_OP } from "../../../utils/sieve-builder";
import type { JsonValue } from "../../../schemas/types";
import { maskPii, revealPii } from "../../../security/pii-accessors";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import {
  SUPPORT_TICKET_COLLECTION,
  SUPPORT_TICKET_PII_FIELDS,
  SUPPORT_TICKET_TRACKED_FIELDS,
  TicketStatusValues,
  ACTIVE_TICKET_STATUSES,
  type SupportTicketDocument,
  type SupportTicketPlain,
  type SupportTicketCreateInput,
  type SupportTicketUpdateInput,
  type TicketMessage,
  type TicketStatus,
} from "../schemas/firestore";
import type { FirestoreDocument } from "@mohasinac/appkit";
import { withHistory, type HistoryActor } from "../../../_internal/shared/history/index";

/** Who/why for a write that lands in `statusHistory`. */
export interface TicketWriteContext {
  actor?: HistoryActor;
  trigger?: string;
  reason?: string;
  note?: string;
}

export class SupportRepository extends BaseRepository<SupportTicketDocument> {
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    userId:     { canFilter: true,  canSort: false },
    // The store a ticket is ABOUT. Filterable so a seller can list their own —
    // `relatedParties.storeId` is not in this map and never was, which is why
    // no seller-scoped query was possible.
    storeId:    { canFilter: true,  canSort: false },
    searchTxt:  { canFilter: true,  canSort: false },
    status:     { canFilter: true,  canSort: false },
    category:   { canFilter: true,  canSort: false },
    priority:   { canFilter: true,  canSort: false },
    assignedTo: { canFilter: true,  canSort: false },
    orderId:    { canFilter: true,  canSort: false },
    createdAt:  { canFilter: true,  canSort: true, parseValue: parseSieveDateValue  },
    updatedAt:  { canFilter: true,  canSort: true, parseValue: parseSieveDateValue  },
  };

  /**
   * Ticket PII, encrypted by BaseRepository's write hooks.
   *
   * `SUPPORT_TICKET_PII_FIELDS` existed but was only ever used to scrub status
   * history — the documents themselves were never encrypted. Safe to enable:
   * nothing queries these by equality (the admin list searches `subject`), so
   * no read path depends on their plaintext.
   */
  protected override piiFields = SUPPORT_TICKET_PII_FIELDS;

  constructor() {
    super(SUPPORT_TICKET_COLLECTION);
  }

  /**
   * Derived on every write path via `applyWriteHooks`.
   *
   * 🛑 `subject` only. `description` and every message body are PII-encrypted
   * at rest, and a plaintext prefix index over an encrypted field gives back
   * precisely what the encryption withheld — the same reason an email is an
   * exact-match blind index rather than a searchable corpus.
   */
  protected override buildSearchTxtFor(
    data: Record<string, JsonValue>,
  ): string[] | null {
    const subject = typeof data.subject === "string" ? data.subject : "";
    return subject ? buildSearchTxt([subject]) : null;
  }

  /** Decrypt on read so callers see the shape they wrote. */
  /*
   * 🛑 `mapDoc` is NOT overridden, and that absence IS the change.
   *
   * It used to decrypt on every read, so ciphertext never left the database
   * and every caller handled plaintext without ever saying so. Following
   * `SiteSettingsRepository`: reads return what Firestore holds, and plaintext
   * requires one of the two named methods below.
   *
   * A convention would not hold this. `SupportTicketDocument`'s PII fields are
   * `Encrypted<string>`, assignable to nothing that wants a plain `string`, so
   * a reader that skips both accessors is a compile error naming file and line.
   */

  /** Plaintext PII. **Opt-in and named** — shows up in review and in a grep. */
  revealTicket(doc: SupportTicketDocument): SupportTicketPlain {
    return revealPii<SupportTicketPlain>(doc, SUPPORT_TICKET_PII_FIELDS);
  }

  /** As `revealTicket`, for a list read. */
  revealTickets(docs: readonly SupportTicketDocument[]): SupportTicketPlain[] {
    return docs.map((d) => this.revealTicket(d));
  }

  /**
   * Masked PII — **the default for any surface that only needs to identify a
   * row to a human.** Decrypts first, then masks: the mask helpers refuse
   * ciphertext by design, so passing a stored field straight in would return
   * "Anonymous" for every row.
   */
  maskedTicket(doc: SupportTicketDocument): SupportTicketPlain {
    return maskPii<SupportTicketPlain>(doc, SUPPORT_TICKET_PII_FIELDS);
  }

  /** As `maskedTicket`, for a list read. */
  maskedTickets(docs: readonly SupportTicketDocument[]): SupportTicketPlain[] {
    return docs.map((d) => this.maskedTicket(d));
  }

  async createTicket(
    input: SupportTicketCreateInput,
  ): Promise<SupportTicketDocument> {
    try {
      const now = new Date();
      const data = {
        ...input,
        status: "open" as const,
        priority: "normal" as const,
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      // Plaintext in; `create` encrypts via the write hook. This used to be
      // `as unknown as SupportTicketDocument` — a double cast that claimed the
      // freshly-built literal was already ciphertext.
      return this.create(data as Partial<SupportTicketPlain>);
    } catch (err) {
      void normalizeError(err);
      throw new DatabaseError("Failed to create support ticket", err);
    }
  }

  async getUserTickets(
    userId: string,
    page = 1,
    pageSize = 20,
  ): Promise<FirebaseSieveResult<SupportTicketDocument>> {
    const model: SieveModel = {
      filters: `userId==${userId}`,
      sorts: "-createdAt",
      page,
      pageSize,
    };
    return this.sieveQuery<SupportTicketDocument>(
      model,
      SupportRepository.SIEVE_FIELDS,
      { defaultPageSize: pageSize, maxPageSize: 50 },
    );
  }

  /**
   * Every ticket ABOUT one store.
   *
   * Keyed on the top-level `storeId`, not `relatedParties.storeId` — the
   * nested one is unindexed and unqueryable, which is the whole reason a
   * seller had no way to see the tickets raised against their own store.
   */
  async getStoreTickets(
    storeId: string,
    page = 1,
    pageSize = 20,
    opts?: { search?: string; status?: string },
  ): Promise<FirebaseSieveResult<SupportTicketDocument>> {
    /*
     * The term is tokenised the same way the index was built, and only the
     * FIRST token is pushed down — Firestore allows one `array-contains` per
     * query. The rest are applied in memory by `sieveQuery`'s own pass, which
     * is what keeps a two-word search from silently matching on the first word
     * alone (the partial-pushdown trap in Root Cause #62).
     */
    const clauses = [
      sieveFilter(SUPPORT_TICKET_FIELDS.STORE_ID, SIEVE_OP.EQ, storeId),
      ...(opts?.status
        ? [sieveFilter(SUPPORT_TICKET_FIELDS.STATUS, SIEVE_OP.EQ, opts.status)]
        : []),
    ];

    const plan = planSearchTxt(opts?.search);
    /*
     * A search that narrowed to no usable term returns NOTHING, not every
     * ticket about the store. The alternative — falling through to the
     * unfiltered list — is the shape where a user types a real subject,
     * sees every row, and concludes the search is broken rather than that
     * their term was stripped.
     */
    if (plan.empty) return emptySearchResult<SupportTicketDocument>();

    let baseQuery = this.getCollection().where(
      SUPPORT_TICKET_FIELDS.STORE_ID,
      "==",
      storeId,
    );
    if (plan.head) {
      baseQuery = baseQuery.where(
        SUPPORT_TICKET_FIELDS.SEARCH_TXT,
        "array-contains",
        plan.head,
      ) as typeof baseQuery;
    }

    const model: SieveModel = {
      filters: sieveAnd(...clauses.slice(1)),
      sorts: "-createdAt",
      page,
      pageSize,
    };
    return this.sieveQuery<SupportTicketDocument>(
      model,
      SupportRepository.SIEVE_FIELDS,
      { defaultPageSize: pageSize, maxPageSize: 50, baseQuery },
    );
  }

  async getTicketById(ticketId: string): Promise<SupportTicketDocument | null> {
    return this.findById(ticketId);
  }

  async countActiveTickets(userId: string): Promise<number> {
    const col = this.db.collection(SUPPORT_TICKET_COLLECTION);
    const snaps = await Promise.all(
      ACTIVE_TICKET_STATUSES.map((s) =>
        col
          .where(SUPPORT_TICKET_FIELDS.USER_ID, "==", userId)
          .where(SUPPORT_TICKET_FIELDS.STATUS, "==", s)
          .select()
          .get(),
      ),
    );
    return snaps.reduce((total: number, snap: FirebaseFirestore.QuerySnapshot) => total + snap.size, 0);
  }

  async getActiveOrderTicket(
    userId: string,
    orderId: string,
  ): Promise<SupportTicketDocument | null> {
    const col = this.db.collection(SUPPORT_TICKET_COLLECTION);
    const snap = await col
      .where(SUPPORT_TICKET_FIELDS.USER_ID, "==", userId)
      .where("orderId", "==", orderId)
      .where(SUPPORT_TICKET_FIELDS.STATUS, "in", ACTIVE_TICKET_STATUSES)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as SupportTicketDocument;
  }

  async getActiveCategoryTicket(
    userId: string,
    category: string,
  ): Promise<SupportTicketDocument | null> {
    const col = this.db.collection(SUPPORT_TICKET_COLLECTION);
    const snap = await col
      .where(SUPPORT_TICKET_FIELDS.USER_ID, "==", userId)
      .where(SUPPORT_TICKET_FIELDS.CATEGORY, "==", category)
      .where(SUPPORT_TICKET_FIELDS.STATUS, "==", "waiting_on_user")
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as SupportTicketDocument;
  }

  /**
   * The single status/assignment write path.
   *
   * `prior` is not an optimisation detail — the caller that matters (the admin
   * PATCH route) already fetches the ticket to 404 on a missing one, so
   * threading it through means history costs ZERO extra Firestore reads
   * (Rule #6). Omit it and this falls back to a read, which is correct but
   * avoidable.
   */
  async updateTicketStatus(
    ticketId: string,
    update: SupportTicketUpdateInput,
    ctx?: TicketWriteContext,
    prior?: SupportTicketDocument | null,
  ): Promise<SupportTicketDocument> {
    const current = prior !== undefined ? prior : await this.getTicketById(ticketId);
    // Plain in, ciphertext out: `this.update` runs the write hook over
    // `piiFields`, which is what encrypts `assignedToName` on the way down.
    const patch: Partial<SupportTicketPlain> = {
      ...update,
      ...this.resolutionStamps(current, update.status),
      updatedAt: new Date(),
    };
    return this.update(
      ticketId,
      this.withTicketHistory(current, patch, ctx, "updateTicketStatus"),
    );
  }

  /**
   * Stamp `resolvedAt` / `closedAt` on the transition INTO that status.
   *
   * Both fields were declared, constant-named and listed in the update input,
   * and no code path had ever written either (verified 2026-08-26) — so every
   * resolved ticket in the collection has no resolution time.
   *
   * Guarded on the transition, not on the status: re-saving a priority change
   * on an already-resolved ticket must not move its resolution time forward.
   * Never fabricated for a ticket resolved before this existed — that one
   * renders an em-dash, the same rule the offer timeline follows.
   */
  /*
   * Returns the PLAIN shape. It only ever emits two Date fields, neither of
   * them PII — but it is SPREAD into a plaintext patch, and a return typed
   * against the document would poison that patch's inferred type with
   * `Encrypted<string>` members it never actually sets.
   */
  private resolutionStamps(
    current: SupportTicketDocument | null | undefined,
    next: TicketStatus | undefined,
  ): Partial<SupportTicketPlain> {
    if (!next || next === current?.status) return {};
    const now = new Date();
    if (next === TicketStatusValues.RESOLVED && !current?.resolvedAt) return { resolvedAt: now };
    if (next === TicketStatusValues.CLOSED && !current?.closedAt) return { closedAt: now };
    return {};
  }

  /** Append a timeline entry when the patch touches a tracked field. */
  /*
   * Takes and returns the PLAIN shape.
   *
   * It only threads a patch through `withHistory` and casts both sides to
   * `FirestoreDocument` anyway, so it is indifferent to whether the PII in it
   * is ciphertext — and its callers hold plaintext, because encryption happens
   * in `this.update`'s write hook downstream.
   */
  private withTicketHistory(
    current: SupportTicketDocument | null | undefined,
    patch: Partial<SupportTicketPlain>,
    ctx: TicketWriteContext | undefined,
    defaultTrigger: string,
  ): Partial<SupportTicketPlain> {
    const withEntry = withHistory(
      current as unknown as FirestoreDocument | undefined,
      patch as unknown as FirestoreDocument,
      {
        tracked: SUPPORT_TICKET_TRACKED_FIELDS,
        actor: ctx?.actor ?? { role: "system" },
        trigger: ctx?.trigger ?? defaultTrigger,
        reason: ctx?.reason,
        note: ctx?.note,
        // `encryptPiiFields` never descends into arrays, so a PII-named value
        // reaching `changes` would persist in PLAINTEXT inside statusHistory.
        piiFields: SUPPORT_TICKET_PII_FIELDS,
      },
    );
    return (withEntry as Partial<SupportTicketPlain> | null) ?? patch;
  }

  /**
   * Append a reply, optionally moving the ticket's status.
   *
   * The message itself is NOT history — the thread is already the record of
   * what was said. Only an accompanying status change earns an entry, and
   * only then is a read taken, so an ordinary reply still costs one write and
   * no read.
   *
   * `messages` stays an `arrayUnion` (concurrent replies must not clobber one
   * another); `statusHistory` cannot, because `arrayUnion` has no way to
   * enforce the FIFO cap — so it is folded in memory and written whole.
   */
  async addMessage(
    ticketId: string,
    message: TicketMessage,
    newStatus?: TicketStatus,
    ctx?: TicketWriteContext,
    prior?: SupportTicketDocument | null,
  ): Promise<void> {
    try {
      const ref = this.db
        .collection(SUPPORT_TICKET_COLLECTION)
        .doc(ticketId);
      const updateData: FirestoreDocument = {
        messages: firebaseFieldOps.arrayUnion(prepareForFirestore(message)),
        updatedAt: new Date(),
      };
      if (newStatus) {
        const current = prior !== undefined ? prior : await this.getTicketById(ticketId);
        Object.assign(
          updateData,
          this.withTicketHistory(
            current,
            { status: newStatus, ...this.resolutionStamps(current, newStatus) },
            ctx,
            "addMessage",
          ),
        );
      }
      await ref.update(updateData);
    } catch (err) {
      void normalizeError(err);
      throw new DatabaseError("Failed to add message to ticket", err);
    }
  }

  async assignTicket(
    ticketId: string,
    assignedTo: string,
    /*
     * PLAINTEXT. `BaseRepository.update` runs `encryptPiiFields` over
     * `piiFields`, which includes `assignedToName`, so the value is encrypted
     * on the way down — the parameter is honest about what the caller holds.
     * `asEncrypted` here would be the misuse its own docstring forbids:
     * labelling plaintext as ciphertext.
     */
    assignedToName: string,
    ctx?: TicketWriteContext,
    prior?: SupportTicketDocument | null,
  ): Promise<SupportTicketDocument> {
    const current = prior !== undefined ? prior : await this.getTicketById(ticketId);
    return this.update(
      ticketId,
      this.withTicketHistory(
        current,
        {
          assignedTo,
          // No cast: `withTicketHistory` takes the PLAIN shape, and this
          // parameter is plaintext (the write hook encrypts downstream). The
          // cast that used to sit here existed only because the payload type
          // claimed ciphertext.
          assignedToName,
          updatedAt: new Date(),
        },
        ctx,
        "assignTicket",
      ),
    );
  }

  async listAll(
    model: SieveModel,
  ): Promise<FirebaseSieveResult<SupportTicketDocument>> {
    return this.sieveQuery<SupportTicketDocument>(
      model,
      SupportRepository.SIEVE_FIELDS,
      { defaultPageSize: 25, maxPageSize: 100 },
    );
  }
}

export const supportRepository = new SupportRepository();
