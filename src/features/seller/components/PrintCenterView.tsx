"use client";

import { Heading, Text } from "../../../ui/components/Typography";
import { Div } from "../../../ui/components/Div";

import { Stack } from "@mohasinac/appkit";
interface PrintCenterStore {
  id: string;
  storeName: string;
  storeDescription?: string;
  storeLogoURL?: string;
  storeCategory?: string;
}

interface PrintCenterProduct {
  id: string;
  name: string;
  price: number;
  slug: string;
  listingType?: string;
  condition?: string;
  stockCount?: number;
  physicalLocation?: string;
}

interface PrintCenterOrder {
  id: string;
  createdAt: string;
  status: string;
  buyerDisplayName?: string;
  buyerCity?: string;
  items: { productName: string; quantity: number; price: number }[];
  physicalLocation?: string;
}

interface PrintCenterViewProps {
  store?: PrintCenterStore | null;
  publicBaseUrl?: string;
  isAdmin?: boolean;
  brandName?: string;
  initialProducts?: PrintCenterProduct[];
  initialOrders?: PrintCenterOrder[];
}

export function PrintCenterView({ store, brandName = "LetItRip" }: PrintCenterViewProps) {
  return (
    <Stack className="justify-center py-24 text-center" align="center" gap="md">
      <Heading level={2}>{brandName} Print Center</Heading>
      {store && <Text size="sm" variant="muted">{store.storeName}</Text>}
      <Text size="sm" variant="muted">Print center features are coming soon.</Text>
    </Stack>
  );
}
