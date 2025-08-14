import { useEffect, useRef } from "react";
import { UseFormReturn } from "react-hook-form";
import type { GuestSelfCheckin } from "@shared/schema";

interface UseAutoSaveProps {
  form: UseFormReturn<GuestSelfCheckin>;
  token: string;
}

export function useAutoSave({ form, token }: UseAutoSaveProps) {
  const saveTimerRef = useRef<number | null>(null);

  // Restore draft values per token
  useEffect(() => {
    if (!token) return;
    try {
      const draftRaw = localStorage.getItem(`guest-checkin-draft:${token}`);
      if (draftRaw) {
        const draft = JSON.parse(draftRaw);
        Object.entries(draft).forEach(([k, v]) => {
          if (v !== undefined) {
            // @ts-ignore
            form.setValue(k as any, v as any, { shouldDirty: true });
          }
        });
      }
    } catch {}
  }, [token]);

  // Autosave draft on change (debounced)
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (!token) return;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        try {
          const toSave: any = {
            nameAsInDocument: values.nameAsInDocument,
            phoneNumber: values.phoneNumber,
            gender: values.gender,
            nationality: values.nationality,
            checkInDate: values.checkInDate,
            checkOutDate: values.checkOutDate,
            icNumber: values.icNumber,
            passportNumber: values.passportNumber,
            paymentMethod: values.paymentMethod,
            emergencyContact: values.emergencyContact,
            emergencyPhone: values.emergencyPhone,
            notes: values.notes,
          };
          localStorage.setItem(`guest-checkin-draft:${token}`, JSON.stringify(toSave));
        } catch {}
      }, 500);
    });
    return () => subscription.unsubscribe();
  }, [form.watch, token]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);
}