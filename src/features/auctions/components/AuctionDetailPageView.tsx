import React from "react";
import Link from "next/link";
import { productRepository } from "../../../repositories";
import { listBidsByProduct } from "../../auctions/actions/bid-actions";
import { ROUTES } from "../../../next";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import {
  Button,
  Container,
  Div,
  Heading,
  Input,
  Main,
  Row,
  Section,
  Span,
  Stack,
  Text,
} from "../../../ui";
import { AuctionDetailView } from "../../products/components/AuctionDetailView";
import { BidHistory } from "../../products/components/BidHistory";
import { RelatedProducts } from "../../products/components/RelatedProducts";
import { MarketplaceAuctionGrid } from "./MarketplaceAuctionGrid";
import type { MarketplaceAuctionCardData } from "./MarketplaceAuctionCard";

export interface AuctionDetailPageViewProps {
  id: string;
}

export async function AuctionDetailPageView({ id }: AuctionDetailPageViewProps) {
  const [product, bidsResult] = await Promise.all([
    productRepository.findByIdOrSlug(id).catch(() => undefined),
    listBidsByProduct(id, { pageSize: 20 }).catch(() => null),
  ]);

  const relatedDocs: Record<string, any>[] = product
    ? await productRepository
        .findByCategory((product as Record<string, any>).category ?? "")
        .catch(() => [])
    : [];

  if (!product) {
    return (
      <Main>
        <Section className="py-20">
          <Container size="md">
            <Stack align="center" gap="md" className="text-center">
              <Heading level={1} className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Auction Not Found
              </Heading>
              <Text className="text-zinc-500">
                This auction may have ended or the link is incorrect.
              </Text>
              <Link href={String(ROUTES.PUBLIC.AUCTIONS)} className="text-sm font-medium text-primary-600 hover:underline">
                Browse Auctions
              </Link>
            </Stack>
          </Container>
        </Section>
      </Main>
    );
  }

  const p = product as Record<string, any>;
  const currency = p.currency || getDefaultCurrency();
  const currentBid = typeof p.currentBid === "number" ? p.currentBid : p.startingBid ?? p.price ?? 0;
  const currentBidFormatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(currentBid);
  const startingBidFormatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(p.startingBid ?? p.price ?? 0);

  const images: string[] = Array.isArray(p.images) ? p.images : p.imageUrl ? [p.imageUrl] : [];
  const primaryImage = images[0];

  const endDate = p.auctionEndDate ? new Date(p.auctionEndDate) : null;
  const isEnded = endDate ? endDate < new Date() : false;
  const bidCount = typeof p.bidCount === "number" ? p.bidCount : 0;

  return (
    <AuctionDetailView
      renderGallery={() =>
        primaryImage ? (
          <Div className="overflow-hidden rounded-xl border border-zinc-100 dark:border-zinc-800">
            <Div
              role="img"
              aria-label={p.title ?? p.name ?? "Auction item"}
              className="aspect-square w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${primaryImage})` }}
            />
          </Div>
        ) : (
          <Div className="overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <Div className="flex aspect-square items-center justify-center text-zinc-300 dark:text-zinc-700">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </Div>
          </Div>
        )
      }
      renderInfo={() => (
        <Stack gap="md">
          <Heading level={1} className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {p.title ?? p.name ?? "Auction Item"}
          </Heading>
          <Row align="center" gap="sm" wrap>
            <Span className="text-2xl font-semibold text-primary-600 dark:text-primary-400">
              {currentBidFormatted}
            </Span>
            <Span className="text-sm text-zinc-500">
              {bidCount} {bidCount === 1 ? "bid" : "bids"}
            </Span>
            {isEnded && (
              <Span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                Ended
              </Span>
            )}
          </Row>
          {endDate && !isEnded && (
            <Text className="text-sm text-zinc-600 dark:text-zinc-400">
              Ends: {endDate.toLocaleString()}
            </Text>
          )}
          {p.description && (
            <Text className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {typeof p.description === "string" ? p.description : ""}
            </Text>
          )}
          {p.sellerName && (
            <Row align="center" gap="xs">
              <Span className="text-xs text-zinc-500">Listed by</Span>
              <Span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {p.sellerName}
              </Span>
            </Row>
          )}
        </Stack>
      )}
      renderBidForm={() => (
        <Div className="rounded-xl border border-zinc-100 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <Stack gap="sm">
            <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Current bid: {currentBidFormatted}
            </Text>
            <Text className="text-xs text-zinc-500">
              Starting bid: {startingBidFormatted}
            </Text>
            <Input
              type="number"
              placeholder={`Minimum bid`}
              min={currentBid + 1}
              aria-label="Your bid amount"
              disabled={isEnded}
            />
            <Button variant="primary" size="md" className="w-full" disabled={isEnded}>
              {isEnded ? "Auction Ended" : "Place Bid"}
            </Button>
          </Stack>
        </Div>
      )}
      renderMobileBidForm={() =>
        !isEnded ? (
          <Div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
            <Stack gap="sm">
              <Row align="center" gap="sm">
                <Span className="text-base font-semibold text-primary-600">{currentBidFormatted}</Span>
                <Span className="text-xs text-zinc-500">{bidCount} bids</Span>
              </Row>
              <Button variant="primary" size="md" className="w-full">
                Place Bid
              </Button>
            </Stack>
          </Div>
        ) : null
      }
      renderBidHistory={() => {
        const bids = (bidsResult?.items ?? []).map((b: any) => ({
          id: b.id,
          bidderId: b.userId ?? b.bidderId ?? "",
          bidderName: b.bidderName ?? b.userName,
          amount: b.bidAmount ?? b.amount ?? 0,
          placedAt: b.createdAt ?? b.bidAt ?? "",
        }));
        return (
          <BidHistory
            bids={bids}
            isEmpty={bids.length === 0}
            labels={{ title: "Bid History" }}
          />
        );
      }}
      renderRelated={() => {
        const related: MarketplaceAuctionCardData[] = relatedDocs
          .filter((r) => r.id !== product!.id && r.isAuction !== false)
          .slice(0, 4)
          .map((r) => ({
            id: String(r.id ?? ""),
            title: String(r.name ?? r.title ?? "Auction Item"),
            price: typeof r.price === "number" ? r.price : 0,
            currency: typeof r.currency === "string" ? r.currency : undefined,
            mainImage: Array.isArray(r.images) ? r.images[0] : typeof r.imageUrl === "string" ? r.imageUrl : undefined,
            isAuction: true,
            auctionEndDate: r.auctionEndDate,
            startingBid: typeof r.startingBid === "number" ? r.startingBid : undefined,
            currentBid: typeof r.currentBid === "number" ? r.currentBid : undefined,
            bidCount: typeof r.bidCount === "number" ? r.bidCount : undefined,
            slug: typeof r.slug === "string" ? r.slug : undefined,
          }));
        if (related.length === 0) return null;
        return (
          <RelatedProducts
            labels={{ title: "Similar Auctions" }}
            renderGrid={() => (
              <MarketplaceAuctionGrid
                auctions={related}
                gridClassName="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
              />
            )}
          />
        );
      }}
    />
  );
}
