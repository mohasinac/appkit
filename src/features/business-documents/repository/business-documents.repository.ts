/**
 * BusinessDocumentsRepository — thin wrapper over the `businessDocuments`
 * collection. See `../schemas/firestore.ts` for the doc shape and for why the
 * bytes are not in Firestore.
 */

import {
  BaseRepository,
  parseSieveDateValue,
  type SieveModel,
  type FirebaseSieveResult,
} from "../../../providers/db-firebase";
import {
  BUSINESS_DOCUMENTS_COLLECTION,
  type BusinessDocumentDocument,
  type BusinessDocumentKind,
} from "../schemas/firestore";

export class BusinessDocumentsRepository extends BaseRepository<BusinessDocumentDocument> {
  constructor() {
    super(BUSINESS_DOCUMENTS_COLLECTION);
  }

  static readonly SIEVE_FIELDS = {
    id: { canFilter: true, canSort: false },
    kind: { canFilter: true, canSort: true },
    fileName: { canFilter: true, canSort: true },
    uploadedBy: { canFilter: true, canSort: false },
    // Timestamp fields that are filterable MUST carry parseValue, or an ISO
    // string reaches Firestore as a string, the type does not match the stored
    // Timestamp, and the query matches ZERO documents with no error anywhere
    // (Root Cause #47).
    uploadedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
  };

  async list(model: SieveModel): Promise<FirebaseSieveResult<BusinessDocumentDocument>> {
    return this.sieveQuery<BusinessDocumentDocument>(
      model,
      BusinessDocumentsRepository.SIEVE_FIELDS,
      { defaultPageSize: 25, maxPageSize: 100 },
    );
  }

  /**
   * The current document of a given kind — newest `uploadedAt` wins.
   *
   * Re-uploading a re-issued certificate is normal and both copies are kept:
   * the superseded one is the evidence of what was true at the time, which is
   * the entire point of keeping a registration document. So this resolves the
   * current one rather than assuming a single row per kind.
   *
   * 🛑 Ordered by `createdAt`, NOT `uploadedAt`, even though the latter reads
   * more naturally here. `BaseRepository.create()` stamps `createdAt` on every
   * document it writes, so it is guaranteed present; `uploadedAt` is set by the
   * caller and a single write path that forgot it would make that row vanish
   * from this query — a Firestore `orderBy` on a field a document lacks is a
   * silent `WHERE field IS NOT NULL` (Root Cause #100). The two are written in
   * the same operation and agree, so there is nothing to gain by taking the
   * field that can be missed.
   */
  async findCurrentByKind(kind: BusinessDocumentKind): Promise<BusinessDocumentDocument | null> {
    const result = await this.list({
      filters: `kind==${kind}`,
      sorts: "-createdAt",
      page: 1,
      pageSize: 1,
    });

    return result.items[0] ?? null;
  }
}

export const businessDocumentsRepository = new BusinessDocumentsRepository();
