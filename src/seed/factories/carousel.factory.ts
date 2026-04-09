// appkit/src/seed/factories/carousel.factory.ts
let _seq = 1;

export interface SeedCarouselSlideDocument {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export function makeCarouselSlide(
  overrides: Partial<SeedCarouselSlideDocument> = {},
): SeedCarouselSlideDocument {
  const n = _seq++;
  return {
    id: overrides.id ?? `slide-${n}`,
    imageUrl: overrides.imageUrl ?? "",
    title: overrides.title ?? `Slide ${n}`,
    subtitle: overrides.subtitle ?? "",
    ctaLabel: overrides.ctaLabel ?? "Shop Now",
    ctaUrl: overrides.ctaUrl ?? "/products",
    sortOrder: overrides.sortOrder ?? n,
    isActive: overrides.isActive ?? true,
    ...overrides,
  };
}
