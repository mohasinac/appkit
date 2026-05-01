import React from "react";
import { blogRepository } from "../../../repositories";
import { Container, Heading, Main, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { BlogIndexListing } from "./BlogIndexListing";

export async function BlogIndexPageView() {
  const result = await blogRepository
    .listPublished({}, { sorts: "-publishedAt", page: 1, pageSize: 24 })
    .catch(() => null);

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Heading level={1} className="mb-8 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            Blog
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <BlogIndexListing initialData={result as any} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
