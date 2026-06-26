"use client"
import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { GRID_COLS_6_LG } from "../../../_internal/shared/styles/grid";
import { useMediaQuery } from "../../../react";
import { Button, Div, Heading, Row, Section, Span, Stack, Text } from "../../../ui";
import type { CharacterHotspotConfig, HotspotPin as HotspotPinData } from "../types";

const __O = {
  hidden: "overflow-hidden",
} as const;

/* -- Fallback when no Firestore config is saved yet --------------------------
   Consumers can override the full config via the `config` prop.
----------------------------------------------------------------- */
const FALLBACK_IMAGE = "/animevssuperhero.jpg";
const FALLBACK_IMAGE_ALT = "DC, Marvel and Anime characters";
const FONT_BANGERS = "var(--font-bangers, Bangers, cursive)";

/* -- Franchise brand colour references — hex lives in tokens.css (exempt) -- */
const BRAND_MARVEL          = "var(--brand-marvel)";
const BRAND_DC              = "var(--brand-dc)";
const BRAND_DC_ALT          = "var(--brand-dc-alt)";
const BRAND_ANIME_YELLOW    = "var(--brand-anime-yellow)";
const BRAND_ANIME_YELLOW_TEXT = "var(--brand-anime-yellow-text)";
const BRAND_NARUTO          = "var(--brand-naruto)";
const BRAND_HOTSPOT_OVERLAY = "var(--brand-hotspot-overlay)";

const DEFAULT_HOTSPOTS: HotspotPinData[] = [
  {
    id: "spiderman",
    name: "SPIDER-MAN",
    universe: "Marvel",
    description:
      "Mid-swing, wall-crawling, Symbiote — Peter Parker in every iconic pose. Hot Toys & Iron Studios pieces with real fabric suits and LED arc detail.",
    href: "/franchise/marvel",
    xPct: 8,
    yPct: 22,
    accent: BRAND_MARVEL,
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
    accent: BRAND_MARVEL,
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
    accent: BRAND_DC,
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
    accent: BRAND_DC,
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
    accent: BRAND_DC_ALT,
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
    accent: BRAND_DC_ALT,
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
    accent: BRAND_ANIME_YELLOW,
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
    accent: BRAND_NARUTO,
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
    accent: BRAND_DC,
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
    accent: BRAND_ANIME_YELLOW,
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
    accent: BRAND_ANIME_YELLOW,
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
  defaultHotspots?: HotspotPinData[];
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
  const hotspots: HotspotPinData[] =
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
  hotspots: HotspotPinData[];
  universeLinks: { label: string; href: string; color: string; icon: string }[];
  shopAllHref: string;
  heading: string;
  subheading?: string;
}

const DEFAULT_UNIVERSE_LINKS: InnerProps["universeLinks"] = [
  { label: "MARVEL",      href: "/franchise/marvel",      color: BRAND_MARVEL,       icon: "⚡" },
  { label: "DC COMICS",   href: "/franchise/dc-comics",   color: BRAND_DC,           icon: "🦇" },
  { label: "DRAGON BALL", href: "/franchise/dragon-ball", color: BRAND_ANIME_YELLOW, icon: "✦" },
  { label: "NARUTO",      href: "/franchise/naruto",      color: BRAND_NARUTO,       icon: "🍃" },
  { label: "ONE PIECE",   href: "/franchise/one-piece",   color: BRAND_ANIME_YELLOW, icon: "⚓" },
  { label: "BLEACH",      href: "/franchise/bleach",      color: BRAND_DC,           icon: "⚔" },
];

function HotspotHeaderOverlay({
  heading,
  subheading,
  shopAllHref,
}: {
  heading: string;
  subheading?: string;
  shopAllHref: string;
}) {
  return (
    <Div
      className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
      style={{
        background:
          "linear-gradient(to bottom, rgba(10,10,18,0.88) 0%, rgba(10,10,18,0.40) 50%, transparent 100%)",
      }}
    >
      <Row
        wrap
        align="start"
        justify="between"
        gap="sm"
        className="pointer-events-auto mx-auto max-w-7xl gap-y-3" paddingX="x-md" paddingY="t-md-b-lg"
      >
        <Div>
          <Text
            className="mb-1 font-black uppercase tracking-[0.2em]" size="xs"
            style={{ color: "var(--color-red)" }}
          >
            Explore the Universe
          </Text>
          <Heading
            level={2}
            style={{
              fontFamily: FONT_BANGERS,
              fontSize: "clamp(1.8rem, 4.5vw, 3rem)",
              letterSpacing: "0.07em",
              color: "white",
              lineHeight: 1,
            }}
          >
            {heading}
          </Heading>
          {subheading ? (
            <Text
              className="mt-2 max-w-md" size="sm" weight="medium"
              style={{ color: "var(--dark-section-muted)" }}
            >
              {subheading}
            </Text>
          ) : (
            <Text
              className="mt-2 max-w-md" size="sm" weight="medium"
              style={{ color: "var(--dark-section-muted)" }}
            >
              &amp; beyond — tap the{" "}
              <Span layout="inline-flex-center" rounded="full" weight="light"
                style={{
                  background: "rgba(255,255,255,0.92)",
                  color: "var(--appkit-color-text)",
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
              </Span>{" "}
              pins to get &amp; buy each character.
            </Text>
          )}
        </Div>
        <Link
          href={shopAllHref}
          className="hidden sm:inline-flex items-center gap-2 px-5 py-2 text-sm font-black uppercase tracking-widest transition-transform hover:-translate-y-0.5"
          style={{
            fontFamily: FONT_BANGERS,
            letterSpacing: "0.1em",
            background: "var(--color-red)",
            color: "white",
            border: "3px solid var(--border-ink)",
            boxShadow: "4px 4px 0px var(--border-ink)",
          }}
        >
          SHOP ALL →
        </Link>
      </Row>
    </Div>
  );
}

function HotspotImageLayer({
  panoramicImage,
  panoramicAlt,
}: {
  panoramicImage: string;
  panoramicAlt: string;
}) {
  return (
    <Div className={`absolute inset-0 ${__O.hidden}`}>
      <Image
        src={panoramicImage}
        alt={panoramicAlt}
        fill
        className="object-cover object-top"
        sizes="100vw"
        priority={false}
      />
      <Div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(10,10,18,0.72) 0%, rgba(10,10,18,0.30) 50%, rgba(10,10,18,0.72) 100%)",
        }}
      />
      <Div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(10,10,18,0.25) 0%, transparent 40%, rgba(10,10,18,0.65) 100%)",
        }}
      />
      <Div
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, transparent, ${BRAND_HOTSPOT_OVERLAY})`,
        }}
      />
    </Div>
  );
}

function HotspotPin({
  hotspot,
  isActive,
  isMobile,
  toggle,
  onClose,
}: {
  hotspot: HotspotPinData;
  isActive: boolean;
  isMobile: boolean;
  toggle: (id: string) => void;
  onClose: () => void;
}) {
  const popupLeft = hotspot.xPct <= 55;
  const popupAbove = hotspot.yPct > 65;
  return (
    <Div
      className="absolute"
      style={{
        left: `${hotspot.xPct}%`,
        top: `${hotspot.yPct}%`,
        zIndex: isActive ? 30 : 10,
        transform: "translate(-50%, -50%)",
      }}
    >
      {!isActive && (
        <Span
          className="absolute animate-ping" rounded="full"
          style={{
            inset: -6,
            background: "rgba(255,255,255,0.2)",
            pointerEvents: "none",
          }}
        />
      )}
      <Button rounded="full" 
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => toggle(hotspot.id)}
        aria-label={`Info about ${hotspot.name}`}
        aria-expanded={isActive}
        className="relative justify-center"
        style={{
          width: isMobile ? 18 : 38,
          height: isMobile ? 18 : 38,
          background: isMobile ? "none" : isActive ? "rgba(30,30,30,0.92)" : "rgba(255,255,255,0.95)",
          border: isMobile ? "none" : isActive ? "2px solid rgba(255,255,255,0.25)" : "2px solid rgba(0,0,0,0.18)",
          boxShadow: isMobile ? "none" : "0 2px 12px rgba(0,0,0,0.55)",
          backdropFilter: isMobile ? "none" : "blur(4px)",
          padding: 0,
          transition: "transform 0.2s ease, opacity 0.2s ease",
          transform: isActive ? "scale(1.2) rotate(45deg)" : "scale(1)",
          color: isMobile ? "white" : isActive ? "white" : "var(--appkit-color-text)",
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
      {isActive && !isMobile && (
        <Div
          className="absolute"
          style={{
            ...(popupAbove ? { bottom: "calc(100% + 12px)", top: "auto", transform: "none" } : { top: "50%", transform: "translateY(-50%)" }),
            ...(popupLeft ? { left: "calc(100% + 14px)" } : { right: "calc(100% + 14px)" }),
            width: 300,
            background: "rgba(255,255,255,0.97)",
            boxShadow: "0 12px 48px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)",
            borderRadius: 4,
            overflow: "hidden",
            zIndex: 40,
            animation: "fadeInUp 0.2s ease both",
          }}
        >
          <Div style={{ height: 4, background: hotspot.accent }} />
          <Div paddingX="x-5" padding="y-md">
            <Text
              className="text-[10px] uppercase tracking-[0.18em] mb-1" weight="bold"
              style={{ color: hotspot.accent === BRAND_ANIME_YELLOW ? BRAND_ANIME_YELLOW_TEXT : hotspot.accent }}
            >
              {hotspot.universe}
            </Text>
            <Heading
              level={3}
              className="font-black leading-tight mb-3"
              style={{ fontFamily: FONT_BANGERS, fontSize: "1.45rem", letterSpacing: "0.06em", color: "var(--appkit-color-text)" }}
            >
              {hotspot.name}
            </Heading>
            <Text className="leading-relaxed mb-4" size="xs" style={{ color: "var(--appkit-color-slate-700)" }}>
              {hotspot.description}
            </Text>
            <Link
              href={hotspot.href}
              onClick={onClose}
              className="flex items-center justify-between px-4 py-2.5 text-sm font-black uppercase transition-opacity hover:opacity-85"
              style={{
                fontFamily: FONT_BANGERS,
                letterSpacing: "0.1em",
                background: hotspot.accent,
                color: hotspot.accent === BRAND_ANIME_YELLOW ? "black" : "white",
                borderRadius: 2,
              }}
            >
              {hotspot.buyText}
              <Span aria-hidden="true">→</Span>
            </Link>
          </Div>
        </Div>
      )}
    </Div>
  );
}

function MobileHotspotSheet({
  active,
  onClose,
}: {
  active: HotspotPinData;
  onClose: () => void;
}) {
  return (
    <Row
      className="fixed inset-0 z-50" align="end"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Div
        className="w-full"
        style={{
          background: "var(--surface-elevated)",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          overflow: "hidden",
          animation: "fadeInUp 0.22s ease both",
        }}
      >
        <Row paddingY="b-2xs" padding="t-sm" justify="center">
          <Div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--appkit-color-zinc-300)" }} />
        </Row>
        <Div style={{ height: 4, background: active.accent }} />
        <Div padding="t-md" style={{ paddingInline: "1.25rem", paddingBottom: "2.5rem" }}>
          <Text
            className="text-[10px] uppercase tracking-[0.18em] mb-1" weight="bold"
            style={{ color: active.accent === BRAND_ANIME_YELLOW ? BRAND_ANIME_YELLOW_TEXT : active.accent }}
          >
            {active.universe}
          </Text>
          <Heading
            level={3}
            className="font-black leading-tight mb-2"
            style={{ fontFamily: FONT_BANGERS, fontSize: "clamp(1.5rem, 6vw, 2rem)", letterSpacing: "0.06em", color: "var(--appkit-color-text)" }}
          >
            {active.name}
          </Heading>
          <Text className="leading-relaxed mb-5" size="sm" style={{ color: "var(--appkit-color-slate-700)" }}>
            {active.description}
          </Text>
          <Row gap="3" >
            <Link
              href={active.href}
              onClick={onClose}
              className="flex-1 flex items-center justify-between px-4 py-3 font-black uppercase"
              style={{
                fontFamily: FONT_BANGERS,
                letterSpacing: "0.1em",
                fontSize: "0.9rem",
                background: active.accent,
                color: active.accent === BRAND_ANIME_YELLOW ? "black" : "white",
                borderRadius: 4,
              }}
            >
              {active.buyText}
              <Span aria-hidden="true">→</Span>
            </Link>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              paddingX="lg" textSize="sm" rounded="default"
              className="py-[0.75rem] font-[700]"
              style={{ background: "var(--appkit-color-slate-100)", color: "var(--appkit-color-slate-600)" }}
            >
              Close
            </Button>
          </Row>
        </Div>
      </Div>
    </Row>
  );
}

function UniverseBrowseRow({
  universeLinks,
}: {
  universeLinks: InnerProps["universeLinks"];
}) {
  return (
    <Div gap="3" 
      className={`mx-auto max-w-7xl ${GRID_COLS_6_LG}`} paddingY="y-lg" paddingX="x-md"
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
            (e.currentTarget as HTMLAnchorElement).style.background = `${color}18`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.08)";
            (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.04)";
          }}
        >
          <Span size="base" aria-hidden="true" className="select-none">{icon}</Span>
          <Span
            size="xs"
            className="font-black uppercase tracking-wide"
            style={{ fontFamily: FONT_BANGERS, letterSpacing: "0.1em", color: "var(--appkit-color-slate-200)" }}
          >
            {label}
          </Span>
          <Span size="xs" className="ml-auto" style={{ color: "var(--appkit-color-slate-600)", transition: "color 0.15s" }}>
            →
          </Span>
        </Link>
      ))}
    </Div>
  );
}

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
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
      <Div
        ref={containerRef}
        className="relative w-full"
        style={{ aspectRatio: "16/9", minHeight: "420px" }}
      >
        <HotspotHeaderOverlay heading={heading} subheading={subheading} shopAllHref={shopAllHref} />
        <HotspotImageLayer panoramicImage={panoramicImage} panoramicAlt={panoramicAlt} />

        {/* Universe zone labels */}
        <Div
          className="hidden sm:flex absolute left-0 right-0 justify-[space-around] items-[flex-start] pointer-events-none"
          style={{ top: "clamp(120px, 18vh, 165px)", zIndex: 5 }}
        >
          {(
            [
              { label: "MARVEL",   color: BRAND_MARVEL },
              { label: "DC COMICS", color: BRAND_DC },
              { label: "ANIME",    color: BRAND_ANIME_YELLOW },
            ] as { label: string; color: string }[]
          ).map(({ label, color }) => (
            <Stack key={label} align="center">
              <Span
                className="text-[10px] font-black uppercase tracking-[0.18em]" smSize="xs" rounded="sm" padding="pill-md"
                style={{
                  background: color,
                  color: color === BRAND_ANIME_YELLOW ? "black" : "white",
                  boxShadow: "2px 2px 0px rgba(0,0,0,0.6)",
                  fontFamily: FONT_BANGERS,
                  letterSpacing: "0.16em",
                }}
              >
                {label}
              </Span>
              <Div className="mt-1 h-5 sm:h-8 w-px" style={{ background: color, opacity: 0.5 }} />
            </Stack>
          ))}
        </Div>

        {/* Hotspot pins */}
        {hotspots.map((hotspot) => (
          <HotspotPin
            key={hotspot.id}
            hotspot={hotspot}
            isActive={activeId === hotspot.id}
            isMobile={isMobile}
            toggle={toggle}
            onClose={() => setActiveId(null)}
          />
        ))}
      </Div>

      {isMobile && active && (
        <MobileHotspotSheet active={active} onClose={() => setActiveId(null)} />
      )}

      <UniverseBrowseRow universeLinks={universeLinks} />
    </Section>
  );
}
