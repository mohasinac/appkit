import { Div, StatusBadge, Span, Button } from "../../../ui";
import type { Category } from "../types";
import { MediaImage } from "../../media";

const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_DELETE_BTN = "text-error hover:text-error dark:text-error";

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
          <Div className={`relative w-9 h-9 rounded ${__O.hidden} flex-shrink-0`}>
            {cat.display?.coverImage ? (
              <MediaImage
                src={cat.display.coverImage}
                alt=""
                size="thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <Div
                className="w-full h-full flex items-center justify-center text-base"
                // audit-inline-style-ok: runtime theme color
                style={{ backgroundColor: cat.display?.color ?? "var(--appkit-color-text-faint)", color: "var(--appkit-color-text-on-primary)" }}
              >
                {cat.display?.icon ?? "🗂️"}
              </Div>
            )}
          </Div>
        ),
      },
      {
        key: "name",
        header: L.colName,
        sortable: true,
        render: (cat: Category) => (
          // audit-inline-style-ok: computed pixel offset
          <Div style={{ paddingLeft: `${cat.tier * 20}px` }}>
            {cat.name}
            {cat.tier > 0 && (
              <Span size="xs" className="text-zinc-400 dark:text-zinc-400 ml-2">
                (Tier {cat.tier})
              </Span>
            )}
          </Div>
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
          <Span size="sm">
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
      <Div className="flex gap-2">
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
          className={CLS_DELETE_BTN}
        >
          {L.actionDelete}
        </Button>
      </Div>
    ),
  };
}
