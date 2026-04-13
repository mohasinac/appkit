"use client";

import React from "react";
import { Div, Heading, Text, TextLink } from "../../../ui";
import type { CollectionListItem } from "../types";

interface CollectionCardProps {
  collection: CollectionListItem;
  href: string;
}

export function CollectionCard({ collection, href }: CollectionCardProps) {
  return (
    <TextLink
      href={href}
      className="group relative block overflow-hidden rounded-xl bg-gray-100 transition-shadow hover:shadow-lg"
    >
      {collection.image ? (
        <Div
          role="img"
          aria-label={collection.title}
          className="h-48 w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundImage: `url(${collection.image})` }}
        />
      ) : (
        <Div className="h-48 w-full bg-gradient-to-br from-indigo-100 to-purple-100" />
      )}
      <Div className="p-4">
        <Heading level={3} className="font-semibold text-gray-900">
          {collection.title}
        </Heading>
        {collection.subtitle && (
          <Text className="mt-1 text-sm text-gray-500">
            {collection.subtitle}
          </Text>
        )}
        {collection.productCount !== undefined && (
          <Text className="mt-2 text-xs text-gray-400">
            {collection.productCount}{" "}
            {collection.productCount === 1 ? "item" : "items"}
          </Text>
        )}
      </Div>
    </TextLink>
  );
}

interface CollectionGridProps {
  collections: CollectionListItem[];
  getHref: (slug: string) => string;
}

export function CollectionGrid({ collections, getHref }: CollectionGridProps) {
  return (
    <Div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {collections.map((c) => (
        <CollectionCard key={c.slug} collection={c} href={getHref(c.slug)} />
      ))}
    </Div>
  );
}
