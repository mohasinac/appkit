# `@mohasinac/appkit/features/categories`

Category, concern, collection, and brand management feature.

## Components

| Component | Description |
|---|---|
| `CategoryCard` | Single category tile (cover image, name, description, item count) |
| `CategoryGrid` | Responsive auto-fill grid of `CategoryCard` tiles |
| `CategoryTree` | Nested tree navigator with expand/collapse, keyboard accessible |
| `BreadcrumbTrail` | Ancestor breadcrumb for a `CategoryItem` using its `ancestors[]` array |
| `ConcernCard` | Concern/wellness icon card (concern-type categories) |
| `ConcernGrid` | Grid of `ConcernCard` |

## BreadcrumbTrail

Generates a full breadcrumb from a category's `ancestors` array automatically.

```tsx
import { BreadcrumbTrail } from "@mohasinac/appkit/features/categories";

<BreadcrumbTrail
  category={category}        // CategoryItem — must have ancestors[]
  rootLabel="All Categories"
  rootHref="/categories"
  basePath="/categories"
/>
```

## Hooks

- `useCategories(params?)` — fetches flat category list
- `useCategoryDetail(id, opts?)` — fetches single category + its children

## API routes (register in consumer project)

```ts
// app/api/categories/route.ts
import { withProviders } from "@/providers.config";
import { GET, POST } from "@mohasinac/appkit/features/categories";
export { GET: withProviders(GET), POST: withProviders(POST) };
```
