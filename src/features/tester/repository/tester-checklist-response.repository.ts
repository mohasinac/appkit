import { BaseRepository } from "../../../providers/db-firebase";
import type { FirebaseSieveFields, FirebaseSieveResult, SieveModel } from "../../../providers/db-firebase";
import {
  TESTER_CHECKLIST_RESPONSE_COLLECTION,
  TESTER_CHECKLIST_RESPONSE_FIELDS,
  createChecklistResponseId,
  type TesterAnswer,
  type TesterChecklistResponseDocument,
} from "../schemas/firestore";

export interface UpsertResponseInput {
  testerId: string;
  testerDisplayName: string;
  checklistItemId: string;
  groupKey: string;
  pageKey: string;
  answer?: TesterAnswer | null;
  comment?: string;
  screenshotUrl?: string;
}

export interface ChecklistItemCoverage {
  checklistItemId: string;
  groupKey: string;
  pageKey: string;
  yesCount: number;
  noCount: number;
  totalAnswered: number;
}

export interface CoverageReport {
  itemCoverage: ChecklistItemCoverage[];
  issues: TesterChecklistResponseDocument[]; // every answer === "no"
  totals: { totalAnswered: number; totalYes: number; totalNo: number };
}

export class TesterChecklistResponseRepository extends BaseRepository<TesterChecklistResponseDocument> {
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    testerId: { canFilter: true, canSort: false },
    checklistItemId: { canFilter: true, canSort: false },
    groupKey: { canFilter: true, canSort: true },
    pageKey: { canFilter: true, canSort: true },
    answer: { canFilter: true, canSort: false },
    status: { canFilter: true, canSort: false },
    createdAt: { canFilter: true, canSort: true },
  };

  constructor() {
    super(TESTER_CHECKLIST_RESPONSE_COLLECTION);
  }

  /** Deterministic-ID upsert — the only mutation path for tester responses. */
  async upsertResponse(input: UpsertResponseInput): Promise<TesterChecklistResponseDocument> {
    const id = createChecklistResponseId(input.testerId, input.checklistItemId);
    const existing = await this.findById(id);

    const patch: Partial<TesterChecklistResponseDocument> = {
      testerId: input.testerId,
      testerDisplayName: input.testerDisplayName,
      checklistItemId: input.checklistItemId,
      groupKey: input.groupKey,
      pageKey: input.pageKey,
      status: "new",
    };
    if (input.answer !== undefined) patch.answer = input.answer;
    if (input.comment !== undefined) patch.comment = input.comment;
    if (input.screenshotUrl !== undefined) patch.screenshotUrl = input.screenshotUrl;

    if (existing) {
      return this.update(id, patch);
    }
    return this.createWithId(id, {
      answer: null,
      ...patch,
    });
  }

  async listForTester(testerId: string): Promise<TesterChecklistResponseDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(TESTER_CHECKLIST_RESPONSE_FIELDS.TESTER_ID, "==", testerId)
      .get();
    return snapshot.docs.map((doc) => this.mapDoc<TesterChecklistResponseDocument>(doc));
  }

  async list(model: SieveModel): Promise<FirebaseSieveResult<TesterChecklistResponseDocument>> {
    return this.sieveQuery<TesterChecklistResponseDocument>(
      model,
      TesterChecklistResponseRepository.SIEVE_FIELDS,
    );
  }

  async markReviewed(id: string): Promise<TesterChecklistResponseDocument> {
    return this.update(id, {
      status: "reviewed",
    } as Partial<TesterChecklistResponseDocument>);
  }

  /** Single collection scan (small table: testers x cases) — no join needed. */
  async getCoverageReport(): Promise<CoverageReport> {
    const snapshot = await this.db.collection(this.collection).get();
    const docs = snapshot.docs.map((doc) => this.mapDoc<TesterChecklistResponseDocument>(doc));

    const byItem = new Map<string, ChecklistItemCoverage>();
    const issues: TesterChecklistResponseDocument[] = [];
    let totalYes = 0;
    let totalNo = 0;

    for (const doc of docs) {
      if (!doc.answer) continue;

      let entry = byItem.get(doc.checklistItemId);
      if (!entry) {
        entry = {
          checklistItemId: doc.checklistItemId,
          groupKey: doc.groupKey,
          pageKey: doc.pageKey,
          yesCount: 0,
          noCount: 0,
          totalAnswered: 0,
        };
        byItem.set(doc.checklistItemId, entry);
      }

      entry.totalAnswered += 1;
      if (doc.answer === "yes") {
        entry.yesCount += 1;
        totalYes += 1;
      } else {
        entry.noCount += 1;
        totalNo += 1;
        issues.push(doc);
      }
    }

    return {
      itemCoverage: Array.from(byItem.values()),
      issues,
      totals: { totalAnswered: totalYes + totalNo, totalYes, totalNo },
    };
  }
}

export const testerChecklistResponseRepository = new TesterChecklistResponseRepository();
