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

Add a `variant` prop only when the **structure is identical** across surfaces but styling differs meaningfully enough that `className` overrides would be repeated in 3+ places.

### Variant names must describe structure or visual weight — never location or role

| Wrong (location/role)         | Right (structure/weight)           |
| ----------------------------- | ---------------------------------- |
| `homepage`, `public`, `admin` | `elevated`, `flat`, `outlined`     |
| `order`, `dashboard`          | `standalone`, `sidebar`, `compact` |
| `mobile`                      | `condensed`                        |

Decision checklist — introduce a variant only if ALL are true:

1. Same component, same slots/behavior — only styling tokens differ.
2. The pattern already repeats across ≥ 3 concrete callsites.
3. The name describes _how it looks or fits_ (layout density, visual weight, border treatment) not _where it appears_.
4. The default variant stays backward compatible — no breaking changes.
5. Adding the variant does not create a combinatorial explosion (avoid `variant` × `size` × `status` matrices).

When NOT to add a variant:

- One-off tweak → use `className`.
- Different data or behavior → split into a separate component.
- New surface with unconfirmed reuse → wait until second callsite exists.

### Current approved variants by component

| Component     | Variants                          | Rationale                                                       |
| ------------- | --------------------------------- | --------------------------------------------------------------- |
| `SummaryCard` | `standalone` (default), `sidebar` | Layout density: spacious vs compact inside a narrow aside       |
| `StatsGrid`   | `elevated` (default), `flat`      | Visual weight: card shadow vs borderless for dense admin tables |
| `StatusBadge` | none — status drives color        | `status` prop already covers all semantic variation             |

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
- `StepperNav`
- `TagInput`
- `StarRating`
- `BulkActionBar`
- `CountdownDisplay`
- `DescriptionField`

### Remaining (next slices)

- `FormGrid`
- `HorizontalScroller`
- `ImageLightbox`
- `ListingLayout`
- `SideModal`
- `Slider`

## PR/Review Checklist

- Does the component have a dedicated `.style.css` file?
- Is it imported in `index.style.css`?
- Are classes appkit-scoped and semantic?
- Does `className` still override defaults?
- Are light + dark defaults aligned with letitrip baseline design?
