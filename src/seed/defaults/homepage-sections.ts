// appkit/src/seed/defaults/homepage-sections.ts
import {
  makeHomepageSection,
  type SeedHomepageSectionDocument,
} from "../factories/homepage-section.factory";

export const DEFAULT_HOMEPAGE_SECTIONS: SeedHomepageSectionDocument[] = [
  makeHomepageSection("hero", {
    id: "section-hero",
    sortOrder: 1,
    content: {
      title: "Welcome to Our Store",
      subtitle: "Discover the best products at unbeatable prices.",
      ctaLabel: "Shop Now",
      ctaUrl: "/products",
      backgroundImage: "",
    },
  }),
  makeHomepageSection("featured-products", {
    id: "section-featured",
    sortOrder: 2,
    content: {
      heading: "Featured Products",
      productIds: [],
    },
  }),
  makeHomepageSection("categories", {
    id: "section-categories",
    sortOrder: 3,
    content: {
      heading: "Shop by Category",
      categoryIds: [],
    },
  }),
  makeHomepageSection("blog", {
    id: "section-blog",
    sortOrder: 4,
    content: {
      heading: "From Our Blog",
      postCount: 3,
    },
  }),
  makeHomepageSection("faqs", {
    id: "section-faqs",
    sortOrder: 5,
    content: {
      heading: "Frequently Asked Questions",
      faqIds: [],
    },
  }),
  makeHomepageSection("stats", {
    id: "section-stats",
    sortOrder: 6,
    content: {
      items: [
        { label: "Products", value: "10,000+" },
        { label: "Sellers", value: "500+" },
        { label: "Orders Delivered", value: "1,00,000+" },
        { label: "Happy Customers", value: "50,000+" },
      ],
    },
  }),
];
