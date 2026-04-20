import React from "react";
import { blogRepository } from "../../../repositories";
import { Button, Container, Heading, Main, Section, Row } from "../../../ui";
import { BlogListView } from "./BlogListView";

function serializeDate(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return String(value);
}

export async function BlogIndexPageView() {
  const result = await blogRepository
    .listPublished({}, { sorts: "-publishedAt", page: 1, pageSize: 24 })
    .catch(() => null);

  const posts = (result?.items ?? []).map((post: any) => ({
    ...post,
    createdAt: serializeDate(post.createdAt),
    updatedAt: serializeDate(post.updatedAt),
    publishedAt: serializeDate(post.publishedAt),
  }));

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Row justify="between" className="mb-8">
            <Heading level={1} className="text-3xl font-semibold text-zinc-900">
              Blog
            </Heading>
            <Button type="button" variant="outline" aria-label="Filters">
              Filters
            </Button>
          </Row>
          <BlogListView posts={posts as any[]} total={result?.total ?? 0} />
        </Container>
      </Section>
    </Main>
  );
}
