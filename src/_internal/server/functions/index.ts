/**
 * Public surface of the Firebase Functions registry.
 *
 * Re-exported from `@mohasinac/appkit/jobs` for consumer use in
 * `functions/src/index.ts`.
 */

export { defineFunction } from "./define";
export { mergeFunctionRegistries } from "./merge";
export { bindAllFromRegistry } from "./bind-all";
export { APPKIT_FUNCTIONS, APPKIT_FUNCTIONS_BY_NAME } from "./manifest";
export type {
  DocumentCreatedTrigger,
  DocumentTriggerFunctionDefinition,
  DocumentUpdatedTrigger,
  DocumentWrittenTrigger,
  FunctionDefinition,
  FunctionMemory,
  FunctionOptions,
  FunctionTrigger,
  HttpsFunctionDefinition,
  HttpsTrigger,
  ScheduledFunctionDefinition,
  ScheduleTrigger,
} from "./types";
