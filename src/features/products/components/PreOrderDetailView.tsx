import React from "react";

/**
 * PreOrderDetailView — shell for pre-order product detail pages.
 * Same slot structure as ProductDetailView; separate component so the
 * pre-order UX can diverge without coupling to the standard detail layout.
 */
export interface PreOrderDetailViewProps {
  isLoading?: boolean;
  renderBreadcrumb?: () => React.ReactNode;
  renderGallery?: (isLoading: boolean) => React.ReactNode;
  renderInfo?: (isLoading: boolean) => React.ReactNode;
  renderBuyBar?: () => React.ReactNode;
  renderTabs?: () => React.ReactNode;
  renderRelated?: () => React.ReactNode;
  renderSkeleton?: () => React.ReactNode;
  className?: string;
}

export function PreOrderDetailView({
  isLoading = false,
  renderBreadcrumb,
  renderGallery,
  renderInfo,
  renderBuyBar,
  renderTabs,
  renderRelated,
  renderSkeleton,
  className = "",
}: PreOrderDetailViewProps) {
  if (isLoading) {
    if (renderSkeleton) return <>{renderSkeleton()}</>;
    return <div className="animate-pulse min-h-screen" />;
  }

  return (
    <div className={className}>
      {renderBreadcrumb?.()}
      <div className="flex gap-8 my-6">
        <div className="w-1/2">{renderGallery?.(isLoading)}</div>
        <div className="flex-1">
          {renderInfo?.(isLoading)}
          {renderBuyBar?.()}
        </div>
      </div>
      {renderTabs?.()}
      {renderRelated?.()}
    </div>
  );
}
