import { BaseRepository, parseSieveDateValue } from "../../../providers/db-firebase";
import type { FirebaseSieveFields, FirebaseSieveResult, SieveModel } from "../../../providers/db-firebase";
import { DatabaseError } from "../../../errors";
import {
  TESTER_CHECKLIST_ITEM_COLLECTION,
  TESTER_CHECKLIST_ITEM_FIELDS,
  createChecklistItemId,
  type TesterChecklistItemDocument,
  type TesterChecklistItemCreateInput,
  type TesterChecklistItemUpdateInput,
  type BugHunterLeaderboardEntry,
} from "../schemas/firestore";

export class TesterChecklistItemRepository extends BaseRepository<TesterChecklistItemDocument> {
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    groupKey: { canFilter: true, canSort: true },
    pageKey: { canFilter: true, canSort: true },
    label: { canFilter: true, canSort: false },
    order: { canFilter: true, canSort: true },
    phase: { canFilter: true, canSort: true },
    isActive: { canFilter: true, canSort: false },
    searchTokens: { canFilter: true, canSort: false },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    bugConfirmed: { canFilter: true, canSort: false },
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
      searchTokens: this.buildSearchTokens(old),
    } as Partial<TesterChecklistItemDocument>);

    await this.update(old.id, { supersededByItemId: newId });

    return newItem;
  }

  /** Single-query, in-memory aggregation of bug credits per hunter — mirrors
   * EventEntryRepository.getLeaderboard()'s shape. Includes old/disabled/
   * superseded items, since bug credit is permanent. */
  async getBugHunterLeaderboard(limit = 50): Promise<BugHunterLeaderboardEntry[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(TESTER_CHECKLIST_ITEM_FIELDS.BUG_CONFIRMED, "==", true)
      .get();

    const byHunter = new Map<string, { name: string; count: number }>();
    for (const doc of snapshot.docs) {
      const item = this.mapDoc<TesterChecklistItemDocument>(doc);
      if (!item.bugHunterId) continue;
      const entry = byHunter.get(item.bugHunterId) ?? {
        name: item.bugHunterName ?? "Unknown tester",
        count: 0,
      };
      entry.count += 1;
      byHunter.set(item.bugHunterId, entry);
    }

    return Array.from(byHunter.entries())
      .map(([hunterId, v]) => ({ hunterId, hunterName: v.name, bugCount: v.count }))
      .sort((a, b) => b.bugCount - a.bugCount)
      .slice(0, limit)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }
}

export const testerChecklistItemRepository = new TesterChecklistItemRepository();
