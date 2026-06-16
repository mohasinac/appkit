"use client";

import * as React from "react";
import { Anchor, Div, Heading, Label, Span, Table, Tbody, Td, Text, Th, Thead, Tr } from "@mohasinac/appkit";
import type { ServerErrorDocument, ServerErrorSource } from "../../../../../features/server-errors/schemas/firestore";

const BORDER_STYLE = "1px solid var(--appkit-color-border)";

interface Column {
  key: keyof ServerErrorDocument | "occurredAtFmt" | "messagePreview";
  label: string;
  width?: string;
}

const COLUMNS: Column[] = [
  { key: "occurredAtFmt", label: "When", width: "180px" },
  { key: "route", label: "Route" },
  { key: "method", label: "Method", width: "70px" },
  { key: "code", label: "Code", width: "180px" },
  { key: "userId", label: "User", width: "120px" },
  { key: "messagePreview", label: "Message" },
  { key: "requestId", label: "Request ID", width: "160px" },
];

export interface ServerErrorsListViewProps {
  title: string;
  subtitle?: string;
  source: ServerErrorSource | "all";
  rows: ServerErrorDocument[];
  detailHrefBase: string;
}

function fmt(occurredAt: number): string {
  return new Date(occurredAt).toISOString().replace("T", " ").slice(0, 19);
}

function preview(message: string, max = 100): string {
  return message.length > max ? message.slice(0, max) + "…" : message;
}

export function ServerErrorsListView({
  title,
  subtitle,
  source,
  rows,
  detailHrefBase,
}: ServerErrorsListViewProps): React.JSX.Element {
  const [codeFilter, setCodeFilter] = React.useState<string>("");
  const [routeFilter, setRouteFilter] = React.useState<string>("");

  const filtered = React.useMemo(() => {
    return rows.filter(
      (r) =>
        (!codeFilter || r.code.toLowerCase().includes(codeFilter.toLowerCase())) &&
        (!routeFilter || r.route.toLowerCase().includes(routeFilter.toLowerCase())),
    );
  }, [rows, codeFilter, routeFilter]);

  return (
    <Div style={{ padding: "1.5rem", maxWidth: "1400px", margin: "0 auto" }}>
      <Heading level={1} style={{ fontSize: "1.5rem", fontWeight: 600 }}>{title}</Heading>
      {subtitle ? (
        <Text as="p" style={{ color: "var(--appkit-color-text-muted)", marginBottom: "1rem" }}>{subtitle}</Text>
      ) : null}

      <Div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", alignItems: "center" }}>
        <Label style={{ fontSize: "0.85rem" }}>
          Code
          <input
            type="search"
            value={codeFilter}
            onChange={(e) => setCodeFilter(e.target.value)}
            placeholder="e.g. NOT_FOUND"
            style={{ marginLeft: "0.5rem", padding: "0.35rem 0.5rem", border: BORDER_STYLE, borderRadius: 4 }}
          />
        </Label>
        <Label style={{ fontSize: "0.85rem" }}>
          Route
          <input
            type="search"
            value={routeFilter}
            onChange={(e) => setRouteFilter(e.target.value)}
            placeholder="e.g. /api/orders"
            style={{ marginLeft: "0.5rem", padding: "0.35rem 0.5rem", border: BORDER_STYLE, borderRadius: 4 }}
          />
        </Label>
        <Span style={{ marginLeft: "auto", fontSize: "0.85rem", color: "var(--appkit-color-text-muted)" }}>
          {filtered.length} of {rows.length} (source={source})
        </Span>
      </Div>

      <Div style={{ overflowX: "auto", border: BORDER_STYLE, borderRadius: 6 }}>
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
            {filtered.length === 0 ? (
              <Tr>
                <Td colSpan={COLUMNS.length} style={{ padding: "2rem", textAlign: "center", color: "var(--appkit-color-text-muted)" }}>
                  No errors in the selected window.
                </Td>
              </Tr>
            ) : (
              filtered.map((r) => (
                <Tr key={r.id} style={{ borderBottom: "1px solid var(--appkit-color-border-subtle)" }}>
                  {COLUMNS.map((c) => {
                    let cell: React.ReactNode;
                    if (c.key === "occurredAtFmt") cell = fmt(r.occurredAt);
                    else if (c.key === "messagePreview") cell = preview(r.message);
                    else cell = (r[c.key as keyof ServerErrorDocument] ?? "") as React.ReactNode;
                    return (
                      <Td key={c.key as string} style={{ padding: "0.5rem 0.75rem", verticalAlign: "top" }}>
                        {c.key === "code" ? (
                          <Anchor href={`${detailHrefBase}/${r.id}`} external={false}>
                            {String(cell)}
                          </Anchor>
                        ) : (
                          String(cell ?? "")
                        )}
                      </Td>
                    );
                  })}
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Div>
    </Div>
  );
}
