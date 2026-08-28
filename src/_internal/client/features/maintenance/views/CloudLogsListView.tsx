"use client";

import * as React from "react";
import { Button, Div, Heading, Span, Table, Tbody, Td, Text, Th, Thead, Tr } from "@mohasinac/appkit/client";
import type { CloudLogEntry } from "../../../../server/features/maintenance/cloud-logs-data";
import { ADMIN_ENDPOINTS } from "../../../../../constants/api-endpoints";
import { normalizeError } from "../../../../../errors/normalize";
import { toUserMessage } from "../../../../../errors/error-display-map";

const BORDER_STYLE = "1px solid var(--appkit-color-border)";

interface Column {
  key: keyof CloudLogEntry | "timestampFmt" | "messagePreview" | "resource";
  label: string;
  width?: string;
}

const COLUMNS: Column[] = [
  { key: "timestampFmt", label: "When", width: "180px" },
  { key: "severity", label: "Severity", width: "100px" },
  { key: "resource", label: "Resource" },
  { key: "messagePreview", label: "Payload excerpt" },
];

function fmt(timestamp: string): string {
  const d = new Date(timestamp);
  return Number.isNaN(d.getTime()) ? timestamp : d.toISOString().replace("T", " ").slice(0, 19);
}

export interface CloudLogsListViewProps {
  title: string;
  subtitle?: string;
  initialEntries: CloudLogEntry[];
  initialNextPageToken: string | null;
}

export function CloudLogsListView({
  title,
  subtitle,
  initialEntries,
  initialNextPageToken,
}: CloudLogsListViewProps): React.JSX.Element {
  const [entries, setEntries] = React.useState<CloudLogEntry[]>(initialEntries);
  const [nextPageToken, setNextPageToken] = React.useState<string | null>(initialNextPageToken);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function loadMore(): Promise<void> {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const url = new URL(ADMIN_ENDPOINTS.MAINTENANCE_CLOUD_LOGS, window.location.origin);
      url.searchParams.set("pageToken", nextPageToken);
      const res = await fetch(url.toString());
      const body = (await res.json()) as
        | { ok: true; data: { entries: CloudLogEntry[]; nextPageToken: string | null } }
        | { ok: false; code: string; error: string };
      if (!res.ok || !body.ok) {
        setError(("error" in body && body.error) || `HTTP ${res.status}`);
        return;
      }
      setEntries((prev) => [...prev, ...body.data.entries]);
      setNextPageToken(body.data.nextPageToken);
    } catch (err) {
      const e = normalizeError(err);
      setError(
        toUserMessage(e.code, undefined, {
          fallback: "Could not load more log entries. Please try again.",
        }),
      );
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <Div style={{ padding: "1.5rem", maxWidth: "1400px", margin: "0 auto" }}>
      <Heading level={1} style={{ fontSize: "1.5rem", fontWeight: 600 }}>{title}</Heading>
      {subtitle ? (
        <Text as="p" style={{ color: "var(--appkit-color-text-muted)", marginBottom: "1rem" }}>{subtitle}</Text>
      ) : null}

      <Span style={{ fontSize: "0.85rem", color: "var(--appkit-color-text-muted)" }}>
        {entries.length} entries loaded
      </Span>

      {error ? (
        <Text as="p" style={{ color: "var(--appkit-color-error)", marginTop: "0.5rem" }}>{error}</Text>
      ) : null}

      <Div style={{ overflowX: "auto", border: BORDER_STYLE, borderRadius: 6, marginTop: "0.75rem" }}>
        <Table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <Thead style={{ background: "var(--appkit-color-bg)" }}>
            <Tr>
              {COLUMNS.map((c) => (
                <Th
                  key={c.key as string}
                  style={{
                    textAlign: "left",
                    padding: "0.5rem 0.75rem",
                    borderBottom: BORDER_STYLE,
                    width: c.width,
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.label}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {entries.length === 0 ? (
              <Tr>
                <Td colSpan={COLUMNS.length} style={{ padding: "2rem", textAlign: "center", color: "var(--appkit-color-text-muted)" }}>
                  No log entries in the selected window.
                </Td>
              </Tr>
            ) : (
              // Named `entry`, not `e`: this is a Cloud Logging record, not a
              // caught error, and rendering its `.message` is the entire point
              // of this admin viewer. The short name read as the defect
              // audit-raw-error-text exists to catch.
              entries.map((entry) => (
                <Tr key={entry.id} style={{ borderBottom: "1px solid var(--appkit-color-border-subtle)" }}>
                  <Td style={{ padding: "0.5rem 0.75rem", verticalAlign: "top", whiteSpace: "nowrap" }}>{fmt(entry.timestamp)}</Td>
                  <Td style={{ padding: "0.5rem 0.75rem", verticalAlign: "top" }}>{entry.severity}</Td>
                  <Td style={{ padding: "0.5rem 0.75rem", verticalAlign: "top" }}>{entry.resourceType}</Td>
                  <Td style={{ padding: "0.5rem 0.75rem", verticalAlign: "top", fontFamily: "monospace" }}>{entry.message}</Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Div>

      <Div style={{ marginTop: "1rem", textAlign: "center" }}>
        {nextPageToken ? (
          <Button type="button" onClick={loadMore} isLoading={loadingMore}>
            Load more
          </Button>
        ) : entries.length > 0 ? (
          <Text style={{ color: "var(--appkit-color-text-muted)", fontSize: "0.85rem" }}>No more entries.</Text>
        ) : null}
      </Div>
    </Div>
  );
}
