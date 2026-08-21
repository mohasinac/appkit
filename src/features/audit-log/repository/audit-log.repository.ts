/**
 * AdminAuditLogRepository — thin wrapper over the `adminAuditLog` collection.
 * See `appkit/src/features/audit-log/schemas/firestore.ts` for the doc shape.
 */

import {
  BaseRepository,
  parseSieveDateValue,
  type SieveModel,
  type FirebaseSieveResult,
} from "../../../providers/db-firebase";
import { ADMIN_AUDIT_LOG_COLLECTION, type AdminAuditLogDocument } from "../schemas/firestore";

export class AdminAuditLogRepository extends BaseRepository<AdminAuditLogDocument> {
  constructor() {
    super(ADMIN_AUDIT_LOG_COLLECTION);
  }

  static readonly SIEVE_FIELDS = {
    id: { canFilter: true, canSort: false },
    actorUid: { canFilter: true, canSort: false },
    actorName: { canFilter: true, canSort: false },
    action: { canFilter: true, canSort: true },
    targetType: { canFilter: true, canSort: false },
    targetId: { canFilter: true, canSort: false },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
  };

  /**
   * Paginated, Firestore-native audit-log list (admin use).
   */
  async list(model: SieveModel): Promise<FirebaseSieveResult<AdminAuditLogDocument>> {
    return this.sieveQuery<AdminAuditLogDocument>(
      model,
      AdminAuditLogRepository.SIEVE_FIELDS,
      {
        defaultPageSize: 50,
        maxPageSize: 200,
      },
    );
  }
}

export const adminAuditLogRepository = new AdminAuditLogRepository();
