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

  /**
   * Ids of automated (non-human) accounts, excluded from the PUBLIC leaderboard.
   *
   * Read as a bare collection query rather than through `userRepository` on purpose:
   * no repository in this codebase imports another, and this needs a key set, not
   * user documents. `.select()` with no fields returns refs only, so the read is as
   * cheap as Firestore allows, and `isBot == true` is a single-field equality served
   * by the automatic index — no composite index to declare.
   */
  private async botHunterIds(): Promise<Set<string>> {
    const snapshot = await this.db
      .collection(USER_COLLECTION)
      .where("isBot", "==", true)
      .select()
      .get();
    return new Set(snapshot.docs.map((d) => d.id));
  }

  /** Single-query, in-memory aggregation of bug credits per hunter — mirrors
   * EventEntryRepository.getLeaderboard()'s shape. Includes old/disabled/
   * superseded items, since bug credit is permanent.
   *
   * Bot accounts are aggregated out (not merely ranked last): the board exists to
   * credit people, and a runner working all 943 cases would otherwise dominate it.
   * The credit still lives on the item, so admin triage and the item's own
   * `bugHunterName` are unaffected. */
  async getBugHunterLeaderboard(limit = 50): Promise<BugHunterLeaderboardEntry[]> {
    const [snapshot, botIds] = await Promise.all([
      this.db
        .collection(this.collection)
        .where(TESTER_CHECKLIST_ITEM_FIELDS.BUG_CONFIRMED, "==", true)
        .get(),
      this.botHunterIds(),
    ]);

    const byHunter = new Map<string, { name: string; count: number }>();
    for (const doc of snapshot.docs) {
      const item = this.mapDoc<TesterChecklistItemDocument>(doc);
      if (!item.bugHunterId || botIds.has(item.bugHunterId)) continue;
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
