import { firebaseFieldOps } from "../../../providers/db-firebase";
import {
  BaseRepository,
  prepareForFirestore,
} from "../../../providers/db-firebase";
import { normalizeError } from "../../../errors/normalize";
import type {
  FirebaseSieveFields,
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";
import { DatabaseError } from "../../../errors";
import { SUPPORT_TICKET_FIELDS } from "../../../constants/field-names";
import {
  SUPPORT_TICKET_COLLECTION,
  ACTIVE_TICKET_STATUSES,
  type SupportTicketDocument,
  type SupportTicketCreateInput,
  type SupportTicketUpdateInput,
  type TicketMessage,
  type TicketStatus,
} from "../schemas/firestore";

export class SupportRepository extends BaseRepository<SupportTicketDocument> {
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    userId:     { canFilter: true,  canSort: false },
    status:     { canFilter: true,  canSort: false },
    category:   { canFilter: true,  canSort: false },
    priority:   { canFilter: true,  canSort: false },
    assignedTo: { canFilter: true,  canSort: false },
    orderId:    { canFilter: true,  canSort: false },
    createdAt:  { canFilter: true,  canSort: true  },
    updatedAt:  { canFilter: true,  canSort: true  },
  };

  constructor() {
    super(SUPPORT_TICKET_COLLECTION);
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
      return this.create(data as unknown as SupportTicketDocument);
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

  async updateTicketStatus(
    ticketId: string,
    update: SupportTicketUpdateInput,
  ): Promise<SupportTicketDocument> {
    return this.update(ticketId, {
      ...update,
      updatedAt: new Date(),
    } as Partial<SupportTicketDocument>);
  }

  async addMessage(
    ticketId: string,
    message: TicketMessage,
    newStatus?: TicketStatus,
  ): Promise<void> {
    try {
      const ref = this.db
        .collection(SUPPORT_TICKET_COLLECTION)
        .doc(ticketId);
      const updateData: Record<string, unknown> = {
        messages: firebaseFieldOps.arrayUnion(prepareForFirestore(message as unknown as Record<string, unknown>)),
        updatedAt: new Date(),
      };
      if (newStatus) updateData.status = newStatus;
      await ref.update(updateData);
    } catch (err) {
      void normalizeError(err);
      throw new DatabaseError("Failed to add message to ticket", err);
    }
  }

  async assignTicket(
    ticketId: string,
    assignedTo: string,
    assignedToName: string,
  ): Promise<SupportTicketDocument> {
    return this.update(ticketId, {
      assignedTo,
      assignedToName,
      updatedAt: new Date(),
    } as Partial<SupportTicketDocument>);
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
