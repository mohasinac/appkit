"use client"
import { Row } from "@mohasinac/appkit";
import { useState } from "react";
import { Div, Span, Text } from "../../../ui";
import type { CategoryItem } from "../types";

// --- CategoryTreeNode ----------------------------------------------------------

interface CategoryTreeNodeProps {
  item: CategoryItem;
  children?: CategoryItem[];
  activeId?: string;
  onSelect?: (category: CategoryItem) => void;
  depth?: number;
}

function CategoryTreeNode({
  item,
  children = [],
  activeId,
  onSelect,
  depth = 0,
}: CategoryTreeNodeProps) {
  const hasChildren = children.length > 0;
  const isActive = item.id === activeId;
  const [expanded, setExpanded] = useState(true);

  const DEPTH_PL = ["pl-2", "pl-6", "pl-10", "pl-14", "pl-[72px]"] as const;
  const depthPl = DEPTH_PL[Math.min(depth, 4)];

  return (
    <Div>
      <Row textWeight="semibold" textSize="sm"
        role="treeitem"
        aria-expanded={hasChildren ? expanded : undefined}
        aria-selected={isActive}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            if (hasChildren) setExpanded((p) => !p);
            onSelect?.(item);
            e.preventDefault();
          }
        }}
        onClick={() => {
          if (hasChildren) setExpanded((p) => !p);
          onSelect?.(item);
        }}
        className={`cursor-pointer py-[var(--appkit-space-1-5)] transition select-none ${depthPl} ${isActive ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400" : "text-neutral-700 hover:bg-neutral-50 text-[var(--appkit-color-text-muted)] hover:bg-[var(--appkit-color-surface-elevated)]"}`} align="center" gap="xs" padding="x-xs" rounded="md"
      >
        {hasChildren && (
          <Span
            size="xs"
            aria-hidden="true"
            className={`transition-transform duration-150 ${expanded ? "rotate-90" : ""}`} color="faint"
          >
            ▶
          </Span>
        )}
        {!hasChildren && <Span className="w-3" />}

        {item.display?.icon && (
          <Span size="base" aria-hidden="true" className="flex-shrink-0">
            {item.display.icon}
          </Span>
        )}

        <Text className="flex-1 truncate">{item.name}</Text>

        {item.metrics && (
          <Span size="xs" className="ml-auto flex-shrink-0 tabular-nums" color="faint">
            {item.metrics.productCount}
          </Span>
        )}
      </Row>

      {hasChildren && expanded && (
        <Div role="group">
          {children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              item={child}
              activeId={activeId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </Div>
      )}
    </Div>
  );
}

// --- CategoryTree -------------------------------------------------------------

export interface CategoryTreeProps {
  /** Flat list of categories; the tree is built from `parentIds`/`childrenIds`. */
  categories: CategoryItem[];
  activeId?: string;
  onSelect?: (category: CategoryItem) => void;
  className?: string;
}

/**
 * CategoryTree — hierarchical expandable navigation for categories.
 *
 * Builds a tree from a flat list by grouping on `rootId` and `parentIds`.
 * Root-level nodes have sieveFilter("tier", SIEVE_OP.EQ, "= 0") or no `parentIds`.
 */
export function CategoryTree({
  categories,
  activeId,
  onSelect,
  className = "",
}: CategoryTreeProps) {
  // Group children by parent
  const childMap = new Map<string, CategoryItem[]>();
  const roots: CategoryItem[] = [];

  for (const cat of categories) {
    const parent = cat.parentIds?.[cat.parentIds.length - 1];
    if (parent) {
      if (!childMap.has(parent)) childMap.set(parent, []);
      childMap.get(parent)!.push(cat);
    } else {
      roots.push(cat);
    }
  }

  if (roots.length === 0) {
    return (
      <Text paddingY="md" className="text-[var(--appkit-color-text-muted)]" size="sm" align="start">
        No categories
      </Text>
    );
  }

  return (
    <Div
      role="tree"
      aria-label="Category navigation"
      className={`select-none ${className}`}
    >
      {roots.map((root) => (
        <CategoryTreeNode
          key={root.id}
          item={root}
          children={childMap.get(root.id)}
          activeId={activeId}
          onSelect={onSelect}
          depth={0}
        />
      ))}
    </Div>
  );
}
