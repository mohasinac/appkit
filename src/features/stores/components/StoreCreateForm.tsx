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
 * 🛑 `<SectionForm>`, not a bare `<Form>`. `audit-form-sectionised` is
 * strict-zero on multi-field forms that skip the section engine, and the engine
 * is what supplies the pinned mobile action bar, the per-section error badges
 * and the schema-driven field rendering every other form in the app has. The
 * sections come from `storeCreateSchema`'s own annotations, so the fields, their
 * labels and their validation have exactly one definition.
 *
 * 🛑 `<SectionForm>` does NOT mount a `FormShellContext` — it consumes whichever
 * one the owning view provides and tolerates none, which means a view rendering
 * only `<SectionForm>` gets section badges and no readable message anywhere.
 * This component mounts the context AND renders `<FormErrorSummary>` itself.
 *
 * The submit handler is injected rather than imported: the server action lives
 * in the consumer (`src/actions/seller.actions.ts`), and appkit must not reach
 * into it. Same slot shape as `StoreCreateProductShell`'s `onSave`/`onPublish`.
 */

import React from "react";
import { Div, Stack, Text } from "../../../ui";
import { FormShellContext, FormErrorSummary, useFormShellState } from "../../../ui/forms";
import { SectionForm, buildSectionsFromSchema, useSectionFormNav } from "../../shell";
import { PaginatedSelect } from "../../../ui/components/PaginatedSelect";
import { loadCategoryOptions } from "../../categories/utils/load-category-options";
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

  const { shellCtx, setFieldError, clearErrors, markSubmitAttempted } =
    useFormShellState(storeCreateSchema);

  const handleChange = React.useCallback((partial: Partial<StoreCreateInput>) => {
    setValues((prev) => Object.assign({}, prev, partial));
  }, []);

  /*
   * 🛑 `PaginatedSelect`, not the inferred text input: there are over a
   * thousand categories, so a flat list is unscannable and the >5-options rule
   * applies. `loadCategoryOptions` passes `listingOnly=true`, without which
   * this offers brands and bundles as categories.
   *
   * 🛑 `value={… || null}` — it renders the placeholder only on `value == null`,
   * so an empty string paints a BLANK trigger with no prompt and no hint that
   * it is a control.
   */
  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<StoreCreateInput>(storeCreateSchema, {
        renderers: {
          storeCategory: ({ values: v, onChange }) => (
            <PaginatedSelect
              name="storeCategory"
              value={(v.storeCategory as string) || null}
              onChange={(val) => onChange({ storeCategory: val ?? "" })}
              loadOptions={loadCategoryOptions}
              placeholder="Search categories… (optional)"
              searchPlaceholder="Type a category name…"
              noResultsText="No categories found"
              ariaLabel="Main category"
            />
          ),
        },
      }),
    [],
  );

  // Declared AFTER `sections`, because it takes them — it derives the ordered
  // open/closed set from the sections that are currently visible.
  const nav = useSectionFormNav<StoreCreateInput>(sections, values);

  async function submit() {
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
       * 🛑 `toUserMessage(code, t)`, never the server's own message. A
       * raw-message fallback is how a Node MODULE_NOT_FOUND with a full
       * require stack got rendered inside a buyer-facing modal (Root Cause
       * #86). `toUserMessage` terminates at a generic string and never
       * returns server text.
       */
      setFieldError(result.field ?? "storeName", toUserMessage(result.code ?? "UNKNOWN", t));
    } catch (err) {
      // Every `NormalizedError` variant carries a non-optional `code`, so
      // there is nothing to default here.
      const e = normalizeError(err);
      setFieldError("storeName", toUserMessage(e.code, t));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <FormShellContext.Provider value={shellCtx}>
      <Div>
        <Stack gap="xs" className="mb-4">
          <Text size="lg" weight="semibold">
            Open your storefront
          </Text>
          <Text size="sm" color="muted">
            You can change all of this later. Your store stays private until we
            review it.
          </Text>
        </Stack>

        <SectionForm<StoreCreateInput>
          sections={sections}
          values={values}
          onChange={handleChange}
          onSubmit={submit}
          schema={storeCreateSchema}
          openIds={nav.openIds}
          onOpenChange={nav.setOpenIds}
          isLoading={isPending}
          submitLabel="Create my store"
        />

        {/* Required whenever a schema is supplied — audit-form-error-summary. */}
        <FormErrorSummary />
      </Div>
    </FormShellContext.Provider>
  );
}
