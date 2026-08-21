"use client";

import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "@mohasinac/appkit/client";
import { Alert, Button, FieldInput, FieldSelect, FieldTextarea, Form, Grid, Row, Span, Stack, Toggle } from "../../../ui";
import { FormErrorSummary } from "../../../ui/forms";
import { MediaUploadList } from "../../media/upload/MediaUploadList";
import { useMediaUpload } from "../../media";
import type { MediaField } from "../../media/types";
import { apiClient } from "../../../http";
import { ACCOUNT_ENDPOINTS } from "../../../constants/api-endpoints";
import { createCatalogueItemSchema } from "../schemas/validation";
import type { CatalogueItemDocument } from "../schemas/firestore";

const CONDITION_OPTIONS = [
  { label: "New", value: "new" },
  { label: "Like new", value: "like_new" },
  { label: "Good", value: "good" },
  { label: "Fair", value: "fair" },
  { label: "Poor", value: "poor" },
  { label: "Used", value: "used" },
  { label: "Refurbished", value: "refurbished" },
];

export interface CatalogueItemEditorViewProps {
  item?: CatalogueItemDocument;
  onSaved?: (id: string) => void;
}

export function CatalogueItemEditorView({ item, onSaved }: CatalogueItemEditorViewProps) {
  const isCreate = !item;
  const queryClient = useQueryClient();
  const { upload } = useMediaUpload();
  const uploadIndexRef = React.useRef(0);

  const [title, setTitle] = React.useState(item?.title ?? "");
  const [description, setDescription] = React.useState(item?.description ?? "");
  const [condition, setCondition] = React.useState(item?.condition ?? "");
  const [price, setPrice] = React.useState(item?.price ? String(item.price) : "0");
  const [quantity, setQuantity] = React.useState(String(item?.quantity ?? 1));
  const [visibility, setVisibility] = React.useState<"public" | "private">(item?.visibility ?? "public");
  const [images, setImages] = React.useState<string[]>(item?.images ?? []);

  const galleryFields: MediaField[] = images.map((url) => ({ url, type: "image" }));

  const handleUpload = async (file: File): Promise<string> => {
    uploadIndexRef.current += 1;
    return upload(file, "catalogue", true, {
      type: "catalogue-image",
      item: title || "item",
      index: uploadIndexRef.current,
    });
  };

  const saveMutation = useApiMutation<CatalogueItemDocument>({
    successMessage: isCreate ? "Added to your catalogue" : "Catalogue item updated",
    mutationFn: async () => {
      const payload = {
        title,
        description: description || undefined,
        condition: condition || undefined,
        price: Math.round(Number(price) * 100) / 100,
        quantity: Number(quantity),
        visibility,
        images,
        mainImage: images[0],
      };
      if (isCreate) return apiClient.post<CatalogueItemDocument>(ACCOUNT_ENDPOINTS.CATALOGUE, payload);
      return apiClient.patch<CatalogueItemDocument>(ACCOUNT_ENDPOINTS.CATALOGUE_BY_ID(item!.id), payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["user", "catalogue"] });
      onSaved?.(saved.id);
    },
  });

  return (
    <Form schema={createCatalogueItemSchema} spacing="md">
      {({ setFieldError }) => (
        <Stack gap="md">
          {item?.listingStatus && item.listingStatus !== "not_listed" && (
            <Alert variant="info">
              This item is {item.listingStatus.replace(/_/g, " ")}
              {item.listingStatus === "rejected" && item.rejectionReason ? `: ${item.rejectionReason}` : "."}
            </Alert>
          )}
          <Grid cols={2} gap="md">
            <FieldInput name="title" label="Title" required value={title} onChange={setTitle} />
            <FieldSelect name="condition" label="Condition" value={condition} onChange={setCondition} options={CONDITION_OPTIONS} />
            <FieldInput name="price" label="Estimated resale price (₹)" type="number" min="0" value={price} onChange={setPrice} />
            <FieldInput name="quantity" label="Quantity" type="number" min="1" value={quantity} onChange={setQuantity} />
          </Grid>
          <FieldTextarea name="description" label="Description" value={description} onChange={setDescription} rows={3} />

          <MediaUploadList
            label="Photos"
            value={galleryFields}
            onChange={(fields) => setImages(fields.map((f) => f.url))}
            onUpload={handleUpload}
            accept="image/*"
            maxItems={8}
            helperText="Photos older than 30 days must be refreshed before this item can be listed."
          />

          <Row gap="sm" align="center">
            <Toggle checked={visibility === "public"} onChange={(checked) => setVisibility(checked ? "public" : "private")} size="sm" />
            <Span>{visibility === "public" ? "Public — visible on your profile" : "Private — only you can see it"}</Span>
          </Row>

          <FormErrorSummary />

          <Button
            type="button"
            isLoading={saveMutation.isPending}
            onClick={() => {
              const parsed = createCatalogueItemSchema.safeParse({
                title,
                images,
                price: Math.round(Number(price) * 100) / 100,
                quantity: Number(quantity),
                visibility,
              });
              if (!parsed.success) {
                for (const issue of parsed.error.issues) setFieldError(String(issue.path[0]), issue.message);
                return;
              }
              saveMutation.mutate();
            }}
          >
            {isCreate ? "Add to Catalogue" : "Save Changes"}
          </Button>
        </Stack>
      )}
    </Form>
  );
}
