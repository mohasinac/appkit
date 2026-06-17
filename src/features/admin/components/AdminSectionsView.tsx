"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import type { JsonObjectWithUndefined, JsonValue } from "@mohasinac/appkit";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProductInlineSelect } from "../../seller/components/ProductInlineSelect";
import { CategoryInlineSelect } from "../../seller/components/CategoryInlineSelect";
import { Button, Checkbox, ConfirmDeleteModal, Div, Form, FormActions, Input, Modal, Row, Select, Stack, Text, Textarea, useToast } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS, DEMO_ENDPOINTS } from "../../../constants";
import { useAdminSectionsListing } from "../hooks/useAdminSectionsListing";
import { DataTable } from "./DataTable";
import {
  SECTION_TYPE_OPTIONS,
  SUPPORTED_TYPED_BUILDERS,
  RESOURCE_SORT_OPTIONS,
  FAQ_CATEGORY_OPTIONS,
  DEFAULT_PRODUCTS_BUILDER,
  DEFAULT_AUCTIONS_BUILDER,
  DEFAULT_STATS_BUILDER,
  DEFAULT_PRE_ORDERS_BUILDER,
  DEFAULT_STORES_BUILDER,
  DEFAULT_EVENTS_BUILDER,
  DEFAULT_SOCIAL_FEED_BUILDER,
  DEFAULT_WELCOME_BUILDER,
  DEFAULT_TRUST_INDICATORS_BUILDER,
  DEFAULT_CATEGORIES_BUILDER,
  DEFAULT_BRANDS_BUILDER,
  DEFAULT_BANNER_BUILDER,
  DEFAULT_FEATURES_BUILDER,
  DEFAULT_REVIEWS_BUILDER,
  DEFAULT_WHATSAPP_BUILDER,
  DEFAULT_FAQ_BUILDER,
  DEFAULT_BLOG_BUILDER,
  DEFAULT_NEWSLETTER_BUILDER,
  DEFAULT_CAROUSEL_BUILDER,
  DEFAULT_CUSTOM_CARDS_BUILDER,
  DEFAULT_GOOGLE_REVIEWS_BUILDER,
  DEFAULT_FEATURED_BUNDLES_BUILDER,
  DEFAULT_PRIZE_DRAWS_BUILDER,
  DEFAULT_EVENT_RAFFLES_BUILDER,
  DEFAULT_COLLECTION_CARDS_BUILDER,
} from "./sections/adminSectionsTypes";
import type {
  SectionType,
  SectionPatchPayload,
  ResourceMode,
  ResourceSortBy,
  ResourceMaxCount,
  CategoryOption,
  ReorderItem,
  FAQCategory,
  ProductsBuilderState,
  AuctionsBuilderState,
  StatsBuilderState,
  PreOrdersBuilderState,
  StoresBuilderState,
  EventsBuilderState,
  SocialFeedBuilderState,
  WelcomeBuilderState,
  TrustIndicatorsBuilderState,
  CategoriesBuilderState,
  BrandsBuilderState,
  BannerBuilderState,
  FeaturesBuilderState,
  ReviewsBuilderState,
  WhatsAppBuilderState,
  FAQBuilderState,
  BlogBuilderState,
  NewsletterBuilderState,
  CarouselBuilderState,
  CustomCardsCardBuilderEntry,
  CustomCardsBuilderState,
  GoogleReviewsBuilderState,
  FeaturedBundlesBuilderState,
  PrizeDrawsBuilderState,
  EventRafflesBuilderState,
  CollectionCardsBuilderState,
  CollectionCardEntryType,
} from "./sections/adminSectionsTypes";
import {
  toStringValue,
  toNumberValue,
  toBooleanValue,
  toStringArray,
  buildProductsConfig,
  buildAuctionsConfig,
  buildStatsConfig,
  buildPreOrdersConfig,
  buildStoresConfig,
  buildEventsConfig,
  buildSocialFeedConfig,
  buildWelcomeConfig,
  buildTrustIndicatorsConfig,
  buildCategoriesConfig,
  buildBrandsConfig,
  buildBannerConfig,
  buildFeaturesConfig,
  buildReviewsConfig,
  buildWhatsAppConfig,
  buildFAQConfig,
  buildBlogConfig,
  buildNewsletterConfig,
  buildCarouselConfig,
  buildCustomCardsConfig,
  buildGoogleReviewsConfig,
  buildFeaturedBundlesConfig,
  buildPrizeDrawsConfig,
  buildEventRafflesConfig,
  buildCollectionCardsConfig,
  parseProductsBuilder,
  parseAuctionsBuilder,
  parseStatsBuilder,
  parsePreOrdersBuilder,
  parseStoresBuilder,
  parseEventsBuilder,
  parseSocialFeedBuilder,
  parseWelcomeBuilder,
  parseTrustIndicatorsBuilder,
  parseCategoriesBuilder,
  parseBrandsBuilder,
  parseBannerBuilder,
  parseFeaturesBuilder,
  parseReviewsBuilder,
  parseWhatsAppBuilder,
  parseFAQBuilder,
  parseBlogBuilder,
  parseNewsletterBuilder,
  parseCarouselBuilder,
  parseCustomCardsBuilder,
  parseGoogleReviewsBuilder,
  parseFeaturedBundlesBuilder,
  parsePrizeDrawsBuilder,
  parseEventRafflesBuilder,
  parseCollectionCardsBuilder,
} from "./sections/adminSectionsBuildParse";

const __P = {
  p3: "p-3",
  p4: "p-4",
} as const;

const CLS_SECTION_PANEL = "rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 space-y-3";
const LBL_FILTER_BY_CATEGORY = "Filter by category";
const PH_FILTER_BY_CATEGORY = "Filter by category…";
const LBL_MAX_ITEMS = "Max items";
const LBL_AUTOMATIC = "Automatic";
const LBL_MANUAL_IDS = "Manual IDs";
const LBL_SCROLL_INTERVAL = "Scroll interval (ms)";

export interface AdminSectionsViewProps {
  children?: React.ReactNode;
}

export function AdminSectionsView({ children }: AdminSectionsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [seedResetOpen, setSeedResetOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"create" | "edit">("create");
  const [selectedSectionId, setSelectedSectionId] = React.useState("");
  const [sectionType, setSectionType] = React.useState<SectionType>("products");
  const [enabled, setEnabled] = React.useState(true);
  const [order, setOrder] = React.useState("");
  const [configJson, setConfigJson] = React.useState("{}");
  const [productsBuilder, setProductsBuilder] = React.useState<ProductsBuilderState>(DEFAULT_PRODUCTS_BUILDER);
  const [auctionsBuilder, setAuctionsBuilder] = React.useState<AuctionsBuilderState>(DEFAULT_AUCTIONS_BUILDER);
  const [statsBuilder, setStatsBuilder] = React.useState<StatsBuilderState>(DEFAULT_STATS_BUILDER);
  const [preOrdersBuilder, setPreOrdersBuilder] = React.useState<PreOrdersBuilderState>(DEFAULT_PRE_ORDERS_BUILDER);
  const [storesBuilder, setStoresBuilder] = React.useState<StoresBuilderState>(DEFAULT_STORES_BUILDER);
  const [eventsBuilder, setEventsBuilder] = React.useState<EventsBuilderState>(DEFAULT_EVENTS_BUILDER);
  const [socialFeedBuilder, setSocialFeedBuilder] = React.useState<SocialFeedBuilderState>(DEFAULT_SOCIAL_FEED_BUILDER);
  const [welcomeBuilder, setWelcomeBuilder] = React.useState<WelcomeBuilderState>(DEFAULT_WELCOME_BUILDER);
  const [trustIndicatorsBuilder, setTrustIndicatorsBuilder] = React.useState<TrustIndicatorsBuilderState>(DEFAULT_TRUST_INDICATORS_BUILDER);
  const [categoriesBuilder, setCategoriesBuilder] = React.useState<CategoriesBuilderState>(DEFAULT_CATEGORIES_BUILDER);
  const [brandsBuilder, setBrandsBuilder] = React.useState<BrandsBuilderState>(DEFAULT_BRANDS_BUILDER);
  const [bannerBuilder, setBannerBuilder] = React.useState<BannerBuilderState>(DEFAULT_BANNER_BUILDER);
  const [featuresBuilder, setFeaturesBuilder] = React.useState<FeaturesBuilderState>(DEFAULT_FEATURES_BUILDER);
  const [reviewsBuilder, setReviewsBuilder] = React.useState<ReviewsBuilderState>(DEFAULT_REVIEWS_BUILDER);
  const [whatsappBuilder, setWhatsappBuilder] = React.useState<WhatsAppBuilderState>(DEFAULT_WHATSAPP_BUILDER);
  const [faqBuilder, setFaqBuilder] = React.useState<FAQBuilderState>(DEFAULT_FAQ_BUILDER);
  const [blogBuilder, setBlogBuilder] = React.useState<BlogBuilderState>(DEFAULT_BLOG_BUILDER);
  const [newsletterBuilder, setNewsletterBuilder] = React.useState<NewsletterBuilderState>(DEFAULT_NEWSLETTER_BUILDER);
  const [carouselBuilder, setCarouselBuilder] = React.useState<CarouselBuilderState>(DEFAULT_CAROUSEL_BUILDER);
  const [customCardsBuilder, setCustomCardsBuilder] = React.useState<CustomCardsBuilderState>(DEFAULT_CUSTOM_CARDS_BUILDER);
  const [googleReviewsBuilder, setGoogleReviewsBuilder] = React.useState<GoogleReviewsBuilderState>(DEFAULT_GOOGLE_REVIEWS_BUILDER);
  const [featuredBundlesBuilder, setFeaturedBundlesBuilder] = React.useState<FeaturedBundlesBuilderState>(DEFAULT_FEATURED_BUNDLES_BUILDER);
  const [prizeDrawsBuilder, setPrizeDrawsBuilder] = React.useState<PrizeDrawsBuilderState>(DEFAULT_PRIZE_DRAWS_BUILDER);
  const [eventRafflesBuilder, setEventRafflesBuilder] = React.useState<EventRafflesBuilderState>(DEFAULT_EVENT_RAFFLES_BUILDER);
  const [collectionCardsBuilder, setCollectionCardsBuilder] = React.useState<CollectionCardsBuilderState>(DEFAULT_COLLECTION_CARDS_BUILDER);
  const [reorderDraft, setReorderDraft] = React.useState<ReorderItem[]>([]);
  const [reorderServerSnapshot, setReorderServerSnapshot] = React.useState<ReorderItem[]>([]);
  const [reorderUndoStack, setReorderUndoStack] = React.useState<ReorderItem[][]>([]);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const toast = useToast();

  const isTypedBuilder = SUPPORTED_TYPED_BUILDERS.includes(sectionType);

  const { sections, isLoading, errorMessage } = useAdminSectionsListing({
    page: 1,
    pageSize: 50,
  });

  const categoriesQuery = useQuery<{ items?: JsonValue[] }>({
    queryKey: ["admin", "sections", "categories", "options"],
    queryFn: () =>
      apiClient.get<{ items?: JsonValue[] }>(
        `${ADMIN_ENDPOINTS.CATEGORIES}?page=1&pageSize=100&sorts=name`,
      ),
    staleTime: 60_000,
  });

  const categoryOptions = React.useMemo<CategoryOption[]>(() => {
    const items = Array.isArray(categoriesQuery.data?.items)
      ? categoriesQuery.data.items
      : [];
    return items
      .map((item) => {
        const row = (item ?? {}) as Record<string, JsonValue>;
        const id = toStringValue(row.id);
        const name = toStringValue(row.name);
        if (!id || !name) {
          return null;
        }
        return { id, name };
      })
      .filter((item): item is CategoryOption => item !== null);
  }, [categoriesQuery.data?.items]);

  const typedConfig = React.useMemo(() => {
    switch (sectionType) {
      case "products": return buildProductsConfig(productsBuilder);
      case "auctions": return buildAuctionsConfig(auctionsBuilder);
      case "stats": return buildStatsConfig(statsBuilder);
      case "pre-orders": return buildPreOrdersConfig(preOrdersBuilder);
      case "stores": return buildStoresConfig(storesBuilder);
      case "events": return buildEventsConfig(eventsBuilder);
      case "social-feed": return buildSocialFeedConfig(socialFeedBuilder);
      case "welcome": return buildWelcomeConfig(welcomeBuilder);
      case "trust-indicators": return buildTrustIndicatorsConfig(trustIndicatorsBuilder);
      case "categories": return buildCategoriesConfig(categoriesBuilder);
      case "brands": return buildBrandsConfig(brandsBuilder);
      case "banner": return buildBannerConfig(bannerBuilder);
      case "features": return buildFeaturesConfig(featuresBuilder);
      case "reviews": return buildReviewsConfig(reviewsBuilder);
      case "whatsapp-community": return buildWhatsAppConfig(whatsappBuilder);
      case "faq": return buildFAQConfig(faqBuilder);
      case "blog-articles": return buildBlogConfig(blogBuilder);
      case "newsletter": return buildNewsletterConfig(newsletterBuilder);
      case "carousel": return buildCarouselConfig(carouselBuilder);
      case "custom-cards": return buildCustomCardsConfig(customCardsBuilder);
      case "google-reviews": return buildGoogleReviewsConfig(googleReviewsBuilder);
      case "featured-bundles": return buildFeaturedBundlesConfig(featuredBundlesBuilder);
      case "prize-draws": return buildPrizeDrawsConfig(prizeDrawsBuilder);
      case "event-raffles": return buildEventRafflesConfig(eventRafflesBuilder);
      case "collection-cards": return buildCollectionCardsConfig(collectionCardsBuilder);
      default: return null;
    }
  }, [
    sectionType,
    productsBuilder,
    auctionsBuilder,
    statsBuilder,
    preOrdersBuilder,
    storesBuilder,
    eventsBuilder,
    socialFeedBuilder,
    welcomeBuilder,
    trustIndicatorsBuilder,
    categoriesBuilder,
    brandsBuilder,
    bannerBuilder,
    featuresBuilder,
    reviewsBuilder,
    whatsappBuilder,
    faqBuilder,
    blogBuilder,
    newsletterBuilder,
    carouselBuilder,
    customCardsBuilder,
    googleReviewsBuilder,
    featuredBundlesBuilder,
    prizeDrawsBuilder,
    eventRafflesBuilder,
    collectionCardsBuilder,
  ]);

  React.useEffect(() => {
    if (!typedConfig) {
      return;
    }
    setConfigJson(JSON.stringify(typedConfig, null, 2));
  }, [typedConfig]);

  React.useEffect(() => {
    const sorted = [...sections]
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        id: section.id,
        type: section.type,
        order: section.order,
      }));
    const normalized = normalizeOrder(sorted);
    setReorderDraft(normalized);
    setReorderServerSnapshot(normalized);
    setReorderUndoStack([]);
  }, [sections]);

  const saveSection = useApiMutation({
    mutationFn: async () => {
      let parsedConfig: Record<string, JsonValue>;
      try {
        parsedConfig = JSON.parse(configJson) as Record<string, JsonValue>;
      } catch {
        throw new Error("Config must be valid JSON.");
      }

      if (mode === "create") {
        await apiClient.post(ADMIN_ENDPOINTS.SECTIONS, {
          type: sectionType,
          enabled,
          ...(order.trim() ? { order: Number(order) } : {}),
          config: parsedConfig,
        });
        return;
      }

      if (!selectedSectionId) {
        throw new Error("Select a section to update.");
      }

      const payload: SectionPatchPayload = {
        enabled,
        config: parsedConfig,
      };
      if (order.trim()) {
        payload.order = Number(order);
      }

      await apiClient.patch(`${ADMIN_ENDPOINTS.SECTIONS}/${selectedSectionId}`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "sections", "listing"] });
      toast.showToast(mode === "create" ? "Section created." : "Section updated.", "success");
      setIsModalOpen(false);
    },
    onError: (error) => {
      toast.showToast(error instanceof Error ? error.message : "Failed to save section.", "error");
    },
  });

  const resetSeed = useApiMutation({
    mutationFn: () =>
      apiClient.post(DEMO_ENDPOINTS.SEED, {
        action: "load",
        collections: ["homepageSections"],
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "sections", "listing"] });
      setSeedResetOpen(false);
      toast.showToast("Homepage sections seed data reloaded.", "success");
    },
    onError: () => {
      toast.showToast("Seed reset failed.", "error");
    },
  });

  const reorderSections = useApiMutation({
    mutationFn: async () => {
      await Promise.all(
        reorderDraft.map((item) =>
          apiClient.patch(`${ADMIN_ENDPOINTS.SECTIONS}/${item.id}`, {
            order: item.order,
          }),
        ),
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "sections", "listing"] });
      setReorderServerSnapshot(cloneReorderItems(reorderDraft));
      setReorderUndoStack([]);
      toast.showToast("Section order updated.", "success");
    },
    onError: (error) => {
      toast.showToast(error instanceof Error ? error.message : "Failed to reorder sections.", "error");
    },
  });

  React.useEffect(() => {
    if (mode !== "edit" || !selectedSectionId) return;
    const selected = sections.find((section) => section.id === selectedSectionId);
    if (!selected) return;

    setSectionType(selected.type as SectionType);
    setEnabled(Boolean(selected.enabled));
    setOrder(String(selected.order ?? ""));
    const selectedConfig = (selected.config ?? {}) as JsonObjectWithUndefined;
    setConfigJson(JSON.stringify(selectedConfig, null, 2));

    switch (selected.type) {
      case "products": setProductsBuilder(parseProductsBuilder(selectedConfig)); break;
      case "auctions": setAuctionsBuilder(parseAuctionsBuilder(selectedConfig)); break;
      case "stats": setStatsBuilder(parseStatsBuilder(selectedConfig)); break;
      case "pre-orders": setPreOrdersBuilder(parsePreOrdersBuilder(selectedConfig)); break;
      case "stores": setStoresBuilder(parseStoresBuilder(selectedConfig)); break;
      case "events": setEventsBuilder(parseEventsBuilder(selectedConfig)); break;
      case "social-feed": setSocialFeedBuilder(parseSocialFeedBuilder(selectedConfig)); break;
      case "welcome": setWelcomeBuilder(parseWelcomeBuilder(selectedConfig)); break;
      case "trust-indicators": setTrustIndicatorsBuilder(parseTrustIndicatorsBuilder(selectedConfig)); break;
      case "categories": setCategoriesBuilder(parseCategoriesBuilder(selectedConfig)); break;
      case "brands": setBrandsBuilder(parseBrandsBuilder(selectedConfig)); break;
      case "banner": setBannerBuilder(parseBannerBuilder(selectedConfig)); break;
      case "features": setFeaturesBuilder(parseFeaturesBuilder(selectedConfig)); break;
      case "reviews": setReviewsBuilder(parseReviewsBuilder(selectedConfig)); break;
      case "whatsapp-community": setWhatsappBuilder(parseWhatsAppBuilder(selectedConfig)); break;
      case "faq": setFaqBuilder(parseFAQBuilder(selectedConfig)); break;
      case "blog-articles": setBlogBuilder(parseBlogBuilder(selectedConfig)); break;
      case "newsletter": setNewsletterBuilder(parseNewsletterBuilder(selectedConfig)); break;
      case "carousel": setCarouselBuilder(parseCarouselBuilder(selectedConfig)); break;
      case "custom-cards": setCustomCardsBuilder(parseCustomCardsBuilder(selectedConfig)); break;
      case "google-reviews": setGoogleReviewsBuilder(parseGoogleReviewsBuilder(selectedConfig)); break;
      case "featured-bundles": setFeaturedBundlesBuilder(parseFeaturedBundlesBuilder(selectedConfig)); break;
      case "prize-draws": setPrizeDrawsBuilder(parsePrizeDrawsBuilder(selectedConfig)); break;
      case "event-raffles": setEventRafflesBuilder(parseEventRafflesBuilder(selectedConfig)); break;
      case "collection-cards": setCollectionCardsBuilder(parseCollectionCardsBuilder(selectedConfig)); break;
    }
  }, [mode, sections, selectedSectionId]);

  React.useEffect(() => {
    if (!isModalOpen || mode !== "create") {
      return;
    }

    switch (sectionType) {
      case "products": setProductsBuilder(DEFAULT_PRODUCTS_BUILDER); break;
      case "auctions": setAuctionsBuilder(DEFAULT_AUCTIONS_BUILDER); break;
      case "stats": setStatsBuilder(DEFAULT_STATS_BUILDER); break;
      case "pre-orders": setPreOrdersBuilder(DEFAULT_PRE_ORDERS_BUILDER); break;
      case "stores": setStoresBuilder(DEFAULT_STORES_BUILDER); break;
      case "events": setEventsBuilder(DEFAULT_EVENTS_BUILDER); break;
      case "social-feed": setSocialFeedBuilder(DEFAULT_SOCIAL_FEED_BUILDER); break;
      case "welcome": setWelcomeBuilder(DEFAULT_WELCOME_BUILDER); break;
      case "trust-indicators": setTrustIndicatorsBuilder(DEFAULT_TRUST_INDICATORS_BUILDER); break;
      case "categories": setCategoriesBuilder(DEFAULT_CATEGORIES_BUILDER); break;
      case "brands": setBrandsBuilder(DEFAULT_BRANDS_BUILDER); break;
      case "banner": setBannerBuilder(DEFAULT_BANNER_BUILDER); break;
      case "features": setFeaturesBuilder(DEFAULT_FEATURES_BUILDER); break;
      case "reviews": setReviewsBuilder(DEFAULT_REVIEWS_BUILDER); break;
      case "whatsapp-community": setWhatsappBuilder(DEFAULT_WHATSAPP_BUILDER); break;
      case "faq": setFaqBuilder(DEFAULT_FAQ_BUILDER); break;
      case "blog-articles": setBlogBuilder(DEFAULT_BLOG_BUILDER); break;
      case "newsletter": setNewsletterBuilder(DEFAULT_NEWSLETTER_BUILDER); break;
      case "carousel": setCarouselBuilder(DEFAULT_CAROUSEL_BUILDER); break;
      case "custom-cards": setCustomCardsBuilder(DEFAULT_CUSTOM_CARDS_BUILDER); break;
      case "google-reviews": setGoogleReviewsBuilder(DEFAULT_GOOGLE_REVIEWS_BUILDER); break;
      case "featured-bundles": setFeaturedBundlesBuilder(DEFAULT_FEATURED_BUNDLES_BUILDER); break;
      case "prize-draws": setPrizeDrawsBuilder(DEFAULT_PRIZE_DRAWS_BUILDER); break;
      case "event-raffles": setEventRafflesBuilder(DEFAULT_EVENT_RAFFLES_BUILDER); break;
      case "collection-cards": setCollectionCardsBuilder(DEFAULT_COLLECTION_CARDS_BUILDER); break;
    }
  }, [isModalOpen, mode, sectionType]);

  function toggleCategorySelection(
    ids: string[],
    categoryId: string,
    checked: boolean,
  ): string[] {
    if (checked) {
      if (ids.includes(categoryId)) {
        return ids;
      }
      return [...ids, categoryId];
    }
    return ids.filter((id) => id !== categoryId);
  }

  function normalizeOrder(items: Array<{ id: string; type: string; order: number }>) {
    return items.map((item, index) => ({ ...item, order: index + 1 }));
  }

  function cloneReorderItems(items: ReorderItem[]): ReorderItem[] {
    return items.map((item) => ({ ...item }));
  }

  function isSameReorder(a: ReorderItem[], b: ReorderItem[]): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => {
      const other = b[index];
      return Boolean(other) && item.id === other.id && item.order === other.order;
    });
  }

  function pushUndoSnapshot(snapshot: ReorderItem[]) {
    setReorderUndoStack((history) => [cloneReorderItems(snapshot), ...history].slice(0, 30));
  }

  function applyReorderChange(transform: (previous: ReorderItem[]) => ReorderItem[]) {
    setReorderDraft((prev) => {
      const next = transform(prev);
      if (isSameReorder(prev, next)) {
        return prev;
      }
      pushUndoSnapshot(prev);
      return next;
    });
  }

  function moveReorderItem(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= reorderDraft.length) {
      return;
    }

    applyReorderChange((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return normalizeOrder(next);
    });
  }

  function updateReorderItemOrder(index: number, nextOrder: number) {
    applyReorderChange((prev) => {
      const clamped = Math.min(Math.max(1, nextOrder), prev.length);
      const currentIndex = index;
      const sorted = [...prev];
      const [item] = sorted.splice(currentIndex, 1);
      sorted.splice(clamped - 1, 0, item);
      return normalizeOrder(sorted);
    });
  }

  function moveItemToIndex(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
      return;
    }

    applyReorderChange((prev) => {
      if (fromIndex >= prev.length || toIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return normalizeOrder(next);
    });
  }

  function handleReorderDrop(targetIndex: number) {
    if (dragIndex !== null) {
      moveItemToIndex(dragIndex, targetIndex);
    }
    setDragIndex(null);
  }

  function reindexDraft() {
    applyReorderChange((prev) => normalizeOrder(prev));
  }

  function resetToServerOrder() {
    applyReorderChange(() => cloneReorderItems(reorderServerSnapshot));
  }

  function undoReorderChange() {
    if (reorderUndoStack.length === 0) {
      return;
    }

    const [latest, ...rest] = reorderUndoStack;
    setReorderUndoStack(rest);
    setReorderDraft(cloneReorderItems(latest));
  }

  function renderProductsCategorySelectors(): React.ReactNode {
    return (
      <Stack gap="sm">
        <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
          Category selectors
        </Text>
        {categoriesQuery.isLoading ? (
          <Text size="sm" color="muted">Loading categories...</Text>
        ) : categoryOptions.length === 0 ? (
          <Text size="sm" color="muted">No categories available.</Text>
        ) : (
          <Div layout="grid" gap="2" className="grid-cols-1 sm:grid-cols-2">
            {categoryOptions.map((category) => (
              <Checkbox
                key={category.id}
                checked={productsBuilder.selectedCategoryIds.includes(category.id)}
                label={category.name}
                onChange={(event) =>
                  setProductsBuilder((prev) => ({
                    ...prev,
                    selectedCategoryIds: toggleCategorySelection(
                      prev.selectedCategoryIds,
                      category.id,
                      event.target.checked,
                    ),
                  }))
                }
              />
            ))}
          </Div>
        )}
      </Stack>
    );
  }

  function renderProductsBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Products Carousel Builder
        </Text>

        <Input
          label="Section title"
          value={productsBuilder.title}
          onChange={(event) =>
            setProductsBuilder((prev) => ({ ...prev, title: event.target.value }))
          }
        />

        <Input
          label="Subtitle"
          value={productsBuilder.subtitle}
          onChange={(event) =>
            setProductsBuilder((prev) => ({ ...prev, subtitle: event.target.value }))
          }
        />

        <Input
          label="Max products"
          type="number"
          min={1}
          max={50}
          value={String(productsBuilder.maxItems)}
          onChange={(event) =>
            setProductsBuilder((prev) => ({
              ...prev,
              maxItems: Math.max(1, Number(event.target.value) || 1),
            }))
          }
        />

        <Select
          label="Status filter"
          value={productsBuilder.status}
          onValueChange={(value) =>
            setProductsBuilder((prev) => ({
              ...prev,
              status: value as ProductsBuilderState["status"],
            }))
          }
          options={[
            { label: "All", value: "all" },
            { label: "Published", value: "published" },
            { label: "Draft", value: "draft" },
          ]}
        />

        <Select
          label="Sort by"
          value={productsBuilder.sortBy}
          onValueChange={(value) => setProductsBuilder((prev) => ({ ...prev, sortBy: value as ResourceSortBy }))}
          options={[...RESOURCE_SORT_OPTIONS]}
        />

        <Stack gap="xs">
          <Text size="sm" weight="medium">{LBL_FILTER_BY_CATEGORY}</Text>
          <CategoryInlineSelect
            value={productsBuilder.filterByCategory}
            onChange={(id) => setProductsBuilder((prev) => ({ ...prev, filterByCategory: id }))}
            placeholder={PH_FILTER_BY_CATEGORY}
          />
        </Stack>

        <Select
          label={LBL_MAX_ITEMS}
          value={String(productsBuilder.maxCount)}
          onValueChange={(v) => setProductsBuilder((prev) => ({ ...prev, maxCount: Number(v) as ResourceMaxCount }))}
          options={[{ label: "5", value: "5" }, { label: "10", value: "10" }, { label: "20", value: "20" }]}
        />

        <Checkbox checked={productsBuilder.loop} label="Loop carousel" onChange={(e) => setProductsBuilder((prev) => ({ ...prev, loop: e.target.checked }))} />

        <Select
          label="Resource mode"
          value={productsBuilder.resourceMode}
          onValueChange={(value) =>
            setProductsBuilder((prev) => ({
              ...prev,
              resourceMode: value as ResourceMode,
            }))
          }
          options={[
            { label: LBL_AUTOMATIC, value: "automatic" },
            { label: LBL_MANUAL_IDS, value: "manual" },
          ]}
        />

        {renderProductsCategorySelectors()}

        {productsBuilder.resourceMode === "manual" ? (
          <ProductInlineSelect
            scope="admin"
            multiple
            value={productsBuilder.manualResourceIds ? productsBuilder.manualResourceIds.split(",").map((s) => s.trim()).filter(Boolean) : []}
            onChange={(ids) =>
              setProductsBuilder((prev) => ({ ...prev, manualResourceIds: ids.join(",") }))
            }
            placeholder="Search and select products…"
          />
        ) : null}

        <Checkbox
          checked={productsBuilder.featuredOnly}
          label="Featured only"
          onChange={(event) =>
            setProductsBuilder((prev) => ({
              ...prev,
              featuredOnly: event.target.checked,
            }))
          }
        />

        <Checkbox
          checked={productsBuilder.inStockOnly}
          label="In-stock only"
          onChange={(event) =>
            setProductsBuilder((prev) => ({
              ...prev,
              inStockOnly: event.target.checked,
            }))
          }
        />

        <Checkbox
          checked={productsBuilder.autoScroll}
          label="Auto-scroll"
          onChange={(event) =>
            setProductsBuilder((prev) => ({
              ...prev,
              autoScroll: event.target.checked,
            }))
          }
        />

        <Input
          label={LBL_SCROLL_INTERVAL}
          type="number"
          min={1000}
          step={500}
          value={String(productsBuilder.scrollInterval)}
          onChange={(event) =>
            setProductsBuilder((prev) => ({
              ...prev,
              scrollInterval: Math.max(1000, Number(event.target.value) || 1000),
            }))
          }
        />
      </Div>
    );
  }

  function renderAuctionsCategorySelectors(): React.ReactNode {
    return (
      <Stack gap="sm">
        <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
          Category selectors
        </Text>
        {categoriesQuery.isLoading ? (
          <Text size="sm" color="muted">Loading categories...</Text>
        ) : categoryOptions.length === 0 ? (
          <Text size="sm" color="muted">No categories available.</Text>
        ) : (
          <Div layout="grid" gap="2" className="grid-cols-1 sm:grid-cols-2">
            {categoryOptions.map((category) => (
              <Checkbox
                key={category.id}
                checked={auctionsBuilder.selectedCategoryIds.includes(category.id)}
                label={category.name}
                onChange={(event) =>
                  setAuctionsBuilder((prev) => ({
                    ...prev,
                    selectedCategoryIds: toggleCategorySelection(
                      prev.selectedCategoryIds,
                      category.id,
                      event.target.checked,
                    ),
                  }))
                }
              />
            ))}
          </Div>
        )}
      </Stack>
    );
  }

  function renderAuctionsBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Auctions Carousel Builder
        </Text>

        <Input
          label="Section title"
          value={auctionsBuilder.title}
          onChange={(event) =>
            setAuctionsBuilder((prev) => ({ ...prev, title: event.target.value }))
          }
        />

        <Input
          label="Subtitle"
          value={auctionsBuilder.subtitle}
          onChange={(event) =>
            setAuctionsBuilder((prev) => ({ ...prev, subtitle: event.target.value }))
          }
        />

        <Input
          label="Max auctions"
          type="number"
          min={1}
          max={50}
          value={String(auctionsBuilder.maxItems)}
          onChange={(event) =>
            setAuctionsBuilder((prev) => ({
              ...prev,
              maxItems: Math.max(1, Number(event.target.value) || 1),
            }))
          }
        />

        <Select
          label="Status filter"
          value={auctionsBuilder.status}
          onValueChange={(value) =>
            setAuctionsBuilder((prev) => ({
              ...prev,
              status: value as AuctionsBuilderState["status"],
            }))
          }
          options={[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Scheduled", value: "scheduled" },
            { label: "Ended", value: "ended" },
          ]}
        />

        <Select
          label="Sort by"
          value={auctionsBuilder.sortBy}
          onValueChange={(value) => setAuctionsBuilder((prev) => ({ ...prev, sortBy: value as ResourceSortBy }))}
          options={[...RESOURCE_SORT_OPTIONS]}
        />

        <Stack gap="xs">
          <Text size="sm" weight="medium">{LBL_FILTER_BY_CATEGORY}</Text>
          <CategoryInlineSelect
            value={auctionsBuilder.filterByCategory}
            onChange={(id) => setAuctionsBuilder((prev) => ({ ...prev, filterByCategory: id }))}
            placeholder={PH_FILTER_BY_CATEGORY}
          />
        </Stack>

        <Select
          label={LBL_MAX_ITEMS}
          value={String(auctionsBuilder.maxCount)}
          onValueChange={(v) => setAuctionsBuilder((prev) => ({ ...prev, maxCount: Number(v) as ResourceMaxCount }))}
          options={[{ label: "5", value: "5" }, { label: "10", value: "10" }, { label: "20", value: "20" }]}
        />

        <Checkbox checked={auctionsBuilder.loop} label="Loop carousel" onChange={(e) => setAuctionsBuilder((prev) => ({ ...prev, loop: e.target.checked }))} />

        <Select
          label="Resource mode"
          value={auctionsBuilder.resourceMode}
          onValueChange={(value) =>
            setAuctionsBuilder((prev) => ({
              ...prev,
              resourceMode: value as ResourceMode,
            }))
          }
          options={[
            { label: LBL_AUTOMATIC, value: "automatic" },
            { label: LBL_MANUAL_IDS, value: "manual" },
          ]}
        />

        {renderAuctionsCategorySelectors()}

        {auctionsBuilder.resourceMode === "manual" ? (
          <ProductInlineSelect
            scope="admin"
            multiple
            value={auctionsBuilder.manualResourceIds ? auctionsBuilder.manualResourceIds.split(",").map((s) => s.trim()).filter(Boolean) : []}
            onChange={(ids) =>
              setAuctionsBuilder((prev) => ({ ...prev, manualResourceIds: ids.join(",") }))
            }
            placeholder="Search and select auctions…"
          />
        ) : null}

        <Checkbox
          checked={auctionsBuilder.autoScroll}
          label="Auto-scroll"
          onChange={(event) =>
            setAuctionsBuilder((prev) => ({
              ...prev,
              autoScroll: event.target.checked,
            }))
          }
        />

        <Input
          label={LBL_SCROLL_INTERVAL}
          type="number"
          min={1000}
          step={500}
          value={String(auctionsBuilder.scrollInterval)}
          onChange={(event) =>
            setAuctionsBuilder((prev) => ({
              ...prev,
              scrollInterval: Math.max(1000, Number(event.target.value) || 1000),
            }))
          }
        />
      </Div>
    );
  }

  function renderStatsBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Stats Section Builder
        </Text>

        <Input
          label="Section title"
          value={statsBuilder.title}
          onChange={(event) =>
            setStatsBuilder((prev) => ({ ...prev, title: event.target.value }))
          }
          helperText="Optional internal title for stats configuration."
        />

        {statsBuilder.stats.map((stat, index) => (
          <Stack key={`stat-row-${index}`} className={`${__P.p3}`} gap="3" rounded="md" border="default">
            <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
              Stat {index + 1}
            </Text>
            <Input
              label="Key"
              value={stat.key}
              onChange={(event) =>
                setStatsBuilder((prev) => {
                  const next = [...prev.stats];
                  next[index] = { ...next[index], key: event.target.value };
                  return { ...prev, stats: next };
                })
              }
            />
            <Input
              label="Label"
              value={stat.label}
              onChange={(event) =>
                setStatsBuilder((prev) => {
                  const next = [...prev.stats];
                  next[index] = { ...next[index], label: event.target.value };
                  return { ...prev, stats: next };
                })
              }
            />
            <Input
              label="Value"
              value={stat.value}
              onChange={(event) =>
                setStatsBuilder((prev) => {
                  const next = [...prev.stats];
                  next[index] = { ...next[index], value: event.target.value };
                  return { ...prev, stats: next };
                })
              }
            />
          </Stack>
        ))}
      </Div>
    );
  }

  function renderCategorySelector(
    selectedIds: string[],
    onToggle: (categoryId: string, checked: boolean) => void,
  ): React.ReactNode {
    return (
      <Stack gap="sm">
        <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
          Category selectors
        </Text>
        {categoriesQuery.isLoading ? (
          <Text size="sm" color="muted">Loading categories...</Text>
        ) : categoryOptions.length === 0 ? (
          <Text size="sm" color="muted">No categories available.</Text>
        ) : (
          <Div layout="grid" gap="2" className="grid-cols-1 sm:grid-cols-2">
            {categoryOptions.map((category) => (
              <Checkbox
                key={category.id}
                checked={selectedIds.includes(category.id)}
                label={category.name}
                onChange={(event) => onToggle(category.id, event.target.checked)}
              />
            ))}
          </Div>
        )}
      </Stack>
    );
  }

  function renderPreOrdersBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Pre-Orders Carousel Builder
        </Text>

        <Input
          label="Section title"
          value={preOrdersBuilder.title}
          onChange={(event) =>
            setPreOrdersBuilder((prev) => ({ ...prev, title: event.target.value }))
          }
        />

        <Input
          label="Subtitle"
          value={preOrdersBuilder.subtitle}
          onChange={(event) =>
            setPreOrdersBuilder((prev) => ({ ...prev, subtitle: event.target.value }))
          }
        />

        <Input
          label="Max pre-orders"
          type="number"
          min={1}
          max={50}
          value={String(preOrdersBuilder.maxItems)}
          onChange={(event) =>
            setPreOrdersBuilder((prev) => ({
              ...prev,
              maxItems: Math.max(1, Number(event.target.value) || 1),
            }))
          }
        />

        <Select
          label="Status filter"
          value={preOrdersBuilder.status}
          onValueChange={(value) =>
            setPreOrdersBuilder((prev) => ({
              ...prev,
              status: value as PreOrdersBuilderState["status"],
            }))
          }
          options={[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Upcoming", value: "upcoming" },
            { label: "Closed", value: "closed" },
          ]}
        />

        <Select
          label="Sort by"
          value={preOrdersBuilder.sortBy}
          onValueChange={(value) => setPreOrdersBuilder((prev) => ({ ...prev, sortBy: value as ResourceSortBy }))}
          options={[...RESOURCE_SORT_OPTIONS]}
        />

        <Stack gap="xs">
          <Text size="sm" weight="medium">{LBL_FILTER_BY_CATEGORY}</Text>
          <CategoryInlineSelect
            value={preOrdersBuilder.filterByCategory}
            onChange={(id) => setPreOrdersBuilder((prev) => ({ ...prev, filterByCategory: id }))}
            placeholder={PH_FILTER_BY_CATEGORY}
          />
        </Stack>

        <Select
          label={LBL_MAX_ITEMS}
          value={String(preOrdersBuilder.maxCount)}
          onValueChange={(v) => setPreOrdersBuilder((prev) => ({ ...prev, maxCount: Number(v) as ResourceMaxCount }))}
          options={[{ label: "5", value: "5" }, { label: "10", value: "10" }, { label: "20", value: "20" }]}
        />

        <Checkbox checked={preOrdersBuilder.loop} label="Loop carousel" onChange={(e) => setPreOrdersBuilder((prev) => ({ ...prev, loop: e.target.checked }))} />

        <Select
          label="Resource mode"
          value={preOrdersBuilder.resourceMode}
          onValueChange={(value) =>
            setPreOrdersBuilder((prev) => ({
              ...prev,
              resourceMode: value as ResourceMode,
            }))
          }
          options={[
            { label: LBL_AUTOMATIC, value: "automatic" },
            { label: LBL_MANUAL_IDS, value: "manual" },
          ]}
        />

        {renderCategorySelector(preOrdersBuilder.selectedCategoryIds, (categoryId, checked) => {
          setPreOrdersBuilder((prev) => ({
            ...prev,
            selectedCategoryIds: toggleCategorySelection(prev.selectedCategoryIds, categoryId, checked),
          }));
        })}

        {preOrdersBuilder.resourceMode === "manual" ? (
          <ProductInlineSelect
            scope="admin"
            multiple
            value={preOrdersBuilder.manualResourceIds ? preOrdersBuilder.manualResourceIds.split(",").map((s) => s.trim()).filter(Boolean) : []}
            onChange={(ids) =>
              setPreOrdersBuilder((prev) => ({ ...prev, manualResourceIds: ids.join(",") }))
            }
            placeholder="Search and select pre-orders…"
          />
        ) : null}

        <Checkbox
          checked={preOrdersBuilder.autoScroll}
          label="Auto-scroll"
          onChange={(event) =>
            setPreOrdersBuilder((prev) => ({
              ...prev,
              autoScroll: event.target.checked,
            }))
          }
        />

        <Input
          label={LBL_SCROLL_INTERVAL}
          type="number"
          min={1000}
          step={500}
          value={String(preOrdersBuilder.scrollInterval)}
          onChange={(event) =>
            setPreOrdersBuilder((prev) => ({
              ...prev,
              scrollInterval: Math.max(1000, Number(event.target.value) || 1000),
            }))
          }
        />
      </Div>
    );
  }

  function renderStoresBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Stores Section Builder
        </Text>

        <Input
          label="Section title"
          value={storesBuilder.title}
          onChange={(event) =>
            setStoresBuilder((prev) => ({ ...prev, title: event.target.value }))
          }
        />

        <Input
          label="Subtitle"
          value={storesBuilder.subtitle}
          onChange={(event) =>
            setStoresBuilder((prev) => ({ ...prev, subtitle: event.target.value }))
          }
        />

        <Input
          label="Max stores"
          type="number"
          min={1}
          max={30}
          value={String(storesBuilder.maxItems)}
          onChange={(event) =>
            setStoresBuilder((prev) => ({
              ...prev,
              maxItems: Math.max(1, Number(event.target.value) || 1),
            }))
          }
        />

        <Select
          label="Status filter"
          value={storesBuilder.status}
          onValueChange={(value) =>
            setStoresBuilder((prev) => ({
              ...prev,
              status: value as StoresBuilderState["status"],
            }))
          }
          options={[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Pending", value: "pending" },
            { label: "Disabled", value: "disabled" },
          ]}
        />

        <Select
          label="Sort by"
          value={storesBuilder.sortBy}
          onValueChange={(value) => setStoresBuilder((prev) => ({ ...prev, sortBy: value as ResourceSortBy }))}
          options={[...RESOURCE_SORT_OPTIONS]}
        />

        <Stack gap="xs">
          <Text size="sm" weight="medium">{LBL_FILTER_BY_CATEGORY}</Text>
          <CategoryInlineSelect
            value={storesBuilder.filterByCategory}
            onChange={(id) => setStoresBuilder((prev) => ({ ...prev, filterByCategory: id }))}
            placeholder={PH_FILTER_BY_CATEGORY}
          />
        </Stack>

        <Select
          label={LBL_MAX_ITEMS}
          value={String(storesBuilder.maxCount)}
          onValueChange={(v) => setStoresBuilder((prev) => ({ ...prev, maxCount: Number(v) as ResourceMaxCount }))}
          options={[{ label: "5", value: "5" }, { label: "10", value: "10" }, { label: "20", value: "20" }]}
        />

        <Checkbox checked={storesBuilder.loop} label="Loop carousel" onChange={(e) => setStoresBuilder((prev) => ({ ...prev, loop: e.target.checked }))} />

        <Select
          label="Resource mode"
          value={storesBuilder.resourceMode}
          onValueChange={(value) =>
            setStoresBuilder((prev) => ({
              ...prev,
              resourceMode: value as ResourceMode,
            }))
          }
          options={[
            { label: LBL_AUTOMATIC, value: "automatic" },
            { label: LBL_MANUAL_IDS, value: "manual" },
          ]}
        />

        {renderCategorySelector(storesBuilder.selectedCategoryIds, (categoryId, checked) => {
          setStoresBuilder((prev) => ({
            ...prev,
            selectedCategoryIds: toggleCategorySelection(prev.selectedCategoryIds, categoryId, checked),
          }));
        })}

        {storesBuilder.resourceMode === "manual" ? (
          <Textarea
            label="Manual store resource IDs (comma-separated)"
            value={storesBuilder.manualResourceIds}
            onChange={(event) =>
              setStoresBuilder((prev) => ({
                ...prev,
                manualResourceIds: event.target.value,
              }))
            }
            rows={3}
          />
        ) : null}

        <Checkbox
          checked={storesBuilder.verifiedOnly}
          label="Verified stores only"
          onChange={(event) =>
            setStoresBuilder((prev) => ({
              ...prev,
              verifiedOnly: event.target.checked,
            }))
          }
        />

        <Checkbox
          checked={storesBuilder.autoScroll}
          label="Auto-scroll"
          onChange={(event) =>
            setStoresBuilder((prev) => ({
              ...prev,
              autoScroll: event.target.checked,
            }))
          }
        />

        <Input
          label={LBL_SCROLL_INTERVAL}
          type="number"
          min={1000}
          step={500}
          value={String(storesBuilder.scrollInterval)}
          onChange={(event) =>
            setStoresBuilder((prev) => ({
              ...prev,
              scrollInterval: Math.max(1000, Number(event.target.value) || 1000),
            }))
          }
        />
      </Div>
    );
  }

  function renderEventsBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Events Section Builder
        </Text>

        <Input
          label="Section title"
          value={eventsBuilder.title}
          onChange={(event) =>
            setEventsBuilder((prev) => ({ ...prev, title: event.target.value }))
          }
        />

        <Input
          label="Subtitle"
          value={eventsBuilder.subtitle}
          onChange={(event) =>
            setEventsBuilder((prev) => ({ ...prev, subtitle: event.target.value }))
          }
        />

        <Input
          label="Max events"
          type="number"
          min={1}
          max={30}
          value={String(eventsBuilder.maxItems)}
          onChange={(event) =>
            setEventsBuilder((prev) => ({
              ...prev,
              maxItems: Math.max(1, Number(event.target.value) || 1),
            }))
          }
        />

        <Select
          label="Status filter"
          value={eventsBuilder.status}
          onValueChange={(value) =>
            setEventsBuilder((prev) => ({
              ...prev,
              status: value as EventsBuilderState["status"],
            }))
          }
          options={[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Upcoming", value: "upcoming" },
            { label: "Ended", value: "ended" },
          ]}
        />

        <Select
          label="Sort by"
          value={eventsBuilder.sortBy}
          onValueChange={(value) => setEventsBuilder((prev) => ({ ...prev, sortBy: value as ResourceSortBy }))}
          options={[...RESOURCE_SORT_OPTIONS]}
        />

        <Stack gap="xs">
          <Text size="sm" weight="medium">{LBL_FILTER_BY_CATEGORY}</Text>
          <CategoryInlineSelect
            value={eventsBuilder.filterByCategory}
            onChange={(id) => setEventsBuilder((prev) => ({ ...prev, filterByCategory: id }))}
            placeholder={PH_FILTER_BY_CATEGORY}
          />
        </Stack>

        <Select
          label={LBL_MAX_ITEMS}
          value={String(eventsBuilder.maxCount)}
          onValueChange={(v) => setEventsBuilder((prev) => ({ ...prev, maxCount: Number(v) as ResourceMaxCount }))}
          options={[{ label: "5", value: "5" }, { label: "10", value: "10" }, { label: "20", value: "20" }]}
        />

        <Checkbox checked={eventsBuilder.loop} label="Loop carousel" onChange={(e) => setEventsBuilder((prev) => ({ ...prev, loop: e.target.checked }))} />

        <Select
          label="Resource mode"
          value={eventsBuilder.resourceMode}
          onValueChange={(value) =>
            setEventsBuilder((prev) => ({
              ...prev,
              resourceMode: value as ResourceMode,
            }))
          }
          options={[
            { label: LBL_AUTOMATIC, value: "automatic" },
            { label: LBL_MANUAL_IDS, value: "manual" },
          ]}
        />

        {renderCategorySelector(eventsBuilder.selectedCategoryIds, (categoryId, checked) => {
          setEventsBuilder((prev) => ({
            ...prev,
            selectedCategoryIds: toggleCategorySelection(prev.selectedCategoryIds, categoryId, checked),
          }));
        })}

        {eventsBuilder.resourceMode === "manual" ? (
          <Textarea
            label="Manual event resource IDs (comma-separated)"
            value={eventsBuilder.manualResourceIds}
            onChange={(event) =>
              setEventsBuilder((prev) => ({
                ...prev,
                manualResourceIds: event.target.value,
              }))
            }
            rows={3}
          />
        ) : null}

        <Checkbox
          checked={eventsBuilder.featuredOnly}
          label="Featured events only"
          onChange={(event) =>
            setEventsBuilder((prev) => ({
              ...prev,
              featuredOnly: event.target.checked,
            }))
          }
        />

        <Checkbox
          checked={eventsBuilder.autoScroll}
          label="Auto-scroll"
          onChange={(event) =>
            setEventsBuilder((prev) => ({
              ...prev,
              autoScroll: event.target.checked,
            }))
          }
        />

        <Input
          label={LBL_SCROLL_INTERVAL}
          type="number"
          min={1000}
          step={500}
          value={String(eventsBuilder.scrollInterval)}
          onChange={(event) =>
            setEventsBuilder((prev) => ({
              ...prev,
              scrollInterval: Math.max(1000, Number(event.target.value) || 1000),
            }))
          }
        />
      </Div>
    );
  }

  function renderFAQBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">FAQ Section Builder</Text>
        <Input label="Section title" value={faqBuilder.title} onChange={(e) => setFaqBuilder((prev) => ({ ...prev, title: e.target.value }))} />
        <Input label="Subtitle" value={faqBuilder.subtitle} onChange={(e) => setFaqBuilder((prev) => ({ ...prev, subtitle: e.target.value }))} />
        <Input label="Display count" type="number" min={1} max={20} value={String(faqBuilder.displayCount)} onChange={(e) => setFaqBuilder((prev) => ({ ...prev, displayCount: Math.min(20, Math.max(1, Number(e.target.value) || 1)) }))} />
        <Checkbox checked={faqBuilder.showOnHomepage} label="Show on homepage" onChange={(e) => setFaqBuilder((prev) => ({ ...prev, showOnHomepage: e.target.checked }))} />
        <Checkbox checked={faqBuilder.expandedByDefault} label="Expanded by default" onChange={(e) => setFaqBuilder((prev) => ({ ...prev, expandedByDefault: e.target.checked }))} />
        <Checkbox checked={faqBuilder.linkToFullPage} label="Link to full FAQ page" onChange={(e) => setFaqBuilder((prev) => ({ ...prev, linkToFullPage: e.target.checked }))} />
        <Stack gap="sm">
          <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">Categories</Text>
          <Div layout="grid" gap="2" className="grid-cols-2">
            {FAQ_CATEGORY_OPTIONS.map((opt) => (
              <Checkbox
                key={opt.value}
                checked={faqBuilder.categories.includes(opt.value)}
                label={opt.label}
                onChange={(e) => setFaqBuilder((prev) => ({
                  ...prev,
                  categories: e.target.checked
                    ? [...prev.categories, opt.value]
                    : prev.categories.filter((c) => c !== opt.value),
                }))}
              />
            ))}
          </Div>
        </Stack>
      </Div>
    );
  }

  function renderBlogBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">Blog Articles Builder</Text>
        <Input label="Section title" value={blogBuilder.title} onChange={(e) => setBlogBuilder((prev) => ({ ...prev, title: e.target.value }))} />
        <Select label="Max articles" value={String(blogBuilder.maxArticles)} onValueChange={(v) => setBlogBuilder((prev) => ({ ...prev, maxArticles: Number(v) }))} options={[{ label: "3", value: "3" }, { label: "4", value: "4" }, { label: "6", value: "6" }]} />
        <Checkbox checked={blogBuilder.showReadTime} label="Show read time" onChange={(e) => setBlogBuilder((prev) => ({ ...prev, showReadTime: e.target.checked }))} />
        <Checkbox checked={blogBuilder.showAuthor} label="Show author" onChange={(e) => setBlogBuilder((prev) => ({ ...prev, showAuthor: e.target.checked }))} />
        <Checkbox checked={blogBuilder.showThumbnails} label="Show thumbnails" onChange={(e) => setBlogBuilder((prev) => ({ ...prev, showThumbnails: e.target.checked }))} />
      </Div>
    );
  }

  function renderNewsletterBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">Newsletter Section Builder</Text>
        <Input label="Title" value={newsletterBuilder.title} onChange={(e) => setNewsletterBuilder((prev) => ({ ...prev, title: e.target.value }))} />
        <Textarea label="Description" value={newsletterBuilder.description} onChange={(e) => setNewsletterBuilder((prev) => ({ ...prev, description: e.target.value }))} rows={2} />
        <Input label="Email placeholder" value={newsletterBuilder.placeholder} onChange={(e) => setNewsletterBuilder((prev) => ({ ...prev, placeholder: e.target.value }))} />
        <Input label="Button text" value={newsletterBuilder.buttonText} onChange={(e) => setNewsletterBuilder((prev) => ({ ...prev, buttonText: e.target.value }))} />
        <Input label="Privacy text" value={newsletterBuilder.privacyText} onChange={(e) => setNewsletterBuilder((prev) => ({ ...prev, privacyText: e.target.value }))} />
        <Input label="Privacy link" value={newsletterBuilder.privacyLink} onChange={(e) => setNewsletterBuilder((prev) => ({ ...prev, privacyLink: e.target.value }))} placeholder="/privacy" />
      </Div>
    );
  }

  function renderBannerBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">Banner Section Builder</Text>
        <Select label="Height" value={bannerBuilder.height} onValueChange={(v) => setBannerBuilder((prev) => ({ ...prev, height: v as BannerBuilderState["height"] }))} options={[{ label: "Small (200px)", value: "sm" }, { label: "Medium (300px)", value: "md" }, { label: "Large (400px)", value: "lg" }, { label: "Extra Large (500px)", value: "xl" }]} />
        <Input label="Background image URL" type="url" value={bannerBuilder.backgroundImage} onChange={(e) => setBannerBuilder((prev) => ({ ...prev, backgroundImage: e.target.value }))} placeholder="https://..." />
        <Input label="Background color (CSS token)" value={bannerBuilder.backgroundColor} onChange={(e) => setBannerBuilder((prev) => ({ ...prev, backgroundColor: e.target.value }))} placeholder="var(--appkit-color-primary)" />
        <Input label="Gradient from (CSS token)" value={bannerBuilder.gradientFrom} onChange={(e) => setBannerBuilder((prev) => ({ ...prev, gradientFrom: e.target.value }))} placeholder="var(--appkit-color-primary)" />
        <Input label="Gradient to (CSS token)" value={bannerBuilder.gradientTo} onChange={(e) => setBannerBuilder((prev) => ({ ...prev, gradientTo: e.target.value }))} placeholder="var(--appkit-color-secondary)" />
        <Input label="Content title" value={bannerBuilder.contentTitle} onChange={(e) => setBannerBuilder((prev) => ({ ...prev, contentTitle: e.target.value }))} />
        <Input label="Content subtitle" value={bannerBuilder.contentSubtitle} onChange={(e) => setBannerBuilder((prev) => ({ ...prev, contentSubtitle: e.target.value }))} />
        <Textarea label="Content description" value={bannerBuilder.contentDescription} onChange={(e) => setBannerBuilder((prev) => ({ ...prev, contentDescription: e.target.value }))} rows={2} />
        <Stack gap="sm">
          <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">Buttons (max 3)</Text>
          {bannerBuilder.buttons.map((btn, index) => (
            <Stack key={`banner-btn-${index}`} rounded="md" padding="xs" border="default" gap="sm">
              <Row align="center" justify="between"><Text size="xs" color="muted">Button {index + 1}</Text><Button type="button" variant="ghost" size="sm" onClick={() => setBannerBuilder((prev) => ({ ...prev, buttons: prev.buttons.filter((_, i) => i !== index) }))}>Remove</Button></Row>
              <Input label="Text" value={btn.text} onChange={(e) => setBannerBuilder((prev) => { const next = [...prev.buttons]; next[index] = { ...next[index], text: e.target.value }; return { ...prev, buttons: next }; })} />
              <Input label="Link" value={btn.link} onChange={(e) => setBannerBuilder((prev) => { const next = [...prev.buttons]; next[index] = { ...next[index], link: e.target.value }; return { ...prev, buttons: next }; })} />
              <Select label="Variant" value={btn.variant} onValueChange={(v) => setBannerBuilder((prev) => { const next = [...prev.buttons]; next[index] = { ...next[index], variant: v as "primary" | "secondary" | "outline" }; return { ...prev, buttons: next }; })} options={[{ label: "Primary", value: "primary" }, { label: "Secondary", value: "secondary" }, { label: "Outline", value: "outline" }]} />
            </Stack>
          ))}
          {bannerBuilder.buttons.length < 3 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setBannerBuilder((prev) => ({ ...prev, buttons: [...prev.buttons, { text: "", link: "", variant: "primary" }] }))}>+ Add button</Button>
          ) : null}
        </Stack>
        <Checkbox checked={bannerBuilder.clickable} label="Make entire banner clickable" onChange={(e) => setBannerBuilder((prev) => ({ ...prev, clickable: e.target.checked }))} />
        {bannerBuilder.clickable ? (
          <Input label="Click link" value={bannerBuilder.clickLink} onChange={(e) => setBannerBuilder((prev) => ({ ...prev, clickLink: e.target.value }))} placeholder="/products" />
        ) : null}
      </Div>
    );
  }

  function renderFeaturesBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">Features Section Builder</Text>
        <Input label="Section title" value={featuresBuilder.title} onChange={(e) => setFeaturesBuilder((prev) => ({ ...prev, title: e.target.value }))} />
        <Stack gap="sm">
          <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">Feature items</Text>
          {featuresBuilder.features.map((feature, index) => (
            <Row key={`feat-${index}`} align="center" gap="sm">
              <Input value={feature} onChange={(e) => setFeaturesBuilder((prev) => { const next = [...prev.features]; next[index] = e.target.value; return { ...prev, features: next }; })} className="flex-1" />
              <Button type="button" variant="ghost" size="sm" onClick={() => setFeaturesBuilder((prev) => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }))}>✕</Button>
            </Row>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setFeaturesBuilder((prev) => ({ ...prev, features: [...prev.features, ""] }))}>+ Add feature</Button>
        </Stack>
      </Div>
    );
  }

  function renderReviewsBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">Reviews Section Builder</Text>
        <Input label="Section title" value={reviewsBuilder.title} onChange={(e) => setReviewsBuilder((prev) => ({ ...prev, title: e.target.value }))} />
        <Select
          label="Reviews source"
          value={reviewsBuilder.source}
          onValueChange={(v) => setReviewsBuilder((prev) => ({ ...prev, source: v as ReviewsBuilderState["source"] }))}
          options={[
            { label: "Platform reviews (LetItRip)", value: "platform" },
            { label: "Google Business Reviews", value: "google" },
          ]}
        />
        {reviewsBuilder.source === "google" ? (
          <Input
            label="Google Place ID"
            value={reviewsBuilder.placeId}
            onChange={(e) => setReviewsBuilder((prev) => ({ ...prev, placeId: e.target.value }))}
            placeholder="ChIJ..."
            helperText="Find your Place ID at maps.google.com/placesinventory"
          />
        ) : null}
        <Select label="Max reviews" value={String(reviewsBuilder.maxReviews)} onValueChange={(v) => setReviewsBuilder((prev) => ({ ...prev, maxReviews: Number(v) }))} options={[{ label: "5", value: "5" }, { label: "10", value: "10" }, { label: "20", value: "20" }]} />
        <Select label="Items per view" value={String(reviewsBuilder.itemsPerView)} onValueChange={(v) => setReviewsBuilder((prev) => ({ ...prev, itemsPerView: Number(v) }))} options={[{ label: "1", value: "1" }, { label: "2", value: "2" }, { label: "3", value: "3" }]} />
        <Checkbox checked={reviewsBuilder.autoScroll} label="Auto-scroll" onChange={(e) => setReviewsBuilder((prev) => ({ ...prev, autoScroll: e.target.checked }))} />
        <Input label={LBL_SCROLL_INTERVAL} type="number" min={1000} step={500} value={String(reviewsBuilder.scrollInterval)} onChange={(e) => setReviewsBuilder((prev) => ({ ...prev, scrollInterval: Math.max(1000, Number(e.target.value) || 1000) }))} />
      </Div>
    );
  }

  function renderWhatsAppBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">WhatsApp Community Builder</Text>
        <Input label="Title" value={whatsappBuilder.title} onChange={(e) => setWhatsappBuilder((prev) => ({ ...prev, title: e.target.value }))} />
        <Textarea label="Description" value={whatsappBuilder.description} onChange={(e) => setWhatsappBuilder((prev) => ({ ...prev, description: e.target.value }))} rows={2} />
        <Input label="WhatsApp group link" type="url" value={whatsappBuilder.groupLink} onChange={(e) => setWhatsappBuilder((prev) => ({ ...prev, groupLink: e.target.value }))} placeholder="https://chat.whatsapp.com/..." />
        <Input label="Member count" type="number" min={0} value={String(whatsappBuilder.memberCount)} onChange={(e) => setWhatsappBuilder((prev) => ({ ...prev, memberCount: Math.max(0, Number(e.target.value) || 0) }))} />
        <Stack gap="sm">
          <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">Benefits</Text>
          {whatsappBuilder.benefits.map((benefit, index) => (
            <Row key={`wb-${index}`} align="center" gap="sm">
              <Input value={benefit} onChange={(e) => setWhatsappBuilder((prev) => { const next = [...prev.benefits]; next[index] = e.target.value; return { ...prev, benefits: next }; })} className="flex-1" />
              <Button type="button" variant="ghost" size="sm" onClick={() => setWhatsappBuilder((prev) => ({ ...prev, benefits: prev.benefits.filter((_, i) => i !== index) }))}>✕</Button>
            </Row>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setWhatsappBuilder((prev) => ({ ...prev, benefits: [...prev.benefits, ""] }))}>+ Add benefit</Button>
        </Stack>
        <Input label="Button text" value={whatsappBuilder.buttonText} onChange={(e) => setWhatsappBuilder((prev) => ({ ...prev, buttonText: e.target.value }))} />
        <Input label="Testimonial (optional)" value={whatsappBuilder.testimonial} onChange={(e) => setWhatsappBuilder((prev) => ({ ...prev, testimonial: e.target.value }))} />
      </Div>
    );
  }

  function renderWelcomeBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">Welcome Section Builder</Text>
        <Input label="Headline (h1)" value={welcomeBuilder.h1} onChange={(e) => setWelcomeBuilder((prev) => ({ ...prev, h1: e.target.value }))} />
        <Input label="Subtitle" value={welcomeBuilder.subtitle} onChange={(e) => setWelcomeBuilder((prev) => ({ ...prev, subtitle: e.target.value }))} />
        <Textarea label="Description" value={welcomeBuilder.description} onChange={(e) => setWelcomeBuilder((prev) => ({ ...prev, description: e.target.value }))} rows={3} />
        <Checkbox checked={welcomeBuilder.showCTA} label="Show CTA button" onChange={(e) => setWelcomeBuilder((prev) => ({ ...prev, showCTA: e.target.checked }))} />
        {welcomeBuilder.showCTA ? (
          <>
            <Input label="CTA text" value={welcomeBuilder.ctaText} onChange={(e) => setWelcomeBuilder((prev) => ({ ...prev, ctaText: e.target.value }))} />
            <Input label="CTA link" value={welcomeBuilder.ctaLink} onChange={(e) => setWelcomeBuilder((prev) => ({ ...prev, ctaLink: e.target.value }))} placeholder="/products" />
          </>
        ) : null}
      </Div>
    );
  }

  function renderTrustIndicatorsBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">Trust Indicators Builder</Text>
        <Input label="Section title" value={trustIndicatorsBuilder.title} onChange={(e) => setTrustIndicatorsBuilder((prev) => ({ ...prev, title: e.target.value }))} />
        {trustIndicatorsBuilder.indicators.map((ind, index) => (
          <Stack key={ind.id} className={`${__P.p3}`} gap="sm" rounded="md" border="default">
            <Row align="center" justify="between">
              <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">Indicator {index + 1}</Text>
              <Button type="button" variant="ghost" size="sm" onClick={() => setTrustIndicatorsBuilder((prev) => ({ ...prev, indicators: prev.indicators.filter((_, i) => i !== index) }))}>Remove</Button>
            </Row>
            <Input label="Icon (emoji or text)" value={ind.icon} onChange={(e) => setTrustIndicatorsBuilder((prev) => { const next = [...prev.indicators]; next[index] = { ...next[index], icon: e.target.value }; return { ...prev, indicators: next }; })} />
            <Input label="Title" value={ind.title} onChange={(e) => setTrustIndicatorsBuilder((prev) => { const next = [...prev.indicators]; next[index] = { ...next[index], title: e.target.value }; return { ...prev, indicators: next }; })} />
            <Input label="Description" value={ind.description} onChange={(e) => setTrustIndicatorsBuilder((prev) => { const next = [...prev.indicators]; next[index] = { ...next[index], description: e.target.value }; return { ...prev, indicators: next }; })} />
          </Stack>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setTrustIndicatorsBuilder((prev) => ({ ...prev, indicators: [...prev.indicators, { id: `ti-${Date.now()}`, icon: "✨", title: "", description: "" }] }))}>+ Add indicator</Button>
      </Div>
    );
  }

  function renderCategoriesBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">Categories Section Builder</Text>
        <Input label="Section title" value={categoriesBuilder.title} onChange={(e) => setCategoriesBuilder((prev) => ({ ...prev, title: e.target.value }))} />
        <Input label="Max categories (4–12)" type="number" min={4} max={12} value={String(categoriesBuilder.maxCategories)} onChange={(e) => setCategoriesBuilder((prev) => ({ ...prev, maxCategories: Math.min(12, Math.max(4, Number(e.target.value) || 4)) }))} />
        <Checkbox checked={categoriesBuilder.autoScroll} label="Auto-scroll" onChange={(e) => setCategoriesBuilder((prev) => ({ ...prev, autoScroll: e.target.checked }))} />
        <Input label={LBL_SCROLL_INTERVAL} type="number" min={1000} step={500} value={String(categoriesBuilder.scrollInterval)} onChange={(e) => setCategoriesBuilder((prev) => ({ ...prev, scrollInterval: Math.max(1000, Number(e.target.value) || 1000) }))} />
      </Div>
    );
  }

  function renderBrandsBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">Brands Section Builder</Text>
        <Input label="Section title" value={brandsBuilder.title} onChange={(e) => setBrandsBuilder((prev) => ({ ...prev, title: e.target.value }))} />
        <Input label="Subtitle" value={brandsBuilder.subtitle} onChange={(e) => setBrandsBuilder((prev) => ({ ...prev, subtitle: e.target.value }))} />
        <Input label="Max brands" type="number" min={1} max={30} value={String(brandsBuilder.maxBrands)} onChange={(e) => setBrandsBuilder((prev) => ({ ...prev, maxBrands: Math.max(1, Number(e.target.value) || 1) }))} />
        <Checkbox checked={brandsBuilder.autoScroll} label="Auto-scroll" onChange={(e) => setBrandsBuilder((prev) => ({ ...prev, autoScroll: e.target.checked }))} />
        <Input label={LBL_SCROLL_INTERVAL} type="number" min={1000} step={500} value={String(brandsBuilder.scrollInterval)} onChange={(e) => setBrandsBuilder((prev) => ({ ...prev, scrollInterval: Math.max(1000, Number(e.target.value) || 1000) }))} />
      </Div>
    );
  }

  function renderCarouselBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Carousel Section Builder
        </Text>

        <Input
          label="Section title"
          value={carouselBuilder.title}
          onChange={(e) => setCarouselBuilder((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Hero Carousel"
        />

        <Select
          label="Slide height"
          value={carouselBuilder.height}
          onValueChange={(value) =>
            setCarouselBuilder((prev) => ({ ...prev, height: value as CarouselBuilderState["height"] }))
          }
          options={[
            { label: "Viewport (100vh)", value: "viewport" },
            { label: "Tall (80vh)", value: "tall" },
            { label: "Medium (60vh)", value: "medium" },
          ]}
        />

        <Input
          label="Default autoplay delay (ms)"
          type="number"
          min={1000}
          step={500}
          value={String(carouselBuilder.defaultAutoplayDelayMs)}
          onChange={(e) =>
            setCarouselBuilder((prev) => ({
              ...prev,
              defaultAutoplayDelayMs: Math.max(1000, Number(e.target.value) || 5000),
            }))
          }
        />

        <Checkbox
          checked={carouselBuilder.pauseOnHover}
          label="Pause on hover"
          onChange={(e) => setCarouselBuilder((prev) => ({ ...prev, pauseOnHover: e.target.checked }))}
        />

        <Checkbox
          checked={carouselBuilder.showDots}
          label="Show navigation dots"
          onChange={(e) => setCarouselBuilder((prev) => ({ ...prev, showDots: e.target.checked }))}
        />

        <Checkbox
          checked={carouselBuilder.showArrows}
          label="Show prev/next arrows"
          onChange={(e) => setCarouselBuilder((prev) => ({ ...prev, showArrows: e.target.checked }))}
        />
      </Div>
    );
  }

  function renderCustomCardsBuilder(): React.ReactNode {
    function addCard() {
      setCustomCardsBuilder((prev) => ({
        ...prev,
        cards: [
          ...prev.cards,
          {
            id: `card-${prev.cards.length + 1}`,
            image: "",
            imageAlt: "",
            eyebrow: "",
            title: "",
            body: "",
            link: "",
            backgroundColor: "",
            textColor: "",
            borderRadius: "md",
            shadowLevel: "sm",
          },
        ],
      }));
    }

    function removeCard(index: number) {
      setCustomCardsBuilder((prev) => ({
        ...prev,
        cards: prev.cards.filter((_, i) => i !== index),
      }));
    }

    function updateCard(index: number, patch: Partial<CustomCardsCardBuilderEntry>) {
      setCustomCardsBuilder((prev) => {
        const next = [...prev.cards];
        next[index] = { ...next[index], ...patch };
        return { ...prev, cards: next };
      });
    }

    function renderCardFields(card: CustomCardsCardBuilderEntry, index: number): React.ReactNode {
      return (
        <Stack
          key={`custom-card-${index}`} rounded="md" padding="sm" border="default" gap="3">
          <Row align="center" justify="between">
            <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
              Card {index + 1}
            </Text>
            <Button type="button" variant="outline" size="sm" onClick={() => removeCard(index)}>
              Remove
            </Button>
          </Row>
          <Input label="ID / slug" value={card.id} onChange={(e) => updateCard(index, { id: e.target.value })} placeholder="card-1" />
          <Input label="Image URL" value={card.image} onChange={(e) => updateCard(index, { image: e.target.value })} placeholder="https://..." />
          <Input label="Image alt text" value={card.imageAlt} onChange={(e) => updateCard(index, { imageAlt: e.target.value })} />
          <Input label="Eyebrow (small label above title)" value={card.eyebrow} onChange={(e) => updateCard(index, { eyebrow: e.target.value })} />
          <Input label="Title" value={card.title} onChange={(e) => updateCard(index, { title: e.target.value })} />
          <Input label="Body / description" value={card.body} onChange={(e) => updateCard(index, { body: e.target.value })} />
          <Input label="Link (href)" value={card.link} onChange={(e) => updateCard(index, { link: e.target.value })} placeholder="/categories/..." />
          {/* audit-hex-tokens-ok: placeholder text shown to admin as example */}
          <Input label="Background colour" value={card.backgroundColor} onChange={(e) => updateCard(index, { backgroundColor: e.target.value })} placeholder="#ffffff or var(--appkit-color-primary)" />
          {/* audit-hex-tokens-ok: placeholder text shown to admin as example */}
          <Input label="Text colour" value={card.textColor} onChange={(e) => updateCard(index, { textColor: e.target.value })} placeholder="#000000" />
          <Select
            label="Border radius"
            value={card.borderRadius}
            onValueChange={(value) => updateCard(index, { borderRadius: value as CustomCardsCardBuilderEntry["borderRadius"] })}
            options={[
              { label: "None", value: "none" }, { label: "Small", value: "sm" }, { label: "Medium", value: "md" },
              { label: "Large", value: "lg" }, { label: "XL", value: "xl" }, { label: "Full (pill)", value: "full" },
            ]}
          />
          <Select
            label="Shadow level"
            value={card.shadowLevel}
            onValueChange={(value) => updateCard(index, { shadowLevel: value as CustomCardsCardBuilderEntry["shadowLevel"] })}
            options={[
              { label: "None", value: "none" }, { label: "Small", value: "sm" },
              { label: "Medium", value: "md" }, { label: "Large", value: "lg" },
            ]}
          />
        </Stack>
      );
    }

    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Custom Cards Builder
        </Text>

        <Input
          label="Section title"
          value={customCardsBuilder.title}
          onChange={(e) => setCustomCardsBuilder((prev) => ({ ...prev, title: e.target.value }))}
        />

        <Select
          label="Layout"
          value={customCardsBuilder.layout}
          onValueChange={(value) =>
            setCustomCardsBuilder((prev) => ({ ...prev, layout: value as CustomCardsBuilderState["layout"] }))
          }
          options={[
            { label: "Grid", value: "grid" },
            { label: "Row (horizontal scroll)", value: "row" },
            { label: "Masonry", value: "masonry" },
          ]}
        />

        <Select
          label="Columns"
          value={String(customCardsBuilder.columns)}
          onValueChange={(value) =>
            setCustomCardsBuilder((prev) => ({ ...prev, columns: Number(value) as CustomCardsBuilderState["columns"] }))
          }
          options={[
            { label: "1 column", value: "1" },
            { label: "2 columns", value: "2" },
            { label: "3 columns", value: "3" },
            { label: "4 columns", value: "4" },
          ]}
        />

        <Checkbox
          checked={customCardsBuilder.autoScroll}
          label="Auto-scroll"
          onChange={(e) => setCustomCardsBuilder((prev) => ({ ...prev, autoScroll: e.target.checked }))}
        />

        <Input
          label={LBL_SCROLL_INTERVAL}
          type="number"
          min={1000}
          step={500}
          value={String(customCardsBuilder.scrollIntervalMs)}
          onChange={(e) =>
            setCustomCardsBuilder((prev) => ({
              ...prev,
              scrollIntervalMs: Math.max(1000, Number(e.target.value) || 4000),
            }))
          }
        />

        <Stack gap="3">
          <Row align="center" justify="between">
            <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
              Cards ({customCardsBuilder.cards.length})
            </Text>
            <Button type="button" variant="outline" size="sm" onClick={addCard}>
              Add card
            </Button>
          </Row>

          {customCardsBuilder.cards.map((card, index) => renderCardFields(card, index))}

          {customCardsBuilder.cards.length === 0 ? (
            <Text size="sm" color="muted">No cards added yet. Click "Add card" to start.</Text>
          ) : null}
        </Stack>
      </Div>
    );
  }

  function renderGoogleReviewsBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Google Reviews Builder
        </Text>

        <Input
          label="Google Place ID"
          value={googleReviewsBuilder.placeId}
          onChange={(e) => setGoogleReviewsBuilder((prev) => ({ ...prev, placeId: e.target.value }))}
          placeholder="ChIJ..."
          helperText="Find your Place ID at developers.google.com/maps/documentation/places/web-service/place-id"
        />

        <Input
          label="Max reviews to show"
          type="number"
          min={1}
          max={20}
          value={String(googleReviewsBuilder.maxReviews)}
          onChange={(e) =>
            setGoogleReviewsBuilder((prev) => ({
              ...prev,
              maxReviews: Math.max(1, Math.min(20, Number(e.target.value) || 6)),
            }))
          }
        />

        <Select
          label="Minimum star rating to show"
          value={String(googleReviewsBuilder.minRating)}
          onValueChange={(value) =>
            setGoogleReviewsBuilder((prev) => ({ ...prev, minRating: Number(value) }))
          }
          options={[
            { label: "All ratings (0★+)", value: "0" },
            { label: "3★ and above", value: "3" },
            { label: "4★ and above", value: "4" },
            { label: "5★ only", value: "5" },
          ]}
        />

        <Select
          label="Layout"
          value={googleReviewsBuilder.layout}
          onValueChange={(value) =>
            setGoogleReviewsBuilder((prev) => ({ ...prev, layout: value as GoogleReviewsBuilderState["layout"] }))
          }
          options={[
            { label: "Grid", value: "grid" },
            { label: "Carousel", value: "carousel" },
          ]}
        />

        <Checkbox
          checked={googleReviewsBuilder.showRating}
          label="Show star rating on each review"
          onChange={(e) => setGoogleReviewsBuilder((prev) => ({ ...prev, showRating: e.target.checked }))}
        />

        <Checkbox
          checked={googleReviewsBuilder.showDate}
          label="Show review date"
          onChange={(e) => setGoogleReviewsBuilder((prev) => ({ ...prev, showDate: e.target.checked }))}
        />

        <Checkbox
          checked={googleReviewsBuilder.linkToGoogleMaps}
          label="Link to Google Maps listing"
          onChange={(e) => setGoogleReviewsBuilder((prev) => ({ ...prev, linkToGoogleMaps: e.target.checked }))}
        />

        {googleReviewsBuilder.linkToGoogleMaps ? (
          <Input
            label="Google Maps URL"
            value={googleReviewsBuilder.googleMapsUrl}
            onChange={(e) => setGoogleReviewsBuilder((prev) => ({ ...prev, googleMapsUrl: e.target.value }))}
            placeholder="https://maps.google.com/..."
          />
        ) : null}
      </Div>
    );
  }

  function renderFeaturedBundlesBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Featured Bundles Builder
        </Text>
        <Input
          label="Section title"
          value={featuredBundlesBuilder.title}
          onChange={(e) => setFeaturedBundlesBuilder((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Curated Bundles"
        />
        <Input
          label="Subtitle"
          value={featuredBundlesBuilder.subtitle}
          onChange={(e) => setFeaturedBundlesBuilder((prev) => ({ ...prev, subtitle: e.target.value }))}
          placeholder="Everything you need in one deal"
        />
        <Input
          label="Max items"
          type="number"
          min={1}
          max={12}
          value={String(featuredBundlesBuilder.maxItems)}
          onChange={(e) =>
            setFeaturedBundlesBuilder((prev) => ({
              ...prev,
              maxItems: Math.max(1, Math.min(12, Number(e.target.value) || 8)),
            }))
          }
        />
        <Input
          label="Filter by store (storeId)"
          value={featuredBundlesBuilder.storeId}
          onChange={(e) => setFeaturedBundlesBuilder((prev) => ({ ...prev, storeId: e.target.value }))}
          placeholder="store-pokemon-palace"
          helperText="Leave blank to show bundles from all stores."
        />
        <Stack gap="xs">
          <Text size="sm" weight="medium">{LBL_FILTER_BY_CATEGORY}</Text>
          <CategoryInlineSelect
            value={featuredBundlesBuilder.categorySlug}
            onChange={(id) => setFeaturedBundlesBuilder((prev) => ({ ...prev, categorySlug: id }))}
            placeholder={PH_FILTER_BY_CATEGORY}
          />
          <Text size="xs" color="muted">Leave blank to show bundles from all categories.</Text>
        </Stack>
        <Select
          label="Sort by"
          value={featuredBundlesBuilder.sortBy}
          onValueChange={(value) =>
            setFeaturedBundlesBuilder((prev) => ({ ...prev, sortBy: value as FeaturedBundlesBuilderState["sortBy"] }))
          }
          options={[
            { label: "Newest first", value: "newest" },
            { label: "Biggest savings", value: "savings-desc" },
            { label: "Price: low → high", value: "price-asc" },
          ]}
        />
        <Checkbox
          checked={featuredBundlesBuilder.showSavingsBadge}
          label="Show savings % badge on each bundle"
          onChange={(e) => setFeaturedBundlesBuilder((prev) => ({ ...prev, showSavingsBadge: e.target.checked }))}
        />
        <Text size="xs" color="muted">
          The bundles collection lands later in the bundle / prize-draw work; until then this section renders an empty state.
        </Text>
      </Div>
    );
  }

  function renderPrizeDrawsBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Prize Draws Builder
        </Text>
        <Input
          label="Section title"
          value={prizeDrawsBuilder.title}
          onChange={(e) => setPrizeDrawsBuilder((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Prize Draws"
        />
        <Input
          label="Subtitle"
          value={prizeDrawsBuilder.subtitle}
          onChange={(e) => setPrizeDrawsBuilder((prev) => ({ ...prev, subtitle: e.target.value }))}
          placeholder="Enter for a chance to win rare collectibles"
        />
        <Input
          label="Max items"
          type="number"
          min={1}
          max={12}
          value={String(prizeDrawsBuilder.maxItems)}
          onChange={(e) =>
            setPrizeDrawsBuilder((prev) => ({
              ...prev,
              maxItems: Math.max(1, Math.min(12, Number(e.target.value) || 6)),
            }))
          }
        />
        <Input
          label="Filter by store (storeId)"
          value={prizeDrawsBuilder.storeId}
          onChange={(e) => setPrizeDrawsBuilder((prev) => ({ ...prev, storeId: e.target.value }))}
          placeholder="Leave blank for all stores"
        />
        <Select
          label="Reveal status"
          value={prizeDrawsBuilder.revealStatus}
          onValueChange={(value) =>
            setPrizeDrawsBuilder((prev) => ({ ...prev, revealStatus: value as PrizeDrawsBuilderState["revealStatus"] }))
          }
          options={[
            { label: "All (pending + open)", value: "all" },
            { label: "Pending only", value: "pending" },
            { label: "Open only", value: "open" },
          ]}
        />
        <Checkbox
          checked={prizeDrawsBuilder.showCountdown}
          label="Show countdown to reveal window"
          onChange={(e) => setPrizeDrawsBuilder((prev) => ({ ...prev, showCountdown: e.target.checked }))}
        />
        <Checkbox
          checked={prizeDrawsBuilder.showEntriesRemaining}
          label="Show entries-remaining bar"
          onChange={(e) => setPrizeDrawsBuilder((prev) => ({ ...prev, showEntriesRemaining: e.target.checked }))}
        />
        <Text size="xs" color="muted">
          Prize-draw listing type is added with the prize-draw feature; until then this section renders an empty state.
        </Text>
      </Div>
    );
  }

  function renderEventRafflesBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Event Raffles Builder
        </Text>
        <Input
          label="Section title"
          value={eventRafflesBuilder.title}
          onChange={(e) => setEventRafflesBuilder((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Live Raffles & Spin Wheels"
        />
        <Input
          label="Subtitle"
          value={eventRafflesBuilder.subtitle}
          onChange={(e) => setEventRafflesBuilder((prev) => ({ ...prev, subtitle: e.target.value }))}
          placeholder="Participate in community events and win prizes"
        />
        <Input
          label="Max items"
          type="number"
          min={1}
          max={8}
          value={String(eventRafflesBuilder.maxItems)}
          onChange={(e) =>
            setEventRafflesBuilder((prev) => ({
              ...prev,
              maxItems: Math.max(1, Math.min(8, Number(e.target.value) || 4)),
            }))
          }
        />
        <Select
          label="Raffle type"
          value={eventRafflesBuilder.raffleType}
          onValueChange={(value) =>
            setEventRafflesBuilder((prev) => ({ ...prev, raffleType: value as EventRafflesBuilderState["raffleType"] }))
          }
          options={[
            { label: "All raffles", value: "all" },
            { label: "Raffle only", value: "raffle" },
            { label: "Spin wheel only", value: "spin_wheel" },
          ]}
        />
        <Checkbox
          checked={eventRafflesBuilder.showEntryCount}
          label="Show entry count on each event"
          onChange={(e) => setEventRafflesBuilder((prev) => ({ ...prev, showEntryCount: e.target.checked }))}
        />
        <Checkbox
          checked={eventRafflesBuilder.showCountdown}
          label="Show countdown to event start/end"
          onChange={(e) => setEventRafflesBuilder((prev) => ({ ...prev, showCountdown: e.target.checked }))}
        />
        <Text size="xs" color="muted">
          The hasRaffle flag on events ships with the raffle feature; until then this section renders an empty state.
        </Text>
      </Div>
    );
  }

  const COLLECTION_CARD_TYPE_OPTIONS: { label: string; value: CollectionCardEntryType }[] = [
    { label: "Products", value: "products" },
    { label: "Auctions", value: "auctions" },
    { label: "Pre-orders", value: "pre-orders" },
    { label: "Stores", value: "stores" },
    { label: "Events", value: "events" },
    { label: "Blog posts", value: "blog-posts" },
    { label: "Reviews", value: "reviews" },
    { label: "Brands", value: "brands" },
    { label: "Categories", value: "categories" },
  ];

  function renderCollectionEntry(entry: { type: CollectionCardEntryType; label: string; limit: number }, idx: number): React.ReactNode {
    return (
      <Stack
        key={`collection-${idx}`} rounded="lg" padding="sm" border="default" gap="sm">
        <Select
          label={`Collection ${idx + 1} type`}
          value={entry.type}
          onValueChange={(value) =>
            setCollectionCardsBuilder((prev) => ({
              ...prev,
              collections: prev.collections.map((c, i) =>
                i === idx ? { ...c, type: value as CollectionCardEntryType } : c,
              ),
            }))
          }
          options={COLLECTION_CARD_TYPE_OPTIONS}
        />
        <Input
          label="Display label (optional)"
          value={entry.label}
          onChange={(e) =>
            setCollectionCardsBuilder((prev) => ({
              ...prev,
              collections: prev.collections.map((c, i) => (i === idx ? { ...c, label: e.target.value } : c)),
            }))
          }
          placeholder="Leave blank to use the type name"
        />
        <Input
          label="Items in this collection"
          type="number"
          min={1}
          max={20}
          value={String(entry.limit)}
          onChange={(e) =>
            setCollectionCardsBuilder((prev) => ({
              ...prev,
              collections: prev.collections.map((c, i) =>
                i === idx ? { ...c, limit: Math.max(1, Math.min(20, Number(e.target.value) || 4)) } : c,
              ),
            }))
          }
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setCollectionCardsBuilder((prev) => ({
              ...prev,
              collections: prev.collections.filter((_, i) => i !== idx),
            }))
          }
        >
          Remove
        </Button>
      </Stack>
    );
  }

  function renderCollectionCardsBuilder(): React.ReactNode {
    const entries = collectionCardsBuilder.collections;
    const canAdd = entries.length < 3;
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Collection Cards Builder
        </Text>
        <Input
          label="Section title"
          value={collectionCardsBuilder.title}
          onChange={(e) => setCollectionCardsBuilder((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Featured Collections"
        />
        <Input
          label="Subtitle"
          value={collectionCardsBuilder.subtitle}
          onChange={(e) => setCollectionCardsBuilder((prev) => ({ ...prev, subtitle: e.target.value }))}
          placeholder="Hand-picked across the marketplace"
        />
        <Select
          label="Layout"
          value={collectionCardsBuilder.layout}
          onValueChange={(value) =>
            setCollectionCardsBuilder((prev) => ({ ...prev, layout: value as CollectionCardsBuilderState["layout"] }))
          }
          options={[
            { label: "Carousel", value: "carousel" },
            { label: "Grid", value: "grid" },
            { label: "Mixed row", value: "mixed-row" },
          ]}
        />
        <Select
          label="Items per row"
          value={String(collectionCardsBuilder.itemsPerRow)}
          onValueChange={(value) =>
            setCollectionCardsBuilder((prev) => ({
              ...prev,
              itemsPerRow: Number(value) as CollectionCardsBuilderState["itemsPerRow"],
            }))
          }
          options={[
            { label: "3", value: "3" },
            { label: "4", value: "4" },
            { label: "5", value: "5" },
          ]}
        />
        <Input
          label="Max total items"
          type="number"
          min={4}
          max={20}
          value={String(collectionCardsBuilder.maxItems)}
          onChange={(e) =>
            setCollectionCardsBuilder((prev) => ({
              ...prev,
              maxItems: Math.max(4, Math.min(20, Number(e.target.value) || 12)),
            }))
          }
        />
        <Checkbox
          checked={collectionCardsBuilder.showCollectionTabs}
          label="Show collection tabs (filter chips)"
          onChange={(e) => setCollectionCardsBuilder((prev) => ({ ...prev, showCollectionTabs: e.target.checked }))}
        />

        <Stack gap="3">
          <Text size="sm" weight="semibold" color="primary">
            Collections ({entries.length}/3)
          </Text>
          {entries.map((entry, idx) => renderCollectionEntry(entry, idx))}
          {canAdd ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setCollectionCardsBuilder((prev) => ({
                  ...prev,
                  collections: [
                    ...prev.collections,
                    { type: "products", label: "", limit: 4, storeId: "", categorySlug: "", brandSlug: "", featuredOnly: false },
                  ],
                }))
              }
            >
              + Add collection
            </Button>
          ) : (
            <Text size="xs" color="muted">
              Maximum of 3 collections per section.
            </Text>
          )}
        </Stack>

        <Text size="xs" color="muted">
          Data fetching wires into the per-resource repositories — the section renders an
          empty state until the wiring lands.
        </Text>
      </Div>
    );
  }

  function renderSocialFeedBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">Social Feed Builder</Text>
        <Input
          label="Section title"
          value={socialFeedBuilder.title}
          onChange={(e) => setSocialFeedBuilder((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="LetItRip on Instagram"
        />
        <Input
          label="Subtitle"
          value={socialFeedBuilder.subtitle}
          onChange={(e) => setSocialFeedBuilder((prev) => ({ ...prev, subtitle: e.target.value }))}
          placeholder="Follow us for daily collection showcases"
        />
        <Select
          label="Platform"
          value={socialFeedBuilder.platform}
          onValueChange={(v) => setSocialFeedBuilder((prev) => ({ ...prev, platform: v as SocialFeedBuilderState["platform"] }))}
          options={[
            { label: "Instagram", value: "instagram" },
            { label: "Facebook", value: "facebook" },
            { label: "TikTok", value: "tiktok" },
            { label: "DeviantArt", value: "deviantart" },
          ]}
        />
        <Input
          label="Account handle / username"
          value={socialFeedBuilder.handle}
          onChange={(e) => setSocialFeedBuilder((prev) => ({ ...prev, handle: e.target.value }))}
          placeholder="letitrip"
        />
        <Select
          label="Post type"
          value={socialFeedBuilder.postType}
          onValueChange={(v) => setSocialFeedBuilder((prev) => ({ ...prev, postType: v as SocialFeedBuilderState["postType"] }))}
          options={[
            { label: "All", value: "all" },
            { label: "Images only", value: "images" },
            { label: "Videos only", value: "videos" },
            { label: "Reels only", value: "reels" },
          ]}
        />
        <Input
          label="Post count (1–12)"
          type="number"
          min={1}
          max={12}
          value={String(socialFeedBuilder.count)}
          onChange={(e) => setSocialFeedBuilder((prev) => ({ ...prev, count: Math.min(12, Math.max(1, Number(e.target.value) || 9)) }))}
        />
        <Select
          label="Layout"
          value={socialFeedBuilder.layout}
          onValueChange={(v) => setSocialFeedBuilder((prev) => ({ ...prev, layout: v as SocialFeedBuilderState["layout"] }))}
          options={[
            { label: "Grid", value: "grid" },
            { label: "Masonry", value: "masonry" },
            { label: "Carousel (horizontal scroll)", value: "carousel" },
          ]}
        />
        <Checkbox
          checked={socialFeedBuilder.showCaption}
          label="Show caption on hover"
          onChange={(e) => setSocialFeedBuilder((prev) => ({ ...prev, showCaption: e.target.checked }))}
        />
        <Checkbox
          checked={socialFeedBuilder.showStats}
          label="Show like / view / comment counts on hover"
          onChange={(e) => setSocialFeedBuilder((prev) => ({ ...prev, showStats: e.target.checked }))}
        />
        <Text size="xs" color="muted">
          Social platform credentials (access tokens, client IDs) must be set in ⑧ Integrations before this section will load live posts.
        </Text>
      </Div>
    );
  }

  function renderTypedBuilder(): React.ReactNode {
    switch (sectionType) {
      case "products": return renderProductsBuilder();
      case "auctions": return renderAuctionsBuilder();
      case "stats": return renderStatsBuilder();
      case "pre-orders": return renderPreOrdersBuilder();
      case "stores": return renderStoresBuilder();
      case "events": return renderEventsBuilder();
      case "social-feed": return renderSocialFeedBuilder();
      case "welcome": return renderWelcomeBuilder();
      case "trust-indicators": return renderTrustIndicatorsBuilder();
      case "categories": return renderCategoriesBuilder();
      case "brands": return renderBrandsBuilder();
      case "banner": return renderBannerBuilder();
      case "features": return renderFeaturesBuilder();
      case "reviews": return renderReviewsBuilder();
      case "whatsapp-community": return renderWhatsAppBuilder();
      case "faq": return renderFAQBuilder();
      case "blog-articles": return renderBlogBuilder();
      case "newsletter": return renderNewsletterBuilder();
      case "carousel": return renderCarouselBuilder();
      case "custom-cards": return renderCustomCardsBuilder();
      case "google-reviews": return renderGoogleReviewsBuilder();
      case "featured-bundles": return renderFeaturedBundlesBuilder();
      case "prize-draws": return renderPrizeDrawsBuilder();
      case "event-raffles": return renderEventRafflesBuilder();
      case "collection-cards": return renderCollectionCardsBuilder();
      default: return null;
    }
  }

  // If children exist, render passthrough mode (detail view)
  if (hasChildren) {
    return <>{children}</>;
  }

  // Map sections data to listing rows
  const rows = sections.map((section) => ({
    id: section.id,
    primary: section.type.charAt(0).toUpperCase() + section.type.slice(1).replace(/-/g, " "),
    secondary: `Order: ${section.order} • ${section.enabled ? "Enabled" : "Disabled"}`,
    status: section.enabled ? "Active" : "Inactive",
    updatedAt: new Date(section.updatedAt).toLocaleDateString(),
  }));

  const sectionOrderMap = React.useMemo(() => {
    return new Map(sections.map((section) => [section.id, section.order]));
  }, [sections]);

  const hasReorderChanges = reorderDraft.some(
    (item) => sectionOrderMap.get(item.id) !== item.order,
  );
  const canUndoReorderChanges = reorderUndoStack.length > 0;

  return (
    <>
      <Div paddingX="x-sm-md" padding="y-md">
        <Row className="mb-4" align="center" justify="between" gap="3">
          <Div>
            <Text size="base" weight="semibold" color="primary">Homepage Sections</Text>
            <Text size="sm" color="muted">Manage homepage sections and their display order</Text>
          </Div>
          <Row align="center" gap="sm">
            <Button type="button" variant="outline" size="sm" onClick={() => setSeedResetOpen(true)}>
              Reset seed data
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
              Manage Sections
            </Button>
          </Row>
        </Row>
        {errorMessage && (
          <Div textSize="sm" className="mb-4 border border-error/20" color="error" surface="danger-surface" padding="inline" rounded="xl">
            {errorMessage}
          </Div>
        )}
        <DataTable rows={rows} isLoading={isLoading} emptyLabel="No sections found" />
      </Div>

      <Stack className={`mt-4 ${__P.p4}`} gap="3" rounded="xl" surface="default" border="default">
        <Row align="center" justify="between" gap="3">
          <Text size="sm" weight="semibold" color="primary">
            Reorder Sections
          </Text>
          <Row align="center" gap="sm">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={reindexDraft}
              disabled={reorderSections.isPending || reorderDraft.length === 0}
            >
              Reindex 1..N
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={undoReorderChange}
              disabled={reorderSections.isPending || !canUndoReorderChanges}
            >
              Undo unsaved
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetToServerOrder}
              disabled={reorderSections.isPending || !hasReorderChanges}
            >
              Reset to server
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => reorderSections.mutate()}
              disabled={!hasReorderChanges || reorderSections.isPending}
            >
              {reorderSections.isPending ? "Saving order..." : "Save order"}
            </Button>
          </Row>
        </Row>

        {reorderDraft.length === 0 ? (
          <Text size="sm" color="muted">No sections to reorder.</Text>
        ) : (
          <Stack gap="sm">
            {reorderDraft.map((item, index) => (
              <Div layout="grid" gap="2" 
                key={`reorder-${item.id}`}
                className="grid-cols-[auto_1fr_auto_auto_auto] items-center" rounded="md" padding="xs" border="default"
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleReorderDrop(index)}
                onDragEnd={() => setDragIndex(null)}
              >
                <Text size="sm" weight="semibold" color="muted">≡</Text>
                <Text size="sm" color="primary">
                  {item.type} #{item.order}
                </Text>
                <Input
                  type="number"
                  min={1}
                  max={reorderDraft.length}
                  value={String(item.order)}
                  onChange={(event) =>
                    updateReorderItemOrder(index, Number(event.target.value) || 1)
                  }
                  className="w-24"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveReorderItem(index, -1)}
                  disabled={index === 0}
                >
                  Up
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveReorderItem(index, 1)}
                  disabled={index === reorderDraft.length - 1}
                >
                  Down
                </Button>
              </Div>
            ))}
          </Stack>
        )}
      </Stack>


      <ConfirmDeleteModal
        isOpen={seedResetOpen}
        onClose={() => setSeedResetOpen(false)}
        onConfirm={() => resetSeed.mutate()}
        title="Reset homepage sections seed data?"
        message="This will reload the 19 default homepage sections from seed data. Any manual changes made in Firestore will be overwritten."
        confirmText="Reset seed"
        cancelText="Cancel"
        isDeleting={resetSeed.isPending}
        variant="danger"
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Manage Homepage Section" size="lg">
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            saveSection.mutate();
          }} spacing="md">
          <Select
            label="Mode"
            value={mode}
            onValueChange={(value) => setMode(value as "create" | "edit")}
            options={[
              { label: "Create new section", value: "create" },
              { label: "Edit existing section", value: "edit" },
            ]}
          />

          {mode === "edit" ? (
            <Select
              label="Section"
              value={selectedSectionId}
              onValueChange={setSelectedSectionId}
              placeholder="Select section"
              options={sections.map((section) => ({
                label: `${section.type} (#${section.order})`,
                value: section.id,
              }))}
            />
          ) : null}

          <Select
            label="Section type"
            value={sectionType}
            onValueChange={(value) => {
              setSectionType(value as SectionType);
              if (mode === "create") {
                setSelectedSectionId("");
              }
            }}
            options={SECTION_TYPE_OPTIONS.map((type) => ({
              label: type,
              value: type,
            }))}
            disabled={mode === "edit"}
          />

          <Input
            label="Order"
            type="number"
            value={order}
            onChange={(event) => setOrder(event.target.value)}
            placeholder="Leave empty to auto-place"
          />

          <Select
            label="Enabled"
            value={enabled ? "true" : "false"}
            onValueChange={(value) => setEnabled(value === "true")}
            options={[
              { label: "Enabled", value: "true" },
              { label: "Disabled", value: "false" },
            ]}
          />

          {isTypedBuilder ? renderTypedBuilder() : null}

          <Textarea
            label={isTypedBuilder ? "Generated config (JSON preview)" : "Section config (JSON)"}
            value={configJson}
            onChange={(event) => setConfigJson(event.target.value)}
            rows={10}
            readOnly={isTypedBuilder}
            helperText={
              isTypedBuilder
                ? "This JSON is generated from typed controls above."
                : "Provide section config JSON for this section type."
            }
          />

          <FormActions align="right">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saveSection.isPending}>
              {saveSection.isPending ? "Saving..." : mode === "create" ? "Create section" : "Update section"}
            </Button>
          </FormActions>
        </Form>
      </Modal>
    </>
  );
}
