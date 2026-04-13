import Image from "next/image";
import Link from "next/link";
import { Div, Heading, Row, Section, Span, Text } from "../../../ui";
import type { PromoBanner } from "../types";

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
      className="py-10 sm:py-16"
      style={{
        background: "var(--dark-section-alt)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Div className="mx-auto max-w-7xl px-4">
        <Row
          wrap
          align="end"
          justify="between"
          gap="sm"
          className="mb-7 gap-y-2"
        >
          <Div>
            <Text
              className="mb-1 text-xs font-black uppercase tracking-widest"
              style={{ color: "var(--color-red)", letterSpacing: "0.18em" }}
            >
              {eyebrow}
            </Text>
            <Heading
              level={2}
              style={{
                fontFamily: "var(--font-bangers, Bangers, cursive)",
                fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                letterSpacing: "0.08em",
                color: "#FFFFFF",
                lineHeight: 1,
              }}
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
        <Div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {banners.slice(0, 4).map((banner, i) => (
            <Link
              key={banner.id}
              href={banner.ctaUrl}
              className={`group relative block overflow-hidden ${i === 0 ? "sm:row-span-2" : ""}`}
              style={{
                minHeight:
                  i === 0
                    ? "clamp(220px, 32vh, 480px)"
                    : "clamp(130px, 16vh, 240px)",
                background: "var(--dark-section-card)",
              }}
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
                className="absolute inset-0"
                style={{
                  background:
                    i === 0
                      ? "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)"
                      : "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 100%)",
                }}
              />
              {/* Yellow inset border on hover */}
              <Div
                className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ boxShadow: "inset 0 0 0 2px var(--color-yellow)" }}
              />
              <Div className="absolute bottom-0 left-0 right-0 p-4">
                <Text
                  className="leading-tight"
                  style={{
                    fontFamily: "var(--font-bangers, Bangers, cursive)",
                    fontSize: i === 0 ? "1.35rem" : "1rem",
                    letterSpacing: "0.06em",
                    color: "#FFFFFF",
                  }}
                >
                  {banner.title}
                </Text>
                <Span
                  className="mt-1 inline-flex items-center gap-1 text-xs font-black uppercase"
                  style={{ color: "var(--color-yellow)" }}
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
