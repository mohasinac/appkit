import React from "react";

export interface DivProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

/**
 * Semantic `<div>` wrapper for general-purpose layout containers.
 *
 * Use when no more specific semantic element applies
 * (`<Section>`, `<Article>`, `<Main>`, `<Aside>` etc). Enables
 * future one-place theming and consistent import from `@mohasinac/appkit/ui`.
 *
 * @example
 * ```tsx
 * <Div className="flex items-center gap-4">
 *   <Badge>New</Badge>
 *   <Text>Product title</Text>
 * </Div>
 * ```
 */
export const Div = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  ),
);
Div.displayName = "Div";
