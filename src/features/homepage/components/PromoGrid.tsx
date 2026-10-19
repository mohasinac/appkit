import Image from "next/image";
import Link from "next/link";
import { Div, Heading, Row, Section, Span, Text } from "../../../ui";
import { resolveMediaUrl } from "../../../utils/media-url";

const __P = {
  p4: "p-[var(--appkit-space-4)]",
} as const;

/** Hard cap — this layout only has slots for 4 (one hero tile + three). */
export const PROMO_GRID_MAX_BANNERS = 4 as const;

/**
 * Promoted to a registered `SectionType` ("promo-grid") 2026-10-19 — see
 * `PromoGridSectionConfig` in `schemas/firestore.ts`.
 *
 * Two fixes made in the same pass:
 * 1. `resolveMediaUrl(banner.image)!` was a non-null assertion on a function
 *    that genuinely returns `undefined` for an empty slug — an admin saving a
 *    banner with no image picked would crash `next/image`, not render a
 *    broken-image placeholder. Falls back to a plain colour tile instead.
 * 2. `--dark-section-alt` / `--dark-section-card` / `--color-red` /
 *    `--font-bangers` were undefined anywhere in the codebase — this
 *    component would have rendered on a transparent background with the
 *    browser default font. Replaced with `bg-zinc-950`/`bg-zinc-900`
 *    (CLAUDE.md's sanctioned "structural neutral" literals, not a raw hex)
 *    and `text-error`/`family="display"`. The dark surfaces are
 *    intentionally hardcoded, not themed — see the docstring on
 *    `PromoGridSectionConfig` for why no admin background field was added.
 */
export interface PromoBannerConfig {
  id: string;
  title: string;
  ctaLabel: string;
  ctaUrl: string;
  /** A media slug (`/media/<id>`), not a raw URL — resolved via `resolveMediaUrl`. */
  image: string;
}

export interface PromoGridProps {
  banners: PromoBannerConfig[];
  /** Eyebrow label above the section heading. Default: "LIMITED TIME". */
  eyebrow?: string;
  /** Section heading. Default: "HOT DEALS & PROMOS". */
  heading?: string;
}

export function PromoGrid({
  banners,
  eyebrow = "LIMITED TIME",
  heading = "HOT DEALS & PROMOS",
}: PromoGridProps) {
  if (banners.length === 0) return null;

  return (
    <Section
      paddingY="y-4xl"
      className="bg-zinc-950 border-t border-b border-white/[0.06]"
    >
      <Div className="mx-auto max-w-7xl" padding="x-md">
        <Row
          wrap
          align="end"
          justify="between"
          gap="sm"
          className="mb-7 gap-y-2"
        >
          <Div>
            <Text
              className="mb-1 font-black uppercase tracking-widest text-error tracking-[0.18em]" size="xs"
            >
              {eyebrow}
            </Text>
            <Heading
              level={2}
              family="display"
              className="tracking-[0.08em] leading-none text-white" size="xl" mdSize="2xl" weight="bold"
            >
              {heading}
            </Heading>
          </Div>
        </Row>

        {/*
          Layout:
          - Mobile: single column stack
          - sm: 2 columns
          - lg: 3 cols, first card spans 2 rows
        */}
        <Div layout="grid" gap="3" className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {banners.slice(0, PROMO_GRID_MAX_BANNERS).map((banner, i) => {
            const resolvedSrc = resolveMediaUrl(banner.image);
            return (
              <Link
                key={banner.id}
                href={banner.ctaUrl}
                className={`group relative block overflow-hidden bg-zinc-900 ${i === 0 ? "sm:row-span-2 min-h-[clamp(220px,32vh,480px)]" : "min-h-[clamp(130px,16vh,240px)]"}`}
              >
                {resolvedSrc ? (
                  <Image
                    src={resolvedSrc}
                    alt={banner.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes={
                      i === 0
                        ? "(max-width: 640px) 100vw, 40vw"
                        : "(max-width: 640px) 50vw, 30vw"
                    }
                  />
                ) : (
                  // No image slug resolved — a plain dark tile rather than
                  // crashing `next/image` on an undefined `src`.
                  <Div className="absolute inset-0 bg-zinc-800" aria-hidden="true" />
                )}
                <Div
                  className={`absolute inset-0 ${i === 0 ? "[background:linear-gradient(to_top,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.3)_50%,transparent_100%)]" : "[background:linear-gradient(to_top,rgba(0,0,0,0.85)_0%,rgba(0,0,0,0.15)_100%)]"}`}
                />
                {/* Yellow inset border on hover */}
                <Div className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-300 group-hover:opacity-100 ring-2 ring-[var(--color-yellow)] ring-inset" />
                <Div className={`absolute bottom-0 left-0 right-0 ${__P.p4}`}>
                  <Text
                    family="display"
                    className={`leading-tight tracking-[0.06em] text-white ${i === 0 ? "text-[1.35rem]" : "text-[1rem]"}`}
                  >
                    {banner.title}
                  </Text>
                  <Span layout="inline-flex" gap="xs"
                    className="mt-1 font-black uppercase text-[var(--color-yellow)]" size="xs"
                  >
                    {banner.ctaLabel} →
                  </Span>
                </Div>
              </Link>
            );
          })}
        </Div>
      </Div>
    </Section>
  );
}
