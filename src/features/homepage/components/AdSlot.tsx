"use client";
import React, { useEffect, useRef, useState } from "react";
import type { AdSlotId, AdProvider, AdSlotConfig } from "../ad-registry";
import { getAdSlot, isAdSlotRenderable } from "../ad-registry";
import { useActiveAd } from "../hooks/useActiveAd";
import type { ActiveAdRecord } from "../hooks/useActiveAd";
import { Div, Span, Text } from "../../../ui";

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
       
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push(
        {},
      );
    } catch {
      // AdSense not loaded yet — no-op
    }
  }, []);

  return (
    <Div ref={ref}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={config.adsenseClient ?? ""}
        data-ad-slot={config.adsenseSlot ?? ""}
        data-ad-format={config.adsenseFormat ?? "auto"}
        data-full-width-responsive="true"
      />
    </Div>
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

function ManualAdBanner({ ad }: { ad: ActiveAdRecord }) {
  const { creative } = ad;
  if (!creative) return null;

  return (
    <a
      href={creative.ctaHref || "#"}
      target={creative.ctaHref ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="flex items-center gap-3 w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 px-4 py-3 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors no-underline"
    >
      {creative.imageUrl ? (
        <img
          src={creative.imageUrl}
          alt={creative.title || "Advertisement"}
          className="h-14 w-14 rounded object-cover flex-shrink-0"
          loading="lazy"
        />
      ) : null}
      <Div className="flex-1 min-w-0">
        {creative.title ? (
          <Text className="truncate" color="primary" size="sm" weight="semibold">{creative.title}</Text>
        ) : null}
        {creative.body ? (
          <Text className="truncate" color="muted" size="xs">{creative.body}</Text>
        ) : null}
      </Div>
      {creative.ctaLabel ? (
        <Span color="inverse" size="xs" weight="semibold" className="flex-shrink-0 bg-primary py-1.5" rounded="md" padding="x-sm">
          {creative.ctaLabel}
        </Span>
      ) : null}
    </a>
  );
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
 * - No active ad exists for the slot (for manual provider without manualContent)
 *
 * @example
 * <AdSlot id="homepage-hero-banner" />
 * <AdSlot id="listing-between-rows" manualContent={<PromoBanner />} />
 */
export function AdSlot({ id, manualContent, className = "" }: AdSlotProps) {
  const [hydrated, setHydrated] = useState(false);
  const { ad: activeAd } = useActiveAd(id);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return null;
  }

  const config = getAdSlot(id);
  const renderable = isAdSlotRenderable(id);

  if (!config || !renderable) {
    return null;
  }

  const resolvedManualContent = manualContent ?? (activeAd ? <ManualAdBanner ad={activeAd} /> : null);
  const content = renderProvider(config.provider, config, resolvedManualContent);

  if (!content) return null;

  return (
    <Div
      className={className}
      data-ad-slot-id={id}
      aria-label="Advertisement"
    >
      {content}
    </Div>
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
