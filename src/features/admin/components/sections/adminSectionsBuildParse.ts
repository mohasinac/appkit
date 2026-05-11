import {
  AuctionsBuilderState,
  BannerBuilderState,
  BlogBuilderState,
  BrandsBuilderState,
  CarouselBuilderState,
  CategoriesBuilderState,
  CustomCardsBuilderState,
  CustomCardsCardBuilderEntry,
  DEFAULT_AUCTIONS_BUILDER,
  DEFAULT_BANNER_BUILDER,
  DEFAULT_BLOG_BUILDER,
  DEFAULT_BRANDS_BUILDER,
  DEFAULT_CAROUSEL_BUILDER,
  DEFAULT_CATEGORIES_BUILDER,
  DEFAULT_CUSTOM_CARDS_BUILDER,
  DEFAULT_EVENTS_BUILDER,
  DEFAULT_FAQ_BUILDER,
  DEFAULT_STATS_BUILDER,
  DEFAULT_FEATURES_BUILDER,
  DEFAULT_GOOGLE_REVIEWS_BUILDER,
  DEFAULT_NEWSLETTER_BUILDER,
  DEFAULT_PRE_ORDERS_BUILDER,
  DEFAULT_PRODUCTS_BUILDER,
  DEFAULT_REVIEWS_BUILDER,
  DEFAULT_SOCIAL_FEED_BUILDER,
  DEFAULT_STORES_BUILDER,
  DEFAULT_TRUST_INDICATORS_BUILDER,
  DEFAULT_WELCOME_BUILDER,
  DEFAULT_WHATSAPP_BUILDER,
  EventsBuilderState,
  FAQ_CATEGORY_OPTIONS,
  FAQBuilderState,
  FAQCategory,
  FeaturesBuilderState,
  GoogleReviewsBuilderState,
  NewsletterBuilderState,
  PreOrdersBuilderState,
  ProductsBuilderState,
  ResourceMaxCount,
  ResourceMode,
  ResourceSortBy,
  ReviewsBuilderState,
  SocialFeedBuilderState,
  StatsBuilderState,
  StatsStatSource,
  StoresBuilderState,
  TrustIndicatorsBuilderState,
  WelcomeBuilderState,
  WhatsAppBuilderState,
} from "./adminSectionsTypes";

export function parseCsvValues(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function toNumberValue(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

export function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function toBooleanValue(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function buildProductsConfig(builder: ProductsBuilderState): Record<string, unknown> {
  return {
    title: builder.title,
    subtitle: builder.subtitle || undefined,
    maxProducts: builder.maxItems,
    maxCount: builder.maxCount,
    sortBy: builder.sortBy,
    filterByCategory: builder.filterByCategory || undefined,
    loop: builder.loop,
    rows: 2,
    itemsPerRow: 3,
    mobileItemsPerRow: 1,
    autoScroll: builder.autoScroll,
    scrollInterval: builder.scrollInterval,
    filters: {
      categoryIds: builder.selectedCategoryIds,
      status: builder.status,
      featuredOnly: builder.featuredOnly,
      inStockOnly: builder.inStockOnly,
    },
    resources: {
      mode: builder.resourceMode,
      ids: builder.resourceMode === "manual" ? parseCsvValues(builder.manualResourceIds) : [],
    },
  };
}

export function buildAuctionsConfig(builder: AuctionsBuilderState): Record<string, unknown> {
  return {
    title: builder.title,
    subtitle: builder.subtitle || undefined,
    maxAuctions: builder.maxItems,
    maxCount: builder.maxCount,
    sortBy: builder.sortBy,
    filterByCategory: builder.filterByCategory || undefined,
    loop: builder.loop,
    rows: 2,
    itemsPerRow: 3,
    mobileItemsPerRow: 1,
    autoScroll: builder.autoScroll,
    scrollInterval: builder.scrollInterval,
    filters: {
      categoryIds: builder.selectedCategoryIds,
      status: builder.status,
    },
    resources: {
      mode: builder.resourceMode,
      ids: builder.resourceMode === "manual" ? parseCsvValues(builder.manualResourceIds) : [],
    },
  };
}

export function buildStatsConfig(builder: StatsBuilderState): Record<string, unknown> {
  return {
    title: builder.title || undefined,
    stats: builder.stats.map((item, index) => {
      const key = item.key.trim() || `stat-${index + 1}`;
      const base = { key, label: item.label, value: item.value, suffix: item.suffix || undefined };
      if (item.source === "live-preset") {
        return { ...base, source: "live-preset", metric: item.metric || undefined };
      }
      if (item.source === "live-collection") {
        return {
          ...base,
          source: "live-collection",
          collectionQuery: {
            type: "collection-query" as const,
            collection: item.collection,
            filterField: item.filterField || undefined,
            filterValue: item.filterValue || undefined,
          },
        };
      }
      return { ...base, source: "static" };
    }),
  };
}

export function buildPreOrdersConfig(builder: PreOrdersBuilderState): Record<string, unknown> {
  return {
    title: builder.title,
    subtitle: builder.subtitle || undefined,
    maxItems: builder.maxItems,
    maxCount: builder.maxCount,
    sortBy: builder.sortBy,
    filterByCategory: builder.filterByCategory || undefined,
    loop: builder.loop,
    rows: 2,
    itemsPerRow: 3,
    mobileItemsPerRow: 1,
    autoScroll: builder.autoScroll,
    scrollInterval: builder.scrollInterval,
    filters: {
      categoryIds: builder.selectedCategoryIds,
      status: builder.status,
    },
    resources: {
      mode: builder.resourceMode,
      ids: builder.resourceMode === "manual" ? parseCsvValues(builder.manualResourceIds) : [],
    },
  };
}

export function buildStoresConfig(builder: StoresBuilderState): Record<string, unknown> {
  return {
    title: builder.title,
    subtitle: builder.subtitle || undefined,
    maxStores: builder.maxItems,
    maxCount: builder.maxCount,
    sortBy: builder.sortBy,
    filterByCategory: builder.filterByCategory || undefined,
    loop: builder.loop,
    autoScroll: builder.autoScroll,
    scrollInterval: builder.scrollInterval,
    filters: {
      categoryIds: builder.selectedCategoryIds,
      status: builder.status,
      verifiedOnly: builder.verifiedOnly,
    },
    resources: {
      mode: builder.resourceMode,
      ids: builder.resourceMode === "manual" ? parseCsvValues(builder.manualResourceIds) : [],
    },
  };
}

export function buildEventsConfig(builder: EventsBuilderState): Record<string, unknown> {
  return {
    title: builder.title,
    subtitle: builder.subtitle || undefined,
    maxEvents: builder.maxItems,
    maxCount: builder.maxCount,
    sortBy: builder.sortBy,
    filterByCategory: builder.filterByCategory || undefined,
    loop: builder.loop,
    autoScroll: builder.autoScroll,
    scrollInterval: builder.scrollInterval,
    filters: {
      categoryIds: builder.selectedCategoryIds,
      status: builder.status,
      featuredOnly: builder.featuredOnly,
    },
    resources: {
      mode: builder.resourceMode,
      ids: builder.resourceMode === "manual" ? parseCsvValues(builder.manualResourceIds) : [],
    },
  };
}

export function parseProductsBuilder(config: Record<string, unknown>): ProductsBuilderState {
  const filters = (config.filters ?? {}) as Record<string, unknown>;
  const resources = (config.resources ?? {}) as Record<string, unknown>;
  const maxCount = toNumberValue(config.maxCount, DEFAULT_PRODUCTS_BUILDER.maxCount);
  return {
    title: toStringValue(config.title, DEFAULT_PRODUCTS_BUILDER.title),
    subtitle: toStringValue(config.subtitle),
    maxItems: toNumberValue(config.maxProducts, DEFAULT_PRODUCTS_BUILDER.maxItems),
    status: toStringValue(filters.status, DEFAULT_PRODUCTS_BUILDER.status) as ProductsBuilderState["status"],
    sortBy: toStringValue(config.sortBy ?? filters.sortBy, DEFAULT_PRODUCTS_BUILDER.sortBy) as ResourceSortBy,
    featuredOnly: toBooleanValue(filters.featuredOnly, DEFAULT_PRODUCTS_BUILDER.featuredOnly),
    inStockOnly: toBooleanValue(filters.inStockOnly, DEFAULT_PRODUCTS_BUILDER.inStockOnly),
    autoScroll: toBooleanValue(config.autoScroll, DEFAULT_PRODUCTS_BUILDER.autoScroll),
    scrollInterval: toNumberValue(config.scrollInterval, DEFAULT_PRODUCTS_BUILDER.scrollInterval),
    resourceMode: toStringValue(resources.mode, DEFAULT_PRODUCTS_BUILDER.resourceMode) as ResourceMode,
    selectedCategoryIds: toStringArray(filters.categoryIds),
    manualResourceIds: toStringArray(resources.ids).join(", "),
    filterByCategory: toStringValue(config.filterByCategory),
    maxCount: ([5, 10, 20].includes(maxCount) ? maxCount : 10) as ResourceMaxCount,
    loop: toBooleanValue(config.loop, false),
  };
}

export function parseAuctionsBuilder(config: Record<string, unknown>): AuctionsBuilderState {
  const filters = (config.filters ?? {}) as Record<string, unknown>;
  const resources = (config.resources ?? {}) as Record<string, unknown>;
  const maxCount = toNumberValue(config.maxCount, DEFAULT_AUCTIONS_BUILDER.maxCount);
  return {
    title: toStringValue(config.title, DEFAULT_AUCTIONS_BUILDER.title),
    subtitle: toStringValue(config.subtitle),
    maxItems: toNumberValue(config.maxAuctions, DEFAULT_AUCTIONS_BUILDER.maxItems),
    status: toStringValue(filters.status, DEFAULT_AUCTIONS_BUILDER.status) as AuctionsBuilderState["status"],
    sortBy: toStringValue(config.sortBy ?? filters.sortBy, DEFAULT_AUCTIONS_BUILDER.sortBy) as ResourceSortBy,
    autoScroll: toBooleanValue(config.autoScroll, DEFAULT_AUCTIONS_BUILDER.autoScroll),
    scrollInterval: toNumberValue(config.scrollInterval, DEFAULT_AUCTIONS_BUILDER.scrollInterval),
    resourceMode: toStringValue(resources.mode, DEFAULT_AUCTIONS_BUILDER.resourceMode) as ResourceMode,
    selectedCategoryIds: toStringArray(filters.categoryIds),
    manualResourceIds: toStringArray(resources.ids).join(", "),
    filterByCategory: toStringValue(config.filterByCategory),
    maxCount: ([5, 10, 20].includes(maxCount) ? maxCount : 10) as ResourceMaxCount,
    loop: toBooleanValue(config.loop, false),
  };
}

export function parseStatsBuilder(config: Record<string, unknown>): StatsBuilderState {
  const statsArray = Array.isArray(config.stats) ? config.stats : [];
  const parsedStats = statsArray.slice(0, 4).map((item, index) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const cq = (row.collectionQuery ?? {}) as Record<string, unknown>;
    const rawSource = toStringValue(row.source, "static");
    const source: StatsStatSource =
      rawSource === "live-preset" || rawSource === "live"
        ? "live-preset"
        : rawSource === "live-collection"
          ? "live-collection"
          : "static";
    return {
      key:         toStringValue(row.key, `stat-${index + 1}`),
      label:       toStringValue(row.label),
      value:       toStringValue(row.value),
      suffix:      toStringValue(row.suffix),
      source,
      metric:      toStringValue(row.metric),
      collection:  toStringValue(cq.collection),
      filterField: toStringValue(cq.filterField),
      filterValue: toStringValue(cq.filterValue),
    };
  });

  while (parsedStats.length < 4) {
    parsedStats.push({
      key:         `stat-${parsedStats.length + 1}`,
      label:       "",
      value:       "",
      suffix:      "",
      source:      "static" as StatsStatSource,
      metric:      "",
      collection:  "",
      filterField: "",
      filterValue: "",
    });
  }

  return {
    title: toStringValue(config.title, DEFAULT_STATS_BUILDER.title),
    stats: parsedStats,
  };
}

export function parsePreOrdersBuilder(config: Record<string, unknown>): PreOrdersBuilderState {
  const filters = (config.filters ?? {}) as Record<string, unknown>;
  const resources = (config.resources ?? {}) as Record<string, unknown>;
  const maxCount = toNumberValue(config.maxCount, DEFAULT_PRE_ORDERS_BUILDER.maxCount);
  return {
    title: toStringValue(config.title, DEFAULT_PRE_ORDERS_BUILDER.title),
    subtitle: toStringValue(config.subtitle),
    maxItems: toNumberValue(config.maxItems, DEFAULT_PRE_ORDERS_BUILDER.maxItems),
    status: toStringValue(filters.status, DEFAULT_PRE_ORDERS_BUILDER.status) as PreOrdersBuilderState["status"],
    sortBy: toStringValue(config.sortBy ?? filters.sortBy, DEFAULT_PRE_ORDERS_BUILDER.sortBy) as ResourceSortBy,
    autoScroll: toBooleanValue(config.autoScroll, DEFAULT_PRE_ORDERS_BUILDER.autoScroll),
    scrollInterval: toNumberValue(config.scrollInterval, DEFAULT_PRE_ORDERS_BUILDER.scrollInterval),
    resourceMode: toStringValue(resources.mode, DEFAULT_PRE_ORDERS_BUILDER.resourceMode) as ResourceMode,
    selectedCategoryIds: toStringArray(filters.categoryIds),
    manualResourceIds: toStringArray(resources.ids).join(", "),
    filterByCategory: toStringValue(config.filterByCategory),
    maxCount: ([5, 10, 20].includes(maxCount) ? maxCount : 10) as ResourceMaxCount,
    loop: toBooleanValue(config.loop, false),
  };
}

export function parseStoresBuilder(config: Record<string, unknown>): StoresBuilderState {
  const filters = (config.filters ?? {}) as Record<string, unknown>;
  const resources = (config.resources ?? {}) as Record<string, unknown>;
  const maxCount = toNumberValue(config.maxCount, DEFAULT_STORES_BUILDER.maxCount);
  return {
    title: toStringValue(config.title, DEFAULT_STORES_BUILDER.title),
    subtitle: toStringValue(config.subtitle),
    maxItems: toNumberValue(config.maxStores, DEFAULT_STORES_BUILDER.maxItems),
    status: toStringValue(filters.status, DEFAULT_STORES_BUILDER.status) as StoresBuilderState["status"],
    sortBy: toStringValue(config.sortBy ?? filters.sortBy, DEFAULT_STORES_BUILDER.sortBy) as ResourceSortBy,
    verifiedOnly: toBooleanValue(filters.verifiedOnly, DEFAULT_STORES_BUILDER.verifiedOnly),
    autoScroll: toBooleanValue(config.autoScroll, DEFAULT_STORES_BUILDER.autoScroll),
    scrollInterval: toNumberValue(config.scrollInterval, DEFAULT_STORES_BUILDER.scrollInterval),
    resourceMode: toStringValue(resources.mode, DEFAULT_STORES_BUILDER.resourceMode) as ResourceMode,
    selectedCategoryIds: toStringArray(filters.categoryIds),
    manualResourceIds: toStringArray(resources.ids).join(", "),
    filterByCategory: toStringValue(config.filterByCategory),
    maxCount: ([5, 10, 20].includes(maxCount) ? maxCount : 10) as ResourceMaxCount,
    loop: toBooleanValue(config.loop, false),
  };
}

export function parseEventsBuilder(config: Record<string, unknown>): EventsBuilderState {
  const filters = (config.filters ?? {}) as Record<string, unknown>;
  const resources = (config.resources ?? {}) as Record<string, unknown>;
  const maxCount = toNumberValue(config.maxCount, DEFAULT_EVENTS_BUILDER.maxCount);
  return {
    title: toStringValue(config.title, DEFAULT_EVENTS_BUILDER.title),
    subtitle: toStringValue(config.subtitle),
    maxItems: toNumberValue(config.maxEvents, DEFAULT_EVENTS_BUILDER.maxItems),
    status: toStringValue(filters.status, DEFAULT_EVENTS_BUILDER.status) as EventsBuilderState["status"],
    sortBy: toStringValue(config.sortBy ?? filters.sortBy, DEFAULT_EVENTS_BUILDER.sortBy) as ResourceSortBy,
    featuredOnly: toBooleanValue(filters.featuredOnly, DEFAULT_EVENTS_BUILDER.featuredOnly),
    autoScroll: toBooleanValue(config.autoScroll, DEFAULT_EVENTS_BUILDER.autoScroll),
    scrollInterval: toNumberValue(config.scrollInterval, DEFAULT_EVENTS_BUILDER.scrollInterval),
    resourceMode: toStringValue(resources.mode, DEFAULT_EVENTS_BUILDER.resourceMode) as ResourceMode,
    selectedCategoryIds: toStringArray(filters.categoryIds),
    manualResourceIds: toStringArray(resources.ids).join(", "),
    filterByCategory: toStringValue(config.filterByCategory),
    maxCount: ([5, 10, 20].includes(maxCount) ? maxCount : 10) as ResourceMaxCount,
    loop: toBooleanValue(config.loop, false),
  };
}

export function buildSocialFeedConfig(builder: SocialFeedBuilderState): Record<string, unknown> {
  return {
    title: builder.title || undefined,
    subtitle: builder.subtitle || undefined,
    platform: builder.platform,
    handle: builder.handle,
    postType: builder.postType,
    count: builder.count,
    layout: builder.layout,
    showCaption: builder.showCaption,
    showStats: builder.showStats,
  };
}

export function parseSocialFeedBuilder(config: Record<string, unknown>): SocialFeedBuilderState {
  return {
    title: toStringValue(config.title),
    subtitle: toStringValue(config.subtitle),
    platform: toStringValue(config.platform, DEFAULT_SOCIAL_FEED_BUILDER.platform) as SocialFeedBuilderState["platform"],
    handle: toStringValue(config.handle),
    postType: toStringValue(config.postType, DEFAULT_SOCIAL_FEED_BUILDER.postType) as SocialFeedBuilderState["postType"],
    count: toNumberValue(config.count, DEFAULT_SOCIAL_FEED_BUILDER.count),
    layout: toStringValue(config.layout, DEFAULT_SOCIAL_FEED_BUILDER.layout) as SocialFeedBuilderState["layout"],
    showCaption: toBooleanValue(config.showCaption, DEFAULT_SOCIAL_FEED_BUILDER.showCaption),
    showStats: toBooleanValue(config.showStats, DEFAULT_SOCIAL_FEED_BUILDER.showStats),
  };
}

export function buildWelcomeConfig(builder: WelcomeBuilderState): Record<string, unknown> {
  return {
    h1: builder.h1,
    subtitle: builder.subtitle || undefined,
    description: builder.description || undefined,
    showCTA: builder.showCTA,
    ctaText: builder.ctaText || undefined,
    ctaLink: builder.ctaLink || undefined,
  };
}

export function parseWelcomeBuilder(config: Record<string, unknown>): WelcomeBuilderState {
  return {
    h1: toStringValue(config.h1, DEFAULT_WELCOME_BUILDER.h1),
    subtitle: toStringValue(config.subtitle, DEFAULT_WELCOME_BUILDER.subtitle),
    description: toStringValue(config.description),
    showCTA: toBooleanValue(config.showCTA, DEFAULT_WELCOME_BUILDER.showCTA),
    ctaText: toStringValue(config.ctaText, DEFAULT_WELCOME_BUILDER.ctaText),
    ctaLink: toStringValue(config.ctaLink, DEFAULT_WELCOME_BUILDER.ctaLink),
  };
}

export function buildTrustIndicatorsConfig(builder: TrustIndicatorsBuilderState): Record<string, unknown> {
  return {
    title: builder.title,
    indicators: builder.indicators.map((ind, index) => ({
      id: ind.id || `ti-${index + 1}`,
      icon: ind.icon,
      title: ind.title,
      description: ind.description,
    })),
  };
}

export function parseTrustIndicatorsBuilder(config: Record<string, unknown>): TrustIndicatorsBuilderState {
  const indicatorsRaw = Array.isArray(config.indicators) ? config.indicators : [];
  const indicators = indicatorsRaw.map((item, index) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      id: toStringValue(row.id, `ti-${index + 1}`),
      icon: toStringValue(row.icon),
      title: toStringValue(row.title),
      description: toStringValue(row.description),
    };
  });
  return {
    title: toStringValue(config.title, DEFAULT_TRUST_INDICATORS_BUILDER.title),
    indicators: indicators.length > 0 ? indicators : DEFAULT_TRUST_INDICATORS_BUILDER.indicators,
  };
}

export function buildCategoriesConfig(builder: CategoriesBuilderState): Record<string, unknown> {
  return {
    title: builder.title,
    maxCategories: builder.maxCategories,
    autoScroll: builder.autoScroll,
    scrollInterval: builder.scrollInterval,
  };
}

export function parseCategoriesBuilder(config: Record<string, unknown>): CategoriesBuilderState {
  return {
    title: toStringValue(config.title, DEFAULT_CATEGORIES_BUILDER.title),
    maxCategories: toNumberValue(config.maxCategories, DEFAULT_CATEGORIES_BUILDER.maxCategories),
    autoScroll: toBooleanValue(config.autoScroll, DEFAULT_CATEGORIES_BUILDER.autoScroll),
    scrollInterval: toNumberValue(config.scrollInterval, DEFAULT_CATEGORIES_BUILDER.scrollInterval),
  };
}

export function buildBrandsConfig(builder: BrandsBuilderState): Record<string, unknown> {
  return {
    title: builder.title,
    subtitle: builder.subtitle || undefined,
    maxBrands: builder.maxBrands,
    autoScroll: builder.autoScroll,
    scrollInterval: builder.scrollInterval,
  };
}

export function parseBrandsBuilder(config: Record<string, unknown>): BrandsBuilderState {
  return {
    title: toStringValue(config.title, DEFAULT_BRANDS_BUILDER.title),
    subtitle: toStringValue(config.subtitle),
    maxBrands: toNumberValue(config.maxBrands, DEFAULT_BRANDS_BUILDER.maxBrands),
    autoScroll: toBooleanValue(config.autoScroll, DEFAULT_BRANDS_BUILDER.autoScroll),
    scrollInterval: toNumberValue(config.scrollInterval, DEFAULT_BRANDS_BUILDER.scrollInterval),
  };
}

export function buildBannerConfig(builder: BannerBuilderState): Record<string, unknown> {
  return {
    height: builder.height,
    backgroundImage: builder.backgroundImage || undefined,
    backgroundColor: builder.backgroundColor || undefined,
    gradient: builder.gradientFrom && builder.gradientTo ? `${builder.gradientFrom},${builder.gradientTo}` : undefined,
    content: {
      title: builder.contentTitle,
      subtitle: builder.contentSubtitle || undefined,
      description: builder.contentDescription || undefined,
    },
    buttons: builder.buttons,
    clickable: builder.clickable,
    clickLink: builder.clickLink || undefined,
  };
}

export function parseBannerBuilder(config: Record<string, unknown>): BannerBuilderState {
  const content = (config.content ?? {}) as Record<string, unknown>;
  const buttonsRaw = Array.isArray(config.buttons) ? config.buttons : [];
  const gradient = toStringValue(config.gradient);
  const [gradientFrom = "", gradientTo = ""] = gradient ? gradient.split(",") : [];
  return {
    height: toStringValue(config.height, DEFAULT_BANNER_BUILDER.height) as BannerBuilderState["height"],
    backgroundImage: toStringValue(config.backgroundImage),
    backgroundColor: toStringValue(config.backgroundColor),
    gradientFrom,
    gradientTo,
    contentTitle: toStringValue(content.title),
    contentSubtitle: toStringValue(content.subtitle),
    contentDescription: toStringValue(content.description),
    buttons: buttonsRaw.map((btn) => {
      const b = (btn ?? {}) as Record<string, unknown>;
      return {
        text: toStringValue(b.text),
        link: toStringValue(b.link),
        variant: toStringValue(b.variant, "primary") as BannerBuilderState["buttons"][number]["variant"],
      };
    }),
    clickable: toBooleanValue(config.clickable),
    clickLink: toStringValue(config.clickLink),
  };
}

export function buildFeaturesConfig(builder: FeaturesBuilderState): Record<string, unknown> {
  return {
    title: builder.title,
    features: builder.features.filter(Boolean),
  };
}

export function parseFeaturesBuilder(config: Record<string, unknown>): FeaturesBuilderState {
  const featuresRaw = Array.isArray(config.features) ? config.features : [];
  return {
    title: toStringValue(config.title, DEFAULT_FEATURES_BUILDER.title),
    features: featuresRaw.filter((f): f is string => typeof f === "string"),
  };
}

export function buildReviewsConfig(builder: ReviewsBuilderState): Record<string, unknown> {
  return {
    title: builder.title,
    maxReviews: builder.maxReviews,
    itemsPerView: builder.itemsPerView,
    mobileItemsPerView: 1,
    autoScroll: builder.autoScroll,
    scrollInterval: builder.scrollInterval,
    source: builder.source,
    placeId: builder.source === "google" ? builder.placeId || undefined : undefined,
  };
}

export function parseReviewsBuilder(config: Record<string, unknown>): ReviewsBuilderState {
  return {
    title: toStringValue(config.title, DEFAULT_REVIEWS_BUILDER.title),
    maxReviews: toNumberValue(config.maxReviews, DEFAULT_REVIEWS_BUILDER.maxReviews),
    itemsPerView: toNumberValue(config.itemsPerView, DEFAULT_REVIEWS_BUILDER.itemsPerView),
    autoScroll: toBooleanValue(config.autoScroll, DEFAULT_REVIEWS_BUILDER.autoScroll),
    scrollInterval: toNumberValue(config.scrollInterval, DEFAULT_REVIEWS_BUILDER.scrollInterval),
    source: toStringValue(config.source, "platform") as ReviewsBuilderState["source"],
    placeId: toStringValue(config.placeId),
  };
}

export function buildWhatsAppConfig(builder: WhatsAppBuilderState): Record<string, unknown> {
  return {
    title: builder.title,
    description: builder.description,
    groupLink: builder.groupLink,
    memberCount: builder.memberCount || undefined,
    benefits: builder.benefits.filter(Boolean),
    buttonText: builder.buttonText,
    testimonial: builder.testimonial || undefined,
  };
}

export function parseWhatsAppBuilder(config: Record<string, unknown>): WhatsAppBuilderState {
  const benefitsRaw = Array.isArray(config.benefits) ? config.benefits : [];
  return {
    title: toStringValue(config.title, DEFAULT_WHATSAPP_BUILDER.title),
    description: toStringValue(config.description, DEFAULT_WHATSAPP_BUILDER.description),
    groupLink: toStringValue(config.groupLink),
    memberCount: toNumberValue(config.memberCount, DEFAULT_WHATSAPP_BUILDER.memberCount),
    benefits: benefitsRaw.filter((b): b is string => typeof b === "string"),
    buttonText: toStringValue(config.buttonText, DEFAULT_WHATSAPP_BUILDER.buttonText),
    testimonial: toStringValue(config.testimonial),
  };
}

export function buildFAQConfig(builder: FAQBuilderState): Record<string, unknown> {
  return {
    title: builder.title,
    subtitle: builder.subtitle || undefined,
    showOnHomepage: builder.showOnHomepage,
    displayCount: builder.displayCount,
    expandedByDefault: builder.expandedByDefault,
    linkToFullPage: builder.linkToFullPage,
    categories: builder.categories,
  };
}

export function parseFAQBuilder(config: Record<string, unknown>): FAQBuilderState {
  const categoriesRaw = Array.isArray(config.categories) ? config.categories : [];
  const validCats = FAQ_CATEGORY_OPTIONS.map((o) => o.value);
  return {
    title: toStringValue(config.title, DEFAULT_FAQ_BUILDER.title),
    subtitle: toStringValue(config.subtitle),
    showOnHomepage: toBooleanValue(config.showOnHomepage, DEFAULT_FAQ_BUILDER.showOnHomepage),
    displayCount: toNumberValue(config.displayCount, DEFAULT_FAQ_BUILDER.displayCount),
    expandedByDefault: toBooleanValue(config.expandedByDefault, DEFAULT_FAQ_BUILDER.expandedByDefault),
    linkToFullPage: toBooleanValue(config.linkToFullPage, DEFAULT_FAQ_BUILDER.linkToFullPage),
    categories: categoriesRaw.filter((c): c is FAQCategory => validCats.includes(c as FAQCategory)),
  };
}

export function buildBlogConfig(builder: BlogBuilderState): Record<string, unknown> {
  return {
    title: builder.title,
    maxArticles: builder.maxArticles,
    showReadTime: builder.showReadTime,
    showAuthor: builder.showAuthor,
    showThumbnails: builder.showThumbnails,
  };
}

export function parseBlogBuilder(config: Record<string, unknown>): BlogBuilderState {
  return {
    title: toStringValue(config.title, DEFAULT_BLOG_BUILDER.title),
    maxArticles: toNumberValue(config.maxArticles, DEFAULT_BLOG_BUILDER.maxArticles),
    showReadTime: toBooleanValue(config.showReadTime, DEFAULT_BLOG_BUILDER.showReadTime),
    showAuthor: toBooleanValue(config.showAuthor, DEFAULT_BLOG_BUILDER.showAuthor),
    showThumbnails: toBooleanValue(config.showThumbnails, DEFAULT_BLOG_BUILDER.showThumbnails),
  };
}

export function buildNewsletterConfig(builder: NewsletterBuilderState): Record<string, unknown> {
  return {
    title: builder.title,
    description: builder.description,
    placeholder: builder.placeholder,
    buttonText: builder.buttonText,
    privacyText: builder.privacyText || undefined,
    privacyLink: builder.privacyLink || undefined,
  };
}

export function parseNewsletterBuilder(config: Record<string, unknown>): NewsletterBuilderState {
  return {
    title: toStringValue(config.title, DEFAULT_NEWSLETTER_BUILDER.title),
    description: toStringValue(config.description, DEFAULT_NEWSLETTER_BUILDER.description),
    placeholder: toStringValue(config.placeholder, DEFAULT_NEWSLETTER_BUILDER.placeholder),
    buttonText: toStringValue(config.buttonText, DEFAULT_NEWSLETTER_BUILDER.buttonText),
    privacyText: toStringValue(config.privacyText, DEFAULT_NEWSLETTER_BUILDER.privacyText),
    privacyLink: toStringValue(config.privacyLink, DEFAULT_NEWSLETTER_BUILDER.privacyLink),
  };
}

export function buildCarouselConfig(builder: CarouselBuilderState): Record<string, unknown> {
  return {
    title: builder.title || undefined,
    height: builder.height,
    defaultAutoplayDelayMs: builder.defaultAutoplayDelayMs,
    pauseOnHover: builder.pauseOnHover,
    showDots: builder.showDots,
    showArrows: builder.showArrows,
  };
}

export function parseCarouselBuilder(config: Record<string, unknown>): CarouselBuilderState {
  return {
    title: toStringValue(config.title),
    height: toStringValue(config.height, DEFAULT_CAROUSEL_BUILDER.height) as CarouselBuilderState["height"],
    defaultAutoplayDelayMs: toNumberValue(config.defaultAutoplayDelayMs, DEFAULT_CAROUSEL_BUILDER.defaultAutoplayDelayMs),
    pauseOnHover: toBooleanValue(config.pauseOnHover, DEFAULT_CAROUSEL_BUILDER.pauseOnHover),
    showDots: toBooleanValue(config.showDots, DEFAULT_CAROUSEL_BUILDER.showDots),
    showArrows: toBooleanValue(config.showArrows, DEFAULT_CAROUSEL_BUILDER.showArrows),
  };
}

export function buildCustomCardsConfig(builder: CustomCardsBuilderState): Record<string, unknown> {
  return {
    title: builder.title || undefined,
    layout: builder.layout,
    columns: builder.columns,
    autoScroll: builder.autoScroll,
    scrollIntervalMs: builder.scrollIntervalMs,
    cards: builder.cards.map((card, index) => ({
      id: card.id || `card-${index + 1}`,
      image: card.image || undefined,
      imageAlt: card.imageAlt || undefined,
      eyebrow: card.eyebrow || undefined,
      title: card.title || undefined,
      body: card.body || undefined,
      link: card.link || undefined,
      backgroundColor: card.backgroundColor || undefined,
      textColor: card.textColor || undefined,
      borderRadius: card.borderRadius !== "none" ? card.borderRadius : undefined,
      shadowLevel: card.shadowLevel !== "none" ? card.shadowLevel : undefined,
    })),
  };
}

export function parseCustomCardsBuilder(config: Record<string, unknown>): CustomCardsBuilderState {
  const cardsRaw = Array.isArray(config.cards) ? config.cards : [];
  const validBorderRadii: CustomCardsCardBuilderEntry["borderRadius"][] = ["none", "sm", "md", "lg", "xl", "full"];
  const validShadows: CustomCardsCardBuilderEntry["shadowLevel"][] = ["none", "sm", "md", "lg"];
  const cols = Number(config.columns);
  return {
    title: toStringValue(config.title),
    layout: toStringValue(config.layout, DEFAULT_CUSTOM_CARDS_BUILDER.layout) as CustomCardsBuilderState["layout"],
    columns: ([1, 2, 3, 4].includes(cols) ? cols : DEFAULT_CUSTOM_CARDS_BUILDER.columns) as CustomCardsBuilderState["columns"],
    autoScroll: toBooleanValue(config.autoScroll, DEFAULT_CUSTOM_CARDS_BUILDER.autoScroll),
    scrollIntervalMs: toNumberValue(config.scrollIntervalMs, DEFAULT_CUSTOM_CARDS_BUILDER.scrollIntervalMs),
    cards: cardsRaw.map((item, index) => {
      const c = (item ?? {}) as Record<string, unknown>;
      const br = toStringValue(c.borderRadius, "none");
      const sh = toStringValue(c.shadowLevel, "none");
      return {
        id: toStringValue(c.id, `card-${index + 1}`),
        image: toStringValue(c.image),
        imageAlt: toStringValue(c.imageAlt),
        eyebrow: toStringValue(c.eyebrow),
        title: toStringValue(c.title),
        body: toStringValue(c.body),
        link: toStringValue(c.link),
        backgroundColor: toStringValue(c.backgroundColor),
        textColor: toStringValue(c.textColor),
        borderRadius: (validBorderRadii.includes(br as CustomCardsCardBuilderEntry["borderRadius"]) ? br : "none") as CustomCardsCardBuilderEntry["borderRadius"],
        shadowLevel: (validShadows.includes(sh as CustomCardsCardBuilderEntry["shadowLevel"]) ? sh : "none") as CustomCardsCardBuilderEntry["shadowLevel"],
      };
    }),
  };
}

export function buildGoogleReviewsConfig(builder: GoogleReviewsBuilderState): Record<string, unknown> {
  return {
    placeId: builder.placeId,
    maxReviews: builder.maxReviews,
    minRating: builder.minRating || undefined,
    layout: builder.layout,
    showRating: builder.showRating,
    showDate: builder.showDate,
    linkToGoogleMaps: builder.linkToGoogleMaps,
    googleMapsUrl: builder.googleMapsUrl || undefined,
  };
}

export function parseGoogleReviewsBuilder(config: Record<string, unknown>): GoogleReviewsBuilderState {
  return {
    placeId: toStringValue(config.placeId),
    maxReviews: toNumberValue(config.maxReviews, DEFAULT_GOOGLE_REVIEWS_BUILDER.maxReviews),
    minRating: toNumberValue(config.minRating, DEFAULT_GOOGLE_REVIEWS_BUILDER.minRating),
    layout: toStringValue(config.layout, DEFAULT_GOOGLE_REVIEWS_BUILDER.layout) as GoogleReviewsBuilderState["layout"],
    showRating: toBooleanValue(config.showRating, DEFAULT_GOOGLE_REVIEWS_BUILDER.showRating),
    showDate: toBooleanValue(config.showDate, DEFAULT_GOOGLE_REVIEWS_BUILDER.showDate),
    linkToGoogleMaps: toBooleanValue(config.linkToGoogleMaps, DEFAULT_GOOGLE_REVIEWS_BUILDER.linkToGoogleMaps),
    googleMapsUrl: toStringValue(config.googleMapsUrl),
  };
}
