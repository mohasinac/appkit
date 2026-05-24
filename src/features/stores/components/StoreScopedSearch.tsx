"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Row } from "../../../ui";
import { ROUTES } from "../../../next/routing/route-map";

interface StoreScopedSearchProps {
  storeId: string;
  storeName: string;
  /** Override placeholder; falls back to "Search {storeName}…". */
  placeholder?: string;
  className?: string;
}

/**
 * W1-19 — inline search input scoped to a single store. Submits to
 * `/products?storeId={storeId}&q={query}` so the public product listing
 * filters down to this seller's catalog. Lives alongside `StoreHeader` and
 * is the store-page complement to the global `<Search>` slot rendered in
 * `LayoutShellClient`.
 */
export function StoreScopedSearch({
  storeId,
  storeName,
  placeholder,
  className = "",
}: StoreScopedSearchProps) {
  const router = useRouter();
  const [value, setValue] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    const base = String(ROUTES.PUBLIC.PRODUCTS);
    const params = new URLSearchParams({ storeId });
    if (q) params.set("q", q);
    router.push(`${base}?${params.toString()}`);
  };

  return (
    <form onSubmit={submit} className={`w-full ${className}`}>
      <Row gap="sm" align="center" className="w-full">
        <Input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder ?? `Search ${storeName}…`}
          aria-label={`Search ${storeName}`}
          className="flex-1"
        />
        <Button type="submit" variant="primary" size="sm">
          Search
        </Button>
      </Row>
    </form>
  );
}
