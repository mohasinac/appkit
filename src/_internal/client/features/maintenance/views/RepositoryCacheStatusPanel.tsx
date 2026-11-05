"use client";

import * as React from "react";
import { Button, Div, FieldInput, Heading, Skeleton, Span, Text } from "@mohasinac/appkit/client";
import { normalizeError } from "../../../../../errors/normalize";
import { toUserMessage } from "../../../../../errors/error-display-map";
import { ADMIN_ENDPOINTS } from "../../../../../constants/api-endpoints";
import { ACTIONS } from "../../../../shared/actions/action-registry";
import { useSession } from "../../../../../react/contexts/SessionContext";
import { isAdminUser } from "../../../../../features/auth/role-predicates";

interface NamedCacheStatus {
  id: string;
  label: string;
  cached: boolean;
  ageMs: number | null;
  ttlMs: number | null;
  expiresInMs: number | null;
}

interface KeyedCacheStatus {
  id: string;
  label: string;
  entryCount: number;
}

interface CacheAdminStatus {
  named: NamedCacheStatus[];
  keyed: KeyedCacheStatus[];
}

function formatMs(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.round(s / 60)}m`;
}

/**
 * Item 8 §18 (overhaul brief) — the `CacheManager` in-memory read cache
 * (today: site settings' 2 fixed keys, products' dynamic per-id/per-slug
 * prefix), a different layer entirely from `CacheInvalidationPanel` above it
 * on this page, which clears Next.js's page/ISR cache instead.
 *
 * 🛑 "Clear" is write-gated SERVER-SIDE on `admin:maintenance:clear-cache`,
 * which `maintenance_employee` does not hold (viewing is `view-cache`, which
 * it does). `ActionDef.permissions` is UI metadata only — `<Button action>`
 * does not read it — so the buttons are hidden here via `isAdminUser`
 * directly, the same predicate CLAUDE.md's RBAC rules require everywhere
 * else, rather than relying on the 403 alone to communicate the boundary.
 */
export function RepositoryCacheStatusPanel(): React.JSX.Element {
  const { user } = useSession();
  const canClear = isAdminUser(user);

  const [status, setStatus] = React.useState<CacheAdminStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [clearingId, setClearingId] = React.useState<string | null>(null);
  // Item 8 (overhaul brief) — draft TTL-minutes input per named row, keyed
  // by source id. Seeded from the live ttlMs once status loads; typing
  // doesn't save until "Save".
  const [ttlDrafts, setTtlDrafts] = React.useState<Record<string, string>>({});
  const [savingTtlId, setSavingTtlId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(ADMIN_ENDPOINTS.MAINTENANCE_CACHE);
      const body = (await res.json()) as
        | { success: true; data: CacheAdminStatus }
        | { success: false; code?: string };
      if (!res.ok || !body.success) {
        setError(
          toUserMessage("code" in body ? String(body.code) : undefined, undefined, {
            fallback: `Could not load cache status (HTTP ${res.status}).`,
          }),
        );
        return;
      }
      setStatus(body.data);
      setTtlDrafts((prev) => {
        const next = { ...prev };
        for (const n of body.data.named) {
          if (next[n.id] === undefined) {
            next[n.id] = n.ttlMs !== null ? String(Math.round(n.ttlMs / 60_000)) : "";
          }
        }
        return next;
      });
    } catch (err) {
      const e = normalizeError(err);
      setError(
        toUserMessage(e.code, undefined, {
          fallback: "Could not reach the cache status endpoint.",
        }),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function clear(kind: "named" | "keyed" | "all", id?: string): Promise<void> {
    setClearingId(id ?? "all");
    setError(null);
    try {
      const res = await fetch(ADMIN_ENDPOINTS.MAINTENANCE_CACHE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kind === "all" ? { kind } : { kind, id }),
      });
      const body = (await res.json()) as
        | { success: true; data: { cleared: number; status: CacheAdminStatus } }
        | { success: false; code?: string };
      if (!res.ok || !body.success) {
        setError(
          toUserMessage("code" in body ? String(body.code) : undefined, undefined, {
            fallback: `Could not clear that cache (HTTP ${res.status}).`,
          }),
        );
        return;
      }
      setStatus(body.data.status);
    } catch (err) {
      const e = normalizeError(err);
      setError(
        toUserMessage(e.code, undefined, {
          fallback: "Could not reach the cache endpoint.",
        }),
      );
    } finally {
      setClearingId(null);
    }
  }

  async function saveTtl(id: string): Promise<void> {
    const raw = ttlDrafts[id] ?? "";
    const minutes = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(minutes) || minutes < 0) {
      setError("Enter a whole number of minutes, 0 or greater.");
      return;
    }
    setSavingTtlId(id);
    setError(null);
    try {
      const res = await fetch(ADMIN_ENDPOINTS.MAINTENANCE_CACHE, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, minutes }),
      });
      const body = (await res.json()) as
        | { success: true; data: { status: CacheAdminStatus } }
        | { success: false; code?: string };
      if (!res.ok || !body.success) {
        setError(
          toUserMessage("code" in body ? String(body.code) : undefined, undefined, {
            fallback: `Could not save that TTL (HTTP ${res.status}).`,
          }),
        );
        return;
      }
      setStatus(body.data.status);
    } catch (err) {
      const e = normalizeError(err);
      setError(
        toUserMessage(e.code, undefined, {
          fallback: "Could not reach the cache endpoint.",
        }),
      );
    } finally {
      setSavingTtlId(null);
    }
  }

  const row: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.5rem 0",
    borderBottom: "1px solid var(--appkit-color-border-subtle)",
    gap: "0.75rem",
  };

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
      <Div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Heading level={2} style={{ fontSize: "1rem", fontWeight: 600 }}>
          Repository read cache
        </Heading>
        {canClear ? (
          <Button
            action={ACTIONS.ADMIN["clear-repository-cache"]}
            variant="ghost"
            size="sm"
            isLoading={clearingId === "all"}
            disabled={clearingId !== null}
            onClick={() => clear("all")}
          >
            Clear all
          </Button>
        ) : null}
      </Div>
      <Text as="p" style={{ color: "var(--appkit-color-text-muted)", margin: "0.35rem 0 0.9rem" }}>
        In-memory reads of Firestore documents — a different layer from the page cache above.
        Clearing one forces its next read to go to Firestore instead of this process&rsquo;s memory.
      </Text>

      {error ? (
        <Text as="p" role="alert" style={{ color: "var(--appkit-color-error)", marginBottom: "0.75rem" }}>
          {error}
        </Text>
      ) : null}

      {loading ? (
        <Div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Skeleton height="1.5rem" />
          <Skeleton height="1.5rem" />
          <Skeleton height="1.5rem" />
        </Div>
      ) : status ? (
        <>
          <Div style={row}>
            <Span weight="semibold" style={{ fontSize: "0.8rem", color: "var(--appkit-color-text-muted)" }}>
              Named caches
            </Span>
          </Div>
          {status.named.map((n) => (
            <Div key={n.id} style={row}>
              <Div>
                <Text size="sm">{n.label}</Text>
                <Text size="xs" style={{ color: "var(--appkit-color-text-muted)" }}>
                  {n.cached
                    ? `cached, age ${formatMs(n.ageMs)}, expires in ${formatMs(n.expiresInMs)}`
                    : "not cached"}
                </Text>
              </Div>
              {canClear ? (
                <Div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Div style={{ width: "5.5rem" }}>
                    <FieldInput
                      name={`ttl-${n.id}`}
                      type="number"
                      label="TTL (min)"
                      value={ttlDrafts[n.id] ?? ""}
                      onChange={(next) => setTtlDrafts((prev) => ({ ...prev, [n.id]: next }))}
                    />
                  </Div>
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={savingTtlId === n.id}
                    disabled={savingTtlId !== null}
                    onClick={() => saveTtl(n.id)}
                  >
                    Save
                  </Button>
                  <Button
                    action={ACTIONS.ADMIN["clear-repository-cache"]}
                    variant="ghost"
                    size="sm"
                    isLoading={clearingId === n.id}
                    disabled={clearingId !== null || !n.cached}
                    onClick={() => clear("named", n.id)}
                  />
                </Div>
              ) : null}
            </Div>
          ))}

          <Div style={{ ...row, marginTop: "0.5rem" }}>
            <Span weight="semibold" style={{ fontSize: "0.8rem", color: "var(--appkit-color-text-muted)" }}>
              Keyed caches (per-id/per-slug)
            </Span>
          </Div>
          {status.keyed.map((k) => (
            <Div key={k.id} style={row}>
              <Div>
                <Text size="sm">{k.label}</Text>
                <Text size="xs" style={{ color: "var(--appkit-color-text-muted)" }}>
                  {k.entryCount} entr{k.entryCount === 1 ? "y" : "ies"} cached
                </Text>
              </Div>
              {canClear ? (
                <Button
                  action={ACTIONS.ADMIN["clear-repository-cache"]}
                  variant="ghost"
                  size="sm"
                  isLoading={clearingId === k.id}
                  disabled={clearingId !== null || k.entryCount === 0}
                  onClick={() => clear("keyed", k.id)}
                >
                  Clear all {k.label}
                </Button>
              ) : null}
            </Div>
          ))}
        </>
      ) : null}
    </Div>
  );
}
