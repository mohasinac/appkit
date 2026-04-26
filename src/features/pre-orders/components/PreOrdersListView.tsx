import { productRepository } from "../../../repositories";
import { Container, Main, Heading, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { PreOrdersIndexListing } from "./PreOrdersIndexListing";

export async function PreOrdersListView() {
  const result = await productRepository
    .list({
      filters: "status==published,isPreOrder==true",
      sorts: "-createdAt",
      page: 1,
      pageSize: 24,
    })
    .catch(() => null);

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Heading level={1} className="mb-8 text-3xl font-semibold text-zinc-900">
            Pre-Orders
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <PreOrdersIndexListing initialData={result ?? undefined} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
