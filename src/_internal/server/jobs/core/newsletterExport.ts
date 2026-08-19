/**
 * Core: async newsletter-subscriber CSV export (`newsletterExport` job).
 *
 * `GET /api/admin/newsletter/export` used to build the full CSV in-process,
 * synchronously, for up to 10,000 subscribers — a real 10s-timeout risk on
 * Vercel Hobby as the list grows (CLAUDE.md Rule #6). This runner does the
 * same work inside a Firebase Function instead and writes the CSV text onto
 * the job's `result.data.csv` field — small enough for a Firestore doc at
 * realistic subscriber counts, and avoids routing through Storage (which
 * would need a `/media/...` proxy URL per the Media Architecture rules
 * rather than a raw signed URL).
 */

import { newsletterRepository } from "../../../../repositories";
import { sortBy } from "../../../../constants/sort";
import { COMMON_FIELDS } from "../../../../constants/field-names";
import type { JobContext } from "../runtime/types";
import type { JobRunResult } from "./jobRunners";

function escape(value: unknown): string {
  const s = String(value ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function csvRow(cols: unknown[]): string {
  return cols.map(escape).join(",");
}

export async function runNewsletterExport(ctx: JobContext): Promise<JobRunResult> {
  const result = await newsletterRepository.list({
    sorts: sortBy(COMMON_FIELDS.CREATED_AT),
    page: "1",
    pageSize: "10000",
  });

  const rows = result.data as unknown as Record<string, unknown>[];
  const header = csvRow(["id", "email", "status", "source", "subscribedAt", "createdAt"]);
  const dataRows = rows.map((s) =>
    csvRow([s["id"], s["email"] ?? "", s["status"] ?? "", s["source"] ?? "", s["subscribedAt"] ?? "", s["createdAt"] ?? ""]),
  );
  const csv = [header, ...dataRows].join("\r\n");

  ctx.logger.info("newsletterExport: complete", { subscriberCount: rows.length });

  return {
    summary: { total: rows.length, succeeded: rows.length, skipped: 0, failed: 0 },
    succeeded: [],
    skipped: [],
    failed: [],
    data: { csv, subscriberCount: rows.length },
  };
}
