"use client";
import React, { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Input } from "./Input";
import { SideDrawer } from "./SideDrawer";
import { Button } from "./Button";
import { QuickFormDrawer } from "../../features/shell/QuickFormDrawer";
import type { QuickFieldDef } from "../../features/shell/QuickFormDrawer";
import type { FirestoreDocument, FormValues } from "../../schemas/types";
import { normalizeError } from "../../errors/normalize";

export interface PaginatedSelectOption<V = string> {
  value: V;
  label: string;
  meta?: FirestoreDocument;
}

export interface AsyncPage<T> {
  items: T[];
  hasMore: boolean;
  nextPage?: number;
}

interface BaseProps<V> {
  options?: PaginatedSelectOption<V>[];
  loadOptions?: (
    query: string,
    page: number,
  ) => Promise<AsyncPage<PaginatedSelectOption<V>>>;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  /** "+ Create new …" button. Provide `renderCreateForm` OR (`createFields` + `onCreateSubmit`). */
  createLabel?: string;
  drawerTitle?: string;
  renderCreateForm?: (props: {
    onCreated: (option: PaginatedSelectOption<V>) => void;
    onCancel: () => void;
  }) => ReactNode;
  createFields?: QuickFieldDef[];
  /** Zod schema for the inline create form — forwarded to QuickFormDrawer. */
  createSchema?: import("zod").ZodType<FormValues> | import("zod").ZodType<unknown>;
  onCreateSubmit?: (
    values: FormValues,
  ) => Promise<PaginatedSelectOption<V>>;
  createSubmitLabel?: string;

  /*
   * ── Edit the SELECTED option (C2c) ──────────────────────────────────────
   *
   * A pencil beside the current selection, mirroring create exactly: same
   * `SideDrawer`, same `QuickFormDrawer`, same Zod schema, same validated
   * route. Single-select only — "edit which of these four chips" is a question
   * this trigger cannot ask, and a wrong answer silently edits the wrong row.
   *
   * 🛑 CREATE AND EDIT ARE NOT SYMMETRICAL, and omitting `onEdit*` is both
   * the default and the safe choice. Creating affects only the new row;
   * editing a SHARED row changes it for everyone already pointing at it.
   *
   *   address (own)  create ✅  edit ✅ — they own the row
   *   sublisting     create ✅  edit ✅ — for the owner
   *   tax code       create ✅  edit ❌ — a wrong rate mis-invoices everything
   *                                       filed under it
   *   category       create ✅  edit ❌ — renaming reshapes the tree
   *   brand          create ✅  edit 🛑 NEVER — `BrandDetailPageView` filters
   *                  on the DISPLAY NAME, so a rename silently orphans the
   *                  entire catalogue of that brand
   *
   * Which is why there is no `allowEdit` boolean: a caller has to supply a
   * form and a submit handler, so "editable" is never reachable by accident.
   */
  editLabel?: string;
  editDrawerTitle?: string;
  renderEditForm?: (props: {
    value: V;
    option: PaginatedSelectOption<V> | null;
    onEdited: (option: PaginatedSelectOption<V>) => void;
    onCancel: () => void;
  }) => ReactNode;
  editFields?: QuickFieldDef[];
  editSchema?: import("zod").ZodType<FormValues> | import("zod").ZodType<unknown>;
  /** Seed the quick form from the row being edited. */
  onEditLoad?: (value: V) => Promise<FormValues>;
  onEditSubmit?: (
    value: V,
    values: FormValues,
  ) => Promise<PaginatedSelectOption<V>>;
  editSubmitLabel?: string;
}

interface SingleProps<V> extends BaseProps<V> {
  multiple?: false;
  value?: V | null;
  onChange?: (value: V | null, option: PaginatedSelectOption<V> | null) => void;
}

interface MultiProps<V> extends BaseProps<V> {
  multiple: true;
  value: V[];
  onChange: (values: V[], options: PaginatedSelectOption<V>[]) => void;
  maxChipsVisible?: number;
}

export type PaginatedSelectProps<V = string> = SingleProps<V> | MultiProps<V>;

const C = {
  root: "appkit-ps",
  chips: "appkit-ps__chips",
  chip: "appkit-ps__chip",
  chipLabel: "appkit-ps__chip-label",
  chipRemove: "appkit-ps__chip-remove",
  overflowChip: "appkit-ps__overflow-chip",
  trigger: "appkit-ps__trigger",
  triggerDisabled: "appkit-ps__trigger--disabled",
  placeholder: "appkit-ps__placeholder",
  triggerLeft: "appkit-ps__trigger-left",
  dropdown: "appkit-ps__dropdown",
  dropdownUp: "appkit-ps__dropdown--up",
  search: "appkit-ps__search",
  list: "appkit-ps__list",
  option: "appkit-ps__option",
  optionSelected: "appkit-ps__option--selected",
  checkbox: "appkit-ps__checkbox",
  checkmark: "appkit-ps__checkmark",
  optionLabel: "appkit-ps__option-label",
  empty: "appkit-ps__empty",
  loading: "appkit-ps__loading",
  loadMore: "appkit-ps__load-more",
  createBtn: "appkit-ps__create-btn",
  editBtn: "appkit-ps__edit-btn",
} as const;

const CREATE_SENTINEL = "__paginated_select_create__";

/**
 * Selected VALUES paired back with their options, for `onChange`.
 *
 * `handleSelect` and `removeChip` carried these identical four lines, and the
 * fallback chain is load-bearing rather than defensive: a value chosen on page
 * 3 is no longer in `resolvedOptions` once the search box is retyped, so
 * resolving from that list alone would hand the caller a chip labelled with its
 * own raw value. `labels` is the cache that survives a list change; `String(v)`
 * is the last resort, not the first.
 *
 * At module scope, taking its three inputs explicitly, so it costs the
 * component no lines — `audit-code-quality` measures significant lines INSIDE
 * a function, and this file's component is a long one.
 */
function pairValuesWithOptions<V>(
  values: readonly V[],
  resolved: readonly PaginatedSelectOption<V>[],
  labels: Map<V, string>,
): PaginatedSelectOption<V>[] {
  return values.map(
    (v) =>
      resolved.find((o) => o.value === v) ?? {
        value: v,
        label: labels.get(v) ?? String(v),
      },
  );
}

/**
 * Is this value currently selected?
 *
 * Module scope for the same reason as `pairValuesWithOptions` above — it needs
 * nothing from the render closure, so it costs the component no lines against
 * the significant-line limit.
 *
 * The cast pair is how the discriminated props union is read: `isMulti` IS the
 * discriminant, so each branch narrows to exactly one of the two shapes.
 */
function isValueSelected<V>(
  value: V,
  props: PaginatedSelectProps<V>,
  isMulti: boolean,
): boolean {
  if (isMulti) return (props as MultiProps<V>).value.includes(value);
  return (props as SingleProps<V>).value === value;
}

/**
 * PaginatedSelect — searchable, async-paginated select with optional multi-mode
 * and optional inline create-new drawer.
 *
 * @example single-select
 * <PaginatedSelect value={storeId} onChange={setStoreId} loadOptions={loadStores} />
 *
 * @example single-select with inline create
 * <PaginatedSelect
 *   value={categoryId}
 *   onChange={(v) => setCategoryId(v ?? "")}
 *   loadOptions={loadCategories}
 *   createLabel="Category"
 *   renderCreateForm={({ onCreated, onCancel }) => <CategoryForm ... />}
 * />
 *
 * @example multi-select
 * <PaginatedSelect multiple value={tagIds} onChange={setTagIds} loadOptions={loadTags} />
 */
export function PaginatedSelect<V = string>(props: PaginatedSelectProps<V>) {
  const {
    options,
    loadOptions,
    placeholder = "Select...",
    searchPlaceholder = "Search...",
    noResultsText = "No results",
    disabled,
    className = "",
    ariaLabel,
    createLabel,
    drawerTitle,
    renderCreateForm,
    createFields,
    createSchema,
    onCreateSubmit,
    createSubmitLabel,
    editLabel,
    editDrawerTitle,
    renderEditForm,
    editFields,
    editSchema,
    onEditLoad,
    onEditSubmit,
    editSubmitLabel,
  } = props;
  const isMulti = props.multiple === true;
  const maxChipsVisible = isMulti ? (props as MultiProps<V>).maxChipsVisible ?? 3 : 0;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [opensUp, setOpensUp] = useState(false);
  const [asyncOptions, setAsyncOptions] = useState<PaginatedSelectOption<V>[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  /*
   * 🛑 A failed load is NOT "no results".
   *
   * `load` below had `try`/`finally` with no `catch`, so a rejected
   * `loadOptions` left `asyncOptions` untouched and the dropdown rendered
   * "No results" — reporting a 500 as a measured zero. That is what made a
   * missing Firestore composite index on the category picker look like an
   * empty taxonomy: the route threw FAILED_PRECONDITION, ApiClient rejected,
   * and the user saw a confident, wrong answer.
   */
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelMap = useRef<Map<V, string>>(new Map());
  // Monotonic counter guarding against out-of-order async responses: a
  // slower earlier request (e.g. for an already-abandoned search query)
  // must never overwrite state after a faster, more recent request resolved.
  const requestIdRef = useRef(0);
  const wasOpenRef = useRef(false);

  const hasCreate = Boolean(
    createLabel && (renderCreateForm ?? (createFields && onCreateSubmit)),
  );
  /*
   * 🛑 Single-select only, and gated on an actual selection.
   *
   * "Edit which of these four chips" is a question one pencil cannot ask, and
   * guessing would silently edit the wrong shared row. And with nothing
   * selected there is no row to edit, so the control must not be reachable —
   * an enabled pencil over an empty value is an invitation to a 404 the user
   * cannot interpret.
   */
  const selectedValue = !isMulti ? (props as SingleProps<V>).value ?? null : null;
  const hasEdit = Boolean(
    editLabel &&
      selectedValue != null &&
      (renderEditForm ?? (editFields && onEditSubmit)),
  );
  const [editOpen, setEditOpen] = useState(false);
  const [editInitialValues, setEditInitialValues] = useState<FormValues>({});
  const resolvedOptions = options ?? asyncOptions;

  resolvedOptions.forEach((o) => labelMap.current.set(o.value, o.label));

  /*
   * 🛑 Resolve the label of an ALREADY-SELECTED value, once, on mount.
   *
   * The trigger's label chain ends in `String(sp.value)` — the raw id — and
   * before the dropdown has ever been opened both earlier links are empty:
   * `resolvedOptions` is `[]` and `labelMap` is populated only BY loading. So
   * every edit form that mounts a PaginatedSelect over an existing record
   * rendered its foreign key at the user. Measured on the seller listing
   * editor, the Category field read `category-burst-superking` where the
   * public page's own chips read "Superking".
   *
   * Fixing it here rather than at the call sites is deliberate: there are 20+
   * of them across the admin and seller editors, and most do not know the
   * display name either — they hold the id, which is exactly the problem. A
   * `valueLabel` prop would therefore fix the handful that could pass one and
   * leave the rest rendering ids.
   *
   * Cost is bounded to the broken case: it runs ONLY when a value is selected
   * AND its label is unknown AND the options are async. A select whose value
   * is null (a create form) or whose label is already known fetches nothing.
   * It seeds `labelMap` alone and never touches `asyncOptions`, so it cannot
   * race the dropdown's own list or its search.
   */
  const [labelVersion, setLabelVersion] = useState(0);
  const labelResolveRef = useRef(false);
  const selectedValues: V[] = isMulti
    ? (props as MultiProps<V>).value
    : (props as SingleProps<V>).value == null
      ? []
      : [(props as SingleProps<V>).value as V];
  const unresolvedKey = selectedValues
    .filter((v) => !labelMap.current.has(v))
    .map((v) => String(v))
    .join(" ");

  useEffect(() => {
    if (!loadOptions || !unresolvedKey || labelResolveRef.current) return;
    labelResolveRef.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const response = await loadOptions("", 1);
        if (cancelled) return;
        response.items.forEach((o) => labelMap.current.set(o.value, o.label));
        setLabelVersion((n) => n + 1);
        // audit-silent-degrade-ok: this effect only ever UPGRADES the trigger from
        // the raw id to a display name. On failure it keeps the id — the behaviour
        // every caller had before it existed — and the control stays fully operable,
        // since opening the dropdown re-loads options through `load`, which surfaces
        // its own errors. There is nothing here a user or an operator could act on.
      } catch (err) {
        void normalizeError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadOptions, unresolvedKey]);
  void labelVersion; // re-render trigger only; the labels live in labelMap

  const load = useCallback(
    async (search: string, nextPage: number, reset = false) => {
      if (!loadOptions) return;
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setLoadError(null);
      try {
        const response = await loadOptions(search, nextPage);
        // A newer request (new search, or the dropdown reopened) was issued
        // while this one was in flight — its response is stale, discard it
        // rather than clobbering state a more recent request already set.
        if (requestId !== requestIdRef.current) return;
        setAsyncOptions((prev) => {
          const merged = reset ? response.items : [...prev, ...response.items];
          merged.forEach((o) => labelMap.current.set(o.value, o.label));
          return merged;
        });
        setPage(nextPage);
        setHasMore(response.hasMore);
      } catch (err) {
        const normalized = normalizeError(err);
        // Same staleness rule as the success path: a superseded request must
        // not paint its failure over a newer request's results.
        if (requestId === requestIdRef.current) {
          setLoadError(normalized.message || "Could not load options.");
          if (reset) setAsyncOptions([]);
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [loadOptions],
  );

  useEffect(() => {
    if (!open || !loadOptions) {
      wasOpenRef.current = false;
      return;
    }
    // Load immediately the moment the dropdown opens; debounce subsequent
    // reloads triggered by the user typing so every keystroke doesn't fire
    // a new request.
    const isFreshOpen = !wasOpenRef.current;
    wasOpenRef.current = true;
    if (isFreshOpen) {
      void load(query, 1, true);
      return;
    }
    const timer = setTimeout(() => {
      void load(query, 1, true);
    }, 300);
    return () => clearTimeout(timer);
  }, [open, query, load, loadOptions]);

  useEffect(() => {
    if (!open || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setOpensUp(spaceBelow < 220 && rect.top > 220);
  }, [open]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeydown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeydown);
    };
  }, []);

  const filtered = options
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()),
      )
    : resolvedOptions;

  const pairWithOptions = (values: readonly V[]) =>
    pairValuesWithOptions(values, resolvedOptions, labelMap.current);

  function handleSelect(opt: PaginatedSelectOption<V>) {
    if (isMulti) {
      const mp = props as MultiProps<V>;
      const nextValues = mp.value.includes(opt.value)
        ? mp.value.filter((v) => v !== opt.value)
        : [...mp.value, opt.value];
      mp.onChange(nextValues, pairWithOptions(nextValues));
    } else {
      const sp = props as SingleProps<V>;
      sp.onChange?.(opt.value, opt);
      setOpen(false);
    }
  }

  function removeChip(v: V) {
    if (!isMulti) return;
    const mp = props as MultiProps<V>;
    const nextValues = mp.value.filter((x) => x !== v);
    mp.onChange(nextValues, pairWithOptions(nextValues));
  }

  function handleCreated(option: PaginatedSelectOption<V>) {
    setDrawerOpen(false);
    labelMap.current.set(option.value, option.label);
    if (isMulti) {
      const mp = props as MultiProps<V>;
      const nextValues = [...mp.value, option.value];
      const nextOptions = nextValues.map((v) => {
        const found = resolvedOptions.find((o) => o.value === v);
        return found ?? { value: v, label: labelMap.current.get(v) ?? String(v) };
      });
      mp.onChange(nextValues, nextOptions);
    } else {
      const sp = props as SingleProps<V>;
      sp.onChange?.(option.value, option);
    }
  }

  /**
   * An edit landed. Refresh the label and re-announce the SAME value.
   *
   * 🛑 Deliberately re-emits `onChange` with an unchanged value, which looks
   * redundant and is not: the caller's rendered label comes from the option,
   * so a rename that did not re-emit would leave the trigger showing the old
   * name until something else forced a reload — i.e. the edit would look like
   * it had failed.
   */
  /*
   * Load the real row when the drawer opens, not on every render.
   *
   * 🛑 It must CLEAR first. Keeping the previous row's values while the fetch
   * is in flight would show one record's fields under another record's title,
   * and a fast submit would write them — editing row B with row A's data.
   */
  useEffect(() => {
    if (!editOpen || !onEditLoad || selectedValue == null) return;
    let cancelled = false;
    setEditInitialValues({});
    void onEditLoad(selectedValue).then((vals) => {
      if (!cancelled) setEditInitialValues(vals);
    });
    return () => {
      cancelled = true;
    };
  }, [editOpen, selectedValue, onEditLoad]);

  function handleEdited(option: PaginatedSelectOption<V>) {
    setEditOpen(false);
    labelMap.current.set(option.value, option.label);
    setLabelVersion((v) => v + 1);
    const sp = props as SingleProps<V>;
    sp.onChange?.(option.value, option);
  }

  const triggerLabel = (() => {
    if (isMulti) {
      const mp = props as MultiProps<V>;
      return mp.value.length === 0 ? placeholder : `${mp.value.length} selected`;
    }
    const sp = props as SingleProps<V>;
    if (sp.value == null) return placeholder;
    return (
      resolvedOptions.find((o) => o.value === sp.value)?.label ??
      labelMap.current.get(sp.value) ??
      String(sp.value)
    );
  })();

  const triggerEmpty = isMulti
    ? (props as MultiProps<V>).value.length === 0
    : (props as SingleProps<V>).value == null;

  const multiValue = isMulti ? (props as MultiProps<V>).value : [];
  const visibleChips = multiValue.slice(0, maxChipsVisible);
  const overflowCount = multiValue.length - maxChipsVisible;

  return (
    <>
      <div
        ref={containerRef}
        className={[C.root, className].filter(Boolean).join(" ")}
        aria-label={ariaLabel}
      >
        {/* chips row (multi only) */}
        {isMulti && multiValue.length > 0 && (
          <div className={C.chips}>
            {visibleChips.map((v) => (
              <span key={String(v)} className={C.chip}>
                <span className={C.chipLabel}>
                  {labelMap.current.get(v) ?? String(v)}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    aria-label="Remove"
                    className={C.chipRemove}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeChip(v);
                    }}
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
            {overflowCount > 0 && (
              <span className={C.overflowChip}>+{overflowCount} more</span>
            )}
          </div>
        )}

        {/* trigger */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className={[C.trigger, disabled ? C.triggerDisabled : ""]
            .filter(Boolean)
            .join(" ")}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span className={C.triggerLeft}>
            <span className={triggerEmpty ? C.placeholder : ""}>
              {triggerLabel}
            </span>
          </span>
          <span aria-hidden="true">▾</span>
        </button>
        {/*
          The pencil sits OUTSIDE the trigger button, not inside it. A button
          nested in a button is invalid HTML and the browser's recovery is to
          hoist it out, after which the click target is whichever one the
          engine decided — so the pencil would open the dropdown on some
          browsers and the editor on others.
        */}
        {hasEdit && !disabled ? (
          <button
            type="button"
            className={C.editBtn}
            aria-label={`Edit ${editLabel}`}
            title={`Edit ${editLabel}`}
            onClick={() => {
              setOpen(false);
              setEditOpen(true);
            }}
          >
            ✎
          </button>
        ) : null}

        {/* dropdown */}
        {open && (
          <div
            className={[C.dropdown, opensUp ? C.dropdownUp : ""].filter(Boolean).join(" ")}
            role="listbox"
            aria-multiselectable={isMulti || undefined}
          >
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className={C.search}
            />
            <ul className={C.list}>
              {filtered.map((opt, idx) => {
                const selected = isValueSelected(opt.value, props, isMulti);
                return (
                  <li key={`${String(opt.value)}-${idx}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={[C.option, selected ? C.optionSelected : ""]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => handleSelect(opt)}
                    >
                      {isMulti && (
                        <span className={C.checkbox} aria-hidden="true">
                          <span className={C.checkmark}>✓</span>
                        </span>
                      )}
                      <span className={C.optionLabel}>{opt.label}</span>
                    </button>
                  </li>
                );
              })}

              {/*
                A failure and an empty result are different answers and must
                read differently — "No results" for a 500 is the same class of
                lie as a swallowed query error. The retry is offered because
                the common causes (a cold index, a transient 5xx) succeed on a
                second attempt.
              */}
              {loadError && !loading && (
                <li className={C.empty} role="alert">
                  {loadError}{" "}
                  <Button variant="ghost" size="sm" onClick={() => void load(query, 1, true)}>
                    Try again
                  </Button>
                </li>
              )}

              {!loadError && filtered.length === 0 && !loading && (
                <li className={C.empty}>{noResultsText}</li>
              )}

              {loading && <li className={C.loading}>Loading…</li>}{/* audit-spinner-defaults-ok — paginated-select dropdown loader, inline by design */}

              {hasMore && !loading && (
                <li>
                  <button
                    type="button"
                    className={C.loadMore}
                    onClick={() => void load(query, page + 1)}
                  >
                    Load more
                  </button>
                </li>
              )}

              {hasCreate && (
                <li key={CREATE_SENTINEL}>
                  <button
                    type="button"
                    className={C.createBtn}
                    onClick={() => {
                      setOpen(false);
                      setDrawerOpen(true);
                    }}
                  >
                    + Create new {createLabel}
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* create drawer */}
      {hasCreate && renderCreateForm ? (
        <SideDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={drawerTitle ?? `Create ${createLabel}`}
          mode="create"
          footer={
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
          }
        >
          {renderCreateForm({
            onCreated: handleCreated,
            onCancel: () => setDrawerOpen(false),
          })}
        </SideDrawer>
      ) : hasCreate && createFields && onCreateSubmit ? (
        <QuickFormDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={drawerTitle ?? `Create ${createLabel}`}
          fields={createFields}
          schema={createSchema}
          submitLabel={createSubmitLabel ?? `Create ${createLabel}`}
          onSubmit={async (values) => {
            const option = await onCreateSubmit(values);
            handleCreated(option);
          }}
        />
      ) : null}

      {/*
        edit drawer — the same two shapes as create, in the same order, so a
        caller that knows one knows the other. `mode="edit"` rather than
        "create" so the chrome reads as an edit.
      */}
      {hasEdit && renderEditForm && selectedValue != null ? (
        <SideDrawer
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          title={editDrawerTitle ?? `Edit ${editLabel}`}
          mode="edit"
          footer={
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
          }
        >
          {renderEditForm({
            value: selectedValue,
            option: resolvedOptions.find((o) => o.value === selectedValue) ?? null,
            onEdited: handleEdited,
            onCancel: () => setEditOpen(false),
          })}
        </SideDrawer>
      ) : hasEdit && editFields && onEditSubmit && selectedValue != null ? (
        <QuickFormDrawer
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          title={editDrawerTitle ?? `Edit ${editLabel}`}
          fields={editFields}
          schema={editSchema}
          /*
           * 🛑 Seeded from `onEditLoad`, not from the option.
           *
           * The option carries a value and a LABEL — nothing else. An edit
           * form seeded from it would render every other field empty, and a
           * quick form submits what it holds, so saving would blank the row's
           * description, its HSN code, whatever it had. Loading the real row
           * is the difference between an edit form and a destructive one.
           */
          defaultValues={editInitialValues}
          submitLabel={editSubmitLabel ?? `Save ${editLabel}`}
          onSubmit={async (values) => {
            const option = await onEditSubmit(selectedValue, values);
            handleEdited(option);
          }}
        />
      ) : null}
    </>
  );
}
