/**
 * `APPKIT_FUNCTIONS` — the single authoritative registry of every
 * appkit-owned Firebase function. Consumers extend by passing their own
 * `FunctionDefinition[]` to `mergeFunctionRegistries(...)`.
 *
 * Order matters only in two ways:
 *   - The `Object.assign(exports, bindAllFromRegistry(REGISTRY))` consumer
 *     pattern preserves insertion order, which determines the order Firebase
 *     CLI lists the functions during deploy.
 *   - `mergeFunctionRegistries` treats the second-and-later registries as
 *     overrides; appkit must be passed first so consumers may shadow.
 */

import { FIRESTORE_TRIGGER_FUNCTIONS } from "./firestore";
import { HTTPS_FUNCTIONS } from "./https";
import { SCHEDULED_FUNCTIONS } from "./scheduled";
import type { FunctionDefinition } from "./types";

export const APPKIT_FUNCTIONS: readonly FunctionDefinition[] = [
  ...SCHEDULED_FUNCTIONS,
  ...FIRESTORE_TRIGGER_FUNCTIONS,
  ...HTTPS_FUNCTIONS,
] as unknown as readonly FunctionDefinition[];

export const APPKIT_FUNCTIONS_BY_NAME: Readonly<Record<string, FunctionDefinition>> =
  Object.freeze(
    Object.fromEntries(APPKIT_FUNCTIONS.map((def) => [def.name, def])),
  );
