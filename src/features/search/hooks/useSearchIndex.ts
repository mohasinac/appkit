"use client";

/*
 * WHY: Fetch the public search artifact exactly once per page session and
 *      hand every caller the SAME prepared copy, so typing costs nothing.
 * WHAT: A module-level singleton loader plus the hook that exposes its state.
 *
 * ## 🛑 ONE fetch and ONE `prepareIndex`, per page session, shared
 *
 * The artifact is ~420 KB and `prepareIndex` normalises ~3,700 titles and
 * details. Both are cheap once and ruinous per component: the header
 * dropdown, `/search`, `/parts` and two `/tools` surfaces all want the same
 * index, and a hook that loaded per mount would download it five times and
 * re-normalise 18,500 strings. The singleton lives at module scope — not in a
 * React context — because a context would make every one of those consumers
 * require a provider they cannot guarantee (Root Cause #20), and the data is
 * immutable so there is nothing for a provider to coordinate.
 *
 * ## 🛑 Nothing loads until somebody intends to search
 *
 * `active` gates the fetch, and callers flip it on first focus or first
 * keypress — never on mount. The action-index route states the rule this
 * follows: one request per session, never per keystroke. Firing on mount
 * would put 420 KB on the critical path of every page view for a feature
 * most visits never touch, which is the opposite of the trade this whole
 * design exists to make.
 *
 * ## 🛑 It NEVER stores the artifact in localStorage
 *
 * The service worker holds the bytes, against an `immutable` version-addressed
 * URL. localStorage is synchronous, ~5 MB, shared with everything else the app
 * keeps, and would have to be invalidated by hand on every build. The plan
 * called for keeping the version integer there to skip the manifest hop; that
 * is dropped deliberately, because the manifest is a ~100-byte 60s-cached
 * document and a remembered version is wrong exactly when it matters — after
 * a rebuild — at which point it costs a WASTED 420 KB download instead of
 * saving a tiny one.
 *
 * ## Four states, and `loading` is not `empty`
 *
 * Same discipline as `GatedPrice`'s three: a caller must be able to tell "no
 * matches" from "we have not loaded the haystack yet". Rendering an empty
 * state while the index is in flight says "nothing matched" about a question
 * nobody has asked yet.
 *
 * `failed` and `disabled` are also distinct, and both mean *fall back to the
 * server path* rather than *show nothing*.
 *
 * @tag domain:search
 * @tag layer:feature
 * @tag pattern:hook
 * @tag access:client
 * @tag consumers:Search,SearchResultsPageView,/parts,/tools/price-index
 * @tag sideEffects:network
 */

import * as React from "react";

import {
  SEARCH_INDEX_SCHEMA_VERSION,
  type SearchIndexArtifact,
} from "../../../_internal/shared/search/index-record";
import {
  searchArtifactUrl,
  searchManifestUrl,
  type SearchIndexManifestPublic,
} from "../../../_internal/shared/search/artifact-url";
import { prepareIndex, type PreparedIndex } from "../../../_internal/shared/search/match";

/**
 * Read at module scope, exactly as `utils/media-url.ts` does for the same
 * variable. Next inlines `NEXT_PUBLIC_*` at build time, so this is a constant
 * in the bundle rather than a runtime lookup.
 */
const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";

export type SearchIndexStatus = "idle" | "loading" | "ready" | "failed" | "disabled";

export interface LoadedSearchIndex {
  readonly artifact: SearchIndexArtifact;
  readonly prepared: PreparedIndex[];
  readonly version: number;
  readonly builtAt: string;
}

export interface SearchIndexState {
  readonly status: SearchIndexStatus;
  readonly index: LoadedSearchIndex | null;
  /** Present on `failed`. Short, for a log line — never rendered to a user. */
  readonly reason: string | null;
}

/**
 * The singleton. `undefined` until the first caller asks; thereafter the same
 * promise forever, resolving to `null` on any failure.
 *
 * 🛑 Resolving to `null` rather than rejecting is deliberate: a rejected
 * module-scope promise with no attached handler is an unhandled rejection in
 * every tab where nothing happens to be awaiting it yet.
 */
let inflight: Promise<LoadedSearchIndex | null> | undefined;
let failureReason: string | null = null;

/** Reset hook, for the verify script and for a kill-switch flip mid-session. */
export function __resetSearchIndexForTests(): void {
  inflight = undefined;
  failureReason = null;
}

async function fetchJson<T>(url: string, label: string): Promise<T> {
  /*
   * 🛑 `mode: "cors"`, explicitly, and never `no-cors`.
   *
   * A `no-cors` fetch of a cross-origin object yields an OPAQUE response: the
   * body cannot be read, the status reads as 0, and a 404 is indistinguishable
   * from a successful empty index — which is this feature's single favourite
   * failure mode. The bucket carries a CORS entry for the app origins
   * precisely so this can be `cors` and the status can be real.
   */
  const res = await fetch(url, { mode: "cors", credentials: "omit" });
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function load(): Promise<LoadedSearchIndex | null> {
  try {
    if (!BUCKET) throw new Error("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is unset");

    const manifest = await fetchJson<SearchIndexManifestPublic>(
      searchManifestUrl(BUCKET),
      "manifest",
    );

    /*
     * 🛑 Refuse a schema this build does not understand, rather than render a
     * half-understood artifact.
     *
     * The tuple is positional. A future `[typeIdx, title, detail, slug,
     * facets, badge]` would parse without error in this build and simply be
     * read wrong — wrong slugs, wrong hrefs, confidently. The version lives
     * in the ENVELOPE and not in the URL for exactly this check; falling back
     * to the server path is always better than being quietly wrong.
     */
    if (manifest.schema !== SEARCH_INDEX_SCHEMA_VERSION) {
      throw new Error(
        `schema ${manifest.schema} != client ${SEARCH_INDEX_SCHEMA_VERSION}`,
      );
    }

    const artifact = await fetchJson<SearchIndexArtifact>(
      searchArtifactUrl(BUCKET, manifest.version),
      "artifact",
    );
    if (artifact.schema !== SEARCH_INDEX_SCHEMA_VERSION) {
      throw new Error(`artifact schema ${artifact.schema} disagrees with its manifest`);
    }

    return {
      artifact,
      // Once, here. See the header, and `prepareIndex`'s own 🛑.
      prepared: [...prepareIndex(artifact)],
      version: artifact.version,
      builtAt: artifact.builtAt,
    };
  } catch (err) {
    failureReason = err instanceof Error ? err.message : String(err);
    return null;
  }
}

/** Start the load if it has not started. Idempotent; safe to call per render. */
export function ensureSearchIndex(): Promise<LoadedSearchIndex | null> {
  inflight ??= load();
  return inflight;
}

export interface UseSearchIndexOptions {
  /**
   * Flip true when the user shows intent — focus, or the first keypress.
   * False keeps the hook in `idle` and issues no request at all.
   */
  active: boolean;
  /**
   * `siteSettings.search?.indexEnabled`. 🛑 Read as `!== false`, so an
   * undefined settings object — a failed fetch, a stale cached response from
   * before the field existed — leaves search WORKING. Only an explicit
   * `false` disables it.
   */
  indexEnabled?: boolean;
}

export function useSearchIndex({
  active,
  indexEnabled,
}: UseSearchIndexOptions): SearchIndexState {
  const enabled = indexEnabled !== false;
  const [index, setIndex] = React.useState<LoadedSearchIndex | null>(null);
  const [settled, setSettled] = React.useState(false);

  React.useEffect(() => {
    if (!active || !enabled || settled) return;
    let alive = true;
    void ensureSearchIndex().then((loaded) => {
      if (!alive) return;
      setIndex(loaded);
      setSettled(true);
    });
    return () => {
      alive = false;
    };
  }, [active, enabled, settled]);

  const status: SearchIndexStatus = !enabled
    ? "disabled"
    : !active
      ? "idle"
      : !settled
        ? "loading"
        : index
          ? "ready"
          : "failed";

  return { status, index, reason: status === "failed" ? failureReason : null };
}
