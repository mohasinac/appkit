"use client";

import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Button,
  Form,
  Input,
  StackedViewShell,
  Toggle,
  useToast,
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { ImageUpload } from "../../media/upload/ImageUpload";
import { useMediaUpload } from "../../media";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

export interface AdminBrandEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  brandId?: string;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
}

interface BrandPayload {
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  logoURL?: string;
  bannerURL?: string;
  website?: string;
  isActive: boolean;
  displayOrder?: number;
}

function toBrandSlug(str: string): string {
  const base = str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base.startsWith("brand-") ? base : `brand-${base}`;
}

export function AdminBrandEditorView({
  brandId,
  onSaved,
  onDeleted,
  ...rest
}: AdminBrandEditorViewProps) {
  const isEdit = Boolean(brandId);

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugManual, setSlugManual] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [logoURL, setLogoURL] = React.useState("");
  const [bannerURL, setBannerURL] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [displayOrder, setDisplayOrder] = React.useState<string>("");
  const { showToast } = useToast();

  const brandQuery = useQuery({
    queryKey: ["admin", "brand", brandId],
    queryFn: async () => {
      const res = await apiClient.get(ADMIN_ENDPOINTS.BRAND_BY_ID(brandId!));
      return (res as any)?.data ?? res;
    },
    enabled: isEdit,
  });

  React.useEffect(() => {
    const brand = brandQuery.data as BrandPayload | undefined;
    if (!brand) return;
    setName(brand.name ?? "");
    setSlug(brand.slug ?? "");
    setSlugManual(true);
    setDescription(brand.description ?? "");
    setLogoURL(brand.logoURL ?? "");
    setBannerURL(brand.bannerURL ?? "");
    setWebsite(brand.website ?? "");
    setIsActive(brand.isActive ?? true);
    setDisplayOrder(brand.displayOrder !== undefined ? String(brand.displayOrder) : "");
  }, [brandQuery.data]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugManual) setSlug(toBrandSlug(value));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: BrandPayload = {
        name,
        slug: slug || toBrandSlug(name),
        description: description || undefined,
        logoURL: logoURL || undefined,
        bannerURL: bannerURL || undefined,
        website: website || undefined,
        isActive,
        displayOrder: displayOrder !== "" ? Number(displayOrder) : undefined,
      };
      if (isEdit) {
        return apiClient.put(ADMIN_ENDPOINTS.BRAND_BY_ID(brandId!), payload);
      }
      return apiClient.post(ADMIN_ENDPOINTS.BRANDS, payload);
    },
    onSuccess: (res: unknown) => {
      const id = (res as any)?.data?.id ?? (res as any)?.id ?? brandId;
      showToast(isEdit ? "Brand updated." : "Brand created.", "success");
      if (onSaved && id) onSaved(id);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to save brand.", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(ADMIN_ENDPOINTS.BRAND_BY_ID(brandId!)),
    onSuccess: () => {
      showToast("Brand deleted.", "success");
      if (onDeleted) onDeleted();
    },
    onError: (err: unknown) => showToast((err as Error)?.message ?? "Failed to delete brand.", "error"),
  });

  const { upload } = useMediaUpload();

  const isSubmitting = saveMutation.isPending || brandQuery.isLoading;

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={isEdit ? "Edit Brand" : "Create Brand"}
      sections={[
        <Form
          key="brand-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Brand name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            placeholder="e.g. Hot Wheels"
          />

          <Input
            label="Slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugManual(true);
            }}
            placeholder="brand-hot-wheels"
            helperText="Auto-generated from name. Must start with 'brand-'."
          />

          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the brand"
          />

          <ImageUpload
            label="Logo"
            currentImage={logoURL}
            onUpload={(file) => upload(file, "brands")}
            onChange={setLogoURL}
          />

          <ImageUpload
            label="Banner"
            currentImage={bannerURL}
            onUpload={(file) => upload(file, "brands")}
            onChange={setBannerURL}
          />

          <Input
            label="Website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://brand.com"
            type="url"
          />

          <Input
            label="Display order"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            type="number"
            min={0}
            placeholder="0"
          />

          <Toggle
            label="Active"
            checked={isActive}
            onChange={setIsActive}
          />

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={!name || isSubmitting}
            >
              {isEdit ? "Save changes" : "Create brand"}
            </Button>
            {isEdit && (
              <Button
                type="button"
                variant="danger"
                isLoading={deleteMutation.isPending}
                onClick={() => {
                  if (confirm("Delete this brand? This cannot be undone.")) {
                    deleteMutation.mutate();
                  }
                }}
              >
                Delete brand
              </Button>
            )}
          </div>
        </Form>,
      ]}
    />
  );
}
