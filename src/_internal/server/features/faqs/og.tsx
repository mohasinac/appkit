import type { ReactElement } from "react";

export interface FaqOgData {
  categoryLabel: string;
  siteName: string;
}

export function renderFaqOg(
  category: string,
  opts: { siteName: string },
): ReactElement {
  const label = category
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return renderFaqOgImage({ categoryLabel: label, siteName: opts.siteName });
}

export function renderFaqOgImage(data: FaqOgData): ReactElement {
  const { categoryLabel, siteName } = data;

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #3570fc 0%, #1343de 100%)",
        fontFamily: "sans-serif",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.06,
          backgroundImage:
            "radial-gradient(circle at 25% 25%, white 1px, transparent 0), radial-gradient(circle at 75% 75%, white 1px, transparent 0)",
          backgroundSize: "64px 64px",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 20,
            color: "rgba(255,255,255,0.7)",
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          {siteName} · Help Centre
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "white",
            lineHeight: 1.1,
            letterSpacing: "-1px",
          }}
        >
          {categoryLabel}
        </div>
        <div
          style={{
            fontSize: 32,
            color: "rgba(255,255,255,0.8)",
            fontWeight: 400,
          }}
        >
          Frequently Asked Questions
        </div>
      </div>
    </div>
  );
}
