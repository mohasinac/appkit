"use client";
import type { ReactNode } from "react";
import { Gavel } from "lucide-react";
import type { WishlistToggleActions } from "../../wishlist";
import { Div, Row, Span, Stack, Text } from "../../../ui";
import {
  MarketplaceAuctionCard,
  type MarketplaceAuctionCardData,
  type MarketplaceAuctionCardLabels,
} from "./MarketplaceAuctionCard";

const __P = {
  p3: "p-3",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

export interface MarketplaceAuctionGridLabels {
  emptyTitle?: string;
  emptyDescription?: string;
}

export interface MarketplaceAuctionGridProps {
  auctions: MarketplaceAuctionCardData[];
  loading?: boolean;
  skeletonCount?: number;
  variant?: "grid" | "card" | "fluid" | "list";
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  gridClassName?: string;
  emptyIcon?: ReactNode;
  labels?: MarketplaceAuctionGridLabels;
  cardLabels?: MarketplaceAuctionCardLabels;
  wishlistActions?: WishlistToggleActions;
}

const CLS_SKELETON_BTN = "h-8 w-20 rounded bg-zinc-300";

const DEFAULT_GRID_LABELS: Required<MarketplaceAuctionGridLabels> = {
  emptyTitle: "No auctions found",
  emptyDescription: "Check back later for live listings.",
};

function AuctionCardSkeleton({
  variant = "grid",
}: {
  variant?: "grid" | "card" | "fluid" | "list";
}) {
  if (variant === "list") {
    return (
      <Row className={`min-h-[220px] ${__O.hidden} animate-pulse`} rounded="xl" surface="subtle">
        <Div className="aspect-square w-40 flex-shrink-0 bg-zinc-300" />
        <Stack className={`flex-1 ${__P.p3}`} gap="sm">
          <Div className="h-4 w-2/3 bg-zinc-300" rounded="default" />
          <Div className="h-3 w-full bg-zinc-300" rounded="default" />
          <Div className="h-3 w-3/4 bg-zinc-300" rounded="default" />
          <Div className="h-5 w-1/2 bg-zinc-300" rounded="default" />
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
      <Div className="aspect-square bg-zinc-300" />
      <Stack className={`${__P.p3}`} gap="sm">
        <Div className="h-4 w-3/4 bg-zinc-300" rounded="default" />
        <Div className="h-3 w-1/3 bg-zinc-300" rounded="default" />
        <Div className="h-5 w-1/2 bg-zinc-300" rounded="default" />
        <Row justify="between">
          <Div className="h-3 w-1/4 bg-zinc-300" rounded="default" />
          <Div className="h-3 w-1/3 bg-zinc-300" rounded="default" />
        </Row>
        <Row gap="sm">
          <Div className={CLS_SKELETON_BTN} />
        </Row>
      </Stack>
    </Div>
  );
}

export function MarketplaceAuctionGrid({
  auctions,
  loading = false,
  skeletonCount = 12,
  variant = "grid",
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  gridClassName,
  emptyIcon,
  labels,
  cardLabels,
  wishlistActions,
}: MarketplaceAuctionGridProps) {
  const mergedLabels = { ...DEFAULT_GRID_LABELS, ...labels };

  const handleSelect = (id: string, selected: boolean) => {
    if (!onSelectionChange) return;
    if (selected) {
      onSelectionChange([...selectedIds, id]);
      return;
    }
    onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
  };

  const containerClass =
    variant === "list"
      ? "flex flex-col gap-4"
      : `${gridClassName ?? "grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4"}`;

  if (loading) {
    return (
      <Div className={containerClass}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <AuctionCardSkeleton
            key={`auction-skeleton-${index}`}
            variant={variant}
          />
        ))}
      </Div>
    );
  }

  if (auctions.length === 0) {
    return (
      <Stack padding="y-6xl" 
        align="center"
        gap="3"
        className="justify-center text-center"
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
    <Div className={containerClass}>
      {auctions.map((auction) => (
        <MarketplaceAuctionCard
          key={auction.id}
          product={auction}
          variant={variant}
          selectable={selectable}
          isSelected={selectedIds.includes(auction.id)}
          onSelect={handleSelect}
          labels={cardLabels}
          wishlistActions={wishlistActions}
        />
      ))}
    </Div>
  );
}
