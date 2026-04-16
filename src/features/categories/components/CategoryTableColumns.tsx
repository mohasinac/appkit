import { StatusBadge, Span, Button } from "../../../ui";
import type { Category } from "../types";
import { MediaImage } from "../../media";

export interface CategoryTableColumnsLabels {
  colName?: string;
  colSlug?: string;
  colProducts?: string;
  colStatus?: string;
  statusActive?: string;
  statusInactive?: string;
  actionEdit?: string;
  actionDelete?: string;
}

const DEFAULT_LABELS: Required<CategoryTableColumnsLabels> = {
  colName: "Name",
  colSlug: "Slug",
  colProducts: "Products",
  colStatus: "Status",
  statusActive: "Active",
  statusInactive: "Inactive",
  actionEdit: "Edit",
  actionDelete: "Delete",
};

export function getCategoryTableColumns(
  onEdit: (cat: Category) => void,
  onDelete: (cat: Category) => void,
  labels: CategoryTableColumnsLabels = {},
) {
  const L = { ...DEFAULT_LABELS, ...labels };

  return {
    columns: [
      {
        key: "image",
        header: "",
        render: (cat: Category) => (
          <div className="relative w-9 h-9 rounded overflow-hidden flex-shrink-0">
            {cat.display?.coverImage ? (
              <MediaImage
                src={cat.display.coverImage}
                alt=""
                size="thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-base"
                style={{ backgroundColor: cat.display?.color ?? "#94a3b8" }}
              >
                {cat.display?.icon ?? "🗂️"}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "name",
        header: L.colName,
        sortable: true,
        render: (cat: Category) => (
          <div style={{ paddingLeft: `${cat.tier * 20}px` }}>
            {cat.name}
            {cat.tier > 0 && (
              <Span className="text-zinc-400 text-xs ml-2">
                (Tier {cat.tier})
              </Span>
            )}
          </div>
        ),
      },
      {
        key: "slug",
        header: L.colSlug,
        sortable: true,
      },
      {
        key: "metrics",
        header: L.colProducts,
        render: (cat: Category) => (
          <Span className="text-sm">
            {cat.metrics.productCount} ({cat.metrics.totalProductCount})
          </Span>
        ),
      },
      {
        key: "isActive",
        header: L.colStatus,
        sortable: true,
        render: (cat: Category) => (
          <StatusBadge
            status={cat.isActive ? "active" : "inactive"}
            label={cat.isActive ? L.statusActive : L.statusInactive}
          />
        ),
      },
    ],
    actions: (cat: Category) => (
      <div className="flex gap-2">
        <Button
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(cat);
          }}
          className="text-primary hover:text-primary/80"
        >
          {L.actionEdit}
        </Button>
        <Button
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(cat);
          }}
          className="text-red-600 hover:text-red-800 dark:text-red-400"
        >
          {L.actionDelete}
        </Button>
      </div>
    ),
  };
}
