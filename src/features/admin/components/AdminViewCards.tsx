"use client";

import React from "react";
import type { AdminListingScaffoldRow } from "./AdminListingScaffold";
import { Text } from "../../../ui";

interface AdminViewCardsProps {
  rows: AdminListingScaffoldRow[];
  view: "grid" | "list";
  isLoading?: boolean;
  emptyLabel?: string;
  onRowClick?: (row: AdminListingScaffoldRow) => void;
  selectedIdSet?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

const FLAG_BADGES: Array<{ key: keyof AdminListingScaffoldRow; label: string; color: string }> = [
  { key: "featured", label: "Featured", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  { key: "isPromoted", label: "Promoted", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  { key: "isOnSale", label: "Sale", color: "bg-success-surface text-success" },
  { key: "isSold", label: "Sold", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-800 dark:bg-secondary-900/30 dark:text-secondary-300 truncate max-w-[120px]">
      {status}
    </span>
  );
}

function SkeletonCard({ view }: { view: "grid" | "list" }) {
  if (view === "list") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
        <div className="h-4 w-4 rounded bg-zinc-200 dark:bg-slate-700 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-2/3" />
          <div className="h-2.5 bg-zinc-200 dark:bg-slate-700 rounded w-1/3" />
        </div>
        <div className="h-5 w-16 bg-zinc-200 dark:bg-slate-700 rounded-full shrink-0" />
        <div className="h-3 w-20 bg-zinc-200 dark:bg-slate-700 rounded shrink-0" />
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-zinc-100 dark:border-slate-700 overflow-hidden animate-pulse">
      <div className="p-4 space-y-2.5">
        <div className="h-4 bg-zinc-200 dark:bg-slate-700 rounded w-3/4" />
        <div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-1/2" />
        <div className="h-5 bg-zinc-200 dark:bg-slate-700 rounded-full w-20 mt-1" />
        <div className="h-3 bg-zinc-200 dark:bg-slate-700 rounded w-1/3" />
      </div>
    </div>
  );
}

function AdminCardItem({
  row,
  view,
  selected,
  onToggleSelect,
  onRowClick,
}: {
  row: AdminListingScaffoldRow;
  view: "grid" | "list";
  selected: boolean;
  onToggleSelect?: (id: string) => void;
  onRowClick?: (row: AdminListingScaffoldRow) => void;
}) {
  const flags = FLAG_BADGES.filter(({ key }) => Boolean(row[key]));

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-checkbox]')) return;
    onRowClick?.(row);
  };

  if (view === "list") {
    return (
      <div
        className={[
          "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-slate-800/50",
          selected ? "bg-primary-50/40 dark:bg-primary-900/10" : "",
        ].filter(Boolean).join(" ")}
        onClick={handleClick}
        role={onRowClick ? "button" : undefined}
      >
        {onToggleSelect && (
          <div data-checkbox className="shrink-0" onClick={(e) => { e.stopPropagation(); onToggleSelect(row.id); }}>
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(row.id)}
              className="h-4 w-4 rounded border-zinc-300 text-primary accent-primary cursor-pointer"
              aria-label={`Select ${row.primary}`}
            />
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-0.5">
          <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{row.primary}</Text>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{row.secondary}</Text>
        </div>
        {flags.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {flags.map(({ key, label, color }) => (
              <span key={key} className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${color}`}>{label}</span>
            ))}
          </div>
        )}
        <StatusBadge status={row.status} />
        <span className="hidden sm:block text-xs text-zinc-400 dark:text-zinc-400 shrink-0 w-24 text-right">{row.updatedAt}</span>
      </div>
    );
  }

  return (
    <div
      className={[
        "rounded-xl border overflow-hidden cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5",
        selected
          ? "border-primary ring-1 ring-primary/20 bg-primary-50/30 dark:bg-primary-900/10"
          : "border-zinc-100 dark:border-slate-700 bg-white dark:bg-slate-900",
      ].filter(Boolean).join(" ")}
      onClick={handleClick}
      role={onRowClick ? "button" : undefined}
    >
      {onToggleSelect && (
        <div
          data-checkbox
          className="flex items-center gap-2 px-3 pt-3"
          onClick={(e) => { e.stopPropagation(); onToggleSelect(row.id); }}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(row.id)}
            className="h-4 w-4 rounded border-zinc-300 text-primary accent-primary cursor-pointer"
            aria-label={`Select ${row.primary}`}
          />
          {flags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {flags.map(({ key, label, color }) => (
                <span key={key} className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${color}`}>{label}</span>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="p-3.5 space-y-2">
        <div className="space-y-0.5">
          <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug">{row.primary}</Text>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{row.secondary}</Text>
        </div>
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={row.status} />
          <span className="text-[11px] text-zinc-400 dark:text-zinc-400 shrink-0">{row.updatedAt}</span>
        </div>
      </div>
    </div>
  );
}

export function AdminViewCards({
  rows,
  view,
  isLoading,
  emptyLabel = "No items found",
  onRowClick,
  selectedIdSet,
  onToggleSelect,
}: AdminViewCardsProps) {
  if (isLoading) {
    const count = view === "grid" ? 12 : 8;
    if (view === "list") {
      return (
        <div className="rounded-xl border border-zinc-100 dark:border-slate-700 overflow-hidden divide-y divide-zinc-100 dark:divide-slate-700">
          {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} view="list" />)}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} view="grid" />)}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <Text className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">{emptyLabel}</Text>
    );
  }

  if (view === "list") {
    return (
      <div className="rounded-xl border border-zinc-100 dark:border-slate-700 overflow-hidden divide-y divide-zinc-100 dark:divide-slate-700">
        {rows.map((row) => (
          <AdminCardItem
            key={row.id}
            row={row}
            view="list"
            selected={selectedIdSet?.has(row.id) ?? false}
            onToggleSelect={onToggleSelect}
            onRowClick={onRowClick}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {rows.map((row) => (
        <AdminCardItem
          key={row.id}
          row={row}
          view="grid"
          selected={selectedIdSet?.has(row.id) ?? false}
          onToggleSelect={onToggleSelect}
          onRowClick={onRowClick}
        />
      ))}
    </div>
  );
}
