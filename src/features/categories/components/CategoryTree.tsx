"use client"
import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
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

  const indent = depth * 16;

  return (
    <Div>
      <Div
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
        className={`flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm transition select-none
          ${isActive ? "bg-primary-50 font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400" : "text-neutral-700 hover:bg-neutral-50 dark:text-zinc-300 dark:hover:bg-zinc-800"}`}
        // audit-inline-style-ok: computed pixel offset
        style={{ paddingLeft: `${8 + indent}px` }}
      >
        {hasChildren && (
          <Span
            size="xs"
            aria-hidden="true"
            className={`text-zinc-400 dark:text-zinc-400 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
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
          <Span size="xs" className="ml-auto flex-shrink-0 text-zinc-400 dark:text-zinc-400 tabular-nums">
            {item.metrics.productCount}
          </Span>
        )}
      </Div>

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
      <Text className="py-4 text-neutral-500" size="sm" align="center">
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
