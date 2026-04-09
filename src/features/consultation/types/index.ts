export type ConsultationStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type ConsultationMode = "remote" | "in-person";

export interface ConsultationBooking {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  concern: string[];
  preferredDate: string;
  preferredTime: string;
  mode: ConsultationMode;
  message?: string;
  status: ConsultationStatus;
  adminNote?: string;
  createdAt: Date | string;
}

export interface BookConsultationInput {
  name: string;
  email: string;
  phone: string;
  concern: string[];
  preferredDate: string;
  preferredTime: string;
  mode: ConsultationMode;
  message?: string;
}

export interface ConsultationListResponse {
  data: ConsultationBooking[];
  total: number;
  page: number;
  perPage: number;
}
