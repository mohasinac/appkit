/**
 * D2 Fix 4 — the cross-resource search RESULTS page.
 *
 * Replaces a pure redirect. Before this, `/search` mapped each of 15
 * `SearchResourceType` values to a browse route and `redirect()`ed, so a buyer
 * searching "dranzer" could not see that we have a product, a category, a blog
 * post and an FAQ about it — the dropdown only chose which single listing page
 * to send them to.
 *
 * Measured on production: "burst" returns 21 hits across SIX groups
 * (listings, categories, brands, stores, articles, FAQs); "zzzznope" and "!!!"
 * return none.
 *
 * 🛑 STILL `noindex`, and that is deliberate rather than inherited. A search
 * results page is the classic crawl trap: one URL per query string, thin
 * content, and no canonical answer to index. The redirect it replaces was
 * `noindex` too, so this changes the page's usefulness to a HUMAN without
 * changing its relationship to a crawler. The `moreHref` links go to the real
 * indexable listing pages.
 *
 * 🛑 NO PRICES ANYWHERE. Prices are hidden from signed-out visitors and this
 * is the one surface where gating every row would be most of the markup.
 * A title plus a link is honest, needs no `<GatedPrice>`, and cannot leak —
 * there is nothing on the row to leak.
 */
import React from "react";
import { ROUTES } from "../../../next/routing/route-map";
import { Section, Container, Stack, Row, Div, Heading, Text, Span, TextLink } from "../../../ui";
import type { SearchEverythingResult } from "../../../_internal/server/features/search/search-everything";

export interface SearchResultsPageViewProps {
  result: SearchEverythingResult;
  /** Rendered above the groups — the consumer owns the input control. */
  renderSearchInput?: () => React.ReactNode;
  /**
   * Rendered between the input and the groups. The facet rail lives here.
   *
   * A SLOT rather than a `facets` prop, because this component is also
   * rendered from a Server Component with no facets at all (the kill-switch
   * fallback), and a required-looking prop that is absent half the time
   * invites a `?? []` that silently renders an empty rail.
   */
  renderAboveGroups?: () => React.ReactNode;
  /**
   * A short line under the heading — "results as of 10:51". Optional because
   * the server tier has no build time to report.
   */
  footnote?: string;
}

export function SearchResultsPageView({
  result,
  renderSearchInput,
  renderAboveGroups,
  footnote,
}: SearchResultsPageViewProps) {
  const { q, terms, groups, totalHits } = result;
  const hasQuery = q.trim().length > 0;

  /*
   * 🛑 THREE states, not two, and the middle one is the honest part.
   *
   *   no query          — prompt, no claim about results
   *   query, 0 terms    — the query normalised away ("!!!", "—"). Saying
   *                       "no results for !!!" implies we looked; we could
   *                       not. A2's bug was the inverse of this: a
   *                       punctuation-only query returned the ENTIRE
   *                       published catalogue as search results.
   *   query, 0 hits     — genuinely nothing matched
   */
  const normalisedAway = hasQuery && terms.length === 0;

  return (
    <Section padding="page">
      <Container>
        <Stack gap="loose">
          <Stack gap="xs">
            <Heading level={1}>
              {hasQuery ? `Search: ${q}` : "Search"}
            </Heading>
            {hasQuery && !normalisedAway && (
              <Text color="muted" size="sm">
                {totalHits === 0
                  ? "Nothing matched."
                  : `${totalHits}${groups.some((g) => g.truncated) ? "+" : ""} result${totalHits === 1 ? "" : "s"} across ${groups.length} section${groups.length === 1 ? "" : "s"}.`}
              </Text>
            )}
          </Stack>

          {footnote && (
            <Text size="xs" color="muted">
              {footnote}
            </Text>
          )}

          {renderSearchInput?.()}

          {renderAboveGroups?.()}

          {!hasQuery && (
            <Text color="muted">
              Search listings, categories, brands, stores, articles and help
              pages at once.
            </Text>
          )}

          {normalisedAway && (
            <Text color="muted">
              {/* Not "no results" — we could not form a search term at all. */}
              That search had no searchable words in it. Try a product, part or
              category name.
            </Text>
          )}

          {groups.map((group) => (
            <Stack key={group.key} gap="sm">
              <Row justify="between" align="center" wrap gap="sm">
                <Heading level={2} size="lg">
                  {group.label}
                  {group.truncated && (
                    <Span size="sm" color="muted">
                      {" "}
                      {/* 🛑 A saturated fetch reports a FLOOR. Same honesty rule
                          as `truncated` on the listing queries — an exact total
                          from a capped window is a confident wrong number. */}
                      ({group.hits.length}+)
                    </Span>
                  )}
                </Heading>
                <TextLink href={group.moreHref}>See all {group.label.toLowerCase()} →</TextLink>
              </Row>
              <Stack gap="xs">
                {group.hits.map((hit) => (
                  <Div key={`${group.key}-${hit.id}`} surface="card" padding="sm" rounded="md">
                    <TextLink href={hit.href}>{hit.title}</TextLink>
                    {hit.detail && (
                      <Text size="xs" color="muted">
                        {hit.detail}
                      </Text>
                    )}
                  </Div>
                ))}
              </Stack>
            </Stack>
          ))}

          {hasQuery && !normalisedAway && totalHits === 0 && (
            <Stack gap="xs">
              <Text color="muted">
                No listings, categories, brands, stores, articles or help pages
                matched “{q}”.
              </Text>
              <TextLink href={ROUTES.PUBLIC.PRODUCTS}>Browse all listings →</TextLink>
            </Stack>
          )}
        </Stack>
      </Container>
    </Section>
  );
}
