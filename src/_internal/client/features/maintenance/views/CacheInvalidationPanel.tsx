"use client";

import * as React from "react";
import { Button, Div, Heading, Span, Text } from "@mohasinac/appkit/client";
import { normalizeError } from "../../../../../errors/normalize";
import { toUserMessage } from "../../../../../errors/error-display-map";
import { ADMIN_ENDPOINTS } from "../../../../../constants/api-endpoints";
import { ACTIONS } from "../../../../shared/actions/action-registry";

interface RevalidateResult {
  scope: "all" | "collections";
  collections: string[];
  unrecognized: string[];
  apiPathsCleared: string[];
  pagesRevalidated: string[];
}

/**
 * "Invalidate all cached pages" — the manual door into ISR invalidation.
 *
 * ## Why a human needs this at all
 *
 * The Firestore triggers (`onProductWrite`, `onCategoryWrite`, `onReviewWrite`,
 * `onStoreWrite`) invalidate on their own, so the common case needs no button.
 * What they cannot see is a change that did not pass through them: an
 * `appkit-seed load`, a console edit, a bulk script, or a trigger that failed
 * its one best-effort `fetch`. Before this the only recovery was a redeploy or
 * waiting out a TTL — and most detail routes have no TTL at all (they are
 * absent from `prerender-manifest.json`, i.e. cached indefinitely), so "wait"
 * was not actually an option.
 *
 * ## 🛑 Confirmed, and the confirmation is about COST, not damage
 *
 * Nothing is deleted and no document is written — this marks entries stale.
 * The risk is the re-render: this project was suspended with HTTP 402 for 3.1M
 * ISR writes against a 200K allowance. The dialog comes from
 * `ACTIONS.ADMIN["invalidate-cache"].confirmation`, so Rule #7 owns the copy
 * and there is no `window.confirm` here.
 *
 * ## The result is rendered, not toasted
 *
 * `revalidatePath` does not report whether an entry existed, so the only
 * honest feedback is *which paths were marked*. A green toast saying "done"
 * would read identically whether seven paths were marked or zero — and
 * "marked nothing, silently" is the documented failure mode of this whole
 * subsystem (the locale-prefix trap in `revalidate-page-targets.ts`). Showing
 * the list means a wrong prefix is visible rather than inferred.
 */
export function CacheInvalidationPanel(): React.JSX.Element {
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<RevalidateResult | null>(null);

  async function invalidateAll(): Promise<void> {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(ADMIN_ENDPOINTS.CACHE_REVALIDATE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // No `collections` key — the server reads that as "every known
        // collection", which is what this button means.
        body: JSON.stringify({}),
      });
      const body = (await res.json()) as
        | { ok: true; data: RevalidateResult }
        | { ok: false; code?: string; error?: string };
      if (!res.ok || !body.ok) {
        /*
         * 🛑 `toUserMessage`, never `?? body.error`. The server's own message
         * is server text; piping it into the UI is how a Node MODULE_NOT_FOUND
         * with a full require stack was once rendered inside a buyer-facing
         * modal (Rule #9 §6, Root Cause #86).
         */
        setError(
          toUserMessage("code" in body ? String(body.code) : undefined, undefined, {
            fallback: `Cache invalidation failed (HTTP ${res.status}).`,
          }),
        );
        return;
      }
      setResult(body.data);
    } catch (err) {
      const e = normalizeError(err);
      setError(
        toUserMessage(e.code, undefined, {
          fallback: "Could not reach the cache endpoint. Check the server logs for detail.",
        }),
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <Div
      style={{
        padding: "1rem 1.25rem",
        border: "1px solid var(--appkit-color-border)",
        borderRadius: 8,
        background: "var(--appkit-color-surface)",
        marginBottom: "1.5rem",
      }}
    >
      <Heading level={2} style={{ fontSize: "1rem", fontWeight: 600 }}>
        Page cache
      </Heading>
      <Text as="p" style={{ color: "var(--appkit-color-text-muted)", margin: "0.35rem 0 0.9rem" }}>
        Writes made through the app invalidate their own pages automatically. Use this after a
        change the triggers could not see — a seed load, a direct Firestore edit, or a bulk
        script.
      </Text>

      <Button
        action={ACTIONS.ADMIN["invalidate-cache"]}
        isLoading={running}
        disabled={running}
        onClick={invalidateAll}
      />

      {error ? (
        <Text as="p" role="alert" style={{ color: "var(--appkit-color-error)", marginTop: "0.75rem" }}>
          {error}
        </Text>
      ) : null}

      {result ? (
        <Div style={{ marginTop: "0.9rem" }}>
          <Text as="p" style={{ margin: 0 }}>
            Marked <Span weight="bold">{result.pagesRevalidated.length}</Span> page
            {result.pagesRevalidated.length === 1 ? "" : "s"} stale across{" "}
            <Span weight="bold">{result.collections.length}</Span> collection
            {result.collections.length === 1 ? "" : "s"}.
          </Text>
          <Text
            as="p"
            size="xs"
            style={{ color: "var(--appkit-color-text-muted)", margin: "0.3rem 0 0" }}
          >
            They re-render on their next visit; nothing was deleted.
          </Text>
          <Div
            style={{
              marginTop: "0.5rem",
              maxHeight: 180,
              overflowY: "auto",
              fontFamily: "monospace",
              fontSize: "0.75rem",
              lineHeight: 1.6,
              color: "var(--appkit-color-text-muted)",
            }}
          >
            {result.pagesRevalidated.map((p) => (
              <Div key={p}>{p}</Div>
            ))}
          </Div>
        </Div>
      ) : null}
    </Div>
  );
}
