# Appkit Styling Standard

This document defines the default styling system for appkit components.

## Goal

Every reusable component in appkit must ship with default styles from appkit itself via:

- `ComponentName.style.css` (per component)
- central import file: `src/ui/components/index.style.css`
- loaded once from `src/ui/index.ts`

Consumers can always override by passing `className` (or slot-level class props where exposed).

## Required Pattern

1. Each component keeps semantic class hooks in TSX, e.g.:
   - `appkit-button`
   - `appkit-button--primary`
   - `appkit-button__icon`
2. Each component owns its default CSS in:
   - `src/ui/components/<Component>.style.css`
3. The style file must be imported by:
   - `src/ui/components/index.style.css`
4. Components must not rely on consumer `globals.css` for base visuals.
5. `className` must remain additive for overrides.

## Naming Convention

Use BEM-like appkit-scoped selectors only:

- Block: `.appkit-component`
- Modifier: `.appkit-component--variant`
- Element: `.appkit-component__part`

Never use unscoped generic selectors for component styles.

## Override Contract

Default order in components should be:

- base class
- variant/size classes
- consumer-provided `className`

This ensures consumer classes can override defaults without patching appkit internals.

## Variant Consolidation Rules

Use a component `variant` prop when the same component shape appears in multiple surfaces with mostly styling differences (for example: homepage vs public page vs admin vs order screens).

Introduce a new variant only when all checks pass:

1. The base structure is the same (same semantic blocks/slots and behavior).
2. At least 2 surfaces already duplicate 60%+ of markup/props and differ mostly by style tokens.
3. The variant name is domain-semantic (`homepage`, `public`, `admin`, `order`) instead of visual-only (`blue`, `compact2`).
4. Accessibility remains equivalent across variants (focus, contrast, landmarks, labels).
5. The default variant remains backward compatible.

When not to add a variant:

- If behavior/data flow differs meaningfully (then split into separate components or feature wrappers).
- If the need is a one-off visual tweak (use `className` override).
- If the new prop matrix becomes hard to reason about (prefer a new component boundary).

Implementation pattern:

- Add union prop: `variant?: "default" | "homepage" | "public" | "admin" | "order"`.
- Map variant to class hooks in TSX (no inline utility bundles).
- Keep consumer override order: base -> state/variant -> consumer `className`.
- Add/adjust tests or stories for each variant used in production surfaces.

## Migration Status

### Completed

- `Button`
- `Input`
- `Textarea`
- `Typography`
- `Select`
- `Badge`
- `TextLink`
- `IconButton`
- `Alert`
- `Accordion`
- `Breadcrumb`
- `Divider`
- `Modal`
- `Drawer`
- `Pagination`
- `Progress`
- `ActiveFilterChips`
- `Spinner`
- `Skeleton`
- `RatingDisplay`
- `PriceDisplay`
- `ItemRow`
- `Tooltip`
- `TabStrip`
- `SectionTabs`
- `Layout`
- `SortDropdown`
- `TablePagination`
- `ViewToggle`
- `SummaryCard`
- `StatsGrid`
- `StatusBadge`

### Remaining (next slices)

- `BulkActionBar`
- `CountdownDisplay`
- `DescriptionField`
- `FormGrid`
- `HorizontalScroller`
- `ImageLightbox`
- `ListingLayout`
- `SideModal`
- `Slider`
- `StarRating`
- `StepperNav`
- `TagInput`

## PR/Review Checklist

- Does the component have a dedicated `.style.css` file?
- Is it imported in `index.style.css`?
- Are classes appkit-scoped and semantic?
- Does `className` still override defaults?
- Are light + dark defaults aligned with letitrip baseline design?
