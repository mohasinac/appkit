import { ERROR_MESSAGES } from "../../errors";

export interface AddressValidationFormData {
  fullName: string;
  phoneNumber: string;
  pincode: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  addressType: string;
  isDefault: boolean;
}

export interface AddressValidationOptions {
  validatePhoneNumber?: (value: string) => boolean;
  validatePostalCode?: (value: string) => boolean;
  requiredFieldMessage?: string;
  invalidPhoneMessage?: string;
  invalidPostalCodeMessage?: string;
}

export function validateAddressForm(
  formData: AddressValidationFormData,
  options?: AddressValidationOptions,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const requiredFieldMessage =
    options?.requiredFieldMessage ?? ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD;

  if (!formData.fullName?.trim()) {
    errors.fullName = requiredFieldMessage;
  }

  if (!formData.phoneNumber?.trim()) {
    errors.phoneNumber = requiredFieldMessage;
  } else if (
    options?.validatePhoneNumber &&
    !options.validatePhoneNumber(formData.phoneNumber)
  ) {
    errors.phoneNumber =
      options.invalidPhoneMessage ?? ERROR_MESSAGES.VALIDATION.INVALID_PHONE;
  }

  if (!formData.pincode?.trim()) {
    errors.pincode = requiredFieldMessage;
  } else if (
    options?.validatePostalCode &&
    !options.validatePostalCode(formData.pincode)
  ) {
    errors.pincode =
      options.invalidPostalCodeMessage ??
      ERROR_MESSAGES.VALIDATION.INVALID_INPUT;
  }

  if (!formData.addressLine1?.trim()) {
    errors.addressLine1 = requiredFieldMessage;
  }

  if (!formData.city?.trim()) {
    errors.city = requiredFieldMessage;
  }

  if (!formData.state?.trim()) {
    errors.state = requiredFieldMessage;
  }

  return errors;
}
