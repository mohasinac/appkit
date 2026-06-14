/**
 * Server-side data loaders for the maintenance pages. Each function reads
 * straight from the `serverErrors` collection — bypasses the sieve framework
 * because the workload is tiny (admin UI / a single human) and the queries
 * are simple.
 */

import { cache } from "react";
import { getAdminDb } from "../../../../providers/db-firebase/admin";
import {
  SERVER_ERRORS_COLLECTION,
  SERVER_ERROR_FIELDS,
  type ServerErrorDocument,
  type ServerErrorSource,
} from "../../../../features/server-errors/schemas/firestore";

interface ListOpts {
  source?: ServerErrorSource;
  /** Filter by one or more codes. */
  codes?: string[];
  limit?: number;
  /** Look-back window in days; default 7. */
  days?: number;
}

export const listServerErrors = cache(
  async (opts: ListOpts = {}): Promise<ServerErrorDocument[]> => {
    const days = opts.days ?? 7;
    const since = Date.now() - days * 86_400_000;
    let q = getAdminDb()
      .collection(SERVER_ERRORS_COLLECTION)
      .where(SERVER_ERROR_FIELDS.OCCURRED_AT, ">=", since);
    if (opts.source) q = q.where(SERVER_ERROR_FIELDS.SOURCE, "==", opts.source);
    if (opts.codes && opts.codes.length > 0) {
      // Firestore "in" requires ≤30 values
      q = q.where(SERVER_ERROR_FIELDS.CODE, "in", opts.codes.slice(0, 30));
    }
    const snap = await q.orderBy(SERVER_ERROR_FIELDS.OCCURRED_AT, "desc").limit(opts.limit ?? 200).get();
    return snap.docs.map((d) => d.data() as ServerErrorDocument);
  },
);

export const getServerErrorById = cache(
  async (id: string): Promise<ServerErrorDocument | null> => {
    const doc = await getAdminDb()
      .collection(SERVER_ERRORS_COLLECTION)
      .doc(id)
      .get();
    return doc.exists ? (doc.data() as ServerErrorDocument) : null;
  },
);

export const findRelatedClientErrors = cache(
  async (requestId: string): Promise<ServerErrorDocument[]> => {
    if (!requestId || requestId === "client-self") return [];
    const snap = await getAdminDb()
      .collection(SERVER_ERRORS_COLLECTION)
      .where("requestId", "==", requestId)
      .where("source", "==", "client")
      .limit(20)
      .get();
    return snap.docs.map((d) => d.data() as ServerErrorDocument);
  },
);

export interface MaintenanceDashboardCounts {
  last24h: number;
  last7d: number;
  last30d: number;
  bySource: Record<ServerErrorSource, number>;
  topCodes: Array<{ code: string; count: number }>;
  topRoutes: Array<{ route: string; count: number; source: string }>;
}

export const getMaintenanceDashboardCounts = cache(
  async (): Promise<MaintenanceDashboardCounts> => {
    const now = Date.now();
    const win24h = now - 24 * 3_600_000;
    const win7d = now - 7 * 86_400_000;
    const win30d = now - 30 * 86_400_000;

    const snap = await getAdminDb()
      .collection(SERVER_ERRORS_COLLECTION)
      .where("occurredAt", ">=", win30d)
      .orderBy("occurredAt", "desc")
      .limit(5000)
      .get();
    const docs = snap.docs.map((d) => d.data() as ServerErrorDocument);

    const bySource: Record<ServerErrorSource, number> = {
      vercel: 0,
      client: 0,
      function: 0,
    };
    const codeMap = new Map<string, number>();
    const routeMap = new Map<string, { count: number; source: string }>();

    let last24h = 0;
    let last7d = 0;
    const last30d = docs.length;

    for (const d of docs) {
      if (d.occurredAt >= win24h) last24h++;
      if (d.occurredAt >= win7d) last7d++;
      bySource[d.source]++;
      codeMap.set(d.code, (codeMap.get(d.code) ?? 0) + 1);
      const rk = `${d.source}:${d.route}`;
      const cur = routeMap.get(rk) ?? { count: 0, source: d.source };
      cur.count++;
      routeMap.set(rk, cur);
    }

    const topCodes = [...codeMap.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topRoutes = [...routeMap.entries()]
      .map(([k, v]) => ({ route: k.replace(/^[^:]+:/, ""), count: v.count, source: v.source }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { last24h, last7d, last30d, bySource, topCodes, topRoutes };
  },
);
