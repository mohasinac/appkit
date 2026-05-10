"use client";
import { SellerProductShell } from "./SellerProductShell";
import type { SellerProductShellProps, ProductListingMode } from "./SellerProductShell";

export interface SellerCreateProductViewProps
  extends Omit<SellerProductShellProps, "mode"> {
  listingType?: ProductListingMode;
}

export function SellerCreateProductView(props: SellerCreateProductViewProps) {
  return <SellerProductShell mode="create" {...props} />;
}
