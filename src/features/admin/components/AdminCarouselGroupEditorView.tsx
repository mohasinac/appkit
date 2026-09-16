"use client";

import React from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button, Form, Row, StackedViewShell, useToast } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { FieldInput, FieldSelect, FormErrorSummary } from "../../../ui/forms";
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
  /**
   * Present → edit that carousel; absent → create a new one.
   *
   * This component was create-only, which is why `/admin/carousels/[id]/edit`
   * did not exist. Same `featureId?`-style seam `AdminFeatureEditorView` uses.
   */
  carouselId?: string;
  onSaved?: (id: string) => void;
}

export function AdminCarouselGroupEditorView({
  onCreated,
  carouselId,
  onSaved,
  ...rest
}: AdminCarouselGroupEditorViewProps) {
  const { showToast } = useToast();
  const router = useRouter();
  const isEdit = Boolean(carouselId);

  const [name, setName] = React.useState("");
  const [status, setStatus] = React.useState<"active" | "draft">("draft");

  // Seed from the single-item GET, never from a cached list row — a list
  // projection is narrower than the document, and saving would write the
  // missing fields back as their defaults (Root Cause #38).
  const existing = useQuery({
    queryKey: ["admin", "carousel", carouselId],
    queryFn: () => apiClient.get(ADMIN_ENDPOINTS.CAROUSELS_BY_ID(carouselId!)),
    enabled: isEdit,
  });

  /*
   * 🛑 `existing.data` IS the document. Do not reach for `.data.data`.
   *
   * `apiClient` already unwraps the envelope — it returns `data.data` — so the
   * extra hop resolved `undefined`, the effect bailed, and the form kept its
   * initial values: an EMPTY name and `status: "draft"`.
   *
   * That is not a cosmetic bug. The editor then PATCHed those defaults over a
   * live carousel, so opening "Homepage Hero" and pressing save renamed it to
   * "" and took it off the homepage. An editor seeded from nothing is more
   * dangerous than one that fails to open.
   *
   * Mirror image of Root Cause #98, which was a raw envelope treated as the
   * payload; this is a payload unwrapped a second time. Both typecheck, because
   * the cast asserts the shape rather than checking it.
   */
  React.useEffect(() => {
    const doc = existing.data as { name?: string; status?: string } | undefined;
    if (!doc) return;
    setName(doc.name ?? "");
    setStatus(doc.status === "active" ? "active" : "draft");
  }, [existing.data]);

  const createMutation = useApiMutation({
    errorMessage: "create",
    /*
     * PATCH on the edit path, not PUT. `/api/admin/carousels/[id]` exports
     * GET/PATCH/DELETE — copying `AdminFeatureEditorView`'s `apiClient.put`
     * here would have been a 405, which is exactly what
     * `audit-client-verb-match` exists to catch.
     */
    mutationFn: () =>
      isEdit
        ? apiClient.patch(ADMIN_ENDPOINTS.CAROUSELS_BY_ID(carouselId!), { name, status })
        : apiClient.post(ADMIN_ENDPOINTS.CAROUSELS, { name, status }),
    onSuccess: (res: JsonValue) => {
      const id = (res as { data?: { id?: string } })?.data?.id ?? carouselId;
      showToast(isEdit ? "Carousel updated." : "Carousel created.", "success");
      if (!id) return;
      if (isEdit) {
        if (onSaved) onSaved(id);
        else router.push(String(ROUTES.ADMIN.CAROUSEL_DETAIL(id)));
        return;
      }
      if (onCreated) onCreated(id);
      else router.push(String(ROUTES.ADMIN.CAROUSEL_DETAIL(id)));
    },
  });

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={isEdit ? "Edit Carousel" : "New Named Carousel"}
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
            <FormErrorSummary />
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
                {isEdit ? "Save changes" : "Create carousel"}
              </Button>
            </Row>
          </>
        )}</Form>,
      ]}
    />
  );
}
