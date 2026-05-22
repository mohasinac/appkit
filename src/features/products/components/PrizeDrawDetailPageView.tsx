import Link from "next/link";
import { orderRepository, productRepository } from "../../../repositories";
import { ROUTES } from "../../../next";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import { safeDisplayName } from "../../../security";
import {
  Container,
  Div,
  Heading,
  Main,
  RichText,
  Row,
  Section,
  Span,
  Stack,
  Text,
} from "../../../ui";
import { PreOrderDetailView } from "./PreOrderDetailView";
import { PrizeDrawBottomActions } from "./PrizeDrawBottomActions";
import { ProductTabsShell } from "./ProductTabsShell";
import { ShareButton } from "./ShareButton";
import { PrizeDrawCollage } from "./PrizeDrawCollage";
import { PrizeDrawEntryActions } from "./PrizeDrawEntryActions";
import type {
  PrizeDrawItem,
  ProductDocument,
} from "../schemas/firestore";
import { HistoryTracker } from "../../history/components/HistoryTracker";

export interface PrizeDrawDetailPageViewProps {
  id: string;
  /**
   * Pre-fetched product document from the page's server data layer.
   * When provided, the internal repository call is skipped — deduplicating
   * the fetch with generateMetadata() via React.cache().
   */
  initialPrizeDraw?: ProductDocument | null;
  /**
   * Authenticated buyer's uid. When set, the view server-fetches the
   * buyer's existing-entry count for this draw and renders the SB6-D
   * personalised "You have X/Y entries used" badge.
   */
  currentUserId?: string;
}

function toDescriptionHtml(raw: unknown): string {
  if (!raw) return "";
  const s = typeof raw === "string" ? raw : JSON.stringify(raw);
  return normalizeRichTextHtml(s);
}

function statusLabel(s: "pending" | "open" | "closed" | undefined): string {
  switch (s) {
    case "open":
      return "Reveal open";
    case "closed":
      return "Draw closed";
    case "pending":
    default:
      return "Reveal pending";
  }
}

function statusClass(s: "pending" | "open" | "closed" | undefined): string {
  switch (s) {
    case "open":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "closed":
      return "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200";
    case "pending":
    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  }
}

function stripIsWon(items: PrizeDrawItem[] | undefined): PrizeDrawItem[] {
  if (!items) return [];
  return items.map((it) => ({ ...it, isWon: false }));
}

/**
 * Public prize-draw detail page (SB4-G).
 *
 * Server-fetches the prize-draw product, strips `isWon` from each item before
 * passing it to `PrizeDrawCollage` so public buyers stay unspoiled, and
 * delegates the buy-bar to the client `PrizeDrawEntryActions` which surfaces
 * the `NonRefundableConsentModal` before any add-to-cart happens.
 *
 * Reuses the `PreOrderDetailView` (grid-2) shell for layout parity.
 */
export async function PrizeDrawDetailPageView({
  id,
  initialPrizeDraw,
  currentUserId,
}: PrizeDrawDetailPageViewProps) {
  const product =
    initialPrizeDraw !== undefined
      ? initialPrizeDraw ?? undefined
      : await productRepository.findByIdOrSlug(id).catch(() => undefined);

  if (!product) {
    return (
      <Main>
        <Section className="py-20">
          <Container size="md">
            <Stack align="center" gap="md" className="text-center">
              <Heading
                level={1}
                className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50"
              >
                Prize Draw Not Found
              </Heading>
              <Text className="text-zinc-500 dark:text-zinc-400">
                The prize draw you are looking for may have been removed.
              </Text>
              <Link
                href={String(ROUTES.PUBLIC.PRIZE_DRAWS)}
                className="text-sm font-medium text-primary-600 hover:underline"
              >
                Browse Prize Draws
              </Link>
            </Stack>
          </Container>
        </Section>
      </Main>
    );
  }

  const p = product as unknown as Record<string, unknown>;
  const currency = (p.currency as string | undefined) || getDefaultCurrency();
  const title = String(p.title ?? p.name ?? "Prize Draw");
  const slug = typeof p.slug === "string" ? p.slug : String(p.id ?? "");

  const items = stripIsWon(p.prizeDrawItems as PrizeDrawItem[] | undefined);
  const pricePerEntry =
    typeof p.pricePerEntry === "number"
      ? p.pricePerEntry
      : typeof p.price === "number"
        ? p.price
        : 0;
  const max =
    typeof p.prizeMaxEntries === "number" ? p.prizeMaxEntries : 0;
  const current =
    typeof p.prizeCurrentEntries === "number" ? p.prizeCurrentEntries : 0;
  const remaining = Math.max(0, max - current);
  const revealStatus =
    typeof p.prizeRevealStatus === "string"
      ? (p.prizeRevealStatus as "pending" | "open" | "closed")
      : undefined;
  const revealStart = p.prizeRevealWindowStart
    ? new Date(p.prizeRevealWindowStart as string)
    : null;
  const revealEnd = p.prizeRevealWindowEnd
    ? new Date(p.prizeRevealWindowEnd as string)
    : null;
  const githubUrl =
    typeof p.prizeGithubFileUrl === "string" ? p.prizeGithubFileUrl : undefined;
  const maxPerUser =
    typeof p.maxPerUser === "number" && p.maxPerUser > 0
      ? (p.maxPerUser as number)
      : null;

  // SB6-D post-auth — fetch this buyer's existing-entry count when we have
  // an authenticated uid. `orderRepository.countByUserAndProduct` already
  // filters by active statuses (pending/confirmed/processing/shipped/
  // delivered) so cancelled/refunded entries don't count.
  const userEntriesUsed =
    currentUserId && maxPerUser != null
      ? await orderRepository
          .countByUserAndProduct(currentUserId, String(product.id))
          .catch(() => 0)
      : null;

  const thumb = items[0]?.images?.[0];
  const storeName = typeof p.storeName === "string" ? p.storeName : null;
  const safeSeller = storeName ? safeDisplayName(storeName, "") : null;
  const storeSlug =
    (typeof p.storeSlug === "string" ? p.storeSlug : null) ||
    (typeof p.storeId === "string" ? p.storeId : null);
  const storeHref = storeSlug
    ? String(ROUTES.PUBLIC.STORE_DETAIL(storeSlug))
    : null;
  const descriptionHtml = toDescriptionHtml(p.description);

  return (
    <Main>
      <HistoryTracker
        productId={String(p.id ?? p.slug ?? "")}
        productType="product"
        snapshot={{
          title,
          thumb,
          price: pricePerEntry,
          storeId: typeof p.storeId === "string" ? p.storeId : undefined,
          storeName: storeName ?? undefined,
        }}
      />
      <Container size="xl" className="px-4 py-6">
        {/* Breadcrumb + share */}
        <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap"
          >
            <Link href={String(ROUTES.HOME)} className="hover:text-primary-600 transition-colors">
              Home
            </Link>
            <Span aria-hidden>/</Span>
            <Link
              href={String(ROUTES.PUBLIC.PRIZE_DRAWS)}
              className="hover:text-primary-600 transition-colors"
            >
              Prize Draws
            </Link>
            <Span aria-hidden>/</Span>
            <Span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[200px]">
              {title}
            </Span>
          </nav>
          <ShareButton title={title} />
        </div>

        <PreOrderDetailView
          renderGallery={() => (
            <PrizeDrawCollage items={items} hideWonState />
          )}
          renderInfo={() => (
            <Stack gap="md">
              <Div>
                <Row gap="xs" className="mb-2 flex-wrap">
                  <Span className="inline-block rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/30 px-2.5 py-0.5 text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-300">
                    Prize Draw
                  </Span>
                  <Span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(revealStatus)}`}
                  >
                    {statusLabel(revealStatus)}
                  </Span>
                  {maxPerUser !== null && (
                    <Span className="inline-block rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Limit: {maxPerUser} entries per customer
                    </Span>
                  )}
                  {maxPerUser !== null && userEntriesUsed !== null && (
                    <Span className="inline-block rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/30 px-2.5 py-0.5 text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-300">
                      You have used {userEntriesUsed}/{maxPerUser}
                    </Span>
                  )}
                </Row>
                <Heading
                  level={1}
                  className="text-xl font-bold leading-snug text-zinc-900 dark:text-zinc-50 sm:text-2xl"
                >
                  {title}
                </Heading>
              </Div>

              <Div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-4">
                <Stack gap="sm">
                  <Row justify="between" align="center">
                    <Text className="text-sm text-[var(--appkit-color-text-muted)]">
                      Entries
                    </Text>
                    <Text className="text-sm font-semibold">
                      {current} / {max} ({remaining} left)
                    </Text>
                  </Row>
                  {revealStart && (
                    <Row justify="between" align="center">
                      <Text className="text-sm text-[var(--appkit-color-text-muted)]">
                        Reveal window opens
                      </Text>
                      <Text className="text-sm font-medium">
                        {revealStart.toLocaleString()}
                      </Text>
                    </Row>
                  )}
                  {revealEnd && (
                    <Row justify="between" align="center">
                      <Text className="text-sm text-[var(--appkit-color-text-muted)]">
                        Reveal window closes
                      </Text>
                      <Text className="text-sm font-medium">
                        {revealEnd.toLocaleString()}
                      </Text>
                    </Row>
                  )}
                </Stack>
              </Div>

              {descriptionHtml && (
                <RichText
                  html={descriptionHtml}
                  proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
                  className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-4"
                />
              )}

              {safeSeller && (
                <Div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-3">
                  <Row justify="between" align="center">
                    <Div>
                      <Text className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-400 mb-0.5">
                        Sold by
                      </Text>
                      <Text className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        {safeSeller}
                      </Text>
                    </Div>
                    {storeHref && (
                      <Link
                        href={storeHref}
                        className="shrink-0 rounded-lg bg-primary/10 dark:bg-primary/20 px-3 py-1.5 text-xs font-semibold text-primary-700 dark:text-primary-300 hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                      >
                        Visit Store →
                      </Link>
                    )}
                  </Row>
                </Div>
              )}
            </Stack>
          )}
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
            />
          )}
          renderBuyBar={() => (
            <Div
              id="prize-draw-buy-bar"
              className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-5"
            >
              <PrizeDrawEntryActions
                productId={String(product.id)}
                productSlug={slug}
                title={title}
                thumb={thumb}
                pricePerEntry={pricePerEntry}
                currency={currency}
                remainingEntries={remaining}
                revealStatus={revealStatus}
                prizeGithubFileUrl={githubUrl}
                storeId={typeof p.storeId === "string" ? p.storeId : undefined}
                storeName={storeName ?? undefined}
              />
            </Div>
          )}
        />

        {/* Mobile actions registered via useBottomActions() */}
        <PrizeDrawBottomActions
          pricePerEntry={pricePerEntry}
          currency={currency}
          closed={revealStatus === "closed" || remaining === 0}
        />
      </Container>
    </Main>
  );
}
