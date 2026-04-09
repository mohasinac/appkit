/**
 * feat-events — single event detail (GET /api/events/[id])
 *
 * 2-line stub:
 * ```ts
 * // app/api/events/[id]/route.ts
 * export { eventIdGET as GET } from "@mohasinac/feat-events";
 * ```
 *
 * Returns a single active or ended event (draft/paused → 404).
 * For poll events with resultsVisibility='always': includes live vote counts.
 * For survey events with hasLeaderboard: includes top-10 leaderboard (PII stripped).
 *
 * Requires `db` registered in providers.config via `registerProviders()`.
 * Collections: "events", "eventEntries"
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "@mohasinac/contracts";
import type { EventItem, EventEntryItem } from "../../types/index.js";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/events/[id] ─────────────────────────────────────────────────────
export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }

    const eventsRepo = db.getRepository<EventItem>("events");
    const event = await eventsRepo.findById(id);

    if (!event || event.status === "draft" || event.status === "paused") {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 },
      );
    }

    // Strip internal field
    const { createdBy: _createdBy, ...publicEvent } = event as EventItem & {
      createdBy?: string;
    };

    const entriesRepo = db.getRepository<EventEntryItem>("eventEntries");

    // For poll events with resultsVisibility='always': compute live vote tallies
    let pollResults: {
      optionId: string;
      label: string;
      count: number;
      percent: number;
    }[] = [];
    if (
      event.type === "poll" &&
      event.pollConfig?.resultsVisibility === "always"
    ) {
      const allEntries = await entriesRepo.findAll({
        filters: `eventId==${id}`,
        perPage: 1000,
      });

      const voteCounts: Record<string, number> = {};
      for (const entry of allEntries.data) {
        for (const optionId of entry.pollVotes ?? []) {
          voteCounts[optionId] = (voteCounts[optionId] ?? 0) + 1;
        }
      }

      const total = allEntries.total || 1;
      pollResults = (event.pollConfig.options ?? []).map((opt) => ({
        optionId: opt.id,
        label: opt.label,
        count: voteCounts[opt.id] ?? 0,
        percent: Math.round(((voteCounts[opt.id] ?? 0) / total) * 100),
      }));
    }

    // For survey events with leaderboard: top-10 approved entries, PII stripped
    let leaderboard: unknown[] = [];
    if (event.type === "survey" && event.surveyConfig?.hasLeaderboard) {
      const leaderboardResult = await entriesRepo.findAll({
        filters: `eventId==${id},reviewStatus==approved`,
        sort: "points",
        order: "desc",
        perPage: 10,
      });

      leaderboard = leaderboardResult.data.map((entry) => {
        const {
          userId: _userId,
          userEmail: _userEmail,
          ...rest
        } = entry as EventEntryItem & {
          userId?: string;
          userEmail?: string;
        };
        return rest;
      });
    }

    return NextResponse.json({
      success: true,
      data: { ...publicEvent, pollResults, leaderboard },
    });
  } catch (error) {
    console.error("[feat-events] GET /api/events/[id] failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch event" },
      { status: 500 },
    );
  }
}
