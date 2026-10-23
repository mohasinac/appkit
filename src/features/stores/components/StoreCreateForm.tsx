"use client";

/**
 * The store-creation form — step 2 of becoming a seller.
 *
 * 🛑 Why this exists. `createStoreAction` has been in the codebase with **no
 * caller and no API route**, there was no `/store/create` page, and
 * `/user/become-seller` collected ZERO fields — it was marketing copy and one
 * button that flipped `role` to `seller` and set `storeStatus: "pending"`. So a
 * real applicant became a seller and then could not open a storefront by any
 * route in the product. Only `role: "tester"` got a store, via the auto-approve
 * branch in `becomeSeller`. This form is the missing step.
 *
 * The submit handler is injected rather than imported: the server action lives
 * in the consumer (`src/actions/seller.actions.ts`), and appkit must not reach
 * into it. Same slot shape as `StoreCreateProductShell`'s `onSave`/`onPublish`.
 */

import React from "react";
import { Button, Label, Stack, Text } from "../../../ui";
// `<Form>` is a component, not a forms-barrel export — the forms barrel
// carries the Field* primitives and the FormShell state, not the <form> wrapper.
import { Form } from "../../../ui/components/Form";
import { FieldInput, FieldTextarea, FormErrorSummary } from "../../../ui/forms";
import { PaginatedSelect } from "../../../ui/components/PaginatedSelect";
import { loadCategoryOptions } from "../../categories/utils/load-category-options";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { storeCreateSchema, type StoreCreateInput } from "../schemas/store-create";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";
import { useTranslations } from "next-intl";

export interface StoreCreateFormResult {
  ok: boolean;
  /** Stable error CODE, never a server message — see the submit handler. */
  code?: string;
  /** Which field the failure belongs to, when the server can say. */
  field?: keyof StoreCreateInput;
}

export interface StoreCreateFormProps {
  /**
   * Performs the create. Resolves `{ ok: true }` on success, or
   * `{ ok: false, code }` with a mapped error code.
   */
  onSubmit: (input: StoreCreateInput) => Promise<StoreCreateFormResult>;
  /** Called after a successful create, for the consumer's redirect/toast. */
  onCreated?: () => void;
}

export function StoreCreateForm({ onSubmit, onCreated }: StoreCreateFormProps) {
  const t = useTranslations();
  const [values, setValues] = React.useState<StoreCreateInput>({
    storeName: "",
    storeDescription: "",
    storeCategory: "",
  });
  const [isPending, setIsPending] = React.useState(false);

  const set = <K extends keyof StoreCreateInput>(key: K, value: StoreCreateInput[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  return (
    <Form
      schema={storeCreateSchema}
      spacing="md"
      surface="card"
      padding="lg"
      /*
       * The native submit is suppressed; the Button's onClick owns the flow so
       * it can validate, map a server code onto a field, and await the action.
       * This is the shape Rule #9's canonical example uses.
       */
      onSubmit={(e) => e.preventDefault()}
    >
      {({ setFieldError, clearErrors, markSubmitAttempted }) => (
        <>
          <Stack gap="xs">
            <Text size="lg" weight="semibold">
              Open your storefront
            </Text>
            <Text size="sm" color="muted">
              You can change all of this later. Your store stays private until we
              review it.
            </Text>
          </Stack>

          <FieldInput
            name="storeName"
            label="Store name"
            required
            maxLength={80}
            value={values.storeName}
            onChange={(v) => set("storeName", v)}
            hint="Buyers see this. It also forms your store's web address."
          />

          <FieldTextarea
            name="storeDescription"
            label="What do you sell?"
            rows={4}
            maxLength={10000}
            showCharCount
            value={values.storeDescription ?? ""}
            onChange={(v) => set("storeDescription", v)}
            hint="Optional. A short introduction for your storefront page."
          />

          {/*
           * 🛑 `PaginatedSelect`, not `<Select>`: there are over a thousand
           * categories, so a flat list is unscannable and the >5-options rule
           * applies. `loadCategoryOptions` passes `listingOnly=true`, without
           * which this offers brands and bundles as categories.
           *
           * 🛑 `value={… || null}` — it renders the placeholder only on
           * `value == null`, so an empty string paints a BLANK trigger with no
           * prompt and no hint that it is a control.
           *
           * `PaginatedSelect` takes no `label` prop, hence the explicit
           * `<Label>` + `ariaLabel` pairing used by every other call site.
           */}
          <Stack gap="xs">
            <Label htmlFor="storeCategory">Main category</Label>
            <PaginatedSelect
              name="storeCategory"
              value={values.storeCategory || null}
              onChange={(val) => set("storeCategory", val ?? "")}
              loadOptions={loadCategoryOptions}
              placeholder="Search categories… (optional)"
              searchPlaceholder="Type a category name…"
              noResultsText="No categories found"
              ariaLabel="Main category"
            />
            <Text size="xs" color="muted">
              Optional. Helps buyers browsing that category find your store.
            </Text>
          </Stack>

          {/* Required whenever a schema is supplied — audit-form-error-summary. */}
          <FormErrorSummary />

          {/*
           * `type="button"`, not `"submit"`. The flow is owned entirely by this
           * handler, so a native submit event would only mean `<Form>` marks
           * the attempt a second time. That also makes the explicit
           * `markSubmitAttempted()` below required rather than belt-and-braces
           * — without a native submit, nothing else marks it, and
           * `<FormErrorSummary>` stays hidden on a failed save.
           */}
          <Button
            type="button"
            action={ACTIONS.STORE["create-store"]}
            isLoading={isPending}
            className="self-start"
            onClick={async () => {
              clearErrors();
              markSubmitAttempted();
              const parsed = storeCreateSchema.safeParse(values);
              if (!parsed.success) {
                for (const issue of parsed.error.issues) {
                  setFieldError(String(issue.path[0]), issue.message);
                }
                return;
              }
              setIsPending(true);
              try {
                const result = await onSubmit(parsed.data);
                if (result.ok) {
                  onCreated?.();
                  return;
                }
                /*
                 * 🛑 `toUserMessage(code, t)`, never the server's own message.
                 * A raw-message fallback is how a Node MODULE_NOT_FOUND with a
                 * full require stack got rendered inside a buyer-facing modal
                 * (Root Cause #86). `toUserMessage` terminates at a generic
                 * string and never returns server text.
                 */
                setFieldError(
                  result.field ?? "storeName",
                  toUserMessage(result.code ?? "UNKNOWN", t),
                );
              } catch (err) {
                // Every `NormalizedError` variant carries a non-optional
                // `code`, so there is nothing to default here.
                const e = normalizeError(err);
                setFieldError("storeName", toUserMessage(e.code, t));
              } finally {
                setIsPending(false);
              }
            }}
          />
        </>
      )}
    </Form>
  );
}
