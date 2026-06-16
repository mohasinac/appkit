import React from "react";
import type { DataTableColumn } from "../../../ui/DataTable";
import { Button, Div, Row, Span } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { formatCurrency as defaultFormatCurrency } from "../../../utils/number.formatter";
import type { ProductItem } from "../types";

const __O = {
  hidden: "overflow-hidden",
} as const;

const STATUS_STYLES: Record<string, string> = {
  published:
    "bg-success-surface text-success dark:bg-success-surface dark:text-success",
  draft: "bg-zinc-100 text-zinc-700 dark:bg-slate-700 dark:text-zinc-300",
  out_of_stock:
    "bg-warning-surface text-warning dark:bg-warning-surface dark:text-warning",
  discontinued: "bg-error-surface text-error dark:bg-error-surface dark:text-error",
  sold: "bg-primary/10 dark:bg-primary/20 text-primary",
};

const CLS_LOW_STOCK = "bg-warning-surface text-warning dark:bg-warning-surface dark:text-warning";
const CLS_DELETE = "text-error hover:text-error dark:text-error";

export interface ProductTableColumnLabels {
  title: string;
  category: string;
  price: string;
  stock: string;
  status: string;
  seller: string;
  featured: string;
  edit: string;
  delete: string;
  yes: string;
  no: string;
}

export interface ProductTableColumnsConfig<
  T extends ProductItem = ProductItem,
> {
  labels: ProductTableColumnLabels;
  onEdit: (product: T) => void;
  onDelete: (product: T) => void;
  currencyCode?: string;
  locale?: string;
  formatCurrency?: (
    amount: number,
    currencyCode?: string,
    locale?: string,
  ) => string;
}

export function getProductTableColumns<T extends ProductItem = ProductItem>({
  labels,
  onEdit,
  onDelete,
  currencyCode,
  locale,
  formatCurrency = defaultFormatCurrency,
}: ProductTableColumnsConfig<T>) {
  const columns: DataTableColumn<T>[] = [
    {
      key: "title",
      header: labels.title,
      sortable: true,
      width: "25%",
      render: (product: T) => (
        <Row gap="sm">
          {product.mainImage ? (
            <Div className={`relative h-8 w-8 flex-shrink-0 ${__O.hidden}`} rounded="default">
              <MediaImage
                src={product.mainImage}
                alt={product.title}
                size="thumbnail"
              />
            </Div>
          ) : (
            <Div className="h-8 w-8 flex-shrink-0" surface="subtle" rounded="default" />
          )}
          <Span weight="medium" className="max-w-[180px] truncate">
            {product.title}
          </Span>
        </Row>
      ),
    },
    {
      key: "category",
      header: labels.category,
      sortable: true,
      width: "12%",
      render: (product: T) => <Span>{(Array.isArray(product.categorySlugs) ? product.categorySlugs[0] : product.category) ?? "-"}</Span>,
    },
    {
      key: "price",
      header: labels.price,
      sortable: true,
      width: "10%",
      render: (product: T) => (
        <Span>
          {formatCurrency(
            product.price ?? 0,
            product.currency ?? currencyCode,
            locale,
          )}
        </Span>
      ),
    },
    {
      key: "stockQuantity",
      header: labels.stock,
      sortable: true,
      width: "10%",
      render: (product: T) => (
        <Span>{product.stockQuantity ?? product.stockCount ?? 0}</Span>
      ),
    },
    {
      key: "status",
      header: labels.status,
      sortable: true,
      width: "12%",
      render: (product: T) => {
        const status = product.status ?? "draft";
        return (
          <Span
            className={[
              "rounded px-2 py-1 text-xs font-medium",
              STATUS_STYLES[status] ??
                "bg-zinc-100 text-zinc-700 dark:bg-slate-700 dark:text-zinc-300",
            ].join(" ")}
          >
            {status.replace("_", " ")}
          </Span>
        );
      },
    },
    {
      key: "storeName",
      header: labels.seller,
      sortable: true,
      width: "15%",
      render: (product: T) => (
        <Span size="sm" className="block max-w-[120px] truncate">
          {product.storeName ?? "-"}
        </Span>
      ),
    },
    {
      key: "featured",
      header: labels.featured,
      sortable: true,
      width: "8%",
      render: (product: T) => {
        const featured = Boolean(product.featured);
        return (
          <Span
            className={[
              "rounded px-2 py-1 text-xs font-medium",
              featured
                ? CLS_LOW_STOCK
                : "bg-zinc-100 text-zinc-700 dark:bg-slate-700 dark:text-zinc-300",
            ].join(" ")}
          >
            {featured ? labels.yes : labels.no}
          </Span>
        );
      },
    },
  ];

  const actions = (product: T) => (
    <Row gap="sm" >
      <Button
        variant="ghost"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(product);
        }}
        className="text-primary hover:text-primary/80"
      >
        {labels.edit}
      </Button>
      <Button
        variant="ghost"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(product);
        }}
        className={CLS_DELETE}
      >
        {labels.delete}
      </Button>
    </Row>
  );

  return { columns, actions };
}
