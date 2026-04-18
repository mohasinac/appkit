import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import {
  buildColumns,
  renderRating,
  renderBoolean,
  renderCount,
} from "../../../ui/columns";
import type { Review } from "../types";

/**
 * Default admin column definitions for a review table.
 *
 * @example
 * const columns = buildReviewColumns<MyReview>({
 *   extras: [{ key: "loyaltyPointsAwarded", header: "Points", render: (r) => r.loyaltyPointsAwarded ?? "—" }],
 * });
 */
export const reviewAdminColumns: TableColumn<Review>[] = [
  { key: "userName", header: "User" },
  { key: "productTitle", header: "Product", sortable: true },
  {
    key: "rating",
    header: "Rating",
    sortable: true,
    render: (r) => `${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}`,
  },
  { key: "title", header: "Title" },
  { key: "status", header: "Status", sortable: true },
  {
    key: "verified",
    header: "Verified",
    render: (r) => (r.verified ? "Yes" : "No"),
  },
  {
    key: "featured",
    header: "Featured",
    render: (r) => (r.featured ? "Yes" : "No"),
  },
  {
    key: "helpfulCount",
    header: "Helpful",
    sortable: true,
    render: (r) => r.helpfulCount?.toLocaleString() ?? "0",
  },
  { key: "createdAt", header: "Created", sortable: true },
];

/**
 * Build a merged column list from the base review columns.
 */
export function buildReviewColumns<T extends Review = Review>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  return buildColumns(reviewAdminColumns as TableColumn<T>[], opts);
}
