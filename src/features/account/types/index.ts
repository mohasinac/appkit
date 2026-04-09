export interface UserAddress {
  id: string;
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
  phone?: string;
}

export interface NotificationPreferences {
  orderUpdates?: boolean;
  promotions?: boolean;
  newsletter?: boolean;
  sms?: boolean;
  push?: boolean;
}

export interface UserProfile {
  id: string;
  displayName?: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  bio?: string;
  addresses?: UserAddress[];
  notificationPreferences?: NotificationPreferences;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  phone?: string;
  bio?: string;
}
