// Every primary Firestore collection document has these three fields.
// All document interfaces must extend this — prevents field-list drift across 23 schema files.
export interface BaseDocument {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Documents addressable by a human-readable slug.
export interface WithSlug {
  slug?: string;
}

// Documents owned by a store — prevents ownerId vs storeId ambiguity.
export interface WithStoreOwnership {
  storeId: string;
  ownerId?: string;
}

// Generic typed status — avoids a local "X"|"Y" inline union per document.
export interface WithStatus<S extends string> {
  status: S;
}
