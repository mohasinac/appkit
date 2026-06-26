import Image from "next/image";
import Link from "next/link";
import { Div, Heading, Row, Section, Span, Text } from "../../../ui";
import type { PromoBanner } from "../types";

const __P = {
  p4: "p-4",
} as const;

export interface PromoGridProps {
  banners: PromoBanner[];
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
      className="bg-[var(--dark-section-alt)] [border-top:1px_solid_rgba(255,255,255,0.06)] [border-bottom:1px_solid_rgba(255,255,255,0.06)]"
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
              className="mb-1 font-black uppercase tracking-widest text-[var(--color-red)] tracking-[0.18em]" size="xs"
            >
              {eyebrow}
            </Text>
            <Heading
              level={2}
              className="[font-family:var(--font-bangers,Bangers,cursive)] text-[clamp(1.6rem,4vw,2.4rem)] tracking-[0.08em] text-white leading-none"
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
          {banners.slice(0, 4).map((banner, i) => (
            <Link
              key={banner.id}
              href={banner.ctaUrl}
              className={`group relative block overflow-hidden bg-[var(--dark-section-card)] ${i === 0 ? "sm:row-span-2 min-h-[clamp(220px,32vh,480px)]" : "min-h-[clamp(130px,16vh,240px)]"}`}
            >
              <Image
                src={banner.image}
                alt={banner.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes={
                  i === 0
                    ? "(max-width: 640px) 100vw, 40vw"
                    : "(max-width: 640px) 50vw, 30vw"
                }
              />
              <Div
                className={`absolute inset-0 ${i === 0 ? "[background:linear-gradient(to_top,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.3)_50%,transparent_100%)]" : "[background:linear-gradient(to_top,rgba(0,0,0,0.85)_0%,rgba(0,0,0,0.15)_100%)]"}`}
              />
              {/* Yellow inset border on hover */}
              {/* audit-inline-style-ok: inset box-shadow via CSS var; no Div.shadow= variant supports inset shadows */}
              <Div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ boxShadow: "inset 0 0 0 2px var(--color-yellow)" }} />
              <Div className={`absolute bottom-0 left-0 right-0 ${__P.p4}`}>
                <Text
                  className={`leading-tight [font-family:var(--font-bangers,Bangers,cursive)] tracking-[0.06em] text-white ${i === 0 ? "text-[1.35rem]" : "text-[1rem]"}`}
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
          ))}
        </Div>
      </Div>
    </Section>
  );
}
