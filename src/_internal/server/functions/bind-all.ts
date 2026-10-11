/**
 * `bindAllFromRegistry(registry)` — converts a `FunctionDefinition[]` into a
 * record of name → bound Firebase function ready for `module.exports`.
 *
 * Each entry is dispatched to the correct existing adapter in
 * `../jobs/runtime/adapters/firebase.ts` based on `trigger.kind`. The adapters
 * already encapsulate the JobContext build, the snapshot unwrap for Firestore
 * triggers, and the shared-secret check for HTTPS handlers. No re-implementation
 * happens here.
 *
 * ## 🛑 Every handler is wrapped here, and this is the ONLY place it happens
 *
 * `wrapJobHandler` persists a `serverErrors` row with `source: "function"`
 * before re-throwing, so `/admin/maintenance/function-errors` has something to
 * show. It was written for that purpose and then had **ZERO call sites** — the
 * tester checklist carries a case whose expected answer is literally "answer NO,
 * because nothing in production writes a row with that source, so this page will
 * be empty no matter what breaks".
 *
 * That mattered more each time a job was added. The price-index rollup, the
 * alert evaluator and the counters reconciler can all fail silently today: the
 * Cloud Functions log has the stack, the admin surface built to surface it has
 * nothing, and nobody looks at a log for a job they do not know failed.
 *
 * 🛑 Wrapped HERE rather than at each `defineFunction`, because this is the one
 * choke point all 28 registered functions pass through — so a new job is
 * covered automatically and CANNOT be added unwrapped. Wrapping at the
 * definition site would make coverage a matter of remembering, which is how the
 * seam ended up dead in the first place.
 *
 * 🛑 It RE-THROWS. The recording is additive and must never swallow the error,
 * or the runtime's retry semantics change — a failed scheduled job that looks
 * successful is worse than one that is merely unobserved. `persist` has its own
 * try/catch so a failure to record cannot become the failure.
 *
 * Consumer usage (functions/src/index.ts):
 *   import { APPKIT_FUNCTIONS, bindAllFromRegistry, mergeFunctionRegistries } from "@mohasinac/appkit/jobs";
 *   import { CONSUMER_FUNCTIONS } from "./consumer-functions";
 *   const REGISTRY = mergeFunctionRegistries(APPKIT_FUNCTIONS, CONSUMER_FUNCTIONS);
 *   Object.assign(exports, bindAllFromRegistry(REGISTRY));
 */

import {
  bindDocumentCreated,
  bindDocumentUpdated,
  bindDocumentWritten,
  bindHttps,
  bindSchedule,
  type BindHttpsOptions,
} from "../jobs/runtime/adapters/firebase";
import {
  wrapScheduleHandler,
  wrapTriggerHandler,
  wrapCallableHandler,
} from "../jobs/core/wrapJobHandler";
import type {
  DocumentOptions,
} from "firebase-functions/v2/firestore";
import type { ScheduleOptions } from "firebase-functions/v2/scheduler";
import type {
  DocumentTriggerFunctionDefinition,
  FunctionDefinition,
  FunctionOptions,
  HttpsFunctionDefinition,
  ScheduledFunctionDefinition,
} from "./types";

/**
 * Generic Firebase function return type. We model it as `unknown` because
 * the underlying v2 builders return three different branded types and the
 * consumer only needs to spread them onto `exports`.
 */
type BoundFirebaseFunction = unknown;

export function bindAllFromRegistry(
  registry: readonly FunctionDefinition[],
): Record<string, BoundFirebaseFunction> {
  const out: Record<string, BoundFirebaseFunction> = {};
  for (const def of registry) {
    out[def.name] = bindOne(def);
  }
  return out;
}

function bindOne(def: FunctionDefinition): BoundFirebaseFunction {
  switch (def.trigger.kind) {
    case "schedule":
      return bindScheduledDefinition(def as ScheduledFunctionDefinition);
    case "documentCreated":
    case "documentUpdated":
    case "documentWritten":
      return bindDocumentDefinition(def as DocumentTriggerFunctionDefinition);
    case "https":
      return bindHttpsDefinition(def as HttpsFunctionDefinition);
  }
}

function bindScheduledDefinition(def: ScheduledFunctionDefinition): BoundFirebaseFunction {
  const opts: ScheduleOptions = {
    schedule: def.trigger.cron,
    ...(def.trigger.timeZone ? { timeZone: def.trigger.timeZone } : {}),
    ...sharedRuntimeOptions(def.options),
  };
  return bindSchedule(def.name, wrapScheduleHandler(def.name, def.handler), opts);
}

function bindDocumentDefinition(def: DocumentTriggerFunctionDefinition): BoundFirebaseFunction {
  const opts: DocumentOptions = {
    document: def.trigger.pathPattern,
    ...sharedRuntimeOptions(def.options),
  };
  const handler = wrapTriggerHandler(def.name, def.handler);
  switch (def.trigger.kind) {
    case "documentCreated":
      return bindDocumentCreated(def.name, handler, opts);
    case "documentUpdated":
      return bindDocumentUpdated(def.name, handler, opts);
    case "documentWritten":
      return bindDocumentWritten(def.name, handler, opts);
  }
}

function bindHttpsDefinition(def: HttpsFunctionDefinition): BoundFirebaseFunction {
  const opts: BindHttpsOptions = {
    secretEnvVar: def.options.secretEnvVar,
    ...(def.trigger.methods ? { methods: [...def.trigger.methods] } : {}),
    ...sharedRuntimeOptions(def.options),
  };
  /*
   * 🛑 Wrapped like the other two, and the HTTPS case is the one most worth
   * recording — `gateway` and `listingProcessor` are reachable from the app, so
   * a failure here is a user-visible 500 whose cause the maintenance UI should
   * be able to name. Note the double-registration trap in Root Cause #85: the
   * same handler is exposed twice (directly and via `gateway`), so a row's
   * `route` is the DEFINITION name and tells you which entry point served it.
   */
  return bindHttps(def.name, wrapCallableHandler(def.name, def.handler), opts);
}

function sharedRuntimeOptions(options: FunctionOptions | undefined) {
  if (!options) return {};
  const {
    region,
    timeoutSeconds,
    memory,
    maxInstances,
    minInstances,
    cors,
    secrets,
  } = options;
  return {
    ...(region !== undefined ? { region } : {}),
    ...(timeoutSeconds !== undefined ? { timeoutSeconds } : {}),
    ...(memory !== undefined ? { memory } : {}),
    ...(maxInstances !== undefined ? { maxInstances } : {}),
    ...(minInstances !== undefined ? { minInstances } : {}),
    ...(cors !== undefined ? buildCorsOption(cors) : {}),
    ...(secrets !== undefined ? { secrets: [...secrets] } : {}),
  };
}

function buildCorsOption(cors: boolean | string | readonly string[]) {
  if (typeof cors === "boolean" || typeof cors === "string") return { cors };
  return { cors: [...cors] };
}
