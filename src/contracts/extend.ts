/**
 * Utility types for schema/type extensibility across feat-* packages.
 *
 * ## Three-layer extensibility model
 *
 * Every feat-* package exports:
 *   1. **Schema**   — a base Zod object (`xxxSchema`). Extend with `.extend({...})`.
 *   2. **Columns**  — a `xxxAdminColumns` array + `buildXxxColumns()` factory.
 *   3. **Slots**    — render-prop overrides accepted by all list/detail views.
 *
 * Assemble all three into a single `FeatureExtension` descriptor and pass it
 * to the hook AND the view component:
 *
 * @example
 * ```ts
 * // 1. Declare the extension (one file per feature in your app)
 * import { productItemSchema, buildProductColumns } from "@mohasinac/feat-products";
 * import type { FeatureExtension } from "@mohasinac/contracts";
 * import type { ProductItem } from "@mohasinac/feat-products";
 * import { z } from "zod";
 *
 * interface ProductDocument extends ProductItem { brand: string }
 *
 * export const productExt: FeatureExtension<ProductItem, ProductDocument> = {
 *   schema: productItemSchema.extend({ brand: z.string() }),
 *   columns: buildProductColumns<ProductDocument>({
 *     extras: [{ key: "brand", header: "Brand", render: (p) => p.brand }],
 *   }),
 *   slots: { renderCard: (p) => <MyBrandCard product={p} /> },
 *   transform: (raw) => ({ ...raw, brand: raw.attributes?.brand ?? "" }),
 * };
 *
 * // 2. Hook
 * const { products } = useProducts<ProductDocument>(params, productExt);
 *
 * // 3. View
 * <ProductGrid products={products} {...productExt.slots} />
 * ```
 */

/**
 * Options mixin for hooks that support an optional per-item transform.
 * The transform maps the API's base type to a richer app-level type.
 */
export interface WithTransformOpts<Base, Target extends Base = Base> {
  /**
   * Map each API item (BaseType) to a richer app-level type (Target).
   * Called once per item after the query resolves.
   */
  transform?: (item: Base) => Target;
}

/**
 * Convenience helper: build a response type for list endpoints that mirrors
 * the package's standard list-response shape but with a generic item type.
 */
export interface GenericListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize?: number;
  perPage?: number;
  totalPages: number;
  hasMore?: boolean;
}

// ─── Table column type (shared across feat packages) ─────────────────────────

/**
 * A single column definition for data tables.
 * Defined here in contracts so feat-* packages can export default column sets
 * without cross-importing each other.
 *
 * @example
 * // feat-products can export default product columns
 * export const productAdminColumns: TableColumn<ProductItem>[] = [...];
 *
 * // Consumer app extends with their richer type
 * const columns: TableColumn<ProductDocument>[] = [
 *   ...productAdminColumns as TableColumn<ProductDocument>[],
 *   { key: "brand", header: "Brand", render: (p) => p.brand },
 * ];
 */
export interface TableColumn<T = Record<string, unknown>> {
  /** Field key (used for sorting, cell lookup) */
  key: string;
  /** Column header label */
  header: string;
  /** Whether clicking the header fires an onSort callback */
  sortable?: boolean;
  /** Custom cell renderer. Return value is rendered as-is (React.ReactNode in JSX context). */
  render?: (row: T) => unknown;
  /** Additional className for the `<th>` and `<td>` */
  className?: string;
  /** CSS width / Tailwind width class applied to the column. */
  width?: string;
  /** Hide this column from the rendered table (keeps it in the array for export) */
  hidden?: boolean;
}

// ─── Column extension helper ──────────────────────────────────────────────────

/**
 * Options accepted by every feature's `buildXxxColumns<T>()` factory.
 * Allows apps to override individual column renderers and/or append extras.
 */
export interface ColumnExtensionOpts<T> {
  /**
   * Keyed partial overrides merged into the matching base column.
   * Only the provided fields are replaced; the rest of the base column is kept.
   */
  overrides?: Partial<Record<string, Partial<TableColumn<T>>>>;
  /** Additional columns appended after the base set. */
  extras?: TableColumn<T>[];
  /** Omit columns by key from the final list. */
  omit?: string[];
}

// ─── Layout slots ─────────────────────────────────────────────────────────────

/**
 * Render-prop slots accepted by every feature's list/detail view component.
 * Only the slots you provide are used; the rest fall back to the package default.
 *
 * All return types are `unknown` here (no React dep in contracts).
 * In practice each package narrows them to `React.ReactNode`.
 *
 * @example
 * // Override only the card renderer
 * <BlogListView
 *   posts={posts}
 *   slots={{ renderCard: (post) => <FeaturedBlogCard post={post} /> }}
 * />
 */
export interface LayoutSlots<T> {
  /** Replace the default card used inside grid/card-list views. */
  renderCard?: (item: T, index: number) => unknown;
  /** Replace the default table row (used when the view renders a table). */
  renderRow?: (item: T, index: number) => unknown;
  /** Replace the empty-state UI shown when there are no items. */
  renderEmptyState?: () => unknown;
  /** Replace the header area (title bar, action buttons, filter summary). */
  renderHeader?: (meta: { total: number }) => unknown;
  /** Replace the footer area (pagination, load-more button). */
  renderFooter?: (meta: { page: number; totalPages: number }) => unknown;
}

// ─── Unified Feature Extension descriptor ────────────────────────────────────

/**
 * The single object an app passes to customise one feature.
 * Contains schema, columns, layout slots, and item transform — all optional.
 *
 * Every feat-* hook accepts `FeatureExtension` as its second argument (the
 * `opts` parameter).  Every feat-* list view accepts `slots` prop destructured
 * from this object.
 *
 * @typeParam TBase     — The base interface exported by the feat-* package
 *                        (e.g. `ProductItem`, `BlogPost`).
 * @typeParam TExtended — Your app-level interface that extends TBase
 *                        (e.g. `ProductDocument`). Defaults to TBase.
 *
 * @example
 * ```ts
 * import { productItemSchema, buildProductColumns } from "@mohasinac/feat-products";
 * import type { FeatureExtension } from "@mohasinac/contracts";
 * import type { ProductItem } from "@mohasinac/feat-products";
 * import { z } from "zod";
 *
 * interface ProductDocument extends ProductItem { brand: string }
 *
 * export const productExt: FeatureExtension<ProductItem, ProductDocument> = {
 *   schema: productItemSchema.extend({ brand: z.string() }),
 *   columns: buildProductColumns<ProductDocument>({
 *     extras: [{ key: "brand", header: "Brand", render: (p) => p.brand }],
 *   }),
 *   slots: { renderCard: (p) => <MyBrandCard product={p} /> },
 *   transform: (raw) => ({ ...raw, brand: raw.attributes?.brand ?? "" }),
 * };
 * ```
 */
export interface FeatureExtension<TBase, TExtended extends TBase = TBase>
  extends WithTransformOpts<TBase, TExtended> {
  /**
   * Extended Zod schema. Use the package's base schema with `.extend({...})`.
   * Typed as `unknown` here so contracts stays Zod-free; at runtime it is a
   * `ZodObject` or `ZodEffects`.
   */
  schema?: unknown;
  /** Merged admin table columns. Use the package's `buildXxxColumns()` helper. */
  columns?: TableColumn<TExtended>[];
  /** Render-prop slot overrides for list/detail view components. */
  slots?: LayoutSlots<TExtended>;
}

