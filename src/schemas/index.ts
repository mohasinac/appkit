// [SCHEMA] Central schema registry — barrel.
//
// Public entry for the `SCHEMAS` registry, registry types, and lookup helpers.
// Per-feature schemas remain in `features/<f>/schemas/index.ts`; the registry
// composes them in `./registry.ts`.

export {
  SCHEMAS,
  lookupApiSchema,
  lookupFirestoreSchema,
} from "./registry";

export type {
  SchemasShape,
  RegisteredApiRouteKey,
  RegisteredFirestoreCollection,
  RegisteredFormId,
  RegisteredSieveCollection,
  RegisteredWebhookProvider,
  RegisteredRtdbChannel,
  RegisteredStorageOp,
} from "./registry";

export type {
  ApiRouteKey,
  ApiRouteSchema,
  HttpVerb,
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  RegistryEntry,
  SchemaRegistry,
  WebhookSchemaBucket,
} from "./types";
