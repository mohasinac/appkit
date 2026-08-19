/**
 * Google Cloud Logging integration for the `/admin/maintenance/cloud-logs`
 * page. Reuses the same 3-tier credential resolution as
 * `providers/db-firebase/admin.ts` (local `firebase-admin-key.json` → Vercel
 * `FIREBASE_ADMIN_*` env vars → Application Default Credentials), so no new
 * env vars are required.
 *
 * Bounded to ONE `Logging#getEntries()` call per invocation — never
 * `getEntriesStream()` in an unbounded loop — to respect the Vercel Hobby
 * 10s sync-function ceiling (CLAUDE.md Rule #6). Pagination is client-driven
 * via `nextPageToken`, not exhausted server-side.
 *
 * `@google-cloud/logging` is a consumer-side (root `package.json`) dependency
 * — it is never imported at module scope here. The `Logging` client is
 * lazily `require()`d inside a function body via `(module as any).require`,
 * exactly like `admin.ts` lazily loads `firebase-admin/*`, so Turbopack never
 * sees a static import of a Node-only client reachable from a client bundle
 * (CLAUDE.md Root Cause #6 / #24). A minimal local interface describes the
 * only surface we call — this file never imports `@google-cloud/logging`'s
 * own types, so it type-checks even though the package is deliberately not
 * listed as an appkit dependency (it lives in the consumer's root
 * `package.json` only, since this integration is Next.js-route-only).
 */

import { cache } from "react";
import { parsePrivateKey } from "../../../../providers/db-firebase/admin";
import type { JsonValue } from "../../../../schemas/types";

// --- Minimal Logging client surface (avoids depending on the real SDK's types) ---
// Typed against only the fields this file actually reads/writes, rather than
// the full @google-cloud/logging Entry/Logging surface, so this stays free of
// both a hard dependency on the SDK's own types AND lazy `unknown` escapes.

interface MinimalLogEntryMetadata {
  timestamp?: string | Date;
  severity?: string;
  insertId?: string;
  logName?: string;
  resource?: { type?: string; labels?: Record<string, string> };
}

interface MinimalLogEntry {
  metadata?: MinimalLogEntryMetadata;
  data?: string | JsonValue;
}

interface MinimalGetEntriesResponse {
  nextPageToken?: string;
}

interface MinimalLoggingClient {
  // Second tuple element is the SDK's internal "next query" cursor object —
  // never consumed here (destructured away by callers), so it is left
  // positionally untyped rather than guessing at its real shape.
  getEntries(options: {
    filter: string;
    pageSize: number;
    orderBy?: string;
    pageToken?: string;
  }): Promise<[MinimalLogEntry[], unknown, MinimalGetEntriesResponse | null]>;
}

/** Only the constructor shapes this file ever actually passes — see getLoggingClient() below. */
type LoggingConstructorOptions =
  | { keyFilename: string }
  | { projectId: string; credentials: { client_email: string; private_key: string } }
  | { projectId?: string };

interface MinimalLoggingModule {
  Logging: new (options?: LoggingConstructorOptions) => MinimalLoggingClient;
}

function loadLogging(): MinimalLoggingModule {
  return (module as any).require("@google-cloud/logging") as MinimalLoggingModule;
}

function nodePath() { return require("path") as typeof import("path"); }
function nodeFs() { return require("fs") as typeof import("fs"); }
// process.cwd() is Node.js-only; access via module.require so the Edge
// static analyser does not flag this file (mirrors admin.ts).
function nodeCwd(): string { return (module as any).require("process").cwd(); }

// Plain module-scope singleton (not `declare global` + `globalThis`) — this
// module is only ever reachable through one resolution path per process, so
// a module-local cache is sufficient and avoids global-augmentation clashes
// when the same declaration is picked up from both compiled `.d.ts` output
// and live source under a `file:./appkit` consumer tsconfig include.
let cachedLoggingClient: MinimalLoggingClient | null = null;

function getCached(): MinimalLoggingClient | null {
  return cachedLoggingClient;
}
function setCached(client: MinimalLoggingClient): void {
  cachedLoggingClient = client;
}

function getLoggingClient(): MinimalLoggingClient {
  const cached = getCached();
  if (cached) return cached;

  const { Logging } = loadLogging();
  const keyPath = nodePath().join(nodeCwd(), "firebase-admin-key.json");

  let client: MinimalLoggingClient;
  if (nodeFs().existsSync(keyPath)) {
    // Local dev — the JSON key file also carries project_id, so the Logging
    // client resolves the project automatically from `keyFilename`.
    client = new Logging({ keyFilename: keyPath });
  } else if (
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  ) {
    // Vercel — same three env vars the Firebase Admin SDK uses.
    client = new Logging({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID.trim(),
      credentials: {
        client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL.trim(),
        private_key: parsePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
      },
    });
  } else if (
    // Application Default Credentials — Firebase Functions / Cloud Run / GCE.
    process.env.FUNCTION_TARGET ||
    process.env.K_SERVICE ||
    process.env.FIREBASE_CONFIG ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  ) {
    const firebaseConfig = process.env.FIREBASE_CONFIG
      ? (JSON.parse(process.env.FIREBASE_CONFIG) as { projectId?: string })
      : {};
    const projectId = firebaseConfig.projectId ?? process.env.GCLOUD_PROJECT;
    client = new Logging(projectId ? { projectId } : {});
  } else {
    throw new Error(
      "@mohasinac/appkit: Cloud Logging credentials not found.\n" +
        "Add firebase-admin-key.json to project root, or set " +
        "FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, " +
        "FIREBASE_ADMIN_PRIVATE_KEY environment variables.",
    );
  }

  setCached(client);
  return client;
}

// --- Public data shape --------------------------------------------------------

export interface CloudLogEntry {
  id: string;
  timestamp: string;
  severity: string;
  resourceType: string;
  resourceLabels: Record<string, string>;
  logName: string;
  message: string;
}

export interface ListCloudLogEntriesOpts {
  /** Full Cloud Logging filter string. Defaults to a 24h `resource.type` window (see below). */
  filter?: string;
  /** Capped at 100. Defaults to 50. */
  pageSize?: number;
  /** Opaque continuation token from a previous call's `nextPageToken`. */
  pageToken?: string;
}

export interface ListCloudLogEntriesResult {
  entries: CloudLogEntry[];
  nextPageToken: string | null;
}

const DEFAULT_WINDOW_HOURS = 24;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;

/**
 * This project's Firebase Functions are all 2nd-gen
 * (`firebase-functions/v2/*` — see
 * `_internal/server/functions/bind-all.ts` + `jobs/runtime/adapters/firebase.ts`,
 * which import exclusively from `firebase-functions/v2/{scheduler,firestore,https}`).
 * 2nd-gen Functions run on Cloud Run under the hood, so their log entries
 * carry `resource.type="cloud_run_revision"` — NOT the 1st-gen
 * `"cloud_function"` resource type.
 */
const DEFAULT_RESOURCE_TYPE = "cloud_run_revision";

function buildDefaultFilter(): string {
  const since = new Date(Date.now() - DEFAULT_WINDOW_HOURS * 3_600_000).toISOString();
  return `resource.type="${DEFAULT_RESOURCE_TYPE}" AND timestamp>="${since}"`;
}

function excerpt(value: unknown, max = 300): string {
  if (value === null || value === undefined || value === "") return "";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function toCloudLogEntry(raw: MinimalLogEntry, index: number): CloudLogEntry {
  const metadata = raw.metadata ?? {};
  const tsRaw = metadata.timestamp;
  const timestamp =
    tsRaw instanceof Date
      ? tsRaw.toISOString()
      : typeof tsRaw === "string"
        ? tsRaw
        : new Date().toISOString();
  const resource = metadata.resource ?? {};

  return {
    id: metadata.insertId ?? `${timestamp}-${index}`,
    timestamp,
    severity: String(metadata.severity ?? "DEFAULT"),
    resourceType: resource.type ?? "unknown",
    resourceLabels: resource.labels ?? {},
    logName: metadata.logName ?? "",
    message: excerpt(raw.data),
  };
}

/**
 * Bounded, single-page Cloud Logging read. One `getEntries()` call per
 * invocation — the caller drives further pages via `opts.pageToken`
 * (client-side "Load more"), never a server-side exhaust loop.
 */
export const listCloudLogEntries = cache(
  async (opts: ListCloudLogEntriesOpts = {}): Promise<ListCloudLogEntriesResult> => {
    const pageSize = Math.min(Math.max(opts.pageSize ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const filter = opts.filter?.trim() ? opts.filter.trim() : buildDefaultFilter();

    const logging = getLoggingClient();
    const [entries, , apiResponse] = await logging.getEntries({
      filter,
      pageSize,
      orderBy: "timestamp desc",
      ...(opts.pageToken ? { pageToken: opts.pageToken } : {}),
    });

    return {
      entries: entries.map((e, i) => toCloudLogEntry(e, i)),
      nextPageToken: apiResponse?.nextPageToken || null,
    };
  },
);
