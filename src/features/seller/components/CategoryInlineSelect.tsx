"use client";
import React from "react";
import { PaginatedSelect } from "../../../ui/components/PaginatedSelect";
import type { PaginatedSelectOption, AsyncPage } from "../../../ui/components/PaginatedSelect";
import { CategoryQuickCreateForm } from "../../admin/components/CategoryQuickCreateForm";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS, CATEGORY_ENDPOINTS } from "../../../constants/api-endpoints";
import { Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import { MAX_CATEGORY_ASSIGNMENTS } from "../../products/repository/category-assignment";

export interface CategoryInlineSelectProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Show the "+ Create new category" option. Defaults to true — sellers can create categories inline. */
  allowCreate?: boolean;
  /**
   * I2 — the ADDITIONAL assignments, beyond `value`.
   *
   * 🛑 Omitting this pair keeps the component exactly single-select, which is
   * what every existing call site gets. Multi-assignment is opt-in per surface
   * rather than switched on globally, because `value`/`onChange` is a `string`
   * contract that five call sites rely on and changing it under them is Root
   * Cause #20 (a public prop change without its consumers in the same commit).
   */
  extraValues?: string[];
  onExtraValuesChange?: (ids: string[]) => void;
  /**
   * How many assignments are allowed in total, `value` included. Defaults to
   * `MAX_CATEGORY_ASSIGNMENTS`, which is what the repository refuses above.
   */
  maxAssignments?: number;
  /**
   * Scope the rows to LEAVES (a single item) or to COLLECTIONS (a lot).
   *
   * 🛑 `undefined` means UNSCOPED, which is what every existing call site
   * gets — this cannot default, because a caller that does not know whether it
   * is a lot must not be silently told it is a single. See `leafFilterFor`
   * for why the server makes this load-bearing rather than cosmetic.
   */
  leavesOnly?: boolean;
}

/**
 * ── 🛑 LOT vs SINGLE SCOPES THE ROWS, AND THE SERVER ALREADY REFUSES THE
 * WRONG ONE ───────────────────────────────────────────────────────────────
 *
 * `assertAssignmentShape` has enforced both directions since 2026-10-14
 * (`ENFORCE_LEAF_FILING = true`):
 *
 *   a LOT at a LEAF     -> "A lot holds several different items, so it cannot
 *                          be filed under X, which is a single-item category."
 *   a SINGLE at a BRANCH -> "X has subcategories, so it describes a group
 *                          rather than one item."
 *
 * Until now the picker offered EVERY category to both, so roughly half of all
 * choices walked the seller into a 400 they could not act on. Scoping the rows
 * is therefore not a convenience — it is the client half of a rule the server
 * already holds.
 *
 * 🛑 `isLeaf` NEEDS NO ROUTE CHANGE. `/api/admin/categories` forwards its
 * `filters` string straight into `categoriesRepository.list`, and the public
 * `/api/categories` whitelists `isLeaf` in `SAFE_CATEGORY_FILTER_FIELDS`. So
 * this is a query-string addition, not new endpoint surface — which is also
 * why it can ship without a build to verify it.
 *
 * `undefined` means UNSCOPED, which is what every existing caller gets. A
 * caller that does not know whether it is a lot must not be silently told it
 * is a single.
 */
function leafFilterFor(leavesOnly?: boolean): string | null {
  if (leavesOnly === undefined) return null;
  return leavesOnly ? "isLeaf==true" : "isLeaf==false";
}

// Admin: paginated + server-side search via /api/admin/categories (admin/mod only).
// Response via successResponse({ data: items, total }) → apiClient unwraps to { data, total, ... }.
async function loadAdminCategoryOptions(
  query: string,
  page: number,
  leavesOnly?: boolean,
): Promise<AsyncPage<PaginatedSelectOption<string>>> {
  const leafFilter = leafFilterFor(leavesOnly);
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    pageSize: "20",
    flat: "true",
    ...(leafFilter ? { filters: leafFilter } : {}),
  });
  const res = await apiClient.get<{
    data?: { id?: string; name?: string }[];
    total?: number;
  }>(`${ADMIN_ENDPOINTS.CATEGORIES}?${params}`);
  const items = (res.data ?? []).map((c) => ({
    value: String(c.id ?? ""),
    label: String(c.name ?? ""),
  }));
  const total = res.total ?? items.length;
  return { items, hasMore: page * 20 < total, nextPage: page + 1 };
}

const PUBLIC_CATEGORY_PAGE_SIZE = 20;

/**
 * Seller: paginated + SERVER-side search via the public `/api/categories`.
 *
 * 🛑 THIS USED TO FETCH 200 ROWS AND FILTER THEM IN THE BROWSER, against a
 * catalogue of **1,185 categories**. It also returned `hasMore: false`, so
 * `PaginatedSelect` never asked for page 2 — meaning **985 categories were
 * permanently unreachable by search**, and what the box searched was whatever
 * arbitrary 200 the endpoint happened to return first. The query never left
 * the browser.
 *
 * The server was always ready: `/api/categories` reads `q` (its own comment
 * notes that pickers send only `page`/`pageSize`/`q`) and returns a `total`
 * for a paged flat request. The admin loader above has done it this way all
 * along — this is the same shape, pointed at the unauthenticated endpoint.
 *
 * 🛑 A failed response now THROWS instead of degrading to an empty list. The
 * old `.catch(() => ({}))` plus `json.data ?? []` turned any non-OK response
 * or shape change into "No results" — indistinguishable from a genuine empty
 * search, and a strong suspect for the reported symptom where typing a single
 * letter matched nothing. `PaginatedSelect` renders an error state with a
 * retry; a silent empty list is the one outcome that teaches the user their
 * category does not exist.
 */
async function loadPublicCategoryOptions(
  query: string,
  page: number,
  leavesOnly?: boolean,
): Promise<AsyncPage<PaginatedSelectOption<string>>> {
  const leafFilter = leafFilterFor(leavesOnly);
  const params = new URLSearchParams({
    q: query.trim(),
    page: String(page),
    pageSize: String(PUBLIC_CATEGORY_PAGE_SIZE),
    flat: "true",
    ...(leafFilter ? { filters: leafFilter } : {}),
  });
  const res = await fetch(CATEGORY_ENDPOINTS.FILTERED(params.toString()), {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Category lookup failed (${res.status})`);
  }
  const json: {
    success?: boolean;
    data?: { id?: string; name?: string }[];
    total?: number;
  } = await res.json();
  const items = (json.data ?? []).map((c) => ({
    value: String(c.id ?? ""),
    label: String(c.name ?? ""),
  }));
  const total = json.total ?? items.length;
  return {
    items,
    hasMore: page * PUBLIC_CATEGORY_PAGE_SIZE < total,
    nextPage: page + 1,
  };
}

export function CategoryInlineSelect({
  value,
  onChange,
  placeholder = "Search categories…",
  disabled,
  allowCreate = true,
  extraValues,
  onExtraValuesChange,
  maxAssignments = MAX_CATEGORY_ASSIGNMENTS,
  leavesOnly,
}: CategoryInlineSelectProps) {
  /*
   * 🛑 MEMOISED, because `PaginatedSelect` consumes `loadOptions` inside an
   * effect keyed on query/page. A fresh function identity every render
   * re-triggers that effect, and the existing loaders are module-scope
   * functions precisely to avoid it — binding the scope here would reintroduce
   * the loop if it were done inline.
   */
  /*
   * 🛑 SUSPECT COUPLING, left in place deliberately rather than changed on a
   * guess. `allowCreate` decides WHICH ENDPOINT is queried — and it defaults
   * to `true` with the docstring "sellers can create categories inline", so a
   * seller's picker calls `/api/admin/categories`. If that endpoint refuses a
   * non-admin, the picker's symptom is "No results", not an error.
   *
   * Permission to CREATE and permission to SEARCH are different questions, and
   * conflating them is how a lookup silently empties for one role. The public
   * endpoint now has server-side search and paging (below), so it could serve
   * both — but admins may rely on the admin endpoint to see inactive or
   * unpublished rows the public one filters out, and losing those from the
   * picker would be a worse regression than the one being fixed.
   *
   * To settle it: open the network tab and type one character. A 403 means
   * this coupling is the bug; rows returned while the box says "No results"
   * means the response shape moved; `[]` returned means the `filters` clause.
   */
  const base = allowCreate ? loadAdminCategoryOptions : loadPublicCategoryOptions;
  const loadOptions = React.useCallback(
    (query: string, page: number) => base(query, page, leavesOnly),
    [base, leavesOnly],
  );

  const primary = (
    <PaginatedSelect<string>
      value={value || null}
      onChange={(v) => onChange(v ?? "")}
      loadOptions={loadOptions}
      placeholder={placeholder}
      disabled={disabled}
      createLabel="category"
      drawerTitle="Create Category"
      renderCreateForm={
        allowCreate
          ? ({ onCreated, onCancel }) => (
              <CategoryQuickCreateForm
                onSaved={(id, name) => onCreated({ value: id, label: name })}
                onCancel={onCancel}
              />
            )
          : undefined
      }
    />
  );

  // Single-select unless the caller opted in — byte-identical to before.
  if (!onExtraValuesChange) return primary;

  const extras = extraValues ?? [];
  const remaining = Math.max(0, maxAssignments - 1 - extras.length);

  return (
    <Stack gap="sm">
      {primary}
      {/*
        * A SECOND picker rather than one multi-select, and the reason is the
        * rule the repository enforces: the FIRST assignment is not
        * interchangeable with the rest. It mirrors the scalar `category` that
        * five other call sites still send, and the derived default is chosen by
        * DEPTH rather than by pick order — so a flat multi-select would imply
        * the four slots are equivalent when they are not.
        */}
      <PaginatedSelect<string>
        multiple
        value={extras}
        onChange={(v) => onExtraValuesChange(Array.isArray(v) ? v : [])}
        loadOptions={loadOptions}
        placeholder={
          remaining > 0
            ? `Also list under… (up to ${remaining} more)`
            : "No more categories can be added"
        }
        disabled={disabled || remaining <= 0}
        /*
         * 🛑 The create affordance belongs here too, and its absence was a
         * one-line omission rather than a decision. The primary picker above
         * passes all three of these; this one passed none, so a seller could
         * create a category for their FIRST assignment and not for any other.
         *
         * Nothing about a secondary assignment makes creating one less valid
         * — and the helper text directly below actively tells the seller to
         * "add a category from a DIFFERENT tree", which is precisely when the
         * one they want is least likely to exist yet.
         */
        createLabel="category"
        drawerTitle="Create Category"
        renderCreateForm={
          allowCreate
            ? ({ onCreated, onCancel }) => (
                <CategoryQuickCreateForm
                  onSaved={(id, name) => onCreated({ value: id, label: name })}
                  onCancel={onCancel}
                />
              )
            : undefined
        }
      />
      <Text size="xs" color="muted">
        {/*
          * 🛑 The rule is STATED before the save rather than only enforced
          * after it. `deriveTaxonomy` refuses two assignments in one tree with
          * a 400 naming both, which is the right server behaviour — but a
          * seller who cannot see the rule experiences it as the form randomly
          * rejecting a valid-looking choice.
          */}
        Optional. Add a category from a DIFFERENT tree — a franchise, for
        example. Two categories from the same tree will be refused, because the
        broader one is already implied by the narrower.
      </Text>
    </Stack>
  );
}
