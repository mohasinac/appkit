import React from "react";
import { productRepository } from "../../../repositories";
import { ROUTES } from "../../../constants";
import { Container, Heading, Main, Section } from "../../../ui";
import { ProductGrid } from "./ProductGrid";

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
          <ProductGrid
            products={products as any[]}
            getProductHref={(p) =>
              String(ROUTES.PUBLIC.PRODUCT_DETAIL((p as any).slug || p.id))
            }
          />
        </Container>
      </Section>
    </Main>
  );
}
