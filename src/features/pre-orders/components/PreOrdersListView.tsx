import { productRepository } from "../../../repositories";
import { ROUTES } from "../../../next";
import { Container, Heading, Main, Section, Grid, Text, Stack } from "../../../ui";
import { ShoppingBag } from "lucide-react";
import { MarketplacePreorderCard } from "./MarketplacePreorderCard";

export async function PreOrdersListView() {
  const result = await productRepository
    .list({
      filters: "status==published,isPreOrder==true",
      sorts: "-createdAt",
      page: 1,
      pageSize: 24,
    })
    .catch(() => null);

  const items = result?.items ?? [];

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Heading level={1} className="mb-8 text-3xl font-semibold text-zinc-900">
            Pre-Orders
          </Heading>
          {items.length === 0 ? (
            <Stack align="center" gap="3" className="justify-center py-24 text-center">
              <ShoppingBag className="h-16 w-16 text-zinc-300" />
              <Text className="text-xl font-medium text-zinc-900">No pre-orders available</Text>
              <Text className="text-sm text-zinc-500">Check back soon for upcoming releases.</Text>
            </Stack>
          ) : (
            <Grid cols={4} gap="md">
              {items.map((item: any) => (
                <MarketplacePreorderCard
                  key={item.id}
                  product={item}
                  hrefBuilder={(p) => String(ROUTES.PUBLIC.PRE_ORDER_DETAIL(p.id))}
                />
              ))}
            </Grid>
          )}
        </Container>
      </Section>
    </Main>
  );
}
