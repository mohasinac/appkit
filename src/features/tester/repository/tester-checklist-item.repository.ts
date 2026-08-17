import { BaseRepository } from "../../../providers/db-firebase";
import type { FirebaseSieveFields, FirebaseSieveResult, SieveModel } from "../../../providers/db-firebase";
import { DatabaseError } from "../../../errors";
import {
  TESTER_CHECKLIST_ITEM_COLLECTION,
  TESTER_CHECKLIST_ITEM_FIELDS,
  createChecklistItemId,
  type TesterChecklistItemDocument,
  type TesterChecklistItemCreateInput,
  type TesterChecklistItemUpdateInput,
} from "../schemas/firestore";

export class TesterChecklistItemRepository extends BaseRepository<TesterChecklistItemDocument> {
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    groupKey: { canFilter: true, canSort: true },
    pageKey: { canFilter: true, canSort: true },
    label: { canFilter: true, canSort: false },
    order: { canFilter: true, canSort: true },
    isActive: { canFilter: true, canSort: false },
    searchTokens: { canFilter: true, canSort: false },
    createdAt: { canFilter: true, canSort: true },
  };

  constructor() {
    super(TESTER_CHECKLIST_ITEM_COLLECTION);
  }

  private buildSearchTokens(
    input: Pick<TesterChecklistItemDocument, "label" | "description" | "groupLabel" | "pageLabel">,
  ): string[] {
    const rawText = [input.label, input.description, input.groupLabel, input.pageLabel]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return Array.from(
      new Set(
        rawText
          .split(/[^a-z0-9]+/i)
          .map((token) => token.trim())
          .filter((token) => token.length >= 2),
      ),
    ).slice(0, 50);
  }

  async createItem(input: TesterChecklistItemCreateInput): Promise<TesterChecklistItemDocument> {
    const id = createChecklistItemId(input.groupKey, input.pageKey, input.label);
    const searchTokens = this.buildSearchTokens(input);
    return this.createWithId(id, { ...input, searchTokens } as Partial<TesterChecklistItemDocument>);
  }

  override async update(
    id: string,
    data: TesterChecklistItemUpdateInput,
  ): Promise<TesterChecklistItemDocument> {
    const current = await this.findById(id);
    if (!current) {
      throw new DatabaseError(`Failed to update checklist item: missing document ${id}`);
    }
    const merged = { ...current, ...data } as TesterChecklistItemDocument;
    return super.update(id, {
      ...data,
      searchTokens: this.buildSearchTokens(merged),
    });
  }

  async listActive(): Promise<TesterChecklistItemDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(TESTER_CHECKLIST_ITEM_FIELDS.IS_ACTIVE, "==", true)
      .orderBy(TESTER_CHECKLIST_ITEM_FIELDS.ORDER, "asc")
      .get();
    return snapshot.docs.map((doc) => this.mapDoc<TesterChecklistItemDocument>(doc));
  }

  async list(model: SieveModel): Promise<FirebaseSieveResult<TesterChecklistItemDocument>> {
    return this.sieveQuery<TesterChecklistItemDocument>(model, TesterChecklistItemRepository.SIEVE_FIELDS);
  }
}

export const testerChecklistItemRepository = new TesterChecklistItemRepository();
