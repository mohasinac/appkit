/**
 * analyze-logs core — shared by the CLI (`scripts/analyze-logs.mjs`) and the
 * admin route (`/api/admin/maintenance/analysis`). Pure function over the
 * `serverErrors` collection: pages through documents within a time window and
 * computes a report.
 *
 * Designed to be cheap enough to run on Vercel's 10s sync-function ceiling for
 * a 7-day window. For larger windows or denser failure rates, call from the
 * CLI which has no ceiling and writes a markdown report to disk.
 */

import { getAdminDb } from "../../../../providers/db-firebase/admin";
import {
  SERVER_ERRORS_COLLECTION,
  type ServerErrorDocument,
  type ServerErrorSource,
} from "../../../../features/server-errors/schemas/firestore";

export interface AnalyzeOptions {
  /** Look-back window in days (1..30). */
  days: number;
  /** Filter by source. Omit / "all" for the full union. */
  source?: ServerErrorSource | "all";
  /** Hard cap on documents loaded — defaults 5000. */
  maxDocs?: number;
}

export interface AnalyzeReport {
  generatedAt: string;
  window: { days: number; from: number; to: number };
  source: ServerErrorSource | "all";
  totalErrors: number;
  uniqueUsers: number;
  topCodes: Array<{ code: string; count: number; userImpact: number }>;
  topRoutes: Array<{ route: string; count: number; source: string }>;
  hourlyHistogram: Array<{ hour: string; count: number }>;
  dailyHistogram: Array<{ day: string; count: number }>;
  stackClusters: Array<{
    signature: string;
    count: number;
    sampleMessage: string;
    sampleStackHead: string[];
  }>;
  burstWindows: Array<{ start: string; end: string; count: number; multiplier: number }>;
  clientServerCorrelation: Array<{
    requestId: string;
    serverCode: string;
    clientCode: string;
  }>;
  recommendations: string[];
}

function topFrames(stack: string | undefined, n: number): string[] {
  if (!stack) return [];
  return stack
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("at "))
    .slice(0, n);
}

function stackSignature(stack: string | undefined): string {
  return topFrames(stack, 3).join(" >> ");
}

export async function analyzeLogs(opts: AnalyzeOptions): Promise<AnalyzeReport> {
  const days = Math.max(1, Math.min(30, opts.days));
  const maxDocs = opts.maxDocs ?? 5000;
  const now = Date.now();
  const from = now - days * 86_400_000;
  const sourceFilter = opts.source && opts.source !== "all" ? opts.source : null;

  const db = getAdminDb();
  let q = db.collection(SERVER_ERRORS_COLLECTION).where("occurredAt", ">=", from);
  if (sourceFilter) q = q.where("source", "==", sourceFilter);
  const snap = await q.orderBy("occurredAt", "desc").limit(maxDocs).get();

  const docs = snap.docs.map((d) => d.data() as ServerErrorDocument);

  const totalErrors = docs.length;
  const uniqueUsersSet = new Set<string>();
  const codeCounts = new Map<string, { count: number; users: Set<string> }>();
  const routeCounts = new Map<string, { count: number; source: string }>();
  const hourlyMap = new Map<string, number>();
  const dailyMap = new Map<string, number>();
  const stackMap = new Map<
    string,
    { count: number; sampleMessage: string; sampleStackHead: string[] }
  >();
  const requestIdMap = new Map<string, { server?: string; client?: string }>();

  for (const d of docs) {
    if (d.userId) uniqueUsersSet.add(d.userId);

    const cc = codeCounts.get(d.code) ?? { count: 0, users: new Set<string>() };
    cc.count++;
    if (d.userId) cc.users.add(d.userId);
    codeCounts.set(d.code, cc);

    const routeKey = `${d.source}:${d.route}`;
    const rc = routeCounts.get(routeKey) ?? { count: 0, source: d.source };
    rc.count++;
    routeCounts.set(routeKey, rc);

    const date = new Date(d.occurredAt);
    const hourKey = `${date.toISOString().slice(0, 13)}:00`;
    hourlyMap.set(hourKey, (hourlyMap.get(hourKey) ?? 0) + 1);
    const dayKey = date.toISOString().slice(0, 10);
    dailyMap.set(dayKey, (dailyMap.get(dayKey) ?? 0) + 1);

    const sig = stackSignature(d.stack);
    if (sig) {
      const sm = stackMap.get(sig) ?? {
        count: 0,
        sampleMessage: d.message,
        sampleStackHead: topFrames(d.stack, 3),
      };
      sm.count++;
      stackMap.set(sig, sm);
    }

    if (d.requestId) {
      const slot = requestIdMap.get(d.requestId) ?? {};
      if (d.source === "client") slot.client = d.code;
      else slot.server = d.code;
      requestIdMap.set(d.requestId, slot);
    }
  }

  const topCodes = [...codeCounts.entries()]
    .map(([code, v]) => ({ code, count: v.count, userImpact: v.users.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const topRoutes = [...routeCounts.entries()]
    .map(([key, v]) => ({ route: key.replace(/^[^:]+:/, ""), count: v.count, source: v.source }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const hourlyHistogram = [...hourlyMap.entries()]
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  const dailyHistogram = [...dailyMap.entries()]
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const stackClusters = [...stackMap.entries()]
    .filter(([, v]) => v.count >= 5)
    .map(([signature, v]) => ({
      signature,
      count: v.count,
      sampleMessage: v.sampleMessage,
      sampleStackHead: v.sampleStackHead,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // 5xx burst detection: split hourlyHistogram into 5-min windows; flag any
  // window > 3× the rolling 24h avg.
  const fiveMinMap = new Map<string, number>();
  for (const d of docs) {
    const t = new Date(d.occurredAt);
    const slot = new Date(t);
    slot.setUTCMinutes(Math.floor(t.getUTCMinutes() / 5) * 5, 0, 0);
    const k = slot.toISOString();
    fiveMinMap.set(k, (fiveMinMap.get(k) ?? 0) + 1);
  }
  const rolling24hAvg = totalErrors / Math.max(1, days * 24 * 12); // per 5 min slot
  const burstWindows = [...fiveMinMap.entries()]
    .filter(([, count]) => count > 3 * rolling24hAvg && count >= 5)
    .map(([start, count]) => {
      const end = new Date(new Date(start).getTime() + 5 * 60_000).toISOString();
      return {
        start,
        end,
        count,
        multiplier: Number((count / Math.max(0.001, rolling24hAvg)).toFixed(1)),
      };
    })
    .sort((a, b) => b.multiplier - a.multiplier)
    .slice(0, 10);

  const clientServerCorrelation = [...requestIdMap.entries()]
    .filter(([, v]) => v.server && v.client)
    .slice(0, 20)
    .map(([requestId, v]) => ({
      requestId,
      serverCode: v.server ?? "",
      clientCode: v.client ?? "",
    }));

  // Heuristic recommendations
  const recommendations: string[] = [];
  const topCode = topCodes[0];
  if (topCode?.code === "NOT_FOUND") {
    recommendations.push(
      `NOT_FOUND is the top code (${topCode.count}× in window). Verify seed coverage of referenced collections.`,
    );
  }
  if (topCodes.find((c) => c.code === "PERMISSION_DENIED" && c.count >= 5)) {
    recommendations.push(
      "PERMISSION_DENIED spike — check Firestore security rules deploy on the affected routes.",
    );
  }
  if (topCodes.find((c) => c.code === "CONCURRENT_MODIFICATION" && c.count >= 5)) {
    recommendations.push(
      "CONCURRENT_MODIFICATION cluster — review transaction retry logic and consider tighter retry bounds.",
    );
  }
  const validationFailures = topRoutes.filter(
    (r) => routeCounts.get(`${r.source}:${r.route}`)?.count !== undefined && topCodes[0]?.code === "VALIDATION_FAILED",
  );
  if (validationFailures.length > 0) {
    recommendations.push(
      `VALIDATION_FAILED concentrated on ${validationFailures[0].route} — fix client request shape or extend the route's Zod schema.`,
    );
  }
  if (topCodes.find((c) => c.code.startsWith("PAYMENT_ROLLBACK"))) {
    recommendations.push(
      "PAYMENT_ROLLBACK_* observed — verify Razorpay webhook health and check the refund-rollback path.",
    );
  }
  if (
    topRoutes.find(
      (r) =>
        r.route === "/api/client-errors" &&
        topCodes[0]?.code === "NETWORK_ERROR",
    )
  ) {
    recommendations.push(
      "/api/client-errors itself is failing — ingestion endpoint may be down; client errors are being lost.",
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      "No anomaly heuristics triggered — failures are within expected distribution.",
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    window: { days, from, to: now },
    source: opts.source ?? "all",
    totalErrors,
    uniqueUsers: uniqueUsersSet.size,
    topCodes,
    topRoutes,
    hourlyHistogram,
    dailyHistogram,
    stackClusters,
    burstWindows,
    clientServerCorrelation,
    recommendations,
  };
}
