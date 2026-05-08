"use client";

import React from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Form, Input, Toggle, useToast } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

export interface BrandQuickCreateFormProps {
  onSaved: (id: string, name: string) => void;
  onCancel: () => void;
}

function toBrandSlug(str: string): string {
  const base = str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base.startsWith("brand-") ? base : `brand-${base}`;
}

export function BrandQuickCreateForm({ onSaved, onCancel }: BrandQuickCreateFormProps) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: async () =>
      apiClient.post(ADMIN_ENDPOINTS.BRANDS, {
        name,
        slug: toBrandSlug(name),
        description: description || undefined,
        isActive,
      }),
    onSuccess: (res: unknown) => {
      const id = (res as { data?: { id?: string } })?.data?.id ?? (res as { id?: string })?.id ?? "";
      onSaved(id as string, name);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to create brand.", "error");
    },
  });

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="space-y-4"
    >
      <Input
        label="Brand name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="e.g. Hot Wheels"
        autoFocus
      />
      <Input
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Optional brief description"
      />
      <Toggle label="Active" checked={isActive} onChange={setIsActive} />
      <div className="flex gap-3 pt-2">
        <Button type="submit" isLoading={mutation.isPending} disabled={!name || mutation.isPending}>
          Create brand
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Form>
  );
}
