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
import { toUserMessage } from "../../../errors/error-display-map";
import { BoxTypeValues, type StorageBoxDocument } from "../schemas/firestore";

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
export function RegisterBoxForm({ onCreated }: { onCreated: () => void }) {
  const [code, setCode] = React.useState("");
  const [boxType, setBoxType] = React.useState<string>(BoxTypeValues[0]);
  const [location, setLocation] = React.useState("");
  const [busy, setBusy] = React.useState(false);

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
            helperText="Exactly what is written on the physical label."
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
              onClick={async () => {
                clearErrors();
                if (!code.trim()) {
                  setFieldError("code", "A box needs a code");
                  return;
                }
                setBusy(true);
                try {
                  await apiClient.post(ADMIN_ENDPOINTS.INVENTORY_BOXES, {
                    code: code.trim(),
                    boxType,
                    ...(location.trim() ? { location: location.trim() } : {}),
                  });
                  onCreated();
                } catch (err) {
                  /*
                   * 🛑 Through `toUserMessage`, never the server's own text.
                   * A raw fallback is how a Node `MODULE_NOT_FOUND` with a
                   * require stack ended up rendered inside a bid modal (Root
                   * Cause #86) — and the 409 here has a real message the map
                   * resolves.
                   */
                  const e = normalizeError(err);
                  setFieldError(
                    "code",
                    toUserMessage(undefined, undefined, { fallback: e.message }),
                  );
                } finally {
                  setBusy(false);
                }
              }}
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
       * Sorted by `ordinal`, not `code`. A string sort puts AC60-10 before
       * AC60-2 — the kind of ordering that makes an operator distrust the
       * screen — which is why `ordinal` is denormalised on write.
       */
      defaultSort: "ordinal",
      sortOptions: [
        { value: "ordinal", label: "Box number" },
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
