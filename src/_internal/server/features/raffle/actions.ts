"use server";
/**
 * SB9-H — server actions for triggering an event raffle / assigning a spin
 * prize from a Next.js API route. Builds an ad-hoc JobContext around
 * `getAdminDb()` so the same pure runners used by the Firebase Functions
 * handlers also work in a Vercel lambda (10s cap honoured by raffle pool
 * size).
 */


import { wrapAction, type ActionResult } from "@mohasinac/appkit/server";
import { getAdminDb } from "../../../../providers/db-firebase/admin";
import {
  runTriggerEventRaffle,
  type TriggerEventRaffleInput,
  type TriggerEventRaffleResult,
} from "../../jobs/core/triggerEventRaffle";
import {
  runAssignSpinPrize,
  type AssignSpinPrizeInput,
  type AssignSpinPrizeResult,
} from "../../jobs/core/assignSpinPrize";
import { resolveEventRef } from "../../jobs/core/_event-ref";
import type { JobContext, JobLogger } from "../../jobs/runtime/types";

function buildContext(job: string): JobContext {
  const logger: JobLogger = {
    info: (msg, meta) => console.info(`[${job}] ${msg}`, meta ?? {}),
    warn: (msg, meta) => console.warn(`[${job}] ${msg}`, meta ?? {}),
    error: (msg, err, meta) =>
      console.error(`[${job}] ${msg}`, err, meta ?? {}),
  };
  return {
    job,
    db: getAdminDb(),
    logger,
    env: (key) => process.env[key],
    now: new Date(),
  };
}

export async function triggerEventRaffleAction(
  input: TriggerEventRaffleInput,
): Promise<ActionResult<TriggerEventRaffleResult>> {
  return wrapAction(async () =>
    runTriggerEventRaffle(input, buildContext("admin.triggerEventRaffle")),
  );
}

export async function assignSpinPrizeAction(
  input: AssignSpinPrizeInput,
): Promise<ActionResult<AssignSpinPrizeResult>> {
  return wrapAction(async () =>
    runAssignSpinPrize(input, buildContext("user.assignSpinPrize")),
  );
}

/**
 * Resolve a slug-or-id to the canonical event DOCUMENT ID.
 *
 * Exists for one caller — `POST /api/events/[id]/spin`, which must hash a
 * guest's identity against a stable key BEFORE calling the spin action.
 *
 * 🛑 Why this is not just a nicety. Public URLs link by slug, so the route
 * received a slug and did `hashGuestIdentity(slug, request)`, while
 * `enterEvent` hashes on the resolved doc id. Two identities for one guest on
 * one event. While the spin core's lookup was broken that was invisible (every
 * spin 404'd); the moment the lookup was fixed it would have become a silent
 * `spinMaxPerUser` bypass — exhaust your spins on `/events/<slug>/participate`
 * and get a fresh allowance on `/events/<docId>/participate`.
 *
 * Returns `null` for an unknown event; the route then lets the spin action
 * produce the single authoritative `event_not_found` rather than guessing at
 * one here.
 */
export async function resolveEventIdAction(
  idOrSlug: string,
): Promise<ActionResult<string | null>> {
  return wrapAction(async () => {
    const resolved = await resolveEventRef(
      buildContext("user.resolveEventId").db,
      idOrSlug,
    );
    return resolved?.id ?? null;
  });
}
