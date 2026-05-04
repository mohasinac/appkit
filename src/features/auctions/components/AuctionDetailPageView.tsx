import React from "react";
import Link from "next/link";
import { productRepository } from "../../../repositories";
import { listBidsByProduct } from "../../auctions/actions/bid-actions";
import { ROUTES } from "../../../next";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import { formatCurrency } from "../../../utils/number.formatter";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import { safeDisplayName } from "../../../security";
import {
  Button,
  Container,
  Div,
  Heading,
  Input,
  Main,
  RichText,
  Row,
  Section,
  Span,
  Stack,
  Text,
} from "../../../ui";
import { AuctionDetailView } from "../../products/components/AuctionDetailView";
import { BidHistory } from "../../products/components/BidHistory";
import { ProductTabsShell } from "../../products/components/ProductTabsShell";
import { BuyBar } from "../../products/components/BuyBar";
import { RelatedProducts } from "../../products/components/RelatedProducts";
import { ProductGalleryClient } from "../../products/components/ProductGalleryClient";
import { ProductFeatureBadges } from "../../products/components/ProductFeatureBadges";
import { MarketplaceAuctionGrid } from "./MarketplaceAuctionGrid";
import type { MarketplaceAuctionCardData } from "./MarketplaceAuctionCard";

export interface AuctionDetailPageViewProps {
  id: string;
}

function toDescriptionHtml(raw: unknown): string {
  if (!raw) return "";
  const s = typeof raw === "string" ? raw : JSON.stringify(raw);
  return normalizeRichTextHtml(s);
}

export async function AuctionDetailPageView({ id }: AuctionDetailPageViewProps) {
  const [product, bidsResult] = await Promise.all([
    productRepository.findByIdOrSlug(id).catch(() => undefined),
    listBidsByProduct(id, { pageSize: 20 }).catch(() => null),
  ]);

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

  const p = product as unknown as Record<string, unknown>;
  const currency = (p.currency as string | undefined) || getDefaultCurrency();

  const title = String(p.title ?? p.name ?? "Auction Item");
  const currentBid =
    typeof p.currentBid === "number"
      ? p.currentBid
      : typeof p.startingBid === "number"
        ? p.startingBid
        : typeof p.price === "number"
          ? p.price
          : 0;
  const startingBid =
    typeof p.startingBid === "number"
      ? p.startingBid
      : typeof p.price === "number"
        ? p.price
        : 0;
  const minBidIncrement =
    typeof p.minBidIncrement === "number" ? p.minBidIncrement : 1;

  const images: string[] = Array.isArray(p.images)
    ? (p.images as string[])
    : typeof p.mainImage === "string"
      ? [p.mainImage]
      : [];

  const endDate = p.auctionEndDate ? new Date(p.auctionEndDate as string) : null;
  const isEnded = endDate ? endDate < new Date() : false;
  const bidCount = typeof p.bidCount === "number" ? p.bidCount : 0;
  const buyNowPrice =
    typeof p.buyNowPrice === "number" ? p.buyNowPrice : null;

  const condition = typeof p.condition === "string" ? p.condition : null;
  const featured = p.featured === true;
  const shippingPaidBy = p.shippingPaidBy as "seller" | "buyer" | undefined;
  const freeShipping = shippingPaidBy === "seller";
  const sellerName = typeof p.sellerName === "string" ? p.sellerName : null;
  const safeSeller = sellerName ? safeDisplayName(sellerName, "") : null;
  const tags: string[] = Array.isArray(p.tags) ? (p.tags as string[]) : [];
  const features: string[] = Array.isArray(p.features) ? (p.features as string[]) : [];
  const specs: { name: string; value: string; unit?: string }[] = Array.isArray(p.specifications)
    ? (p.specifications as { name: string; value: string; unit?: string }[])
    : [];
  const descriptionHtml = toDescriptionHtml(p.description);

  const relatedDocs: Record<string, unknown>[] = await productRepository
    .findByCategory(String(p.category ?? ""))
    .catch(() => []) as Record<string, unknown>[];

  return (
    <Main>
      <Container size="xl" className="px-4 py-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
          <Link href={String(ROUTES.HOME)} className="hover:text-primary-600 transition-colors">Home</Link>
          <Span aria-hidden>/</Span>
          <Link href={String(ROUTES.PUBLIC.AUCTIONS)} className="hover:text-primary-600 transition-colors">Auctions</Link>
          <Span aria-hidden>/</Span>
          <Span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[200px]">{title}</Span>
        </nav>

        <AuctionDetailView
          renderGallery={() => (
            <ProductGalleryClient images={images} productName={title} />
          )}
          renderInfo={() => (
            <Stack gap="sm">
              {/* Auction badge + title */}
              <Div>
                <Span className="mb-1.5 inline-block rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  🏷️ Live Auction
                </Span>
                <Heading level={1} className="text-xl font-bold leading-snug text-zinc-900 dark:text-zinc-50 sm:text-2xl">
                  {title}
                </Heading>
              </Div>

              {/* Current bid + bid count */}
              <Row align="center" gap="sm" wrap>
                <Div>
                  <Text className="text-xs text-zinc-500">Current bid</Text>
                  <Span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    {formatCurrency(currentBid, currency)}
                  </Span>
                </Div>
                <Span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  {bidCount} {bidCount === 1 ? "bid" : "bids"}
                </Span>
                {isEnded ? (
                  <Span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    Ended
                  </Span>
                ) : (
                  <Span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Active
                  </Span>
                )}
              </Row>

              {/* Auction timing */}
              {endDate && (
                <Row align="center" gap="xs" className="text-sm text-zinc-600 dark:text-zinc-400">
                  <Span>{isEnded ? "Ended" : "Ends"}:</Span>
                  <Span className="font-medium">{endDate.toLocaleString()}</Span>
                </Row>
              )}

              {/* Buy Now price */}
              {buyNowPrice !== null && !isEnded && (
                <Row align="center" gap="sm" className="rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 px-3 py-2">
                  <Span className="text-xs text-zinc-600 dark:text-zinc-400">Buy Now:</Span>
                  <Span className="text-base font-bold text-primary-700 dark:text-primary-300">
                    {formatCurrency(buyNowPrice, currency)}
                  </Span>
                </Row>
              )}

              {/* Feature badges */}
              <ProductFeatureBadges
                featured={featured}
                freeShipping={freeShipping}
                condition={condition ?? undefined}
                labels={{
                  featured: "Featured",
                  fasterDelivery: "Faster Delivery",
                  ratedSeller: "Rated Seller",
                  condition: "Condition",
                  conditionNew: "New",
                  conditionUsed: "Used",
                  conditionBroken: "For Parts",
                  conditionRefurbished: "Refurbished",
                  returnable: "Returnable",
                  freeShipping: "Free Shipping",
                  codAvailable: "Cash on Delivery",
                  wishlistCount: (n) => `${n} wishlisted`,
                  categoryProductCount: (n, cat) => `${n} in ${cat}`,
                }}
              />

              {/* Highlights */}
              {features.length > 0 && (
                <Div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 px-4 py-3">
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    About this item
                  </Text>
                  <ul className="space-y-1.5">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <Span className="mt-0.5 flex-shrink-0 text-primary-500">•</Span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </Div>
              )}

              {/* Description preview */}
              {descriptionHtml && (
                <RichText
                  html={descriptionHtml}
                  proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
                  className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-4"
                />
              )}

              {/* Seller */}
              {safeSeller && (
                <Row align="center" gap="xs" className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
                  <Span className="text-xs text-zinc-500">Listed by</Span>
                  <Span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{safeSeller}</Span>
                </Row>
              )}
            </Stack>
          )}
          renderBidForm={() => (
            <Div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-5 space-y-4">
              {/* Current bid summary */}
              <Div className="space-y-1">
                <Row justify="between" align="center">
                  <Text className="text-xs text-zinc-500">Current bid</Text>
                  <Text className="text-xs text-zinc-500">Starting bid</Text>
                </Row>
                <Row justify="between" align="baseline">
                  <Span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                    {formatCurrency(currentBid, currency)}
                  </Span>
                  <Span className="text-sm text-zinc-500">
                    {formatCurrency(startingBid, currency)}
                  </Span>
                </Row>
                <Text className="text-xs text-zinc-400 dark:text-zinc-500">
                  {bidCount} {bidCount === 1 ? "bid" : "bids"} · min increment {formatCurrency(minBidIncrement, currency)}
                </Text>
              </Div>

              {/* Bid input + CTA */}
              <Stack gap="sm">
                <Input
                  type="number"
                  placeholder={`At least ${formatCurrency(currentBid + minBidIncrement, currency)}`}
                  min={currentBid + minBidIncrement}
                  aria-label="Your bid amount"
                  disabled={isEnded}
                />
                <Button variant="primary" size="md" className="w-full" disabled={isEnded}>
                  {isEnded ? "Auction Ended" : "Place Bid"}
                </Button>
                {buyNowPrice !== null && !isEnded && (
                  <Button variant="secondary" size="md" className="w-full">
                    Buy Now — {formatCurrency(buyNowPrice, currency)}
                  </Button>
                )}
              </Stack>

              {/* Tags */}
              {tags.length > 0 && (
                <Div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                  <Row wrap gap="xs">
                    {tags.map((tag) => (
                      <Span key={tag} className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-300">
                        {tag}
                      </Span>
                    ))}
                  </Row>
                </Div>
              )}
            </Div>
          )}
          renderMobileBidForm={() =>
            !isEnded ? (
              <Div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-4 lg:hidden">
                <Row align="center" gap="sm" className="mb-3">
                  <Span className="text-base font-bold text-primary-600 dark:text-primary-400">
                    {formatCurrency(currentBid, currency)}
                  </Span>
                  <Span className="text-xs text-zinc-500">{bidCount} bids</Span>
                </Row>
                <Button variant="primary" size="md" className="w-full">
                  Place Bid
                </Button>
              </Div>
            ) : null
          }
          renderTabs={() => (
            <ProductTabsShell
              descriptionContent={
                descriptionHtml ? (
                  <RichText
                    html={descriptionHtml}
                    proseClass="prose prose-sm sm:prose max-w-none dark:prose-invert"
                    className="text-zinc-700 dark:text-zinc-300"
                  />
                ) : undefined
              }
              specsContent={
                specs.length > 0 ? (
                  <dl className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden text-sm">
                    {specs.map((s, i) => (
                      <div
                        key={i}
                        className="flex gap-4 px-4 py-3 bg-white dark:bg-zinc-900 even:bg-zinc-50 dark:even:bg-zinc-800/50"
                      >
                        <dt className="w-36 flex-shrink-0 font-medium text-zinc-700 dark:text-zinc-300">
                          {s.name}
                        </dt>
                        <dd className="flex-1 text-zinc-600 dark:text-zinc-400">
                          {s.value}{s.unit ? ` ${s.unit}` : ""}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : undefined
              }
            />
          )}
          renderBidHistory={() => {
            const bids = (bidsResult?.items ?? []).map((b: Record<string, unknown>) => ({
              id: String(b.id ?? ""),
              bidderId: String(b.userId ?? b.bidderId ?? ""),
              bidderName: (b.bidderName ?? b.userName) as string | undefined,
              amount: (typeof b.bidAmount === "number" ? b.bidAmount : typeof b.amount === "number" ? b.amount : 0),
              placedAt: (b.createdAt ?? b.bidAt ?? "") as string,
            }));
            return (
              <BidHistory
                bids={bids}
                isEmpty={bids.length === 0}
                currency={currency}
                labels={{ title: "Bid History" }}
              />
            );
          }}
          renderRelated={() => {
            const related: MarketplaceAuctionCardData[] = relatedDocs
              .filter((r) => r.id !== product.id && r.isAuction !== false)
              .slice(0, 4)
              .map((r) => ({
                id: String(r.id ?? ""),
                title: String(r.title ?? r.name ?? "Auction Item"),
                price: typeof r.price === "number" ? r.price : 0,
                currency: typeof r.currency === "string" ? r.currency : undefined,
                mainImage: Array.isArray(r.images)
                  ? (r.images as string[])[0]
                  : typeof r.mainImage === "string"
                    ? r.mainImage
                    : undefined,
                isAuction: true,
                auctionEndDate: r.auctionEndDate as Date | undefined,
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

        {/* Mobile sticky buy bar */}
        {!isEnded && (
          <BuyBar>
            <Span className="mr-auto text-sm font-bold text-zinc-900 dark:text-zinc-50">
              {formatCurrency(currentBid, currency)}
            </Span>
            <Span className="text-xs text-zinc-400 dark:text-zinc-500 mr-1">
              {bidCount} bid{bidCount !== 1 ? "s" : ""}
            </Span>
            <Button variant="primary" size="sm" className="shrink-0">
              Place Bid
            </Button>
          </BuyBar>
        )}
      </Container>
    </Main>
  );
}
