export type CorporateInquiryStatus = "new" | "in_progress" | "won" | "lost";

export interface CorporateInquiry {
  id: string;
  companyName: string;
  contactPerson: string;
  designation?: string;
  email: string;
  phone: string;
  units: number;
  budgetPerUnit?: number;
  totalBudget?: number;
  deliveryDateRequired?: string;
  customBranding: boolean;
  message?: string;
  status: CorporateInquiryStatus;
  adminNote?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface SubmitCorporateInquiryInput {
  companyName: string;
  contactPerson: string;
  designation?: string;
  email: string;
  phone: string;
  units: number;
  budgetPerUnit?: number;
  deliveryDateRequired?: string;
  customBranding: boolean;
  message?: string;
}

export interface CorporateInquiryListResponse {
  data: CorporateInquiry[];
  total: number;
  page: number;
  perPage: number;
}
