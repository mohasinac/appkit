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
  return bindSchedule(def.name, def.handler, opts);
}

function bindDocumentDefinition(def: DocumentTriggerFunctionDefinition): BoundFirebaseFunction {
  const opts: DocumentOptions = {
    document: def.trigger.pathPattern,
    ...sharedRuntimeOptions(def.options),
  };
  switch (def.trigger.kind) {
    case "documentCreated":
      return bindDocumentCreated(def.name, def.handler, opts);
    case "documentUpdated":
      return bindDocumentUpdated(def.name, def.handler, opts);
    case "documentWritten":
      return bindDocumentWritten(def.name, def.handler, opts);
  }
}

function bindHttpsDefinition(def: HttpsFunctionDefinition): BoundFirebaseFunction {
  const opts: BindHttpsOptions = {
    secretEnvVar: def.options.secretEnvVar,
    ...(def.trigger.methods ? { methods: [...def.trigger.methods] } : {}),
    ...sharedRuntimeOptions(def.options),
  };
  return bindHttps(def.name, def.handler, opts);
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
