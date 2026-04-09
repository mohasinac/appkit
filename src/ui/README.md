# `@mohasinac/appkit/ui`

Primitive UI components — semantic HTML wrappers, typography, interactive elements, and headless layout primitives. Zero app-specific logic; styled with Tailwind CSS.

## Semantic HTML wrappers

`Section` · `Article` · `Main` · `Aside` · `Nav` · `BlockHeader` · `BlockFooter` · `Header` · `Footer` · `Ul` · `Ol` · `Li` · `Div`

## Typography

`Heading` · `Text` · `Label` · `Caption` · `Span`

## Interactive

`Button` · `IconButton` · `TextLink` · `Accordion` · `Tooltip` · `Modal` · `SideModal` · `Drawer`  

`Tooltip` supports **long-press on mobile**: after `longPressDelay` ms (default 500) a bottom sheet opens with the label.

## Data display

`Badge` · `Alert` · `Spinner` · `Skeleton` · `Divider` · `Progress` · `StatusBadge` · `RatingDisplay` · `PriceDisplay` · `StarRating`

## Layout

`Layout` · `FormGrid` · `FormField` · `DescriptionField` · `TabStrip` · `HorizontalScroller` · `Breadcrumb` · `StepperNav` · `ViewToggle`

## Tables / lists

`DataTable<T>` · `TablePagination` · `Pagination` · `SortDropdown` · `ActiveFilterChips` · `ItemRow`

## Rich text

`RichText` — renders sanitised CMS HTML with optional syntax highlighting:

```tsx
import { RichText } from "@mohasinac/appkit/ui";
import hljs from "highlight.js";

<RichText
  html={post.body}
  highlightCode={(code, lang) =>
    hljs.highlight(code, { language: lang || "plaintext", ignoreIllegals: true }).value
  }
/>
```

## Section 37 compliance

All components use `@mohasinac/ui` semantic wrappers internally. No raw `<div>`, `<span>`, `<button>` etc. in application-level feature code.
