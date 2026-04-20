import { useCallback, useState } from "react";

export interface AddressFormStateData {
  fullName: string;
  phoneNumber: string;
  pincode: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  state: string;
  addressType: string;
  isDefault: boolean;
}

const DEFAULT_FORM_DATA: AddressFormStateData = {
  fullName: "",
  phoneNumber: "",
  pincode: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  city: "",
  state: "",
  addressType: "home",
  isDefault: false,
};

function defaultValidate(data: AddressFormStateData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.fullName.trim()) errors.fullName = "Full name is required";
  if (!data.phoneNumber.trim()) errors.phoneNumber = "Phone number is required";
  if (!data.addressLine1.trim())
    errors.addressLine1 = "Address line 1 is required";
  if (!data.city.trim()) errors.city = "City is required";
  if (!data.state.trim()) errors.state = "State is required";
  if (!data.pincode.trim()) errors.pincode = "Pincode is required";
  return errors;
}

interface UseAddressFormResult {
  formData: AddressFormStateData;
  errors: Record<string, string>;
  handleChange: (
    field: keyof AddressFormStateData,
    value: string | boolean,
  ) => void;
  validate: () => boolean;
  reset: (data?: Partial<AddressFormStateData>) => void;
  setFormData: React.Dispatch<React.SetStateAction<AddressFormStateData>>;
}

export function useAddressForm(
  initialData: Partial<AddressFormStateData> = {},
  options?: {
    validateFn?: (data: AddressFormStateData) => Record<string, string>;
  },
): UseAddressFormResult {
  const [formData, setFormData] = useState<AddressFormStateData>({
    ...DEFAULT_FORM_DATA,
    ...initialData,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateFn = options?.validateFn ?? defaultValidate;

  const handleChange = useCallback(
    (field: keyof AddressFormStateData, value: string | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [errors],
  );

  const validate = useCallback(() => {
    const newErrors = validateFn(formData);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validateFn]);

  const reset = useCallback((data: Partial<AddressFormStateData> = {}) => {
    setFormData({ ...DEFAULT_FORM_DATA, ...data });
    setErrors({});
  }, []);

  return { formData, errors, handleChange, validate, reset, setFormData };
}
