import { useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { GuestSelfCheckin } from "@shared/schema";

export function useGuestValidation(form: UseFormReturn<GuestSelfCheckin>) {
  const watchedIcNumber = form.watch("icNumber");
  const watchedPassportNumber = form.watch("passportNumber");
  const watchedCheckInDate = form.watch("checkInDate");
  const watchedCheckOutDate = form.watch("checkOutDate");
  
  // Determine which fields should be disabled based on mutual exclusivity
  const isIcFieldDisabled = !!(watchedPassportNumber && watchedPassportNumber.trim().length > 0);
  const isPassportFieldDisabled = !!(watchedIcNumber && watchedIcNumber.trim().length > 0);
  
  // Validate check-out date is after check-in date
  const isCheckOutDateValid = !watchedCheckInDate || !watchedCheckOutDate || 
    new Date(watchedCheckOutDate) > new Date(watchedCheckInDate);

  // Clear the disabled field when the other field is filled
  useEffect(() => {
    if (watchedIcNumber && watchedIcNumber.trim().length > 0) {
      // Clear passport fields when IC is filled
      if (watchedPassportNumber) {
        form.setValue("passportNumber", "");
      }
    }
  }, [watchedIcNumber, watchedPassportNumber, form]);

  useEffect(() => {
    if (watchedPassportNumber && watchedPassportNumber.trim().length > 0) {
      // Clear IC fields when passport is filled
      if (watchedIcNumber) {
        form.setValue("icNumber", "");
      }
    }
  }, [watchedPassportNumber, watchedIcNumber, form]);

  // Scroll to first error field on invalid submit
  const onInvalid = (errors: any) => {
    const firstKey = Object.keys(errors)[0];
    const idMap: Record<string, string> = {
      nameAsInDocument: 'nameAsInDocument',
      phoneNumber: 'phoneNumber',
      gender: 'gender',
      nationality: 'nationality',
      icNumber: 'icNumber',
      passportNumber: 'passportNumber',
      paymentMethod: 'paymentMethod',
      emergencyContact: 'emergencyContact',
      emergencyPhone: 'emergencyPhone',
      notes: 'notes',
    };
    const id = idMap[firstKey];
    if (id) {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // @ts-ignore
      el?.focus?.();
    }
  };

  return {
    isIcFieldDisabled,
    isPassportFieldDisabled,
    isCheckOutDateValid,
    onInvalid,
  };
}
