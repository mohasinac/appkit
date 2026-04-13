import { Div, Heading, Section, StarRating, Text } from "../../../ui";
import type { Testimonial } from "../types";

export interface TestimonialsCarouselProps {
  testimonials: Testimonial[];
  /** Eyebrow label. Default: "COLLECTOR REVIEWS". */
  eyebrow?: string;
  /** Section heading. Default: "WHAT OUR COLLECTORS SAY". */
  heading?: string;
}

export function TestimonialsCarousel({
  testimonials,
  eyebrow = "COLLECTOR REVIEWS",
  heading = "WHAT OUR COLLECTORS SAY",
}: TestimonialsCarouselProps) {
  if (testimonials.length === 0) return null;

  return (
    <Section
      style={{
        background: "var(--section-bg)",
        borderTop: "var(--section-border)",
        borderBottom: "var(--section-border)",
        minHeight: "calc(100svh - var(--header-height, 4rem))",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        paddingBlock: "clamp(3rem, 6vh, 5rem)",
      }}
    >
      <Div
        className="mx-auto w-full max-w-7xl px-6 sm:px-8 flex flex-col"
        style={{ minHeight: 0 }}
      >
        {/* Heading */}
        <Div className="mb-6 text-center" style={{ flexShrink: 0 }}>
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
              fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
              letterSpacing: "0.08em",
              color: "var(--section-title-color)",
              lineHeight: 1,
            }}
          >
            {heading}
          </Heading>
        </Div>

        {/* 2-row masonry grid — wraps into 2 rows, scrolls horizontally on overflow */}
        <Div
          className="flex flex-col flex-wrap gap-4 overflow-x-auto scrollbar-none"
          style={{ maxHeight: "50svh", alignContent: "flex-start" }}
        >
          {testimonials.map((t) => (
            <Div
              key={t.id}
              className="flex shrink-0 flex-col gap-3 p-5"
              style={{
                width: "clamp(260px, 28vw, 360px)",
                background: "var(--card-bg)",
                border: "var(--card-border)",
                boxShadow: "var(--card-shadow)",
              }}
            >
              <StarRating value={t.rating} readOnly size="sm" />
              <Text
                className="flex-1 text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                &ldquo;{t.text}&rdquo;
              </Text>
              <Text
                className="text-xs font-black uppercase"
                style={{
                  color: "var(--color-yellow)",
                  letterSpacing: "0.06em",
                }}
              >
                — {t.name}
              </Text>
            </Div>
          ))}
        </Div>
      </Div>
    </Section>
  );
}
