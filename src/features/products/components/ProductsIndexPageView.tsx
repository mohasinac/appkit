import React from "react";
import { productRepository } from "../../../repositories";
import { ROUTES } from "../../../constants";
import { Container, Heading, Main, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { ProductsIndexListing } from "./ProductsIndexListing";

export async function ProductsIndexPageView() {
  const result = await productRepository
    .list({
      filters: "status==published,isAuction==false",
      sorts: "-createdAt",
      page: 1,
      pageSize: 24,
    })
    .catch(() => null);

  const products = result ?? null;

  return (
    <Main>
      {/* Page header */}
      <Section className="pt-8 pb-4 border-b border-zinc-100 dark:border-slate-800">
        <Container size="xl">
          <Heading level={1} className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Products
          </Heading>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Discover amazing products and deals
          </p>
          <div className="mt-3">
            <a
              href={ROUTES.PUBLIC.AUCTIONS}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-400 hover:bg-primary/15 transition-colors"
            >
              🏷️ Looking for unique deals? Browse Auctions →
            </a>
          </div>
        </Container>
      </Section>

      {/* Listing with sticky toolbar */}
      <Container size="xl" className="px-4">
        <AdSlot id="listing-sidebar-top" className="mb-4 mt-4" />
        <ProductsIndexListing initialData={products} />
        <AdSlot id="listing-sidebar-bottom" className="mt-8" />
      </Container>
    </Main>
  );
}
