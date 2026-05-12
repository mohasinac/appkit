import Link from "next/link";
import {
  Container,
  Heading,
  Section,
  Stack,
  Text,
} from "../../../ui";
import { ROUTES } from "../../../next";
import type { FeaturedBundlesSectionConfig } from "../../homepage/schemas/firestore";
import { listFeaturedBundles } from "../../../_internal/server/features/bundles/data";
import type { GroupedListingDocument } from "../../grouped/schemas/firestore";

export interface FeaturedBundlesSectionProps {
  config: FeaturedBundlesSectionConfig;
}

function formatINR(paise: number | undefined): string {
  if (typeof paise !== "number") return "";
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

function sortBundles(
  bundles: GroupedListingDocument[],
  sortBy: FeaturedBundlesSectionConfig["sortBy"],
): GroupedListingDocument[] {
  const arr = [...bundles];
  switch (sortBy) {
    case "savings-desc":
      return arr.sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0));
    case "price-asc":
      return arr.sort((a, b) => (a.bundlePrice ?? 0) - (b.bundlePrice ?? 0));
    case "newest":
    default:
      return arr.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export async function FeaturedBundlesSection({
  config,
}: FeaturedBundlesSectionProps) {
  const title = config.title ?? "Curated Bundles";
  const subtitle = config.subtitle ?? "Everything you need in one deal";
  const showSavingsBadge = config.showSavingsBadge ?? true;
  const maxItems = Math.max(1, Math.min(config.maxItems ?? 8, 12));

  let fetched: GroupedListingDocument[] = [];
  try {
    fetched = await listFeaturedBundles(maxItems * 2);
  } catch {
    fetched = [];
  }

  const filtered = fetched.filter((b) => {
    if (config.storeId && b.storeId !== config.storeId) return false;
    if (config.categorySlug && b.categorySlug !== config.categorySlug) return false;
    return true;
  });
  const bundles = sortBundles(filtered, config.sortBy).slice(0, maxItems);

  return (
    <Section className="py-10">
      <Container size="xl">
        <Stack gap="md">
          <Stack gap="xs">
            <Heading
              level={2}
              className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {title}
            </Heading>
            {subtitle ? (
              <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                {subtitle}
              </Text>
            ) : null}
          </Stack>

          {bundles.length === 0 ? (
            <Stack
              align="center"
              gap="sm"
              className="rounded-2xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-slate-700"
            >
              <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                Bundles are coming soon — check back shortly.
              </Text>
              <Link
                href={String(ROUTES.PUBLIC.PRODUCTS)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Browse products →
              </Link>
            </Stack>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {bundles.map((b) => {
                const href = b.storeId
                  ? `${String(ROUTES.PUBLIC.STORES)}/${b.storeId}`
                  : String(ROUTES.PUBLIC.PRODUCTS);
                return (
                  <Link
                    key={b.id}
                    href={href}
                    className="group block overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                  >
                    {b.coverImage ? (
                      <div
                        className="aspect-[4/3] w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${b.coverImage})` }}
                      />
                    ) : (
                      <div className="aspect-[4/3] w-full bg-zinc-100 dark:bg-slate-800" />
                    )}
                    <div className="space-y-2 p-4">
                      <Text className="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {b.title}
                      </Text>
                      <div className="flex items-center gap-2">
                        {typeof b.bundlePrice === "number" ? (
                          <Text className="text-base font-bold text-primary">
                            {formatINR(b.bundlePrice)}
                          </Text>
                        ) : null}
                        {typeof b.originalPrice === "number" &&
                        b.originalPrice > (b.bundlePrice ?? 0) ? (
                          <Text className="text-xs text-zinc-500 line-through dark:text-zinc-400">
                            {formatINR(b.originalPrice)}
                          </Text>
                        ) : null}
                        {showSavingsBadge && typeof b.discountPercent === "number" && b.discountPercent > 0 ? (
                          <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            -{b.discountPercent}%
                          </span>
                        ) : null}
                      </div>
                      <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                        {b.productIds.length} items
                      </Text>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Stack>
      </Container>
    </Section>
  );
}
