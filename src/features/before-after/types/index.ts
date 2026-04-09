export interface BeforeAfterItem {
  id: string;
  title: string;
  description?: string;
  concern?: string;
  productId?: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  durationWeeks?: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface BeforeAfterListResponse {
  data: BeforeAfterItem[];
  total: number;
}
