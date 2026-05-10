"use client";
import { SellerProductShell } from "./SellerProductShell";
import type { SellerProductShellProps, ProductListingMode } from "./SellerProductShell";

export interface SellerEditProductViewProps
  extends Omit<SellerProductShellProps, "mode"> {
  listingType?: ProductListingMode;
}

export function SellerEditProductView(props: SellerEditProductViewProps) {
  return <SellerProductShell mode="edit" {...props} />;
}
