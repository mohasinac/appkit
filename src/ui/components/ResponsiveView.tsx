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
    <div className={`appkit-responsive-view--${breakpoint}`} data-section="responsiveview-div-578">
      <div className="appkit-responsive-view__mobile" data-section="responsiveview-div-579">{mobile}</div>
      {tablet && <div className="appkit-responsive-view__tablet" data-section="responsiveview-div-580">{tablet}</div>}
      <div className="appkit-responsive-view__desktop" data-section="responsiveview-div-581">{desktop}</div>
    </div>
  );
}

export type { ResponsiveViewProps };
