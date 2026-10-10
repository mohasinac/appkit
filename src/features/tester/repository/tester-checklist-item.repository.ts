import { BaseRepository, parseSieveDateValue } from "../../../providers/db-firebase";
import { buildSearchTxt } from "../../../utils/search-txt";
import type { FirebaseSieveFields, FirebaseSieveResult, SieveModel } from "../../../providers/db-firebase";
import { DatabaseError } from "../../../errors";
import { USER_COLLECTION } from "../../auth/schemas/firestore";
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
    phase: { canFilter: true, canSort: true },
    isActive: { canFilter: true, canSort: false },
    searchTxt: { canFilter: true, canSort: false },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    bugConfirmed: { canFilter: true, canSort: false },
  };

  constructor() {
    super(TESTER_CHECKLIST_ITEM_COLLECTION);
  }

  async createItem(input: TesterChecklistItemCreateInput): Promise<TesterChecklistItemDocument> {
    const id = createChecklistItemId(input.groupKey, input.pageKey, input.label);
    const searchTxt = buildSearchTxt([input.label, input.description, input.groupLabel, input.pageLabel]);
    return this.createWithId(id, { ...input, searchTxt } as Partial<TesterChecklistItemDocument>);
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
      searchTxt: buildSearchTxt([merged.label, merged.description, merged.groupLabel, merged.pageLabel]),
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

  /** Confirms a reported "No" as a real bug: credits the reporting tester and
   * disables the case for all other testers. Credit is permanent — never
   * touched again by reopenAsNewVersion(). */
  async confirmBug(
    id: string,
    hunterId: string,
    hunterName: string,
  ): Promise<TesterChecklistItemDocument> {
    const current = await this.findById(id);
    if (!current) {
      throw new DatabaseError(`Failed to confirm bug: missing checklist item ${id}`);
    }
    if (current.bugConfirmed) {
      throw new DatabaseError(`Checklist item ${id} already has a confirmed bug`);
    }
    return this.update(id, {
      isActive: false,
      bugConfirmed: true,
      bugHunterId: hunterId,
      bugHunterName: hunterName,
      bugConfirmedAt: new Date(),
    });
  }

  /** Reopens a fixed, bug-confirmed case as a new, active version for retest.
   * The old item stays disabled forever with its bug-hunter credit intact. */
  async reopenAsNewVersion(oldItemId: string): Promise<TesterChecklistItemDocument> {
    const old = await this.findById(oldItemId);
    if (!old) {
      throw new DatabaseError(`Failed to reopen checklist item: missing document ${oldItemId}`);
    }
    if (!old.bugConfirmed) {
      throw new DatabaseError(`Checklist item ${oldItemId} has no confirmed bug to reopen`);
    }
    if (old.supersededByItemId) {
      throw new DatabaseError(`Checklist item ${oldItemId} has already been reopened`);
    }

    const nextVersion = (old.version ?? 1) + 1;
    const newId = `${old.id}-v${nextVersion}`;
    const newItem = await this.createWithId(newId, {
      groupKey: old.groupKey,
      groupLabel: old.groupLabel,
      pageKey: old.pageKey,
      pageLabel: old.pageLabel,
      label: old.label,
      description: old.description,
      href: old.href,
      order: old.order,
      phase: old.phase,
      adminOnly: old.adminOnly,
      isActive: true,
      version: nextVersion,
      previousVersionId: old.id,
      searchTxt: buildSearchTxt([old.label, old.description, old.groupLabel, old.pageLabel]),
    } as Partial<TesterChecklistItemDocument>);

    await this.update(old.id, { supersededByItemId: newId });

    return newItem;
  }

  /*
   * 🛑 `botHunterIds()` and `getBugHunterLeaderboard()` were DELETED (B2,
   * 2026-10-10) with the public /bug-hunters page they fed. Both were correct;
   * the feature they served — crediting human testers on a public board —
   * retired with the human tester programme. The bug credit itself stays on
   * the checklist item (`bugConfirmed`, `bugHunterId`, `bugHunterName`), so
   * admin triage at /admin/tester-feedback is unaffected.
   *
   * Do not reinstate the aggregation without the page: it was a full
   * collection scan of every bug-confirmed item plus a users query, which is
   * only justifiable when something renders the result.
   */
}

export const testerChecklistItemRepository = new TesterChecklistItemRepository();
