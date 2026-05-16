"use client";

export interface LabelDesign {
  template: "minimal" | "detailed" | "branded";
  colorScheme: "light" | "dark" | "store-primary";
  size: {
    widthMm: number;
    heightMm: number;
  };
  show: {
    logo: boolean;
    price: boolean;
    stock: boolean;
    barcode: boolean;
    location: boolean;
    listingTypeBadge: boolean;
  };
}

export const LABEL_DESIGN_STORAGE_KEY = "letitrip:label-design";

export const DEFAULT_PRODUCT_LABEL_DESIGN: LabelDesign = {
  template: "detailed",
  colorScheme: "light",
  size: { widthMm: 62, heightMm: 38 },
  show: { logo: true, price: true, stock: true, barcode: true, location: true, listingTypeBadge: true },
};

export const DEFAULT_ORDER_LABEL_DESIGN: LabelDesign = {
  template: "detailed",
  colorScheme: "light",
  size: { widthMm: 100, heightMm: 70 },
  show: { logo: true, price: false, stock: false, barcode: true, location: true, listingTypeBadge: false },
};

export const DEFAULT_CARD_DESIGN: LabelDesign = {
  template: "branded",
  colorScheme: "light",
  size: { widthMm: 85, heightMm: 54 },
  show: { logo: true, price: false, stock: false, barcode: true, location: false, listingTypeBadge: false },
};
