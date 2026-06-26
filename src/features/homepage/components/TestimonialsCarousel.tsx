import { Div, Heading, Section, Stack, StarRating, Text } from "../../../ui";
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
    <Stack as="section"
      justify="center"
      className="bg-[var(--section-bg)] [border-top:var(--section-border)] [border-bottom:var(--section-border)] min-h-[calc(100svh-var(--header-height,4rem))] [padding-block:clamp(3rem,6vh,5rem)]"
    >
      <Stack
        className="mx-auto w-full max-w-7xl sm:px-[2rem] min-h-0" padding="x-lg"
      >
        {/* Heading */}
        <Div className="mb-6 text-center shrink-0">
          <Text
            className="mb-1 font-black uppercase tracking-widest text-[var(--color-red)] tracking-[0.18em]" size="xs"
          >
            {eyebrow}
          </Text>
          <Heading
            level={2}
            className="[font-family:var(--font-bangers,Bangers,cursive)] text-[clamp(1.8rem,4vw,2.8rem)] tracking-[0.08em] text-[var(--section-title-color)] leading-none"
          >
            {heading}
          </Heading>
        </Div>

        {/* 2-row masonry grid — wraps into 2 rows, scrolls horizontally on overflow */}
        <Stack
          wrap className="overflow-x-auto scrollbar-none max-h-[50svh] content-start" gap="md"
        >
          {testimonials.map((t) => (
            <Stack padding="5"
              key={t.id}
              className="shrink-0 w-[clamp(260px,28vw,360px)] bg-[var(--card-bg)] [border:var(--card-border)]" shadow="card" gap="3"
            >
              <StarRating value={t.rating} readOnly size="sm" />
              <Text
                className="flex-1 leading-relaxed text-[var(--text-secondary)]" size="sm"
              >
                &ldquo;{t.text}&rdquo;
              </Text>
              <Text
                className="font-black uppercase text-[var(--color-yellow)] tracking-[0.06em]" size="xs"
              >
                — {t.name}
              </Text>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
}
