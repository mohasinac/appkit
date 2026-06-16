import React from "react";
import { Div, Heading, Text, TextLink } from "../../../ui";
import { THEME_CONSTANTS, LAYOUT } from "../../../tokens";
import type { CollectionListItem } from "../types";

const CLS_PLACEHOLDER = "w-full";

interface CollectionCardProps {
  collection: CollectionListItem;
  href: string;
}

export function CollectionCard({ collection, href }: CollectionCardProps) {
  return (
    <TextLink
      href={href}
      className="group relative block overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-800 transition-shadow hover:shadow-lg"
    >
      {collection.image ? (
        <Div
          role="img"
          aria-label={collection.title}
          className={`${LAYOUT.cardHeight.md} w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105`}
          // audit-inline-style-ok: dynamic image URL
          style={{ backgroundImage: `url(${collection.image})` }}
        />
      ) : (
        <Div surface="muted" className={`${LAYOUT.cardHeight.md} ${CLS_PLACEHOLDER}`} />
      )}
      <Div surface="default" padding="sm">
          <Heading level={3} className="text-gray-900" weight="semibold">
          {collection.title}
        </Heading>
        {collection.subtitle && (
            <Text className="mt-1 text-gray-500" size="sm">
            {collection.subtitle}
          </Text>
        )}
        {collection.productCount !== undefined && (
            <Text className="mt-2 text-gray-400" size="xs">
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
