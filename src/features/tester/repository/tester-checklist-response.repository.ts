import { BaseRepository } from "../../../providers/db-firebase";
import type { FirebaseSieveFields, FirebaseSieveResult, SieveModel } from "../../../providers/db-firebase";
import {
  TESTER_CHECKLIST_RESPONSE_COLLECTION,
  TESTER_CHECKLIST_RESPONSE_FIELDS,
  createChecklistResponseId,
  type TesterAnswer,
  type TesterChecklistResponseDocument,
} from "../schemas/firestore";
import { testerChecklistItemRepository } from "./tester-checklist-item.repository";

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

function escapeMd(text: string | undefined): string {
  return (text ?? "").replace(/\r?\n/g, " ").trim();
}

function screenshotLink(screenshotUrl: string | undefined, siteOrigin: string): string {
  if (!screenshotUrl) return "(none)";
  const abs = screenshotUrl.startsWith("http") ? screenshotUrl : `${siteOrigin}${screenshotUrl}`;
  return `[view](${abs})`;
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

  /**
   * Markdown dump of every answered case, joined against the checklist item
   * catalog for the human-readable label/href — optimized for a future dev
   * (or Claude session) to read directly and go fix the reported issues.
   * Mirrors appkit/scripts/export-tester-feedback.mjs's CLI output exactly;
   * keep the two in sync.
   */
  async getMarkdownReport(siteOrigin: string): Promise<string> {
    const [items, snapshot] = await Promise.all([
      testerChecklistItemRepository.list({ page: "1", pageSize: "1000" }),
      this.db.collection(this.collection).get(),
    ]);
    const itemById = new Map(items.items.map((item) => [item.id, item]));

    const responses = snapshot.docs
      .map((d) => this.mapDoc<TesterChecklistResponseDocument>(d))
      .filter((r) => r.answer === "yes" || r.answer === "no");

    interface GroupBucket {
      groupLabel: string;
      pageLabel: string;
      items: (TesterChecklistResponseDocument & { label: string; href?: string })[];
    }
    const grouped = new Map<string, GroupBucket>();
    for (const r of responses) {
      const item = itemById.get(r.checklistItemId);
      const groupLabel = item?.groupLabel ?? r.groupKey ?? "Unknown group";
      const pageLabel = item?.pageLabel ?? r.pageKey ?? "Unknown page";
      const key = `${groupLabel}␟${pageLabel}`;
      if (!grouped.has(key)) grouped.set(key, { groupLabel, pageLabel, items: [] });
      grouped.get(key)!.items.push({ ...r, label: item?.label ?? r.checklistItemId, href: item?.href });
    }
    const sortedGroups = Array.from(grouped.values()).sort(
      (a, b) => a.groupLabel.localeCompare(b.groupLabel) || a.pageLabel.localeCompare(b.pageLabel),
    );

    const issues = responses.filter((r) => r.answer === "no");
    const passingWithNotes = responses.filter((r) => r.answer === "yes" && r.comment?.trim());

    const lines: string[] = [];
    lines.push("# Tester Feedback Report");
    lines.push("");
    lines.push(
      `Generated ${new Date().toISOString()} — ${issues.length} issue(s) ("No" answers) across ${responses.length} answered case(s), plus ${passingWithNotes.length} note(s) on passing cases.`,
    );
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push('## Issues ("No" answers) — fix these');
    lines.push("");

    if (issues.length === 0) {
      lines.push("_No issues reported yet._");
      lines.push("");
    } else {
      for (const group of sortedGroups) {
        const groupIssues = group.items.filter((r) => r.answer === "no");
        if (groupIssues.length === 0) continue;
        lines.push(`### ${group.groupLabel} › ${group.pageLabel}`);
        lines.push("");
        for (const r of groupIssues) {
          lines.push(`- [ ] **${escapeMd(r.label)}**`);
          lines.push(`  - Tester: ${escapeMd(r.testerDisplayName)}`);
          if (r.comment) lines.push(`  - Comment: ${escapeMd(r.comment)}`);
          lines.push(`  - Screenshot: ${screenshotLink(r.screenshotUrl, siteOrigin)}`);
          if (r.href) lines.push(`  - Test this: ${r.href}`);
          lines.push(`  - Status: ${r.status === "reviewed" ? "reviewed" : "new"}`);
          lines.push("");
        }
      }
    }

    lines.push("---");
    lines.push("");
    lines.push('## Notes on passing cases ("Yes" with a comment)');
    lines.push("");

    if (passingWithNotes.length === 0) {
      lines.push("_No notes on passing cases._");
      lines.push("");
    } else {
      for (const group of sortedGroups) {
        const groupNotes = group.items.filter((r) => r.answer === "yes" && r.comment?.trim());
        if (groupNotes.length === 0) continue;
        lines.push(`### ${group.groupLabel} › ${group.pageLabel}`);
        lines.push("");
        for (const r of groupNotes) {
          lines.push(`- **${escapeMd(r.label)}** (works)`);
          lines.push(`  - Tester: ${escapeMd(r.testerDisplayName)}`);
          lines.push(`  - Comment: ${escapeMd(r.comment)}`);
          lines.push(`  - Screenshot: ${screenshotLink(r.screenshotUrl, siteOrigin)}`);
          lines.push("");
        }
      }
    }

    return lines.join("\n");
  }
}

export const testerChecklistResponseRepository = new TesterChecklistResponseRepository();
