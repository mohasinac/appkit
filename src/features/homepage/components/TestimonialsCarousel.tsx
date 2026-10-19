import { Div, Heading, Stack, StarRating, Text } from "../../../ui";

/**
 * Promoted to a registered `SectionType` ("testimonials") 2026-10-19 — see
 * `TestimonialsSectionConfig` in `schemas/firestore.ts`, which this prop shape
 * mirrors (Firestore config must be a plain serialisable object).
 *
 * Three things fixed in the same pass, all required before this could render
 * correctly on a real page rather than just compile:
 *
 * 1. **Testimonials are now INLINE in config**, not a read from the
 *    `testimonials` collection shape (`Testimonial` in `types/index.ts`, with
 *    `featured`/`sortOrder`/`active`). Those three fields are collection-row
 *    housekeeping with no meaning inside an ordered config array — the config
 *    IS the order, and every entry in it is already "featured" by virtue of
 *    being configured. `avatarUrl` is dropped too: declared on the old type,
 *    never rendered by this component.
 * 2. **It is not a carousel** — no autoplay, no arrows, no dots, just a
 *    horizontally-scrolling wrapped row. So the config carries no
 *    `autoScroll`/`scrollInterval`/`loop` fields; adding them would be
 *    `NO-RENDERER` dead weight from day one.
 * 3. **Every colour/font var below was undefined anywhere in the codebase**
 *    (`--section-bg`, `--card-bg`, `--card-border`, `--section-border`,
 *    `--section-title-color`, `--text-secondary`, `--color-red`,
 *    `--font-bangers`) — this component would have rendered with a
 *    transparent background, no borders and the browser's default font had
 *    it ever shipped. Migrated to the real `--appkit-*` token set (Root Cause
 *    #21); `--color-yellow` was the one survivor (a real token, `tokens.css`).
 */
export interface TestimonialConfigItem {
  id: string;
  name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
}

export interface TestimonialsCarouselProps {
  testimonials: TestimonialConfigItem[];
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
      surface="muted"
      border="subtle"
      className="min-h-[calc(100svh-var(--header-height,4rem))] [padding-block:clamp(3rem,6vh,5rem)]"
    >
      <Stack
        className="mx-auto w-full max-w-7xl sm:px-[2rem] min-h-0" padding="x-lg"
      >
        {/* Heading */}
        <Div className="mb-6 text-left shrink-0">
          <Text
            className="mb-1 font-black uppercase tracking-widest text-error tracking-[0.18em]" size="xs"
          >
            {eyebrow}
          </Text>
          <Heading
            level={2}
            family="display"
            className="tracking-[0.08em] leading-none" size="2xl" mdSize="3xl" weight="bold" color="primary"
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
              surface="card"
              border="subtle"
              className="shrink-0 w-[clamp(260px,28vw,360px)]" shadow="card" gap="3"
            >
              <StarRating value={t.rating} readOnly size="sm" />
              <Text
                className="flex-1 leading-relaxed" size="sm" color="muted"
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
