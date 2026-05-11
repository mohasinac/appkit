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

export interface FeaturedBundlesSectionProps {
  config: FeaturedBundlesSectionConfig;
}

/**
 * Renders a curated-bundles strip on the homepage.
 *
 * Backed by the `bundles` collection (SB11 tier — schema + data layer land later
 * in the bundle/prize-draw block). Until then the component renders an empty
 * state so the section can be enabled by an admin the moment the data exists.
 * The section is shipped disabled in seed; only the type union is needed now.
 */
export async function FeaturedBundlesSection({
  config,
}: FeaturedBundlesSectionProps) {
  const title = config.title ?? "Curated Bundles";
  const subtitle = config.subtitle ?? "Everything you need in one deal";

  const bundles: never[] = [];

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
          ) : null}
        </Stack>
      </Container>
    </Section>
  );
}
