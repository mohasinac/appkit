/**
 * feat-events — Next.js App Router API handler (GET /api/events)
 *
 * Consuming projects can create a 2-line stub:
 *
 * ```ts
 * // app/api/events/route.ts
 * export { GET } from "@mohasinac/feat-events";
 * ```
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../contracts";
import type { EventItem, EventListResponse } from "../types/index";

function param(url: URL, key: string): string | null {
  return url.searchParams.get(key);
}

function numParam(url: URL, key: string, fallback: number): number {
  const v = url.searchParams.get(key);
  const n = v !== null ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

const SAFE_EVENT_FILTER_FIELDS = new Set([
  "status",
  "title",
  "type",
  "startsAt",
  "endsAt",
  "createdAt",
]);

function validateSieveFilters(
  raw: string,
  allowedFields: ReadonlySet<string>,
): string {
  return raw
    .split(",")
    .map((c) => c.trim())
    .filter((c) => {
      const m = c.match(/^([^<>=!@]+)\s*(?:==|!=|<=|>=|<|>|@=\*?)/);
      return m ? allowedFields.has(m[1].trim()) : false;
    })
    .join(",");
}

// ——— GET /api/events ————————————————————————————————
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const page = numParam(url, "page", 1);
    const pageSize = numParam(url, "pageSize", 24);
    const sort = param(url, "sorts") ?? param(url, "sort") ?? "-startsAt";

    const parts: string[] = ["status==active"];
    const q = param(url, "q");
    if (q) parts.push(`title@=*${q}`);
    const raw = param(url, "filters");
    if (raw) {
      const safe = validateSieveFilters(raw, SAFE_EVENT_FILTER_FIELDS);
      if (safe) parts.push(safe);
    }
    const filters = parts.join(",");

    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }

    const repo = db.getRepository<EventItem>("events");
    const result = await repo.findAll({
      filters,
      sort,
      page,
      perPage: pageSize,
    });

    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));

    // Strip internal fields (createdBy) before returning
    const items = result.data.map((event) => {
      const { createdBy: _createdBy, ...publicEvent } = event as EventItem & {
        createdBy?: string;
      };
      return publicEvent as EventItem;
    });

    const body: EventListResponse = {
      items: items as EventItem[],
      total: result.total,
      page: result.page,
      pageSize,
      totalPages,
      hasMore: result.page < totalPages,
    };

    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    console.error("[feat-events] GET /api/events failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}
