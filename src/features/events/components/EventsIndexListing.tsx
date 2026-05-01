"use client";
import React from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useEvents } from "../hooks/useEvents";
import {
  Div,
  Input,
  Pagination,
  SlottedListingView,
  SortDropdown,
} from "../../../ui";
import { EventCard } from "./EventCard";
import {
  EventFilters,
  EVENT_PUBLIC_SORT_OPTIONS,
} from "./EventFilters";
import type { UrlTable } from "../../filters/FilterPanel";

const PAGE_SIZE = 24;

export interface EventsIndexListingProps {
  initialData?: any;
}

export function EventsIndexListing({ initialData }: EventsIndexListingProps) {
  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: "startsAt" } });

  const params = {
    page: table.getNumber("page", 1),
    pageSize: table.getNumber("pageSize", PAGE_SIZE),
    sort: table.get("sort") || "startsAt",
    type: table.get("type") || undefined,
    status: table.get("status") || "published",
    filters: table.get("filters") || undefined,
  };

  const { events, total, totalPages, isLoading } = useEvents(params as any, {
    initialData,
  });

  const currentPage = table.getNumber("page", 1);

  return (
    <Div className="min-h-screen">
      <SlottedListingView
        portal="public"
        manageSearch
        manageSort
        inlineToolbar
        renderSearch={(search, setSearch) => (
          <Input
            value={search}
            onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Search events..."
            className="max-w-sm"
          />
        )}
        renderSort={(value, onChange) => (
          <SortDropdown
            value={value}
            onChange={onChange}
            options={EVENT_PUBLIC_SORT_OPTIONS as unknown as Array<{ value: string; label: string }>}
          />
        )}
        renderFilters={() => (
          <EventFilters table={table as unknown as UrlTable} variant="public" />
        )}
        renderTable={() => (
          <Div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </Div>
        )}
        renderPagination={() =>
          totalPages > 1 ? (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => table.setPage(p)}
            />
          ) : null
        }
        total={total}
        isLoading={isLoading}
      />
    </Div>
  );
}
