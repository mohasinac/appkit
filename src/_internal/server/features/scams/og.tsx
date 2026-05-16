import type { ReactElement } from "react";

export interface ScamOgData {
  displayName: string;
  scamTypeLabel: string;
  reportCount: number;
}

interface ScammerDocLike {
  displayNames?: string[];
  scamType?: string;
  incidents?: unknown[];
  totalReports?: number;
}

export function renderScamOg(
  doc: ScammerDocLike | null | undefined,
  opts: { siteName: string; scamTypeLabel?: string },
): ReactElement {
  return renderScamOgImage(
    {
      displayName: doc?.displayNames?.[0] ?? "Unknown",
      scamTypeLabel: opts.scamTypeLabel ?? doc?.scamType ?? "Scammer",
      reportCount: (doc?.totalReports as number | undefined) ?? 0,
    },
    opts.siteName,
  );
}

export function renderScamOgImage(data: ScamOgData, siteName: string): ReactElement {
  const { displayName, scamTypeLabel, reportCount } = data;

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#0f172a",
        fontFamily: "sans-serif",
        alignItems: "center",
        padding: "60px 80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, #1e0505 0%, #0f172a 60%)",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 28,
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              background: "#dc2626",
              color: "white",
              padding: "6px 18px",
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            ⚠ Verified Scammer
          </div>
          <div style={{ fontSize: 18, color: "#94a3b8", letterSpacing: 1 }}>
            {siteName} · Scam Registry
          </div>
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#f1f5f9",
            lineHeight: 1.1,
            letterSpacing: "-1px",
          }}
        >
          {displayName}
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <div
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 22,
              color: "#f87171",
              fontWeight: 600,
            }}
          >
            {scamTypeLabel}
          </div>
          {reportCount > 0 && (
            <div style={{ fontSize: 22, color: "#64748b" }}>
              {reportCount} {reportCount === 1 ? "report" : "reports"}
            </div>
          )}
        </div>
        <div style={{ fontSize: 20, color: "#64748b", marginTop: 8 }}>
          Do not transact with this individual. Verified by the LetItRip community.
        </div>
      </div>
    </div>
  );
}
