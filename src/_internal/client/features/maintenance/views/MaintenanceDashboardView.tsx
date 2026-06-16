"use client";

import * as React from "react";
import { Anchor, Div, Heading, Li, Nav, Section, Span, Text, Ul } from "@mohasinac/appkit";
import type { MaintenanceDashboardCounts } from "../../../../server/features/maintenance/data";

export interface MaintenanceDashboardViewProps {
  counts: MaintenanceDashboardCounts;
  basePath: string;
}

const card: React.CSSProperties = {
  padding: "1rem 1.25rem",
  border: "1px solid var(--appkit-color-border)",
  borderRadius: 8,
  background: "var(--appkit-color-surface)",
};

export function MaintenanceDashboardView({
  counts,
  basePath,
}: MaintenanceDashboardViewProps): React.JSX.Element {
  return (
    <Div style={{ padding: "1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      <Heading level={1} style={{ fontSize: "1.5rem", fontWeight: 600 }}>Maintenance</Heading>
      <Text as="p" style={{ color: "var(--appkit-color-text-muted)", marginBottom: "1.25rem" }}>
        Errors and failures across the platform — server, client, and Cloud Functions.
      </Text>

      <Div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <Div style={card}>
          <Div style={{ fontSize: "0.78rem", color: "var(--appkit-color-text-muted)" }}>Last 24 hours</Div>
          <Div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{counts.last24h}</Div>
        </Div>
        <Div style={card}>
          <Div style={{ fontSize: "0.78rem", color: "var(--appkit-color-text-muted)" }}>Last 7 days</Div>
          <Div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{counts.last7d}</Div>
        </Div>
        <Div style={card}>
          <Div style={{ fontSize: "0.78rem", color: "var(--appkit-color-text-muted)" }}>Last 30 days</Div>
          <Div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{counts.last30d}</Div>
        </Div>
        <Div style={card}>
          <Div style={{ fontSize: "0.78rem", color: "var(--appkit-color-text-muted)" }}>Server (Vercel)</Div>
          <Div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{counts.bySource.vercel}</Div>
        </Div>
        <Div style={card}>
          <Div style={{ fontSize: "0.78rem", color: "var(--appkit-color-text-muted)" }}>Client</Div>
          <Div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{counts.bySource.client}</Div>
        </Div>
        <Div style={card}>
          <Div style={{ fontSize: "0.78rem", color: "var(--appkit-color-text-muted)" }}>Cloud Functions</Div>
          <Div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{counts.bySource.function}</Div>
        </Div>
      </Div>

      <Section style={{ marginBottom: "1.5rem" }}>
        <Heading level={2} style={{ fontSize: "1rem", fontWeight: 600 }}>Top codes (30d)</Heading>
        <Ul style={{ listStyle: "none", padding: 0 }}>
          {counts.topCodes.length === 0 ? <Li style={{ color: "var(--appkit-color-text-muted)" }}>No errors recorded.</Li> :
            counts.topCodes.map((c) => (
              <Li key={c.code} style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--appkit-color-border-subtle)" }}>
                <Span style={{ fontFamily: "monospace" }}>{c.code}</Span>
                <Span>{c.count}</Span>
              </Li>
            ))}
        </Ul>
      </Section>

      <Section style={{ marginBottom: "1.5rem" }}>
        <Heading level={2} style={{ fontSize: "1rem", fontWeight: 600 }}>Top routes (30d)</Heading>
        <Ul style={{ listStyle: "none", padding: 0 }}>
          {counts.topRoutes.length === 0 ? <Li style={{ color: "var(--appkit-color-text-muted)" }}>No errors recorded.</Li> :
            counts.topRoutes.map((r) => (
              <Li key={`${r.source}:${r.route}`} style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid var(--appkit-color-border-subtle)" }}>
                <Span style={{ fontFamily: "monospace" }}>[{r.source}] {r.route}</Span>
                <Span>{r.count}</Span>
              </Li>
            ))}
        </Ul>
      </Section>

      <Nav aria-label="Maintenance sections" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.5rem" }}>
        <Anchor href={`${basePath}/server-errors`} tone="default" underline="none" style={{ ...card }}>
          <Span weight="bold">Server errors</Span>
          <Div style={{ color: "var(--appkit-color-text-muted)", fontSize: "0.85rem" }}>Vercel function failures</Div>
        </Anchor>
        <Anchor href={`${basePath}/client-errors`} tone="default" underline="none" style={{ ...card }}>
          <Span weight="bold">Client errors</Span>
          <Div style={{ color: "var(--appkit-color-text-muted)", fontSize: "0.85rem" }}>window.onerror + unhandledrejection + boundaries</Div>
        </Anchor>
        <Anchor href={`${basePath}/function-errors`} tone="default" underline="none" style={{ ...card }}>
          <Span weight="bold">Function errors</Span>
          <Div style={{ color: "var(--appkit-color-text-muted)", fontSize: "0.85rem" }}>Cloud Functions handler exceptions</Div>
        </Anchor>
        <Anchor href={`${basePath}/cloud-logs`} tone="default" underline="none" style={{ ...card }}>
          <Span weight="bold">Cloud Logging</Span>
          <Div style={{ color: "var(--appkit-color-text-muted)", fontSize: "0.85rem" }}>Live stream from Cloud Logging API</Div>
        </Anchor>
        <Anchor href={`${basePath}/payment-rollbacks`} tone="default" underline="none" style={{ ...card }}>
          <Span weight="bold">Payment rollbacks</Span>
          <Div style={{ color: "var(--appkit-color-text-muted)", fontSize: "0.85rem" }}>Razorpay refund + upstream-unavailable rows</Div>
        </Anchor>
        <Anchor href={`${basePath}/analysis`} tone="default" underline="none" style={{ ...card }}>
          <Span weight="bold">Analysis</Span>
          <Div style={{ color: "var(--appkit-color-text-muted)", fontSize: "0.85rem" }}>Run the maintenance analyzer + recommendations</Div>
        </Anchor>
      </Nav>
    </Div>
  );
}
