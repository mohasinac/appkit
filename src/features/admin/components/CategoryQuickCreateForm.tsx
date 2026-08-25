"use client";

import { Row } from "@mohasinac/appkit/ui";
import { useApiMutation, type JsonValue } from "@mohasinac/appkit/client";
import React from "react";

import { Button, Form, Input, Toggle, useToast } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { quickCreateTaxonomySchema } from "../schemas/small-forms";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { applyZodIssues } from "../../../ui/forms/FormShell";

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
    onSuccess: (res: JsonValue) => {
      const id = (res as { data?: { id?: string } })?.data?.id ?? (res as { id?: string })?.id ?? "";
      onSaved(id as string, name);
    },
    onError: (err: Error) => {
      showToast((err as Error)?.message ?? "Failed to create category.", "error");
    },
  });

  return (
    <Form schema={quickCreateTaxonomySchema} onSubmit={(e) => e.preventDefault()} spacing="md">
      {({ setFieldError, clearErrors }) => (
        <>
      <FormErrorSummary />
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
        <Button
          type="submit"
          isLoading={mutation.isPending}
          disabled={mutation.isPending}
          onClick={() => {
            clearErrors();
            const parsed = quickCreateTaxonomySchema.safeParse({ name, description, isActive });
            if (!parsed.success) {
              applyZodIssues(parsed.error.issues, setFieldError);
              return;
            }
            mutation.mutate();
          }}
        >
          Create category
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </Row>
        </>
      )}
    </Form>
  );
}
