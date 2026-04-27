"use client";
import React, { useEffect, useRef, useState } from "react";
import type { AdSlotId, AdProvider, AdSlotConfig } from "../ad-registry";
import { getAdSlot, isAdSlotRenderable } from "../ad-registry";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AdSlotProps {
  /** The registered slot id to render. */
  id: AdSlotId;
  /**
   * Manual ad content — rendered only when the slot's provider is `"manual"`.
   * Pass any ReactNode: an image, a promotional banner, etc.
   */
  manualContent?: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Sub-renderers
// ---------------------------------------------------------------------------

function AdsenseAd({ config }: { config: AdSlotConfig }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push(
        {},
      );
    } catch {
      // AdSense not loaded yet — no-op
    }
  }, []);

  return (
    <div ref={ref} data-section="adslot-div-296">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={config.adsenseClient ?? ""}
        data-ad-slot={config.adsenseSlot ?? ""}
        data-ad-format={config.adsenseFormat ?? "auto"}
        data-full-width-responsive="true"
      />
    </div>
  );
}

function ThirdPartyAd({ config }: { config: AdSlotConfig }) {
  if (config.thirdPartyUrl) {
    return (
      <iframe
        src={config.thirdPartyUrl}
        width={config.thirdPartyWidth ?? "100%"}
        height={config.thirdPartyHeight ?? "90"}
        scrolling="no"
        frameBorder="0"
        title="Advertisement"
        style={{ border: 0, overflow: "hidden" }}
        loading="lazy"
      />
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Primary component
// ---------------------------------------------------------------------------

/**
 * `<AdSlot>` renders an ad based on the registered configuration for `id`.
 *
 * Renders nothing (zero height) when:
 * - The slot id is not registered
 * - `enabled: false` in config
 * - `requiresConsent: true` and consent has not been granted
 *
 * When `reservedHeight` is set in the config, the container always reserves
 * that height to prevent CLS — even before the ad loads.
 *
 * @example
 * <AdSlot id="homepage-hero-banner" />
 * <AdSlot id="listing-between-rows" manualContent={<PromoBanner />} />
 */
export function AdSlot({ id, manualContent, className = "" }: AdSlotProps) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return null;
  }

  const config = getAdSlot(id);
  const renderable = isAdSlotRenderable(id);

  const reservedStyle = config?.reservedHeight
    ? { minHeight: config.reservedHeight }
    : undefined;

  if (!config || !renderable) {
    // Preserve reserved space even when ad is not shown (avoids layout jumps
    // when ads are re-enabled after consent grant in the same session).
    if (config?.reservedHeight && config?.enabled !== false) {
      return (
        <div
          className={className}
          style={reservedStyle}
          aria-hidden="true"
          data-ad-slot-id={id}
          data-ad-slot-state="awaiting-consent"
        />
      );
    }
    return null;
  }

  const content = renderProvider(config.provider, config, manualContent);

  return (
    <div
      className={className}
      style={reservedStyle}
      data-ad-slot-id={id}
      aria-label="Advertisement"
    >
      {content}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Provider dispatch
// ---------------------------------------------------------------------------

function renderProvider(
  provider: AdProvider,
  config: AdSlotConfig,
  manualContent: React.ReactNode,
): React.ReactNode {
  switch (provider) {
    case "manual":
      return manualContent ?? null;
    case "adsense":
      return <AdsenseAd config={config} />;
    case "thirdParty":
      return <ThirdPartyAd config={config} />;
    default:
      return null;
  }
}
