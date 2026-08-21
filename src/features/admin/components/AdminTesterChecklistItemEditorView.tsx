"use client";

import type { JsonValue } from "@mohasinac/appkit/client";
import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Button,
  ConfirmDeleteModal,
  Div,
  Form,
  Input,
  Row,
  Stack,
  StackedViewShell,
  Text,
  Toggle,
  useToast,
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { FieldInput, FieldTextarea, FormErrorSummary } from "../../../ui/forms";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";

const checklistItemFormSchema = z.object({
  groupKey: z.string().min(1, "Group key is required").max(100),
  groupLabel: z.string().min(1, "Group label is required").max(200),
  pageKey: z.string().min(1, "Page key is required").max(100),
  pageLabel: z.string().min(1, "Page label is required").max(200),
  label: z.string().min(3, "Label must be at least 3 characters").max(500),
}).passthrough();

const __P = {
  p4: "p-[var(--appkit-space-4)]",
} as const;

const __O = {
  yAuto: "overflow-y-auto",
} as const;

export interface AdminTesterChecklistItemEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  itemId?: string;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
  embedded?: boolean;
}

function slugifyKey(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminTesterChecklistItemEditorView({
  itemId,
  onSaved,
  onDeleted,
  embedded,
  ...rest
}: AdminTesterChecklistItemEditorViewProps) {
  const isEdit = Boolean(itemId);

  const [groupKey, setGroupKey] = React.useState("");
  const [groupLabel, setGroupLabel] = React.useState("");
  const [pageKey, setPageKey] = React.useState("");
  const [pageLabel, setPageLabel] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [href, setHref] = React.useState("");
  const [order, setOrder] = React.useState(0);
  const [phase, setPhase] = React.useState(1);
  const [isActive, setIsActive] = React.useState(true);
  const [adminOnly, setAdminOnly] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  const { showToast } = useToast();

  const itemQuery = useQuery({
    queryKey: ["admin", "tester-checklist-items", itemId],
    queryFn: async () => {
      const res = await apiClient.get(ADMIN_ENDPOINTS.TESTER_CHECKLIST_ITEM_BY_ID(itemId!));
      return (res as any)?.data ?? res;
    },
    enabled: isEdit,
  });

  React.useEffect(() => {
    const item = itemQuery.data as any;
    if (!item) return;
    setGroupKey(item.groupKey ?? "");
    setGroupLabel(item.groupLabel ?? "");
    setPageKey(item.pageKey ?? "");
    setPageLabel(item.pageLabel ?? "");
    setLabel(item.label ?? "");
    setDescription(item.description ?? "");
    setHref(item.href ?? "");
    setOrder(typeof item.order === "number" ? item.order : 0);
    setPhase(typeof item.phase === "number" ? item.phase : 1);
    setIsActive(item.isActive ?? true);
    setAdminOnly(item.adminOnly ?? false);
  }, [itemQuery.data]);

  const handleGroupLabelChange = (value: string) => {
    setGroupLabel(value);
    if (!isEdit) setGroupKey(slugifyKey(value));
  };

  const handlePageLabelChange = (value: string) => {
    setPageLabel(value);
    if (!isEdit) setPageKey(slugifyKey(value));
  };

  const saveMutation = useApiMutation({
    mutationFn: async () => {
      const payload: Record<string, JsonValue> = {
        groupKey: groupKey || slugifyKey(groupLabel),
        groupLabel,
        pageKey: pageKey || slugifyKey(pageLabel),
        pageLabel,
        label,
        description: description || "",
        href: href || "",
        order,
        phase,
        isActive,
        adminOnly,
      };
      if (isEdit) {
        return apiClient.put(ADMIN_ENDPOINTS.TESTER_CHECKLIST_ITEM_BY_ID(itemId!), payload);
      }
      return apiClient.post(ADMIN_ENDPOINTS.TESTER_CHECKLIST_ITEMS, payload);
    },
    onSuccess: (res: JsonValue) => {
      const id = (res as any)?.data?.id ?? (res as any)?.id ?? itemId;
      showToast(isEdit ? "Checklist item updated." : "Checklist item created.", "success");
      if (onSaved && id) onSaved(id);
    },
    onError: (err: Error) => {
      showToast((err as Error)?.message ?? "Failed to save checklist item.", "error");
    },
  });

  const deleteMutation = useApiMutation({
    mutationFn: () => apiClient.delete(ADMIN_ENDPOINTS.TESTER_CHECKLIST_ITEM_BY_ID(itemId!)),
    onSuccess: () => {
      showToast("Checklist item deleted.", "success");
      if (onDeleted) onDeleted();
    },
    onError: (err: Error) =>
      showToast((err as Error)?.message ?? "Failed to delete checklist item.", "error"),
  });

  const isSubmitting = saveMutation.isPending || itemQuery.isLoading;
  const canSave = Boolean(groupLabel.trim()) && Boolean(pageLabel.trim()) && Boolean(label.trim());

  const formSection = (
    <>
      <Form
        key="tester-checklist-item-form"
        schema={checklistItemFormSchema}
        onSubmit={(e) => e.preventDefault()}
        spacing="md"
      >
        {({ setFieldError, clearErrors }) => (
          <>
            <Div layout="grid" gap="4" className="grid-cols-2">
              <FieldInput
                name="groupLabel"
                label="Group"
                value={groupLabel}
                onChange={handleGroupLabelChange}
                required
                placeholder="e.g. Buying"
                hint="Top-level accordion section on the Tester Hub."
              />
              <Input
                label="Group key"
                value={groupKey}
                onChange={(e) => setGroupKey(e.target.value)}
                placeholder="buying"
                helperText="Auto-generated from the group name."
              />
            </Div>

            <Div layout="grid" gap="4" className="grid-cols-2">
              <FieldInput
                name="pageLabel"
                label="Page"
                value={pageLabel}
                onChange={handlePageLabelChange}
                required
                placeholder="e.g. Checkout"
                hint="Sub-accordion within the group."
              />
              <Input
                label="Page key"
                value={pageKey}
                onChange={(e) => setPageKey(e.target.value)}
                placeholder="checkout"
                helperText="Auto-generated from the page name."
              />
            </Div>

            <FieldInput
              name="label"
              label="Test case (Yes/No question)"
              value={label}
              onChange={setLabel}
              required
              placeholder="e.g. Coupon discount is correctly reflected in the order total"
            />

            <FieldTextarea
              name="description"
              label="Description (optional)"
              value={description}
              onChange={setDescription}
              placeholder="Extra context for the tester."
            />

            <FieldInput
              name="href"
              label="Deep link (optional)"
              value={href}
              onChange={setHref}
              placeholder="/cart"
              hint="Jumps the tester straight to the feature being tested."
            />

            <Div layout="grid" gap="4" className="grid-cols-2">
              <Input
                label="Display order"
                value={String(order)}
                onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)}
                type="number"
                min={0}
                helperText="Lower = shown first within the page."
              />
              <Input
                label="Phase"
                value={String(phase)}
                onChange={(e) => setPhase(Math.max(1, parseInt(e.target.value, 10) || 1))}
                type="number"
                min={1}
                helperText="Test batch this case belongs to — testers work through one phase at a time."
              />
            </Div>

            <Stack className={`${__P.p4}`} gap="3" rounded="lg" border="default">
              <Text size="sm" weight="medium" color="muted">Visibility</Text>
              <Toggle label="Active (visible to testers)" checked={isActive} onChange={setIsActive} />
              <Toggle
                label="Admin-only (requires canTestAdmin)"
                checked={adminOnly}
                onChange={setAdminOnly}
              />
            </Stack>

            <FormErrorSummary />
            <Row gap="3" padding="t-xs">
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={!canSave || isSubmitting}
                onClick={() => {
                  clearErrors();
                  if (!label.trim()) { setFieldError("label", "Test case label is required"); return; }
                  saveMutation.mutate();
                }}
              >
                {isEdit ? "Save changes" : "Create checklist item"}
              </Button>
              {isEdit && (
                <Button
                  type="button"
                  variant="danger"
                  isLoading={deleteMutation.isPending}
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  Delete
                </Button>
              )}
            </Row>
          </>
        )}
      </Form>
      {deleteConfirmOpen && (
        <ConfirmDeleteModal
          isOpen
          title={ACTIONS.ADMIN["delete-checklist-item"].confirmation?.title ?? "Delete checklist item"}
          message={
            ACTIONS.ADMIN["delete-checklist-item"].confirmation?.body ??
            "Delete this checklist item? This cannot be undone."
          }
          onConfirm={() => { deleteMutation.mutate(); setDeleteConfirmOpen(false); }}
          onClose={() => setDeleteConfirmOpen(false)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </>
  );

  if (embedded) {
    return <Div className={`${__O.yAuto} ${__P.p4}`}>{formSection}</Div>;
  }

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={isEdit ? "Edit checklist item" : "New checklist item"}
      sections={[formSection]}
    />
  );
}
