"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMediaQuery } from "@mohasinac/react";
import { Button, Heading, Section, Text } from "@mohasinac/ui";
import type { CharacterHotspotConfig, HotspotPin } from "../types";

/* ── Fallback when no Firestore config is saved yet ──────────────────────────
   Consumers can override the full config via the `config` prop.
───────────────────────────────────────────────────────────────── */
const FALLBACK_IMAGE = "/animevssuperhero.jpg";
const FALLBACK_IMAGE_ALT = "DC, Marvel and Anime characters";

const DEFAULT_HOTSPOTS: HotspotPin[] = [
  {
    id: "spiderman",
    name: "SPIDER-MAN",
    universe: "Marvel",
    description:
      "Mid-swing, wall-crawling, Symbiote — Peter Parker in every iconic pose. Hot Toys & Iron Studios pieces with real fabric suits and LED arc detail.",
    href: "/franchise/marvel",
    xPct: 8,
    yPct: 22,
    accent: "#E8001C",
    badge: "MARVEL",
    buyText: "Get Spider-Man Figures",
  },
  {
    id: "ironman",
    name: "IRON MAN",
    universe: "Marvel",
    description:
      "Tony Stark's armour at display scale. Arc-reactor glow, battle-damaged panels, nano-tech variants — the cornerstone of every serious Marvel shelf.",
    href: "/franchise/marvel",
    xPct: 18,
    yPct: 58,
    accent: "#E8001C",
    badge: "MARVEL",
    buyText: "Get Iron Man Figures",
  },
  {
    id: "robin",
    name: "ROBIN",
    universe: "DC Comics",
    description:
      "Dick Grayson's acrobatic grace in resin. Flying-kick, staff-spin & Nightwing-transition statues — the most underrated must-have in the Bat-family lineup.",
    href: "/franchise/dc-comics",
    xPct: 28,
    yPct: 18,
    accent: "#4A90D9",
    badge: "DC",
    buyText: "Get Robin Figures",
  },
  {
    id: "batman",
    name: "BATMAN",
    universe: "DC Comics",
    description:
      "Gotham's Dark Knight on your shelf. Full-armoured, Nanosuit & Bat-suit variants from Hot Toys & Prime 1 Studio — every grim detail preserved in 1/6 scale.",
    href: "/franchise/dc-comics",
    xPct: 36,
    yPct: 42,
    accent: "#4A90D9",
    badge: "DC",
    buyText: "Get Batman Figures",
  },
  {
    id: "captain-america",
    name: "CAPTAIN AMERICA",
    universe: "Marvel",
    description:
      "Shield raised, Endgame-ready. WW2 Origin, MCU & Broken Shield variants — the most recognisable Marvel statue in any collection. Limited stock.",
    href: "/franchise/marvel",
    xPct: 12,
    yPct: 76,
    accent: "#0057FF",
    badge: "MARVEL",
    buyText: "Get Cap Figures",
  },
  {
    id: "superman",
    name: "SUPERMAN",
    universe: "DC Comics",
    description:
      "Kal-El soaring above your display. XM Studios & Iron Studios full-sculpt statues — classic red cape and New 52 dark variants, ready to ship.",
    href: "/franchise/dc-comics",
    xPct: 44,
    yPct: 68,
    accent: "#0057FF",
    badge: "DC",
    buyText: "Get Superman Figures",
  },
  {
    id: "goku",
    name: "SON GOKU",
    universe: "Dragon Ball",
    description:
      "Ultra Instinct, SSJ4, Kamehameha — every legendary form. S.H.Figuarts & Banpresto pieces sell out within hours of restock. Order yours today.",
    href: "/franchise/dragon-ball",
    xPct: 51,
    yPct: 36,
    accent: "#FFE500",
    badge: "ANIME",
    buyText: "Get Goku Figures",
  },
  {
    id: "naruto",
    name: "NARUTO UZUMAKI",
    universe: "Naruto Shippuden",
    description:
      "Sage Mode, Baryon Mode, Nine-Tails Chakra — Naruto's greatest forms frozen in resin. These restock and sell out within days. Don't sleep on it.",
    href: "/franchise/naruto",
    xPct: 57,
    yPct: 78,
    accent: "#FF6B00",
    badge: "ANIME",
    buyText: "Get Naruto Figures",
  },
  {
    id: "ichigo",
    name: "ICHIGO KUROSAKI",
    universe: "Bleach",
    description:
      "Bankai Tensa Zangetsu, Hollow & Final Getsuga forms — some of anime's most dramatic poses. Bleach figures are rare. When they restock, they go fast.",
    href: "/franchise/bleach",
    xPct: 70,
    yPct: 20,
    accent: "#4A90D9",
    badge: "ANIME",
    buyText: "Get Ichigo Figures",
  },
  {
    id: "luffy",
    name: "MONKEY D. LUFFY",
    universe: "One Piece",
    description:
      "Gear 5, Red Roc, Boundman — Luffy's explosive power takes centre stage. One Piece is the fastest-moving anime series on our platform. Grab yours now.",
    href: "/franchise/one-piece",
    xPct: 80,
    yPct: 50,
    accent: "#FFE500",
    badge: "ANIME",
    buyText: "Get Luffy Figures",
  },
  {
    id: "saitama",
    name: "SAITAMA",
    universe: "One Punch Man",
    description:
      "One punch. That's all it takes. From deadpan standing pose to the single devastating strike — Saitama figures are deceptively brilliant shelf pieces.",
    href: "/franchise/one-punch-man",
    xPct: 91,
    yPct: 50,
    accent: "#FFE500",
    badge: "ANIME",
    buyText: "Get Saitama Figures",
  },
];

export interface CharacterHotspotProps {
  config?: CharacterHotspotConfig | null;
  /**
   * Override the default fallback hotspot pins shown when no config is supplied.
   * Useful for non-collectibles storefronts.
   */
  defaultHotspots?: HotspotPin[];
  /** Universe quick-browse links shown below the panorama. */
  universeLinks?: {
    label: string;
    href: string;
    color: string;
    icon: string;
  }[];
  /** "Shop all" button href */
  shopAllHref?: string;
  /** Section heading */
  heading?: string;
  /** Sub-heading / helper text */
  subheading?: string;
}

export function CharacterHotspot({
  config,
  defaultHotspots = DEFAULT_HOTSPOTS,
  universeLinks,
  shopAllHref = "/search",
  heading = "HEROES & LEGENDS",
  subheading,
}: CharacterHotspotProps) {
  if (config !== undefined && config !== null && !config.active) return null;

  const panoramicImage = config?.imageUrl || FALLBACK_IMAGE;
  const panoramicAlt = config?.imageAlt || FALLBACK_IMAGE_ALT;
  const hotspots: HotspotPin[] =
    config?.pins && config.pins.length > 0 ? config.pins : defaultHotspots;

  return (
    <CharacterHotspotInner
      panoramicImage={panoramicImage}
      panoramicAlt={panoramicAlt}
      hotspots={hotspots}
      universeLinks={universeLinks ?? DEFAULT_UNIVERSE_LINKS}
      shopAllHref={shopAllHref}
      heading={heading}
      subheading={subheading}
    />
  );
}

interface InnerProps {
  panoramicImage: string;
  panoramicAlt: string;
  hotspots: HotspotPin[];
  universeLinks: { label: string; href: string; color: string; icon: string }[];
  shopAllHref: string;
  heading: string;
  subheading?: string;
}

const DEFAULT_UNIVERSE_LINKS: InnerProps["universeLinks"] = [
  { label: "MARVEL", href: "/franchise/marvel", color: "#E8001C", icon: "⚡" },
  {
    label: "DC COMICS",
    href: "/franchise/dc-comics",
    color: "#4A90D9",
    icon: "🦇",
  },
  {
    label: "DRAGON BALL",
    href: "/franchise/dragon-ball",
    color: "#FFE500",
    icon: "✦",
  },
  { label: "NARUTO", href: "/franchise/naruto", color: "#FF6B00", icon: "🍃" },
  {
    label: "ONE PIECE",
    href: "/franchise/one-piece",
    color: "#FFE500",
    icon: "⚓",
  },
  { label: "BLEACH", href: "/franchise/bleach", color: "#4A90D9", icon: "⚔" },
];

function CharacterHotspotInner({
  panoramicImage,
  panoramicAlt,
  hotspots,
  universeLinks,
  shopAllHref,
  heading,
  subheading,
}: InnerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 767px)");

  const toggle = useCallback((id: string) => {
    setActiveId((prev) => (prev === id ? null : id));
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setActiveId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActiveId(null);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const active = hotspots.find((h) => h.id === activeId) ?? null;

  return (
    <Section
      style={{
        background: "var(--dark-section-deep)",
        borderTop: "3px solid var(--dark-section-bg)",
        borderBottom: "3px solid var(--dark-section-bg)",
        overflow: "hidden",
      }}
    >
      {/* Panoramic scene — 16:9 container */}
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ aspectRatio: "16/9", minHeight: "420px" }}
      >
        {/* Header overlay */}
        <div
          className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(10,10,18,0.88) 0%, rgba(10,10,18,0.40) 50%, transparent 100%)",
          }}
        >
          <div className="pointer-events-auto mx-auto max-w-7xl px-4 pt-4 pb-6 flex flex-wrap items-start justify-between gap-y-3">
            <div>
              <Text
                className="mb-1 text-xs font-black uppercase tracking-[0.2em]"
                style={{ color: "var(--color-red)" }}
              >
                Explore the Universe
              </Text>
              <Heading
                level={2}
                style={{
                  fontFamily: "var(--font-bangers, Bangers, cursive)",
                  fontSize: "clamp(1.8rem, 4.5vw, 3rem)",
                  letterSpacing: "0.07em",
                  color: "#FFFFFF",
                  lineHeight: 1,
                }}
              >
                {heading}
              </Heading>
              {subheading && (
                <Text
                  className="mt-2 text-sm font-medium max-w-md"
                  style={{ color: "var(--dark-section-muted)" }}
                >
                  {subheading}
                </Text>
              )}
              {!subheading && (
                <Text
                  className="mt-2 text-sm font-medium max-w-md"
                  style={{ color: "var(--dark-section-muted)" }}
                >
                  &amp; beyond — tap the{" "}
                  <span
                    className="inline-flex items-center justify-center rounded-full font-light"
                    style={{
                      background: "rgba(255,255,255,0.92)",
                      color: "#111111",
                      width: 18,
                      height: 18,
                      border: "1.5px solid rgba(0,0,0,0.18)",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                      verticalAlign: "middle",
                      fontSize: 13,
                      lineHeight: 1,
                    }}
                  >
                    +
                  </span>{" "}
                  pins to get &amp; buy each character.
                </Text>
              )}
            </div>
            <Link
              href={shopAllHref}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2 text-sm font-black uppercase tracking-widest transition-transform hover:-translate-y-0.5"
              style={{
                fontFamily: "var(--font-bangers, Bangers, cursive)",
                letterSpacing: "0.1em",
                background: "var(--color-red)",
                color: "#FFFFFF",
                border: "3px solid var(--border-ink)",
                boxShadow: "4px 4px 0px var(--border-ink)",
              }}
            >
              SHOP ALL →
            </Link>
          </div>
        </div>

        {/* Image layer */}
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={panoramicImage}
            alt={panoramicAlt}
            fill
            className="object-cover object-top"
            sizes="100vw"
            priority={false}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, rgba(10,10,18,0.72) 0%, rgba(10,10,18,0.30) 50%, rgba(10,10,18,0.72) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(10,10,18,0.25) 0%, transparent 40%, rgba(10,10,18,0.65) 100%)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, transparent, #0A0A12)",
            }}
          />
        </div>

        {/* Universe zone labels */}
        <div
          className="hidden sm:flex absolute left-0 right-0 justify-around items-start pointer-events-none"
          style={{ top: "clamp(120px, 18vh, 165px)", zIndex: 5 }}
        >
          {(
            [
              { label: "MARVEL", color: "#E8001C" },
              { label: "DC COMICS", color: "#4A90D9" },
              { label: "ANIME", color: "#FFE500" },
            ] as { label: string; color: string }[]
          ).map(({ label, color }) => (
            <div key={label} className="flex flex-col items-center">
              <span
                className="px-3 py-1 text-[10px] sm:text-xs font-black uppercase tracking-[0.18em] rounded-sm"
                style={{
                  background: color,
                  color: color === "#FFE500" ? "#0D0D0D" : "#FFFFFF",
                  boxShadow: "2px 2px 0px rgba(0,0,0,0.6)",
                  fontFamily: "var(--font-bangers, Bangers, cursive)",
                  letterSpacing: "0.16em",
                }}
              >
                {label}
              </span>
              <div
                className="mt-1 h-5 sm:h-8 w-px"
                style={{ background: color, opacity: 0.5 }}
              />
            </div>
          ))}
        </div>

        {/* Hotspot pins */}
        {hotspots.map((hotspot) => {
          const isActive = activeId === hotspot.id;
          const popupLeft = hotspot.xPct <= 55;
          const popupAbove = hotspot.yPct > 65;

          return (
            <div
              key={hotspot.id}
              className="absolute"
              style={{
                left: `${hotspot.xPct}%`,
                top: `${hotspot.yPct}%`,
                zIndex: isActive ? 30 : 10,
                transform: "translate(-50%, -50%)",
              }}
            >
              {!isActive && (
                <span
                  className="absolute rounded-full animate-ping"
                  style={{
                    inset: -6,
                    background: "rgba(255,255,255,0.2)",
                    pointerEvents: "none",
                  }}
                />
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => toggle(hotspot.id)}
                aria-label={`Info about ${hotspot.name}`}
                aria-expanded={isActive}
                className="relative flex items-center justify-center rounded-full"
                style={{
                  width: isMobile ? 18 : 38,
                  height: isMobile ? 18 : 38,
                  background: isMobile
                    ? "none"
                    : isActive
                      ? "rgba(30,30,30,0.92)"
                      : "rgba(255,255,255,0.95)",
                  border: isMobile
                    ? "none"
                    : isActive
                      ? "2px solid rgba(255,255,255,0.25)"
                      : "2px solid rgba(0,0,0,0.18)",
                  boxShadow: isMobile ? "none" : "0 2px 12px rgba(0,0,0,0.55)",
                  backdropFilter: isMobile ? "none" : "blur(4px)",
                  padding: 0,
                  transition: "transform 0.2s ease, opacity 0.2s ease",
                  transform: isActive ? "scale(1.2) rotate(45deg)" : "scale(1)",
                  color: isMobile
                    ? "#FFFFFF"
                    : isActive
                      ? "#FFFFFF"
                      : "#111111",
                  fontSize: isMobile ? 18 : 22,
                  fontWeight: 200,
                  lineHeight: 1,
                  cursor: "pointer",
                  textShadow: isMobile ? "0 1px 6px rgba(0,0,0,0.8)" : "none",
                  opacity: isActive ? 0.7 : 1,
                }}
              >
                +
              </Button>

              {/* Desktop side popup */}
              {isActive && !isMobile && (
                <div
                  className="absolute"
                  style={{
                    ...(popupAbove
                      ? {
                          bottom: "calc(100% + 12px)",
                          top: "auto",
                          transform: "none",
                        }
                      : { top: "50%", transform: "translateY(-50%)" }),
                    ...(popupLeft
                      ? { left: "calc(100% + 14px)" }
                      : { right: "calc(100% + 14px)" }),
                    width: 300,
                    background: "rgba(255,255,255,0.97)",
                    boxShadow:
                      "0 12px 48px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)",
                    borderRadius: 4,
                    overflow: "hidden",
                    zIndex: 40,
                    animation: "fadeInUp 0.2s ease both",
                  }}
                >
                  <div style={{ height: 4, background: hotspot.accent }} />
                  <div className="px-5 py-4">
                    <Text
                      className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1"
                      style={{
                        color:
                          hotspot.accent === "#FFE500"
                            ? "#b08800"
                            : hotspot.accent,
                      }}
                    >
                      {hotspot.universe}
                    </Text>
                    <Heading
                      level={3}
                      className="font-black leading-tight mb-3"
                      style={{
                        fontFamily: "var(--font-bangers, Bangers, cursive)",
                        fontSize: "1.45rem",
                        letterSpacing: "0.06em",
                        color: "#111111",
                      }}
                    >
                      {hotspot.name}
                    </Heading>
                    <Text
                      className="text-xs leading-relaxed mb-4"
                      style={{ color: "#374151" }}
                    >
                      {hotspot.description}
                    </Text>
                    <Link
                      href={hotspot.href}
                      onClick={() => setActiveId(null)}
                      className="flex items-center justify-between px-4 py-2.5 text-sm font-black uppercase transition-opacity hover:opacity-85"
                      style={{
                        fontFamily: "var(--font-bangers, Bangers, cursive)",
                        letterSpacing: "0.1em",
                        background: hotspot.accent,
                        color:
                          hotspot.accent === "#FFE500" ? "#0D0D0D" : "#FFFFFF",
                        borderRadius: 2,
                      }}
                    >
                      {hotspot.buyText}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile bottom-sheet popup */}
      {isMobile && active && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveId(null);
          }}
        >
          <div
            className="w-full"
            style={{
              background: "var(--surface-elevated)",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              overflow: "hidden",
              animation: "fadeInUp 0.22s ease both",
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  background: "#D1D5DB",
                }}
              />
            </div>
            <div style={{ height: 4, background: active.accent }} />
            <div className="px-5 pt-4 pb-10">
              <Text
                className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1"
                style={{
                  color:
                    active.accent === "#FFE500" ? "#b08800" : active.accent,
                }}
              >
                {active.universe}
              </Text>
              <Heading
                level={3}
                className="font-black leading-tight mb-2"
                style={{
                  fontFamily: "var(--font-bangers, Bangers, cursive)",
                  fontSize: "clamp(1.5rem, 6vw, 2rem)",
                  letterSpacing: "0.06em",
                  color: "#111111",
                }}
              >
                {active.name}
              </Heading>
              <Text
                className="text-sm leading-relaxed mb-5"
                style={{ color: "#374151" }}
              >
                {active.description}
              </Text>
              <div className="flex gap-3">
                <Link
                  href={active.href}
                  onClick={() => setActiveId(null)}
                  className="flex-1 flex items-center justify-between px-4 py-3 font-black uppercase"
                  style={{
                    fontFamily: "var(--font-bangers, Bangers, cursive)",
                    letterSpacing: "0.1em",
                    fontSize: "0.9rem",
                    background: active.accent,
                    color: active.accent === "#FFE500" ? "#0D0D0D" : "#FFFFFF",
                    borderRadius: 4,
                  }}
                >
                  {active.buyText}
                  <span aria-hidden="true">→</span>
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveId(null)}
                  className="px-5 py-3 text-sm font-bold rounded"
                  style={{ background: "#F1F5F9", color: "#475569" }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Universe quick-browse row */}
      <div
        className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        {universeLinks.map(({ label, href, color, icon }) => (
          <Link
            key={label}
            href={href}
            className="group flex items-center gap-2.5 px-3 py-2.5 rounded-sm transition-all hover:-translate-y-0.5"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = color;
              (e.currentTarget as HTMLAnchorElement).style.background =
                `${color}18`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor =
                "rgba(255,255,255,0.08)";
              (e.currentTarget as HTMLAnchorElement).style.background =
                "rgba(255,255,255,0.04)";
            }}
          >
            <span className="text-base select-none" aria-hidden="true">
              {icon}
            </span>
            <span
              className="text-xs font-black uppercase tracking-wide"
              style={{
                fontFamily: "var(--font-bangers, Bangers, cursive)",
                letterSpacing: "0.1em",
                color: "#E2E8F0",
              }}
            >
              {label}
            </span>
            <span
              className="ml-auto text-xs"
              style={{ color: "#475569", transition: "color 0.15s" }}
            >
              →
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}
