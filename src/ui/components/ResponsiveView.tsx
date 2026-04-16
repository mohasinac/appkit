"use client";

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
    <>
      <div className={`block ${breakpoint}:hidden`}>{mobile}</div>
      {tablet && <div className="hidden md:block lg:hidden">{tablet}</div>}
      <div className={`hidden ${breakpoint}:block`}>{desktop}</div>
    </>
  );
}

export type { ResponsiveViewProps };
