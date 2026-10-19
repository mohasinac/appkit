"use client";

/*
 * WHY: the Subcategories row was a pill per child in an `<OverflowRow>`, which
 *      collapses to a searchable dropdown when it does not fit. A pill carries
 *      only a name and a count, so on a tree this wide every child looked the
 *      same and the row read as a wall of words.
 * WHAT: small cards in the shared `<HorizontalScroller>`, with a filter box
 *       that matches ONE LEVEL DEEPER than the cards themselves.
 *
 * EXPORTS: SubcategoryCardRow, SubcategoryCardItem
 *
 * ## 🛑 The filter matches grandchildren, and that is the point
 *
 * Searching "Dranzer" on Spinning Tops should surface *Beyblade Original* —
 * the card you must click to get there — not nothing. So each card carries its
 * own direct children's names (`childNames`) and the match runs over the card
 * name PLUS that list. One level only: the full subtree of a root is ~1,200
 * nodes, and matching all of it would surface a card because of a name six
 * levels down that the visitor will never see on the next page either.
 *
 * `childNames` is built from data the page has ALREADY fetched
 * (`getDescendants` is one array-contains query over `parentIds`), so the
 * filter costs no request — it is pure in-browser narrowing of a list that is
 * already in memory.
 *
 * ## 🛑 Why this does not reintroduce the bug `OverflowRow` was built for
 *
 * CLAUDE.md records a bare `overflow-x-auto` row as an anti-pattern, measured:
 * "4 of 12 subcategories past the right edge with no scrollbar and no arrow".
 * The discoverability problem is real and this row answers it twice over —
 * `<HorizontalScroller showArrows>` renders real scroll affordances, and the
 * filter box makes an off-screen card reachable by typing rather than by
 * scrolling to it. What is given up is the collapse-to-dropdown behaviour,
 * which was the fallback for exactly that problem.
 *
 * @tag domain:categories
 * @tag layer:feature
 * @tag pattern:none
 * @tag access:client
 * @tag sideEffects:none
 */

import React, { useMemo, useState } from "react";
import { Div, HorizontalScroller, Row, Span, Stack, Text } from "../../../ui";
import { FieldInput } from "../../../ui/forms";
import { MediaImage } from "../../media/MediaImage";
import { TextLink } from "../../../ui/components/TextLink";

export interface SubcategoryCardItem {
  id: string;
  name: string;
  href: string;
  /** Rollup listing count. Omitted when zero — a card reading "0" invites a dead click. */
  count?: number;
  /** A real picture, when the row resolved one. */
  imageUrl?: string;
  /** An emoji, when that is all the row has. Never passed to an `<img>`. */
  emoji?: string;
  /** Direct children's names — searched, never rendered. */
  childNames?: readonly string[];
  /**
   * Depth in the forest: 0 is a root, 1 its child, and so on.
   *
   * Rendered as a small "L0 / L1 / L2" marker so a row of ancestors reads as a
   * LADDER rather than as five unrelated cards. Omitted on the subcategory row
   * itself, where every card is the same depth by construction and the marker
   * would be noise repeated N times.
   */
  level?: number;
}

/**
 * The filter appears once this many NAMES are searchable — cards plus the
 * grandchildren they match on.
 *
 * 🛑 Counting cards alone was wrong, and wrong in the case that prompted this
 * row. Spinning Tops shows FIVE cards, so a `cards >= 6` rule hid the filter
 * on exactly the page the request came from — while that page actually has 26
 * searchable names (5 cards + 21 grandchildren), which is precisely where
 * typing beats scanning.
 *
 * The number of cards is not what the filter searches, so it is not what
 * should decide whether the filter exists.
 */
const FILTER_MIN_NAMES = 12;

/** Case- and whitespace-insensitive contains. */
function matches(item: SubcategoryCardItem, needle: string): boolean {
  if (item.name.toLowerCase().includes(needle)) return true;
  /*
   * 🛑 `?? []`, not a non-null assertion. A card whose children were never
   * resolved must still match on its OWN name — otherwise a transient fetch
   * failure upstream silently removes it from every search, which looks like
   * the category does not exist rather than like a degraded read.
   */
  return (item.childNames ?? []).some((n) => n.toLowerCase().includes(needle));
}

export function SubcategoryCardRow({
  items,
  label = "Subcategories",
}: {
  items: readonly SubcategoryCardItem[];
  label?: string;
}) {
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (needle ? items.filter((i) => matches(i, needle)) : items),
    [items, needle],
  );

  const searchableNames = useMemo(
    () => items.reduce((n, i) => n + 1 + (i.childNames?.length ?? 0), 0),
    [items],
  );

  if (items.length === 0) return null;

  const showFilter = searchableNames >= FILTER_MIN_NAMES;

  return (
    <Stack gap="xs">
      <Row justify="between" align="center" gap="md" wrap>
        <Text size="xs" color="muted" weight="medium">
          {label}
        </Text>
        {showFilter && (
          <Div className="w-full sm:w-64">
            <FieldInput
              name="subcategory-filter"
              type="search"
              value={query}
              onChange={setQuery}
              placeholder="Filter subcategories…"
              aria-label="Filter subcategories"
            />
          </Div>
        )}
      </Row>

      {filtered.length === 0 ? (
        /*
         * A real empty state rather than a blank strip. The row is otherwise
         * indistinguishable from "this category has no subcategories", which
         * is a different and much more alarming thing to tell someone.
         */
        <Text size="sm" color="muted">
          No subcategory matches “{query.trim()}”.
        </Text>
      ) : (
        <HorizontalScroller
          showArrows
          showScrollbar={false}
          gap={12}
          minItemWidth={150}
          items={filtered as SubcategoryCardItem[]}
          keyExtractor={(item) => item.id}
          renderItem={(item) => (
            <TextLink
              href={item.href}
              className="group block h-full no-underline"
              aria-label={
                item.count !== undefined
                  ? `${item.name}, ${item.count} listings`
                  : item.name
              }
            >
              <Stack
                gap="xs"
                surface="card"
                rounded="lg"
                border="subtle"
                padding="sm"
                className="h-full transition-colors hover:bg-surface-hover"
              >
                <Div
                  surface="muted"
                  rounded="md"
                  className={`relative aspect-square w-full overflow-hidden flex-shrink-0`}
                >
                  {item.imageUrl ? (
                    <MediaImage
                      src={item.imageUrl}
                      alt=""
                      size="thumbnail"
                      className="transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    /*
                     * The emoji is the FALLBACK, never an overlay — same rule
                     * as `CategoryCard` and `resolveTaxonomyVisual`: an emoji
                     * is what you show when there is no picture, not something
                     * you paint on top of one.
                     */
                    <Row align="center" justify="center" textSize="2xl" className="absolute inset-0">
                      {item.emoji ?? ""}
                    </Row>
                  )}
                </Div>

                {item.level !== undefined && (
                  <Span size="xs" color="muted" weight="medium">
                    {item.level === 0 ? "L0 · root" : `L${item.level}`}
                  </Span>
                )}

                <Text size="xs" weight="medium" className="line-clamp-2">
                  {item.name}
                </Text>

                {item.count !== undefined && (
                  <Span size="xs" color="muted">
                    {item.count.toLocaleString()}
                  </Span>
                )}
              </Stack>
            </TextLink>
          )}
        />
      )}
    </Stack>
  );
}
