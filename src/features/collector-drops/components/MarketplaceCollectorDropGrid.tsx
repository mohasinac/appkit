"use client";
import type { ReactNode } from "react";
import { Gavel } from "lucide-react";
import type { WishlistToggleActions } from "../../wishlist/hooks/useWishlistToggle";
import { Div } from "../../../ui/components/Div";
import { Grid, Row, Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import {
  MarketplaceCollectorDropCard,
  type MarketplaceCollectorDropCardData,
  type MarketplaceCollectorDropCardLabels,
} from "./MarketplaceCollectorDropCard";

const __P = {
  p3: "p-[var(--appkit-space-3)]",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

export interface MarketplaceCollectorDropGridLabels {
  emptyTitle?: string;
  emptyDescription?: string;
}

export interface MarketplaceCollectorDropGridProps {
  collectorDrops: MarketplaceCollectorDropCardData[];
  loading?: boolean;
  skeletonCount?: number;
  variant?: "grid" | "card" | "fluid" | "list";
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  emptyIcon?: ReactNode;
  labels?: MarketplaceCollectorDropGridLabels;
  cardLabels?: MarketplaceCollectorDropCardLabels;
  wishlistActions?: WishlistToggleActions;
}

const CLS_SKELETON_BTN = "h-8 w-20 rounded bg-zinc-300";

const DEFAULT_GRID_LABELS: Required<MarketplaceCollectorDropGridLabels> = {
  emptyTitle: "No collector drops found",
  emptyDescription: "Check back later for live listings.",
};

function CollectorDropCardSkeleton({
  variant = "grid",
}: {
  variant?: "grid" | "card" | "fluid" | "list";
}) {
  if (variant === "list") {
    return (
      <Row className={`min-h-[220px] ${__O.hidden} animate-pulse`} rounded="xl" surface="subtle">
        <Div surface="skeleton" className="aspect-square w-40 flex-shrink-0" />
        <Stack className={`flex-1 ${__P.p3}`} gap="sm">
          <Div surface="skeleton" className="h-4 w-2/3" rounded="default" />
          <Div surface="skeleton" className="h-3 w-full" rounded="default" />
          <Div surface="skeleton" className="h-3 w-3/4" rounded="default" />
          <Div surface="skeleton" className="h-5 w-1/2" rounded="default" />
          <Row gap="sm">
            <Div className={CLS_SKELETON_BTN} />
            <Div className={CLS_SKELETON_BTN} />
          </Row>
        </Stack>
      </Row>
    );
  }

  return (
    <Div className={`${__O.hidden} animate-pulse`} rounded="xl" surface="subtle">
      <Div surface="skeleton" className="aspect-square" />
      <Stack className={`${__P.p3}`} gap="sm">
        <Div surface="skeleton" className="h-4 w-3/4" rounded="default" />
        <Div surface="skeleton" className="h-3 w-1/3" rounded="default" />
        <Div surface="skeleton" className="h-5 w-1/2" rounded="default" />
        <Row justify="between">
          <Div surface="skeleton" className="h-3 w-1/4" rounded="default" />
          <Div surface="skeleton" className="h-3 w-1/3" rounded="default" />
        </Row>
        <Row gap="sm">
          <Div className={CLS_SKELETON_BTN} />
        </Row>
      </Stack>
    </Div>
  );
}

export function MarketplaceCollectorDropGrid({
  collectorDrops,
  loading = false,
  skeletonCount = 12,
  variant = "grid",
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  emptyIcon,
  labels,
  cardLabels,
  wishlistActions,
}: MarketplaceCollectorDropGridProps) {
  const mergedLabels = { ...DEFAULT_GRID_LABELS, ...labels };

  const handleSelect = (id: string, selected: boolean) => {
    if (!onSelectionChange) return;
    if (selected) {
      onSelectionChange([...selectedIds, id]);
      return;
    }
    onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
  };

  /* The container is either the canonical card ladder or a plain stack — the
     caller no longer supplies a grid className, so a store's collector drops tab and
     /collector-drops can no longer drift apart in column count. */
  const Container = ({ children }: { children: ReactNode }) =>
    variant === "list" ? (
      <Stack gap="md">{children}</Stack>
    ) : (
      <Grid cols="cards" gap="lg">{children}</Grid>
    );

  if (loading) {
    return (
      <Container>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <CollectorDropCardSkeleton
            key={`collectordrop-skeleton-${index}`}
            variant={variant}
          />
        ))}
      </Container>
    );
  }

  if (collectorDrops.length === 0) {
    return (
      <Stack justify="center" padding="y-6xl"
        align="start"
        gap="3"
        className="text-left"
      >
        {emptyIcon ?? <Gavel className="h-16 w-16" />}
        <Text size="xl" weight="medium" color="primary">
          {mergedLabels.emptyTitle}
        </Text>
        <Text size="sm" color="muted">
          {mergedLabels.emptyDescription}
        </Text>
      </Stack>
    );
  }

  return (
    <Container>
      {collectorDrops.map((collectorDrop) => (
        <MarketplaceCollectorDropCard
          key={collectorDrop.id}
          product={collectorDrop}
          variant={variant}
          selectable={selectable}
          isSelected={selectedIds.includes(collectorDrop.id)}
          onSelect={handleSelect}
          labels={cardLabels}
          wishlistActions={wishlistActions}
        />
      ))}
    </Container>
  );
}
