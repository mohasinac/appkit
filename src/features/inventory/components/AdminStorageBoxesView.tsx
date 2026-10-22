"use client";
/*
 * WHY: The box registry needs the same listing chrome every other admin
 *      surface has — search, sort, pagination, a create affordance and a row
 *      you can open — and `DataListingView` is that, for ~86 configs.
 * WHAT: The config, plus the inline create drawer.
 *
 * @tag domain:inventory
 * @tag layer:feature
 * @tag access:client
 */

import React from "react";
import {
  DataListingView,
  type ListingViewConfig,
} from "../../admin/components/DataListingView";
import { Button, Div, Form, FieldInput, FieldSelect, Stack, Text } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { apiClient } from "../../../http";
import { sortBy } from "../../../constants/sort";
import { normalizeError } from "../../../errors/normalize";
import { sieveFilter, SIEVE_OP } from "../../../utils/sieve-builder";
import { operatorMessage } from "./operator-message";
import {
  BoxTypeValues,
  STORAGE_BOX_FIELDS,
  type StorageBoxDocument,
} from "../schemas/firestore";

interface BoxRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

interface BoxesResponse {
  items?: StorageBoxDocument[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

const TYPE_OPTIONS = BoxTypeValues.map((v) => ({ value: v, label: v }));

/**
 * The register-a-box form.
 *
 * Exported because it is a PAGE now, not a drawer — see the note on
 * `primaryAction` below for why create could not share the row affordance.
 */
// audit-form-sectionised-ok: a three-field quick create (code, type, location),
// not a multi-section editor. <SectionForm> derives its sections from a schema
// and pins a mobile action bar for a long scroll; neither has anything to do
// here, and sections of one field each would be chrome around three inputs.
export function RegisterBoxForm({ onCreated }: { onCreated: () => void }) {
  const [code, setCode] = React.useState("");
  const [boxType, setBoxType] = React.useState<string>(BoxTypeValues[0]);
  const [location, setLocation] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  /**
   * Create the box.
   *
   * Named rather than an inline `onClick`: inline, every statement in it
   * sat five braces deep inside the JSX, including the `apiClient.post`
   * payload and the error branch whose comment below is the whole reason
   * this catch is worth reading.
   */
  async function handleRegisterBox(helpers: {
    clearErrors: () => void;
    setFieldError: (field: string, message: string) => void;
  }) {
    const { clearErrors, setFieldError } = helpers;
      clearErrors();
      if (!code.trim()) {
        setFieldError("code", "A box needs a code");
        return;
      }
      setBusy(true);
      try {
        // Built outside the call: inline, the payload literal sat
        // five braces deep inside the JSX `onClick`.
        const payload = {
          code: code.trim(),
          boxType,
          ...(location.trim() ? { location: location.trim() } : {}),
        };
        await apiClient.post(ADMIN_ENDPOINTS.INVENTORY_BOXES, payload);
        onCreated();
      } catch (err) {
        /*
         * 🛑 `operatorMessage`, not a raw fallback. This read
         * `toUserMessage(undefined, undefined, { fallback: e.message })`
         * under a comment claiming it never showed server text —
         * which is false twice over: `undefined` for the code means
         * the map never runs, so the fallback is ALWAYS what shows.
         * A comment asserting the fix while the code reintroduces the
         * bug is how Root Cause #86 would come back, and how the seed
         * `listingType` bug survived its own fix one field over.
         *
         * The split is on status: the 409 here ("Box AC60-03 already
         * exists") is authored for this operator and must survive; a
         * 5xx terminates in a constant.
         */
        setFieldError("code", operatorMessage(normalizeError(err)));
      } finally {
        setBusy(false);
      }
  }

  return (
    <Form onSubmit={(e) => e.preventDefault()} className="space-y-4">
      {({ setFieldError, clearErrors }) => (
        <Stack gap="md">
          <FieldInput
            name="code"
            label="Box code"
            required
            value={code}
            onChange={setCode}
            placeholder="AC60-03"
            hint="Exactly what is written on the physical label."
          />
          <FieldSelect
            name="boxType"
            label="Box type"
            value={boxType}
            onChange={setBoxType}
            options={TYPE_OPTIONS}
          />
          <FieldInput
            name="location"
            label="Where it is"
            value={location}
            onChange={setLocation}
            placeholder="Shelf B, second from top"
          />
          <Text size="xs" color="muted">
            A second box with the same code is the same box — the registry
            refuses a duplicate rather than merging two.
          </Text>
          <Div>
            <Button
              type="submit"
              variant="primary"
              isLoading={busy}
              onClick={() => handleRegisterBox({ clearErrors, setFieldError })}
            >
              Register box
            </Button>
          </Div>
        </Stack>
      )}
    </Form>
  );
}

export function AdminStorageBoxesView() {
  const config: ListingViewConfig<BoxesResponse, BoxRow> = React.useMemo(
    () => ({
      portal: "admin",
      title: "Storage Boxes",
      subtitle:
        "The physical AC60 and AC30 boxes, and what is in each one. A box is here because somebody labelled it.",
      /*
       * `search.fields` names what the index actually matches — `searchTxt` is
       * built from the code, the type and the location, and nothing else. A
       * placeholder promising more is the empty-list lie the admin products
       * toolbar was making about SKUs.
       */
      search: {
        placeholder: "Search by code or location",
        fields: ["code", "boxType", "location"],
      },
      emptyLabel: "No boxes registered yet",
      filterKeys: ["status", "boxType"],
      /*
       * 🛑 REQUIRED — see the long note in `AdminMoveLedgerView`. Its absence
       * threw `TypeError: buildFilters is not a function` during render, so
       * `/admin/inventory/boxes` never painted.
       *
       * Joined with "," because sievejs reads a comma as AND: status AND
       * boxType, which is what two independent chip groups mean. A "|" would
       * be an OR-group on ONE field and is what `sieveMultiEq` is for —
       * getting that backwards is how a filter silently widens instead of
       * narrowing.
       */
      buildFilters: (state) => {
        const parts: string[] = [];
        if (state.status) parts.push(sieveFilter("status", SIEVE_OP.EQ, state.status));
        if (state.boxType) parts.push(sieveFilter("boxType", SIEVE_OP.EQ, state.boxType));
        return parts.join(",") || undefined;
      },
      /*
       * Sorted by `ordinal`, not `code`. A string sort puts AC60-10 before
       * AC60-2 — the kind of ordering that makes an operator distrust the
       * screen — which is why `ordinal` is denormalised on write.
       */
      defaultSort: sortBy(STORAGE_BOX_FIELDS.ORDINAL, "ASC"),
      sortOptions: [
        // Same expression as `defaultSort`, not a matching literal beside it —
        // `sortBy(f, "ASC")` is the bare field, so the two are identical by
        // construction. A default that is not one of the options opens the
        // dropdown with nothing selected (Root Cause #63).
        { value: sortBy(STORAGE_BOX_FIELDS.ORDINAL, "ASC"), label: "Box number" },
        { value: sortBy("createdAt", "DESC"), label: "Newest" },
        { value: sortBy("code", "ASC"), label: "Code A–Z" },
      ],
      queryKey: ["admin", "inventory", "boxes"],
      endpoint: ADMIN_ENDPOINTS.INVENTORY_BOXES,
      mapRows: (response) =>
        (response.items ?? []).map((box) => ({
          id: box.id,
          primary: box.code,
          secondary: [
            box.boxType,
            box.location,
            /*
             * The ADVISORY rollup, labelled as of its own timestamp rather
             * than presented as live. A scheduled job writes it, so a box
             * that changed an hour ago reads stale — saying "as of" is the
             * difference between a cache and a lie.
             */
            box.rollup
              ? `${box.rollup.totalUnits} units in ${box.rollup.distinctProducts} products`
              : "not yet counted",
          ]
            .filter(Boolean)
            .join(" · "),
          status: box.status,
          updatedAt: box.updatedAt ? String(box.updatedAt) : "",
        })),
      /*
       * A real detail page, so `DataListingView` gives every row the direct
       * edit affordance it composes — and a middle-clickable link, which is
       * how an operator opens three boxes to compare them.
       */
      rowHrefTemplate: "/admin/inventory/boxes/{id}",
      /*
       * 🛑 `href`, NOT `renderEditor`, and the two are mutually exclusive
       * here for a reason I nearly got wrong.
       *
       * `DataListingView` resolves its row affordances in the order
       * `onRowClick` → `renderEditor` → `rowHrefTemplate`. So a config
       * carrying BOTH a create drawer and a row href gets the drawer on every
       * row: the pencil calls `openEditPanel(row.id)` and a create form that
       * ignores the id opens, presented as an edit of that box. A create form
       * reached through an edit affordance is the clickable-card lie in a new
       * shape.
       *
       * So create is a PAGE (`primaryAction.href`, which exists for exactly
       * this per the config's own docs) and the row href is the detail page.
       * Registering a box is also not a one-field drawer job — it is the
       * moment the code is chosen, and the code is immutable afterwards
       * because the document id derives from it.
       */
      primaryAction: { label: "Register box", href: "/admin/inventory/boxes/new" },
    }),
    [],
  );

  return <DataListingView config={config} />;
}
