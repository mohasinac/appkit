"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Checkbox,
  Div,
  Form,
  FormActions,
  Input,
  Modal,
  Select,
  Text,
  Textarea,
} from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants";
import { useAdminSectionsListing } from "../hooks/useAdminSectionsListing";
import { AdminListingScaffold } from "./AdminListingScaffold";

export interface AdminSectionsViewProps {
  children?: React.ReactNode;
}

const SECTION_TYPE_OPTIONS = [
  "welcome",
  "stats",
  "trust-indicators",
  "categories",
  "brands",
  "products",
  "pre-orders",
  "auctions",
  "banner",
  "features",
  "reviews",
  "whatsapp-community",
  "faq",
  "blog-articles",
  "newsletter",
  "stores",
  "events",
] as const;

type SectionType = (typeof SECTION_TYPE_OPTIONS)[number];

interface SectionPatchPayload {
  enabled: boolean;
  order?: number;
  config: Record<string, unknown>;
}

type ResourceMode = "automatic" | "manual";

interface CategoryOption {
  id: string;
  name: string;
}

interface ReorderItem {
  id: string;
  type: string;
  order: number;
}

interface ProductsBuilderState {
  title: string;
  subtitle: string;
  maxItems: number;
  status: "all" | "published" | "draft";
  sortBy: "featured" | "newest" | "price-asc" | "price-desc";
  featuredOnly: boolean;
  inStockOnly: boolean;
  autoScroll: boolean;
  scrollInterval: number;
  resourceMode: ResourceMode;
  selectedCategoryIds: string[];
  manualResourceIds: string;
}

interface AuctionsBuilderState {
  title: string;
  subtitle: string;
  maxItems: number;
  status: "all" | "active" | "scheduled" | "ended";
  sortBy: "ending-soon" | "highest-bid" | "newest";
  autoScroll: boolean;
  scrollInterval: number;
  resourceMode: ResourceMode;
  selectedCategoryIds: string[];
  manualResourceIds: string;
}

interface StatsBuilderState {
  title: string;
  stats: Array<{
    key: string;
    label: string;
    value: string;
  }>;
}

interface PreOrdersBuilderState {
  title: string;
  subtitle: string;
  maxItems: number;
  status: "all" | "active" | "upcoming" | "closed";
  sortBy: "newest" | "price-asc" | "price-desc" | "shipping-soon";
  autoScroll: boolean;
  scrollInterval: number;
  resourceMode: ResourceMode;
  selectedCategoryIds: string[];
  manualResourceIds: string;
}

interface StoresBuilderState {
  title: string;
  subtitle: string;
  maxItems: number;
  status: "all" | "active" | "pending" | "disabled";
  sortBy: "rating-desc" | "newest" | "popular";
  verifiedOnly: boolean;
  autoScroll: boolean;
  scrollInterval: number;
  resourceMode: ResourceMode;
  selectedCategoryIds: string[];
  manualResourceIds: string;
}

interface EventsBuilderState {
  title: string;
  subtitle: string;
  maxItems: number;
  status: "all" | "active" | "upcoming" | "ended";
  sortBy: "start-date" | "newest" | "popular";
  featuredOnly: boolean;
  autoScroll: boolean;
  scrollInterval: number;
  resourceMode: ResourceMode;
  selectedCategoryIds: string[];
  manualResourceIds: string;
}

const DEFAULT_PRODUCTS_BUILDER: ProductsBuilderState = {
  title: "Featured Products",
  subtitle: "",
  maxItems: 18,
  status: "published",
  sortBy: "featured",
  featuredOnly: true,
  inStockOnly: true,
  autoScroll: false,
  scrollInterval: 5000,
  resourceMode: "automatic",
  selectedCategoryIds: [],
  manualResourceIds: "",
};

const DEFAULT_AUCTIONS_BUILDER: AuctionsBuilderState = {
  title: "Live Auctions",
  subtitle: "",
  maxItems: 18,
  status: "active",
  sortBy: "ending-soon",
  autoScroll: false,
  scrollInterval: 5000,
  resourceMode: "automatic",
  selectedCategoryIds: [],
  manualResourceIds: "",
};

const DEFAULT_STATS_BUILDER: StatsBuilderState = {
  title: "Marketplace Stats",
  stats: [
    { key: "products", label: "Products Listed", value: "10,000+" },
    { key: "sellers", label: "Verified Sellers", value: "2,000+" },
    { key: "buyers", label: "Happy Buyers", value: "50,000+" },
    { key: "rating", label: "Average Rating", value: "4.8/5" },
  ],
};

const DEFAULT_PRE_ORDERS_BUILDER: PreOrdersBuilderState = {
  title: "Reserve Before It Ships",
  subtitle: "",
  maxItems: 18,
  status: "active",
  sortBy: "shipping-soon",
  autoScroll: false,
  scrollInterval: 5000,
  resourceMode: "automatic",
  selectedCategoryIds: [],
  manualResourceIds: "",
};

const DEFAULT_STORES_BUILDER: StoresBuilderState = {
  title: "Featured Stores",
  subtitle: "",
  maxItems: 8,
  status: "active",
  sortBy: "rating-desc",
  verifiedOnly: true,
  autoScroll: false,
  scrollInterval: 5000,
  resourceMode: "automatic",
  selectedCategoryIds: [],
  manualResourceIds: "",
};

const DEFAULT_EVENTS_BUILDER: EventsBuilderState = {
  title: "Events & Offers",
  subtitle: "",
  maxItems: 6,
  status: "active",
  sortBy: "start-date",
  featuredOnly: false,
  autoScroll: false,
  scrollInterval: 5000,
  resourceMode: "automatic",
  selectedCategoryIds: [],
  manualResourceIds: "",
};

const SUPPORTED_TYPED_BUILDERS: SectionType[] = [
  "products",
  "auctions",
  "stats",
  "pre-orders",
  "stores",
  "events",
];

function parseCsvValues(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function toNumberValue(value: unknown, fallback: number): number {
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

function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toBooleanValue(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function buildProductsConfig(builder: ProductsBuilderState): Record<string, unknown> {
  return {
    title: builder.title,
    subtitle: builder.subtitle || undefined,
    maxProducts: builder.maxItems,
    rows: 2,
    itemsPerRow: 3,
    mobileItemsPerRow: 1,
    autoScroll: builder.autoScroll,
    scrollInterval: builder.scrollInterval,
    filters: {
      categoryIds: builder.selectedCategoryIds,
      status: builder.status,
      sortBy: builder.sortBy,
      featuredOnly: builder.featuredOnly,
      inStockOnly: builder.inStockOnly,
    },
    resources: {
      mode: builder.resourceMode,
      ids: builder.resourceMode === "manual" ? parseCsvValues(builder.manualResourceIds) : [],
    },
  };
}

function buildAuctionsConfig(builder: AuctionsBuilderState): Record<string, unknown> {
  return {
    title: builder.title,
    subtitle: builder.subtitle || undefined,
    maxAuctions: builder.maxItems,
    rows: 2,
    itemsPerRow: 3,
    mobileItemsPerRow: 1,
    autoScroll: builder.autoScroll,
    scrollInterval: builder.scrollInterval,
    filters: {
      categoryIds: builder.selectedCategoryIds,
      status: builder.status,
      sortBy: builder.sortBy,
    },
    resources: {
      mode: builder.resourceMode,
      ids: builder.resourceMode === "manual" ? parseCsvValues(builder.manualResourceIds) : [],
    },
  };
}

function buildStatsConfig(builder: StatsBuilderState): Record<string, unknown> {
  return {
    title: builder.title || undefined,
    stats: builder.stats.map((item, index) => ({
      key: item.key.trim() || `stat-${index + 1}`,
      label: item.label,
      value: item.value,
    })),
  };
}

function buildPreOrdersConfig(builder: PreOrdersBuilderState): Record<string, unknown> {
  return {
    title: builder.title,
    subtitle: builder.subtitle || undefined,
    maxItems: builder.maxItems,
    rows: 2,
    itemsPerRow: 3,
    mobileItemsPerRow: 1,
    autoScroll: builder.autoScroll,
    scrollInterval: builder.scrollInterval,
    filters: {
      categoryIds: builder.selectedCategoryIds,
      status: builder.status,
      sortBy: builder.sortBy,
    },
    resources: {
      mode: builder.resourceMode,
      ids: builder.resourceMode === "manual" ? parseCsvValues(builder.manualResourceIds) : [],
    },
  };
}

function buildStoresConfig(builder: StoresBuilderState): Record<string, unknown> {
  return {
    title: builder.title,
    subtitle: builder.subtitle || undefined,
    maxStores: builder.maxItems,
    autoScroll: builder.autoScroll,
    scrollInterval: builder.scrollInterval,
    filters: {
      categoryIds: builder.selectedCategoryIds,
      status: builder.status,
      sortBy: builder.sortBy,
      verifiedOnly: builder.verifiedOnly,
    },
    resources: {
      mode: builder.resourceMode,
      ids: builder.resourceMode === "manual" ? parseCsvValues(builder.manualResourceIds) : [],
    },
  };
}

function buildEventsConfig(builder: EventsBuilderState): Record<string, unknown> {
  return {
    title: builder.title,
    subtitle: builder.subtitle || undefined,
    maxEvents: builder.maxItems,
    autoScroll: builder.autoScroll,
    scrollInterval: builder.scrollInterval,
    filters: {
      categoryIds: builder.selectedCategoryIds,
      status: builder.status,
      sortBy: builder.sortBy,
      featuredOnly: builder.featuredOnly,
    },
    resources: {
      mode: builder.resourceMode,
      ids: builder.resourceMode === "manual" ? parseCsvValues(builder.manualResourceIds) : [],
    },
  };
}

function parseProductsBuilder(config: Record<string, unknown>): ProductsBuilderState {
  const filters = (config.filters ?? {}) as Record<string, unknown>;
  const resources = (config.resources ?? {}) as Record<string, unknown>;
  return {
    title: toStringValue(config.title, DEFAULT_PRODUCTS_BUILDER.title),
    subtitle: toStringValue(config.subtitle),
    maxItems: toNumberValue(config.maxProducts, DEFAULT_PRODUCTS_BUILDER.maxItems),
    status:
      toStringValue(filters.status, DEFAULT_PRODUCTS_BUILDER.status) as ProductsBuilderState["status"],
    sortBy:
      toStringValue(filters.sortBy, DEFAULT_PRODUCTS_BUILDER.sortBy) as ProductsBuilderState["sortBy"],
    featuredOnly: toBooleanValue(filters.featuredOnly, DEFAULT_PRODUCTS_BUILDER.featuredOnly),
    inStockOnly: toBooleanValue(filters.inStockOnly, DEFAULT_PRODUCTS_BUILDER.inStockOnly),
    autoScroll: toBooleanValue(config.autoScroll, DEFAULT_PRODUCTS_BUILDER.autoScroll),
    scrollInterval: toNumberValue(config.scrollInterval, DEFAULT_PRODUCTS_BUILDER.scrollInterval),
    resourceMode:
      toStringValue(resources.mode, DEFAULT_PRODUCTS_BUILDER.resourceMode) as ResourceMode,
    selectedCategoryIds: toStringArray(filters.categoryIds),
    manualResourceIds: toStringArray(resources.ids).join(", "),
  };
}

function parseAuctionsBuilder(config: Record<string, unknown>): AuctionsBuilderState {
  const filters = (config.filters ?? {}) as Record<string, unknown>;
  const resources = (config.resources ?? {}) as Record<string, unknown>;
  return {
    title: toStringValue(config.title, DEFAULT_AUCTIONS_BUILDER.title),
    subtitle: toStringValue(config.subtitle),
    maxItems: toNumberValue(config.maxAuctions, DEFAULT_AUCTIONS_BUILDER.maxItems),
    status:
      toStringValue(filters.status, DEFAULT_AUCTIONS_BUILDER.status) as AuctionsBuilderState["status"],
    sortBy:
      toStringValue(filters.sortBy, DEFAULT_AUCTIONS_BUILDER.sortBy) as AuctionsBuilderState["sortBy"],
    autoScroll: toBooleanValue(config.autoScroll, DEFAULT_AUCTIONS_BUILDER.autoScroll),
    scrollInterval: toNumberValue(config.scrollInterval, DEFAULT_AUCTIONS_BUILDER.scrollInterval),
    resourceMode:
      toStringValue(resources.mode, DEFAULT_AUCTIONS_BUILDER.resourceMode) as ResourceMode,
    selectedCategoryIds: toStringArray(filters.categoryIds),
    manualResourceIds: toStringArray(resources.ids).join(", "),
  };
}

function parseStatsBuilder(config: Record<string, unknown>): StatsBuilderState {
  const statsArray = Array.isArray(config.stats) ? config.stats : [];
  const parsedStats = statsArray
    .slice(0, 4)
    .map((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return {
        key: toStringValue(row.key, `stat-${index + 1}`),
        label: toStringValue(row.label),
        value: toStringValue(row.value),
      };
    });

  while (parsedStats.length < 4) {
    parsedStats.push({
      key: `stat-${parsedStats.length + 1}`,
      label: "",
      value: "",
    });
  }

  return {
    title: toStringValue(config.title, DEFAULT_STATS_BUILDER.title),
    stats: parsedStats,
  };
}

function parsePreOrdersBuilder(config: Record<string, unknown>): PreOrdersBuilderState {
  const filters = (config.filters ?? {}) as Record<string, unknown>;
  const resources = (config.resources ?? {}) as Record<string, unknown>;
  return {
    title: toStringValue(config.title, DEFAULT_PRE_ORDERS_BUILDER.title),
    subtitle: toStringValue(config.subtitle),
    maxItems: toNumberValue(config.maxItems, DEFAULT_PRE_ORDERS_BUILDER.maxItems),
    status:
      toStringValue(filters.status, DEFAULT_PRE_ORDERS_BUILDER.status) as PreOrdersBuilderState["status"],
    sortBy:
      toStringValue(filters.sortBy, DEFAULT_PRE_ORDERS_BUILDER.sortBy) as PreOrdersBuilderState["sortBy"],
    autoScroll: toBooleanValue(config.autoScroll, DEFAULT_PRE_ORDERS_BUILDER.autoScroll),
    scrollInterval: toNumberValue(config.scrollInterval, DEFAULT_PRE_ORDERS_BUILDER.scrollInterval),
    resourceMode:
      toStringValue(resources.mode, DEFAULT_PRE_ORDERS_BUILDER.resourceMode) as ResourceMode,
    selectedCategoryIds: toStringArray(filters.categoryIds),
    manualResourceIds: toStringArray(resources.ids).join(", "),
  };
}

function parseStoresBuilder(config: Record<string, unknown>): StoresBuilderState {
  const filters = (config.filters ?? {}) as Record<string, unknown>;
  const resources = (config.resources ?? {}) as Record<string, unknown>;
  return {
    title: toStringValue(config.title, DEFAULT_STORES_BUILDER.title),
    subtitle: toStringValue(config.subtitle),
    maxItems: toNumberValue(config.maxStores, DEFAULT_STORES_BUILDER.maxItems),
    status:
      toStringValue(filters.status, DEFAULT_STORES_BUILDER.status) as StoresBuilderState["status"],
    sortBy:
      toStringValue(filters.sortBy, DEFAULT_STORES_BUILDER.sortBy) as StoresBuilderState["sortBy"],
    verifiedOnly: toBooleanValue(filters.verifiedOnly, DEFAULT_STORES_BUILDER.verifiedOnly),
    autoScroll: toBooleanValue(config.autoScroll, DEFAULT_STORES_BUILDER.autoScroll),
    scrollInterval: toNumberValue(config.scrollInterval, DEFAULT_STORES_BUILDER.scrollInterval),
    resourceMode:
      toStringValue(resources.mode, DEFAULT_STORES_BUILDER.resourceMode) as ResourceMode,
    selectedCategoryIds: toStringArray(filters.categoryIds),
    manualResourceIds: toStringArray(resources.ids).join(", "),
  };
}

function parseEventsBuilder(config: Record<string, unknown>): EventsBuilderState {
  const filters = (config.filters ?? {}) as Record<string, unknown>;
  const resources = (config.resources ?? {}) as Record<string, unknown>;
  return {
    title: toStringValue(config.title, DEFAULT_EVENTS_BUILDER.title),
    subtitle: toStringValue(config.subtitle),
    maxItems: toNumberValue(config.maxEvents, DEFAULT_EVENTS_BUILDER.maxItems),
    status:
      toStringValue(filters.status, DEFAULT_EVENTS_BUILDER.status) as EventsBuilderState["status"],
    sortBy:
      toStringValue(filters.sortBy, DEFAULT_EVENTS_BUILDER.sortBy) as EventsBuilderState["sortBy"],
    featuredOnly: toBooleanValue(filters.featuredOnly, DEFAULT_EVENTS_BUILDER.featuredOnly),
    autoScroll: toBooleanValue(config.autoScroll, DEFAULT_EVENTS_BUILDER.autoScroll),
    scrollInterval: toNumberValue(config.scrollInterval, DEFAULT_EVENTS_BUILDER.scrollInterval),
    resourceMode:
      toStringValue(resources.mode, DEFAULT_EVENTS_BUILDER.resourceMode) as ResourceMode,
    selectedCategoryIds: toStringArray(filters.categoryIds),
    manualResourceIds: toStringArray(resources.ids).join(", "),
  };
}

export function AdminSectionsView({ children }: AdminSectionsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
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
  const [reorderDraft, setReorderDraft] = React.useState<ReorderItem[]>([]);
  const [reorderServerSnapshot, setReorderServerSnapshot] = React.useState<ReorderItem[]>([]);
  const [reorderUndoStack, setReorderUndoStack] = React.useState<ReorderItem[][]>([]);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [formMessage, setFormMessage] = React.useState<string | null>(null);

  const isTypedBuilder = SUPPORTED_TYPED_BUILDERS.includes(sectionType);

  const { sections, isLoading, errorMessage } = useAdminSectionsListing({
    page: 1,
    pageSize: 50,
  });

  const categoriesQuery = useQuery<{ items?: unknown[] }>({
    queryKey: ["admin", "sections", "categories", "options"],
    queryFn: () =>
      apiClient.get<{ items?: unknown[] }>(
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
        const row = (item ?? {}) as Record<string, unknown>;
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
    if (sectionType === "products") {
      return buildProductsConfig(productsBuilder);
    }
    if (sectionType === "auctions") {
      return buildAuctionsConfig(auctionsBuilder);
    }
    if (sectionType === "stats") {
      return buildStatsConfig(statsBuilder);
    }
    if (sectionType === "pre-orders") {
      return buildPreOrdersConfig(preOrdersBuilder);
    }
    if (sectionType === "stores") {
      return buildStoresConfig(storesBuilder);
    }
    if (sectionType === "events") {
      return buildEventsConfig(eventsBuilder);
    }
    return null;
  }, [
    sectionType,
    productsBuilder,
    auctionsBuilder,
    statsBuilder,
    preOrdersBuilder,
    storesBuilder,
    eventsBuilder,
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

  const saveSection = useMutation({
    mutationFn: async () => {
      let parsedConfig: Record<string, unknown>;
      try {
        parsedConfig = JSON.parse(configJson) as Record<string, unknown>;
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
      setFormMessage(mode === "create" ? "Section created." : "Section updated.");
      setIsModalOpen(false);
    },
    onError: (error) => {
      setFormMessage(error instanceof Error ? error.message : "Failed to save section.");
    },
  });

  const reorderSections = useMutation({
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
      setFormMessage("Section order updated.");
    },
    onError: (error) => {
      setFormMessage(error instanceof Error ? error.message : "Failed to reorder sections.");
    },
  });

  React.useEffect(() => {
    if (mode !== "edit" || !selectedSectionId) return;
    const selected = sections.find((section) => section.id === selectedSectionId);
    if (!selected) return;

    setSectionType(selected.type as SectionType);
    setEnabled(Boolean(selected.enabled));
    setOrder(String(selected.order ?? ""));
    const selectedConfig = (selected.config ?? {}) as unknown as Record<string, unknown>;
    setConfigJson(JSON.stringify(selectedConfig, null, 2));

    if (selected.type === "products") {
      setProductsBuilder(parseProductsBuilder(selectedConfig));
    }
    if (selected.type === "auctions") {
      setAuctionsBuilder(parseAuctionsBuilder(selectedConfig));
    }
    if (selected.type === "stats") {
      setStatsBuilder(parseStatsBuilder(selectedConfig));
    }
    if (selected.type === "pre-orders") {
      setPreOrdersBuilder(parsePreOrdersBuilder(selectedConfig));
    }
    if (selected.type === "stores") {
      setStoresBuilder(parseStoresBuilder(selectedConfig));
    }
    if (selected.type === "events") {
      setEventsBuilder(parseEventsBuilder(selectedConfig));
    }
  }, [mode, sections, selectedSectionId]);

  React.useEffect(() => {
    if (!isModalOpen || mode !== "create") {
      return;
    }

    if (sectionType === "products") {
      setProductsBuilder(DEFAULT_PRODUCTS_BUILDER);
    }
    if (sectionType === "auctions") {
      setAuctionsBuilder(DEFAULT_AUCTIONS_BUILDER);
    }
    if (sectionType === "stats") {
      setStatsBuilder(DEFAULT_STATS_BUILDER);
    }
    if (sectionType === "pre-orders") {
      setPreOrdersBuilder(DEFAULT_PRE_ORDERS_BUILDER);
    }
    if (sectionType === "stores") {
      setStoresBuilder(DEFAULT_STORES_BUILDER);
    }
    if (sectionType === "events") {
      setEventsBuilder(DEFAULT_EVENTS_BUILDER);
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

  function renderProductsBuilder(): React.ReactNode {
    return (
      <Div className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-slate-700">
        <Text className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
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
          label="Sort"
          value={productsBuilder.sortBy}
          onValueChange={(value) =>
            setProductsBuilder((prev) => ({
              ...prev,
              sortBy: value as ProductsBuilderState["sortBy"],
            }))
          }
          options={[
            { label: "Featured", value: "featured" },
            { label: "Newest", value: "newest" },
            { label: "Price (Low to High)", value: "price-asc" },
            { label: "Price (High to Low)", value: "price-desc" },
          ]}
        />

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
            { label: "Automatic by filters", value: "automatic" },
            { label: "Manual resource IDs", value: "manual" },
          ]}
        />

        <Div className="space-y-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Category selectors
          </Text>
          {categoriesQuery.isLoading ? (
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">Loading categories...</Text>
          ) : categoryOptions.length === 0 ? (
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">No categories available.</Text>
          ) : (
            <Div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
        </Div>

        {productsBuilder.resourceMode === "manual" ? (
          <Textarea
            label="Manual product resource IDs (comma-separated)"
            value={productsBuilder.manualResourceIds}
            onChange={(event) =>
              setProductsBuilder((prev) => ({
                ...prev,
                manualResourceIds: event.target.value,
              }))
            }
            rows={3}
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
          label="Scroll interval (ms)"
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

  function renderAuctionsBuilder(): React.ReactNode {
    return (
      <Div className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-slate-700">
        <Text className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
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
          label="Sort"
          value={auctionsBuilder.sortBy}
          onValueChange={(value) =>
            setAuctionsBuilder((prev) => ({
              ...prev,
              sortBy: value as AuctionsBuilderState["sortBy"],
            }))
          }
          options={[
            { label: "Ending Soon", value: "ending-soon" },
            { label: "Highest Bid", value: "highest-bid" },
            { label: "Newest", value: "newest" },
          ]}
        />

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
            { label: "Automatic by filters", value: "automatic" },
            { label: "Manual resource IDs", value: "manual" },
          ]}
        />

        <Div className="space-y-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Category selectors
          </Text>
          {categoriesQuery.isLoading ? (
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">Loading categories...</Text>
          ) : categoryOptions.length === 0 ? (
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">No categories available.</Text>
          ) : (
            <Div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
        </Div>

        {auctionsBuilder.resourceMode === "manual" ? (
          <Textarea
            label="Manual auction resource IDs (comma-separated)"
            value={auctionsBuilder.manualResourceIds}
            onChange={(event) =>
              setAuctionsBuilder((prev) => ({
                ...prev,
                manualResourceIds: event.target.value,
              }))
            }
            rows={3}
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
          label="Scroll interval (ms)"
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
      <Div className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-slate-700">
        <Text className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
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
          <Div key={`stat-row-${index}`} className="space-y-3 rounded-md border border-zinc-200 p-3 dark:border-slate-700">
            <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
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
          </Div>
        ))}
      </Div>
    );
  }

  function renderCategorySelector(
    selectedIds: string[],
    onToggle: (categoryId: string, checked: boolean) => void,
  ): React.ReactNode {
    return (
      <Div className="space-y-2">
        <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Category selectors
        </Text>
        {categoriesQuery.isLoading ? (
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">Loading categories...</Text>
        ) : categoryOptions.length === 0 ? (
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">No categories available.</Text>
        ) : (
          <Div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
      </Div>
    );
  }

  function renderPreOrdersBuilder(): React.ReactNode {
    return (
      <Div className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-slate-700">
        <Text className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
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
          label="Sort"
          value={preOrdersBuilder.sortBy}
          onValueChange={(value) =>
            setPreOrdersBuilder((prev) => ({
              ...prev,
              sortBy: value as PreOrdersBuilderState["sortBy"],
            }))
          }
          options={[
            { label: "Shipping Soon", value: "shipping-soon" },
            { label: "Newest", value: "newest" },
            { label: "Price (Low to High)", value: "price-asc" },
            { label: "Price (High to Low)", value: "price-desc" },
          ]}
        />

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
            { label: "Automatic by filters", value: "automatic" },
            { label: "Manual resource IDs", value: "manual" },
          ]}
        />

        {renderCategorySelector(preOrdersBuilder.selectedCategoryIds, (categoryId, checked) => {
          setPreOrdersBuilder((prev) => ({
            ...prev,
            selectedCategoryIds: toggleCategorySelection(prev.selectedCategoryIds, categoryId, checked),
          }));
        })}

        {preOrdersBuilder.resourceMode === "manual" ? (
          <Textarea
            label="Manual pre-order resource IDs (comma-separated)"
            value={preOrdersBuilder.manualResourceIds}
            onChange={(event) =>
              setPreOrdersBuilder((prev) => ({
                ...prev,
                manualResourceIds: event.target.value,
              }))
            }
            rows={3}
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
          label="Scroll interval (ms)"
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
      <Div className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-slate-700">
        <Text className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
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
          label="Sort"
          value={storesBuilder.sortBy}
          onValueChange={(value) =>
            setStoresBuilder((prev) => ({
              ...prev,
              sortBy: value as StoresBuilderState["sortBy"],
            }))
          }
          options={[
            { label: "Rating (High to Low)", value: "rating-desc" },
            { label: "Newest", value: "newest" },
            { label: "Popular", value: "popular" },
          ]}
        />

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
            { label: "Automatic by filters", value: "automatic" },
            { label: "Manual resource IDs", value: "manual" },
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
          label="Scroll interval (ms)"
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
      <Div className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-slate-700">
        <Text className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
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
          label="Sort"
          value={eventsBuilder.sortBy}
          onValueChange={(value) =>
            setEventsBuilder((prev) => ({
              ...prev,
              sortBy: value as EventsBuilderState["sortBy"],
            }))
          }
          options={[
            { label: "Start Date", value: "start-date" },
            { label: "Newest", value: "newest" },
            { label: "Popular", value: "popular" },
          ]}
        />

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
            { label: "Automatic by filters", value: "automatic" },
            { label: "Manual resource IDs", value: "manual" },
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
          label="Scroll interval (ms)"
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

  function renderTypedBuilder(): React.ReactNode {
    if (sectionType === "products") {
      return renderProductsBuilder();
    }
    if (sectionType === "auctions") {
      return renderAuctionsBuilder();
    }
    if (sectionType === "stats") {
      return renderStatsBuilder();
    }
    if (sectionType === "pre-orders") {
      return renderPreOrdersBuilder();
    }
    if (sectionType === "stores") {
      return renderStoresBuilder();
    }
    if (sectionType === "events") {
      return renderEventsBuilder();
    }
    return null;
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
      <AdminListingScaffold
        title="Homepage Sections"
        subtitle="Manage homepage sections and their display order"
        actionLabel="Manage Sections"
        searchPlaceholder="Search sections..."
        rows={rows}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyLabel="No sections found"
        actionsSlot={
          <Button type="button" variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            Manage Sections
          </Button>
        }
      />

      <Div className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <Div className="flex items-center justify-between gap-3">
          <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Reorder Sections
          </Text>
          <Div className="flex items-center gap-2">
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
          </Div>
        </Div>

        {reorderDraft.length === 0 ? (
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">No sections to reorder.</Text>
        ) : (
          <Div className="space-y-2">
            {reorderDraft.map((item, index) => (
              <Div
                key={`reorder-${item.id}`}
                className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 rounded-md border border-zinc-200 p-2 dark:border-slate-700"
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null) {
                    moveItemToIndex(dragIndex, index);
                  }
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
              >
                <Text className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">≡</Text>
                <Text className="text-sm text-zinc-800 dark:text-zinc-200">
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
          </Div>
        )}
      </Div>

      {formMessage ? (
        <Alert variant={formMessage.includes("Failed") || formMessage.includes("must") ? "error" : "success"} title="Sections">
          {formMessage}
        </Alert>
      ) : null}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Manage Homepage Section" size="lg">
        <Form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveSection.mutate();
          }}
        >
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
