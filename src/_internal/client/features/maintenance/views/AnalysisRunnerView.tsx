"use client";
import { normalizeError } from "../../../../../errors/normalize";

import * as React from "react";
import { Div, Heading, Li, Section, Span, Text, Ul } from "@mohasinac/appkit";
import type { AnalyzeReport } from "../../../../server/features/maintenance/analyze";

export function AnalysisRunnerView(): React.JSX.Element {
  const [days, setDays] = React.useState(7);
  const [source, setSource] = React.useState<"all" | "vercel" | "client" | "function">("all");
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [report, setReport] = React.useState<AnalyzeReport | null>(null);

  async function run(): Promise<void> {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/maintenance/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, source }),
      });
      const body = (await res.json()) as
        | { ok: true; data: AnalyzeReport }
        | { ok: false; code: string; error: string };
      if (!res.ok || !body.ok) {
        setError(("error" in body && body.error) || `HTTP ${res.status}`);
        setRunning(false);
        return;
      }
      setReport(body.data);
    } catch (err) {
      void normalizeError(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Div style={{ padding: "1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      <Heading level={1} style={{ fontSize: "1.5rem", fontWeight: 600 }}>Maintenance analysis</Heading>
      <Div style={{ display: "flex", gap: "1rem", alignItems: "center", margin: "1rem 0" }}>
        <label>
          Days back:&nbsp;
          <input
            type="number"
            min={1}
            max={30}
            value={days}
            onChange={(e) => setDays(Math.max(1, Math.min(30, Number(e.target.value) || 7)))}
            style={{ width: 80, padding: "0.35rem 0.5rem", border: "1px solid var(--appkit-color-border)", borderRadius: 4 }}
          />
        </label>
        <label>
          Source:&nbsp;
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as typeof source)}
            style={{ padding: "0.35rem 0.5rem", border: "1px solid var(--appkit-color-border)", borderRadius: 4 }}
          >
            <option value="all">all</option>
            <option value="vercel">server (vercel)</option>
            <option value="client">client</option>
            <option value="function">function</option>
          </select>
        </label>
        <button
          type="button"
          onClick={run}
          disabled={running}
          style={{
            padding: "0.5rem 1rem",
            background: "var(--appkit-color-primary)",
            color: "var(--appkit-color-surface)",
            border: 0,
            borderRadius: 4,
            cursor: running ? "wait" : "pointer",
          }}
        >
          {running ? "Running…" : "Run analysis"}
        </button>
      </Div>

      {error ? <Text as="p" style={{ color: "var(--appkit-color-error)" }}>{error}</Text> : null}

      {report ? <ReportView report={report} /> : null}
    </Div>
  );
}

function ReportView({ report }: { report: AnalyzeReport }): React.JSX.Element {
  return (
    <Div>
      <Text as="p" style={{ color: "var(--appkit-color-text-muted)" }}>
        Generated {report.generatedAt}. Window: {report.window.days}d. Total: {report.totalErrors}. Unique users: {report.uniqueUsers}.
      </Text>

      <ReportSection title="Top codes">
        <table style={{ width: "100%", fontSize: "0.85rem" }}>
          <thead><tr><th align="left">Code</th><th align="right">Count</th><th align="right">User impact</th></tr></thead>
          <tbody>
            {report.topCodes.map((c) => (
              <tr key={c.code}><td style={{ fontFamily: "monospace" }}>{c.code}</td><td align="right">{c.count}</td><td align="right">{c.userImpact}</td></tr>
            ))}
          </tbody>
        </table>
      </ReportSection>

      <ReportSection title="Top routes">
        <table style={{ width: "100%", fontSize: "0.85rem" }}>
          <thead><tr><th align="left">Route</th><th align="left">Source</th><th align="right">Count</th></tr></thead>
          <tbody>
            {report.topRoutes.map((r) => (
              <tr key={`${r.source}:${r.route}`}><td style={{ fontFamily: "monospace" }}>{r.route}</td><td>{r.source}</td><td align="right">{r.count}</td></tr>
            ))}
          </tbody>
        </table>
      </ReportSection>

      {report.stackClusters.length > 0 ? (
        <ReportSection title={`Stack clusters (≥5)`}>
          <Ul>
            {report.stackClusters.map((c) => (
              <Li key={c.signature} style={{ marginBottom: "0.5rem", fontSize: "0.82rem" }}>
                <Span weight="bold">{c.count}×</Span> <Span style={{ fontFamily: "monospace" }}>{c.signature}</Span>
                <Div style={{ color: "var(--appkit-color-text-muted)" }}>sample: {c.sampleMessage}</Div>
              </Li>
            ))}
          </Ul>
        </ReportSection>
      ) : null}

      {report.burstWindows.length > 0 ? (
        <ReportSection title="5xx burst windows">
          <Ul>
            {report.burstWindows.map((b) => (
              <Li key={b.start}>{b.start} — {b.count} errors ({b.multiplier}× avg)</Li>
            ))}
          </Ul>
        </ReportSection>
      ) : null}

      <ReportSection title="Recommendations">
        <Ul>
          {report.recommendations.map((r, i) => <Li key={i}>{r}</Li>)}
        </Ul>
      </ReportSection>
    </Div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <Section style={{ marginTop: "1.5rem" }}>
      <Heading level={2} style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>{title}</Heading>
      {children}
    </Section>
  );
}
