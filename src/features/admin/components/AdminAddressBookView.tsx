"use client";

/**
 * AdminAddressBookView — admin lookup of the addresses collection by owner.
 * The list endpoint (GET /api/admin/addresses) only supports per-owner or
 * per-banStatus queries, not a global browse, so this is a search-by-owner
 * tool rather than a paginated DataListingView.
 */

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  FieldSelect,
  Heading,
  Input,
  Row,
  Stack,
  Text,
  TextLink,
} from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROUTES } from "../../../next/routing/route-map";

interface AddressRecord {
  id: string;
  ownerType: "user" | "store";
  ownerId: string;
  label: string;
  fullName: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault?: boolean;
}

interface AddressListResponse {
  items?: AddressRecord[];
  total?: number;
}

const OWNER_TYPE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "store", label: "Store" },
];

export interface AdminAddressBookViewProps {
  children?: React.ReactNode;
}

export function AdminAddressBookView(_props: AdminAddressBookViewProps) {
  const [ownerType, setOwnerType] = React.useState<"user" | "store">("user");
  const [ownerIdInput, setOwnerIdInput] = React.useState("");
  const [searchedOwnerId, setSearchedOwnerId] = React.useState<string | null>(null);

  const { data, isLoading, error } = useQuery<AddressListResponse>({
    queryKey: ["admin", "addresses", "by-owner", ownerType, searchedOwnerId],
    queryFn: () =>
      apiClient.get<AddressListResponse>(
        `${ADMIN_ENDPOINTS.ADDRESSES}?ownerType=${ownerType}&ownerId=${encodeURIComponent(searchedOwnerId!)}`,
      ),
    enabled: !!searchedOwnerId,
  });

  const addresses = data?.items ?? [];

  return (
    <Stack gap="lg" padding="page">
      <Row justify="between" align="center">
        <Stack gap="none">
          <Heading level={2} size="lg" weight="semibold" color="primary">Addresses</Heading>
          <Text size="sm" color="muted" className="mt-1">
            Look up a user's or store's saved addresses by owner ID.
          </Text>
        </Stack>
        <TextLink href={String(ROUTES.ADMIN.ADDRESSES_NEW)}>
          <Button type="button">+ New address</Button>
        </TextLink>
      </Row>

      <Card variant="outlined" padding="md">
        <Row gap="md" align="end" wrap>
          <FieldSelect
            name="ownerType"
            label="Owner type"
            value={ownerType}
            onChange={(v) => setOwnerType(v as "user" | "store")}
            options={OWNER_TYPE_OPTIONS}
          />
          <Input
            name="ownerId"
            label="Owner ID"
            placeholder={ownerType === "user" ? "user-..." : "store-..."}
            value={ownerIdInput}
            onChange={(e) => setOwnerIdInput(e.target.value)}
          />
          <Button
            type="button"
            isLoading={isLoading}
            disabled={!ownerIdInput.trim()}
            onClick={() => setSearchedOwnerId(ownerIdInput.trim())}
          >
            Search
          </Button>
        </Row>
      </Card>

      {error && (
        <Text size="sm" color="danger">
          {(error as Error)?.message ?? "Failed to load addresses."}
        </Text>
      )}

      {searchedOwnerId && !isLoading && addresses.length === 0 && !error && (
        <Text size="sm" color="muted">No addresses found for this owner.</Text>
      )}

      {addresses.length > 0 && (
        <Stack gap="sm">
          {addresses.map((addr) => (
            <Card key={addr.id} variant="outlined" padding="md">
              <Row justify="between" align="center" wrap>
                <Stack gap="none">
                  <Row gap="sm" align="center">
                    <Text weight="medium">{addr.label}</Text>
                    {addr.isDefault && <Badge variant="secondary" size="sm">Default</Badge>}
                  </Row>
                  <Text size="sm" color="muted">{addr.fullName}</Text>
                  <Text size="sm" color="muted">
                    {[addr.addressLine1, addr.city, addr.state, addr.postalCode].filter(Boolean).join(", ")}
                  </Text>
                </Stack>
                <TextLink href={String(ROUTES.ADMIN.ADDRESSES_EDIT(addr.id))}>
                  <Button type="button" variant="secondary">Edit</Button>
                </TextLink>
              </Row>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
