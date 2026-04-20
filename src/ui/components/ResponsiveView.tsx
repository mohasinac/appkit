interface ResponsiveViewProps {
  mobile: React.ReactNode;
  desktop: React.ReactNode;
  tablet?: React.ReactNode;
  breakpoint?: "sm" | "md" | "lg" | "xl";
}

/**
 * ResponsiveView keeps both trees in the DOM and lets CSS hide inactive branches.
 * This prevents hydration mismatches caused by client-only media queries.
 */
export function ResponsiveView({
  mobile,
  desktop,
  tablet,
  breakpoint = "md",
}: ResponsiveViewProps) {
  return (
    <div className={`appkit-responsive-view--${breakpoint}`}>
      <div className="appkit-responsive-view__mobile">{mobile}</div>
      {tablet && <div className="appkit-responsive-view__tablet">{tablet}</div>}
      <div className="appkit-responsive-view__desktop">{desktop}</div>
    </div>
  );
}

export type { ResponsiveViewProps };
