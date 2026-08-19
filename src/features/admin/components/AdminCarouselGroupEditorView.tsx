"use client";

import React from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button, Form, Row, StackedViewShell, useToast } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { FieldInput, FieldSelect } from "../../../ui/forms";
import { useApiMutation, type JsonValue } from "@mohasinac/appkit/client";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROUTES } from "../../../next/routing/route-map";

const carouselGroupFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  status: z.enum(["active", "draft"]),
});

export interface AdminCarouselGroupEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  onCreated?: (id: string) => void;
}

export function AdminCarouselGroupEditorView({
  onCreated,
  ...rest
}: AdminCarouselGroupEditorViewProps) {
  const { showToast } = useToast();
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [status, setStatus] = React.useState<"active" | "draft">("draft");

  const createMutation = useApiMutation({
    mutationFn: () => apiClient.post(ADMIN_ENDPOINTS.CAROUSELS, { name, status }),
    onSuccess: (res: JsonValue) => {
      const id = (res as { data?: { id?: string } })?.data?.id;
      showToast("Carousel created.", "success");
      if (id) {
        if (onCreated) onCreated(id);
        else router.push(String(ROUTES.ADMIN.CAROUSEL_DETAIL(id)));
      }
    },
    onError: (err: Error) => {
      showToast(err?.message ?? "Failed to create carousel.", "error");
    },
  });

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title="New Named Carousel"
      sections={[
        <Form
          key="carousel-group-form"
          schema={carouselGroupFormSchema}
          onSubmit={(e) => e.preventDefault()}
          spacing="md"
        >{({ setFieldError, clearErrors }) => (
          <>
            <FieldInput
              name="name"
              label="Carousel name"
              value={name}
              onChange={(v) => setName(v)}
              required
              placeholder="e.g. Homepage Hero"
            />
            <FieldSelect
              name="status"
              label="Status"
              value={status}
              onChange={(v) => setStatus(v as "active" | "draft")}
              options={[
                { value: "draft", label: "Draft" },
                { value: "active", label: "Active" },
              ]}
            />
            <Row gap="3" padding="t-xs">
              <Button
                type="submit"
                isLoading={createMutation.isPending}
                disabled={!name || createMutation.isPending}
                onClick={() => {
                  clearErrors();
                  if (!name.trim()) { setFieldError("name", "Carousel name is required"); return; }
                  createMutation.mutate();
                }}
              >
                Create carousel
              </Button>
            </Row>
          </>
        )}</Form>,
      ]}
    />
  );
}
