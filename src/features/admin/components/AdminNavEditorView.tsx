"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";

import {
  Button,
  Form,
  FormActions,
  Input,
  Select,
  SideDrawer,
  Toggle,
  useToast,
} from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

// --- Types -------------------------------------------------------------------

export interface NavItemData {
  id?: string;
  label: string;
  href: string;
  icon?: string;
  order?: number;
  parentId?: string;
  isVisible?: boolean;
}

export interface AdminNavEditorViewProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  item?: NavItemData | null;
  parentOptions?: { label: string; value: string }[];
}

// --- Constants ---------------------------------------------------------------

const ICON_OPTIONS = [
  { label: "None", value: "" },
  { label: "Home", value: "home" },
  { label: "Package", value: "package" },
  { label: "Gavel", value: "gavel" },
  { label: "Clock", value: "clock" },
  { label: "Grid", value: "grid" },
  { label: "Store", value: "store" },
  { label: "Calendar", value: "calendar" },
  { label: "BookOpen", value: "book-open" },
  { label: "Star", value: "star" },
  { label: "Tag", value: "tag" },
  { label: "Link", value: "link" },
];

// --- Component ---------------------------------------------------------------

export function AdminNavEditorView({
  open,
  onClose,
  onSaved,
  item,
  parentOptions = [],
}: AdminNavEditorViewProps) {
  const isEdit = Boolean(item?.id);

  const [label, setLabel] = React.useState("");
  const [href, setHref] = React.useState("");
  const [icon, setIcon] = React.useState("");
  const [order, setOrder] = React.useState(0);
  const [parentId, setParentId] = React.useState("");
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    if (open && item) {
      setLabel(item.label ?? "");
      setHref(item.href ?? "");
      setIcon(item.icon ?? "");
      setOrder(item.order ?? 0);
      setParentId(item.parentId ?? "");
      setIsVisible(item.isVisible ?? true);
    } else if (!open) {
      setLabel("");
      setHref("");
      setIcon("");
      setOrder(0);
      setParentId("");
      setIsVisible(true);
    }
  }, [open, item]);

  const { showToast } = useToast();

  const saveMutation = useApiMutation({
    mutationFn: async () => {
      const payload = {
        label,
        href,
        icon: icon || undefined,
        order,
        parentId: parentId || undefined,
        isVisible,
      };
      if (isEdit) {
        return apiClient.patch(ADMIN_ENDPOINTS.NAVIGATION_BY_ID(item!.id!), payload);
      }
      return apiClient.post(ADMIN_ENDPOINTS.NAVIGATION, payload);
    },
    onSuccess: () => {
      showToast(isEdit ? "Nav item updated." : "Nav item created.", "success");
      onSaved();
      onClose();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to save nav item.", "error");
    },
  });

  const canSave = Boolean(label.trim()) && Boolean(href.trim());

  const parentSelectOptions = [
    { label: "None (top-level)", value: "" },
    ...parentOptions,
  ];

  return (
    <SideDrawer
      isOpen={open}
      onClose={onClose}
      title={isEdit ? "Edit Nav Item" : "New Nav Item"}
    >
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
        className="space-y-4 p-4"
      >
        <Input
          label="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
          placeholder="e.g. Products"
        />

        <Input
          label="URL / href"
          value={href}
          onChange={(e) => setHref(e.target.value)}
          required
          placeholder="/products"
          helperText="Use relative paths (e.g. /products) or full URLs."
        />

        <Select
          label="Icon (optional)"
          options={ICON_OPTIONS}
          value={icon}
          onValueChange={setIcon}
        />

        {parentOptions.length > 0 && (
          <Select
            label="Parent item (for nested nav)"
            options={parentSelectOptions}
            value={parentId}
            onValueChange={setParentId}
          />
        )}

        <Input
          label="Order"
          value={String(order)}
          onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)}
          type="number"
          min={0}
          helperText="Lower numbers appear first."
        />

        <Toggle
          label="Visible in navigation"
          checked={isVisible}
          onChange={setIsVisible}
        />

        <FormActions align="right">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={saveMutation.isPending}
            disabled={!canSave || saveMutation.isPending}
          >
            {isEdit ? "Save changes" : "Create item"}
          </Button>
        </FormActions>
      </Form>
    </SideDrawer>
  );
}
