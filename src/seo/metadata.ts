import type { Metadata } from "next";

export interface SeoConfig {
  siteName: string;
  siteUrl: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultImage: string;
  twitterHandle: string;
  locale: string;
}

export const SEO_CONFIG: SeoConfig = {
  siteName: "App",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  defaultTitle: "App - Modern SSR Application",
  defaultDescription: "A modern SSR application built with AppKit.",
  defaultImage: "/og-image.jpg",
  twitterHandle: "@app",
  locale: "en_US",
};

export function createSeoConfig(overrides: Partial<SeoConfig>): SeoConfig {
  return {
    ...SEO_CONFIG,
    ...overrides,
  };
}

export function generateMetadata(
  config: {
    title?: string;
    description?: string;
    keywords?: string[];
    image?: string;
    path?: string;
    type?: "website" | "article" | "profile";
    author?: string;
    publishedTime?: string;
    modifiedTime?: string;
    noIndex?: boolean;
  },
  seoConfig: SeoConfig = SEO_CONFIG,
): Metadata {
  const {
    title = seoConfig.defaultTitle,
    description = seoConfig.defaultDescription,
    keywords = [],
    image = seoConfig.defaultImage,
    path = "",
    type = "website",
    author,
    publishedTime,
    modifiedTime,
    noIndex = false,
  } = config;

  const url = `${seoConfig.siteUrl}${path}`;
  const fullTitle = title.includes(seoConfig.siteName)
    ? title
    : `${title} - ${seoConfig.siteName}`;
  const imageUrl = image.startsWith("http")
    ? image
    : `${seoConfig.siteUrl}${image}`;

  return {
    title: { absolute: fullTitle },
    description,
    keywords: keywords.join(", "),
    authors: author ? [{ name: author }] : undefined,
    ...(noIndex && { robots: { index: false, follow: false } }),
    openGraph: {
      type,
      locale: seoConfig.locale,
      url,
      siteName: seoConfig.siteName,
      title: fullTitle,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    twitter: {
      card: "summary_large_image",
      site: seoConfig.twitterHandle,
      creator: seoConfig.twitterHandle,
      title: fullTitle,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: url,
    },
  };
}

export interface ProductSeoInput {
  title: string;
  description: string;
  slug: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  mainImage?: string;
  category?: string;
}

export interface CategorySeoInput {
  name: string;
  slug: string;
  description?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };
}

export interface BlogSeoInput {
  title: string;
  slug: string;
  excerpt: string;
  coverImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  publishedAt?: Date;
  updatedAt?: Date;
  authorName?: string;
}

export interface AuctionSeoInput {
  title: string;
  slug: string;
  description: string;
  seoTitle?: string;
  seoDescription?: string;
  mainImage?: string;
  auctionEndDate?: Date;
}

export function generateProfileMetadata(
  user: {
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
    role: string;
    uid: string;
  },
  seoConfig: SeoConfig = SEO_CONFIG,
): Metadata {
  const profileName = user.displayName || user.email?.split("@")[0] || "User";
  const profileImage = user.photoURL || seoConfig.defaultImage;

  return generateMetadata(
    {
      title: `${profileName}'s Profile`,
      description: `View ${profileName}'s profile on ${seoConfig.siteName}.`,
      keywords: ["profile", "user", profileName],
      image: profileImage,
      path: `/profile/${user.uid}`,
      type: "profile",
    },
    seoConfig,
  );
}

export function generateProductMetadata(
  product: ProductSeoInput,
  seoConfig: SeoConfig = SEO_CONFIG,
): Metadata {
  const title = product.seoTitle || product.title;
  const description =
    product.seoDescription ||
    product.description.slice(0, 160) ||
    `Buy ${product.title} on ${seoConfig.siteName}.`;
  const keywords = product.seoKeywords || [
    product.title,
    ...(product.category ? [product.category] : []),
    "buy",
    "shop",
    seoConfig.siteName,
  ];

  return generateMetadata(
    {
      title,
      description,
      keywords,
      image: product.mainImage || seoConfig.defaultImage,
      path: `/products/${product.slug}`,
      type: "website",
    },
    seoConfig,
  );
}

export function generateCategoryMetadata(
  category: CategorySeoInput,
  seoConfig: SeoConfig = SEO_CONFIG,
): Metadata {
  const title =
    category.seo?.title || `${category.name} - ${seoConfig.siteName}`;
  const description =
    category.seo?.description ||
    category.description ||
    `Shop ${category.name} products on ${seoConfig.siteName}.`;
  const keywords = category.seo?.keywords || [
    category.name,
    "products",
    "shop",
    seoConfig.siteName,
  ];

  return generateMetadata(
    {
      title,
      description,
      keywords,
      image: category.seo?.ogImage || seoConfig.defaultImage,
      path: `/categories/${category.slug}`,
      type: "website",
    },
    seoConfig,
  );
}

export function generateBlogMetadata(
  post: BlogSeoInput,
  seoConfig: SeoConfig = SEO_CONFIG,
): Metadata {
  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt;

  return generateMetadata(
    {
      title,
      description,
      image: post.coverImage || seoConfig.defaultImage,
      path: `/blog/${post.slug}`,
      type: "article",
      author: post.authorName,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt?.toISOString(),
    },
    seoConfig,
  );
}

export function generateAuctionMetadata(
  auction: AuctionSeoInput,
  seoConfig: SeoConfig = SEO_CONFIG,
): Metadata {
  const title = auction.seoTitle || `Auction: ${auction.title}`;
  const description =
    auction.seoDescription ||
    auction.description.slice(0, 160) ||
    `Bid on ${auction.title} on ${seoConfig.siteName}.`;

  return generateMetadata(
    {
      title,
      description,
      image: auction.mainImage || seoConfig.defaultImage,
      path: `/auctions/${auction.slug}`,
      type: "website",
    },
    seoConfig,
  );
}

export function generateSearchMetadata(
  q: string,
  category?: string,
  seoConfig: SeoConfig = SEO_CONFIG,
): Metadata {
  const queryLabel = q ? `"${q}"` : "All Products";
  const categoryLabel = category ? ` in ${category}` : "";

  return generateMetadata(
    {
      title: `Search: ${queryLabel}${categoryLabel}`,
      description: `Search results for ${queryLabel}${categoryLabel} on ${seoConfig.siteName}.`,
      keywords: [
        q,
        ...(category ? [category] : []),
        "search",
        seoConfig.siteName,
      ],
      path: q ? `/search?q=${encodeURIComponent(q)}` : "/search",
      noIndex: true,
    },
    seoConfig,
  );
}
