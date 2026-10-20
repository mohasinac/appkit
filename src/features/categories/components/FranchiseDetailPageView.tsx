import { listPublicProducts } from "../../../_internal/server/features/products/list-public";
import { toProductItem } from "../../../_internal/shared/features/products/to-product-item";
import { safeRead } from "../../../errors/safe-read";
import { hidePublicTestData } from "../../../_internal/server/features/tester/visibility";
import { Container, Row, Stack } from "../../../ui/components/Layout";
import { Main, Section } from "../../../ui/components/Semantic";
import { Heading, Text } from "../../../ui/components/Typography";
import { MediaImage } from "../../media/MediaImage";
import { ProductGrid } from "../../products/components/ProductGrid";
import { Alert } from "../../../ui/components/Alert";
import type { CategoryDocument } from "../schemas";
import { RecordOwnerQuickActions } from "../../admin/components/RecordOwnerQuickActions";

/**
 * A FRANCHISE page — every listing from one IP.
 *
 * 🛑 Products are matched on `franchiseSlug`, NOT on the display name. That is
 * the one place this deliberately diverges from `BrandDetailPageView`, which
 * filters `sieveFilter("brand", EQ, brandName)` and therefore orphans a brand's
 * entire catalogue the moment anyone renames it (`_helpers/brand-rows.ts`,
 * trap 1). Franchise is new, so it starts with the stable key.
 *
 * 🛑 An INACTIVE franchise still renders. Seven of the eight seeded rows have
 * no stock and are inactive precisely so they stay out of the grid — but their
 * pages must resolve, because `CharacterHotspot` ships eighteen `/franchise/*`
 * links that were 404ing. An inactive row renders an honest "nothing listed
 * yet" rather than a dead end or a lie.
 *
 * @tag domain:categories
 * @tag layer:view
 * @tag access:server-only
 */
export interface FranchiseDetailPageViewProps {
  slug: string;
  franchise: CategoryDocument;
}

const PAGE_SIZE = 24;

export async function FranchiseDetailPageView({
  slug,
  franchise,
}: FranchiseDetailPageViewProps) {
  const result = await safeRead(
    () =>
      listPublicProducts({
        franchiseSlug: slug,
        page: 1,
        pageSize: PAGE_SIZE,
      }),
    { route: "/franchise/[slug]", key: "franchise.products", fallback: null },
  );

  /*
   * Every scalar read off `result` happens HERE, before the narrowing below —
   * `audit-projection-shadow` is right that reading the raw result after
   * taking a projection of it is the shape that lets a repository document
   * leak onward (Root Cause #70). These three are the only things the view
   * needs from it.
   */
  const readFailed = result === null;
  const truncated = result?.truncated === true;
  const reportedTotal = result?.total;

  /*
   * `hidePublicTestData` widens to its own `TestDataFlagged` shape, which has
   * no index signature and so does not satisfy `toProductItem`'s
   * `FirestoreDocument` parameter. The cast is at the adapter boundary and
   * restores the type the repository actually returned — not a claim about
   * unknown data.
   */
  const rows = hidePublicTestData(result?.items ?? []) as Parameters<typeof toProductItem>[0][];
  const products = rows.map((r) => toProductItem(r));
  const total = reportedTotal ?? products.length;
  const cover = franchise.display?.coverImage;

  return (
    <Main>
      <Section padding="y-2xl">
        <Container size="xl">
          <Row align="center" gap="comfortable" className="mb-8">
            {cover ? (
              <MediaImage
                src={cover}
                alt={franchise.name ?? slug}
                size="thumbnail"
                rounded="lg"
              />
            ) : null}
            <Stack gap="dense">
              <Row gap="sm" align="center" justify="between" wrap>
                <Heading level={1} color="primary" size="3xl" weight="semibold">
                  {franchise.name}
                </Heading>
                {/*
                  A franchise row IS a category (`categoryType: "franchise"`),
                  so it edits through the category editor and the FRANCHISE
                  mapping reuses the CATEGORY leaves rather than duplicating
                  copy that would drift.

                  Admin-only in practice: a category has no `ownerId`, so the
                  owner branch can never match — the component admits admins on
                  its own term. No clone, for the same reason categories have
                  none: parentIds / ancestors / tier / path / position are all
                  derived by buildCategoryTree, so a copy carries stale state.
                */}
                {franchise.id ? (
                  <RecordOwnerQuickActions
                    resource="FRANCHISE"
                    recordId={franchise.id}
                    placement="detail"
                    recordLabel={franchise.name ?? slug}
                  />
                ) : null}
              </Row>
              {franchise.description ? (
                <Text color="muted" className="max-w-2xl">
                  {franchise.description}
                </Text>
              ) : null}
            </Stack>
          </Row>

          {/*
            An inactive franchise is one we have not stocked yet, and saying so
            is better than an unexplained empty grid — the visitor arrived from
            a real link and deserves to know it is coming, not that something
            broke.
          */}
          {franchise.isActive === false ? (
            <Alert variant="info" className="mb-6">
              We are not stocking {franchise.name} yet. This page is here so the
              link works — check back, or browse what we do carry.
            </Alert>
          ) : null}

          {/* 🛑 `readFailed` is a READ FAILURE, not an empty catalogue.
              `safeRead` already recorded it; saying "no products" here would
              turn an outage into a confident, wrong statement about stock. */}
          {readFailed ? (
            <Alert variant="warning">
              We could not load {franchise.name} listings just now. Please try again.
            </Alert>
          ) : (
            <>
              <Text color="muted" className="mb-4">
                {total === 0
                  ? "No listings yet."
                  : `${total}${truncated ? "+" : ""} listing${total === 1 ? "" : "s"}`}
              </Text>
              <ProductGrid products={products} emptyLabel="No listings yet." />
            </>
          )}
        </Container>
      </Section>
    </Main>
  );
}
