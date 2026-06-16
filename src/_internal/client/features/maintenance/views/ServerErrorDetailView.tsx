"use client";

import * as React from "react";
import { Anchor, Div, Heading, Li, Section, Text, Ul } from "@mohasinac/appkit";
import type { ServerErrorDocument } from "../../../../../features/server-errors/schemas/firestore";

export interface ServerErrorDetailViewProps {
  doc: ServerErrorDocument;
  related: ServerErrorDocument[];
  backHref: string;
}

function fmt(t: number): string {
  return new Date(t).toISOString().replace("T", " ").slice(0, 19);
}

export function ServerErrorDetailView({
  doc,
  related,
  backHref,
}: ServerErrorDetailViewProps): React.JSX.Element {
  return (
    <Div style={{ padding: "1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      <Text as="p">
        <Anchor href={backHref} external={false}>
          ← Back to list
        </Anchor>
      </Text>
      <Heading level={1} style={{ fontSize: "1.5rem", fontWeight: 600 }}>
        {doc.code} <Text size="xs" style={{ fontSize: "1rem", color: "var(--appkit-color-text-muted)" }}>{doc.source}</Text>
      </Heading>
      <Text as="p" style={{ color: "var(--appkit-color-text-muted)" }}>{fmt(doc.occurredAt)} — {doc.method ?? "—"} {doc.route}</Text>

      <Section style={{ marginTop: "1.25rem" }}>
        <Heading level={2} style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Message</Heading>
        <Text as="p" style={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}>{doc.message}</Text>
      </Section>

      <Section style={{ marginTop: "1.25rem" }}>
        <Heading level={2} style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Metadata</Heading>
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.25rem 1rem", fontSize: "0.85rem" }}>
          <dt>request ID</dt>
          <dd style={{ fontFamily: "monospace" }}>{doc.requestId}</dd>
          {doc.userId ? (<>
            <dt>user ID</dt>
            <dd style={{ fontFamily: "monospace" }}>{doc.userId}</dd>
          </>) : null}
          {doc.userAgent ? (<>
            <dt>user agent</dt>
            <dd>{doc.userAgent}</dd>
          </>) : null}
          {doc.bodyDigest ? (<>
            <dt>body digest</dt>
            <dd style={{ fontFamily: "monospace" }}>{doc.bodyDigest}</dd>
          </>) : null}
        </dl>
      </Section>

      {doc.stack ? (
        <Section style={{ marginTop: "1.25rem" }}>
          <Heading level={2} style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Stack</Heading>
          <pre style={{ fontFamily: "monospace", fontSize: "0.78rem", background: "var(--appkit-color-text)", color: "var(--appkit-color-border)", padding: "0.75rem", borderRadius: 4, overflowX: "auto" }}>
            {doc.stack}
          </pre>
        </Section>
      ) : null}

      {doc.componentStack ? (
        <Section style={{ marginTop: "1.25rem" }}>
          <Heading level={2} style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Component stack</Heading>
          <pre style={{ fontFamily: "monospace", fontSize: "0.78rem", background: "var(--appkit-color-text)", color: "var(--appkit-color-border)", padding: "0.75rem", borderRadius: 4, overflowX: "auto" }}>
            {doc.componentStack}
          </pre>
        </Section>
      ) : null}

      {related.length > 0 ? (
        <Section style={{ marginTop: "1.25rem" }}>
          <Heading level={2} style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Related client errors (same requestId)
          </Heading>
          <Ul>
            {related.map((r) => (
              <Li key={r.id} style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>
                {fmt(r.occurredAt)} — {r.code} — {r.message.slice(0, 100)}
              </Li>
            ))}
          </Ul>
        </Section>
      ) : null}
    </Div>
  );
}
