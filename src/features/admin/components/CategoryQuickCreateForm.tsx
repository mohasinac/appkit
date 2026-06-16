"use client";

import { Row } from "@mohasinac/appkit/ui";
import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";

import { Button, Div, Form, Input, Toggle, useToast } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

export interface CategoryQuickCreateFormProps {
  onSaved: (id: string, name: string) => void;
  onCancel: () => void;
}

function toCategorySlug(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function CategoryQuickCreateForm({ onSaved, onCancel }: CategoryQuickCreateFormProps) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const { showToast } = useToast();

  const mutation = useApiMutation({
    mutationFn: async () =>
      apiClient.post(ADMIN_ENDPOINTS.CATEGORIES, {
        name,
        slug: toCategorySlug(name),
        description: description || undefined,
        isActive,
      }),
    onSuccess: (res: unknown) => {
      const id = (res as { data?: { id?: string } })?.data?.id ?? (res as { id?: string })?.id ?? "";
      onSaved(id as string, name);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to create category.", "error");
    },
  });

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }} spacing="md">
      <Input
        label="Category name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="e.g. Trading Cards"
        autoFocus
      />
      <Input
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Optional brief description"
      />
      <Toggle label="Active" checked={isActive} onChange={setIsActive} />
      <Row gap="3" padding="t-xs">
        <Button type="submit" isLoading={mutation.isPending} disabled={!name || mutation.isPending}>
          Create category
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </Row>
    </Form>
  );
}
