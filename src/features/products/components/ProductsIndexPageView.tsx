import React from "react";
import { productRepository } from "../../../repositories";
import { ROUTES } from "../../../constants";
import { Container, Heading, Main, Section } from "../../../ui";
import { ProductGrid } from "./ProductGrid";
import { AdSlot } from "../../homepage/components/AdSlot";

export async function ProductsIndexPageView() {
  const result = await productRepository
    .list({
      filters: "status==published,isAuction==false",
      sorts: "-createdAt",
      page: 1,
      pageSize: 24,
    })
    .catch(() => null);

  const products = result?.items ?? [];

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Heading level={1} className="mb-8 text-3xl font-semibold text-zinc-900">
            Products
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <ProductGrid
            products={products as any[]}
            getProductHref={(p) =>
              String(ROUTES.PUBLIC.PRODUCT_DETAIL((p as any).slug || p.id))
            }
          />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
