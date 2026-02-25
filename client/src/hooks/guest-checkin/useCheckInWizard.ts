import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { guestSelfCheckinSchema, type GuestSelfCheckin } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";

export function useCheckInWizard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useI18n();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [token, setToken] = useState<string>("");
  const [guestInfo, setGuestInfo] = useState<{
    unitNumber?: string;
    autoAssign?: boolean;
    guestName: string;
    phoneNumber: string;
    email?: string;
    expectedCheckoutDate?: string;
    position: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [editToken, setEditToken] = useState<string>("");
  const [editExpiresAt, setEditExpiresAt] = useState<Date | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [unitIssues, setunitIssues] = useState<any[]>([]);
  const [assignedunitNumber, setAssignedunitNumber] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  
  const saveTimerRef = useRef<number | null>(null);

  const form = useForm<GuestSelfCheckin>({
    resolver: zodResolver(guestSelfCheckinSchema),
    defaultValues: {
      nameAsInDocument: "",
      phoneNumber: "",
      gender: "male" as const,
      nationality: "Malaysian",
      checkInDate: new Date().toISOString().split('T')[0],
      checkOutDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      icNumber: "",
      passportNumber: "",
      icDocumentUrl: "",
      passportDocumentUrl: "",
      paymentMethod: undefined,
      guestPaymentDescription: "",
      emergencyContact: "",
      emergencyPhone: "",
      notes: "",
    },
  });

  const steps = [
    "Personal Info",
    "Documents", 
    "Payment",
    "Emergency Contact",
    "Review & Submit"
  ];

  // Token validation effect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    
    if (!urlToken) {
      toast({
        title: t.invalidLink,
        description: t.invalidLinkDesc,
        variant: "destructive",
      });
      setLocation('/');
      return;
    }

    setToken(urlToken);
    validateToken(urlToken);
  }, [toast, setLocation]);

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

  // Countdown timer effect
  useEffect(() => {
    if (!tokenExpiresAt) return;
    
    const updateCountdown = () => {
      const now = new Date();
      const diff = tokenExpiresAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining(t.linkExpired || "Link has expired");
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [tokenExpiresAt, t.linkExpired]);

  const validateToken = async (tokenValue: string) => {
    try {
      const response = await fetch(`/api/guest-tokens/${tokenValue}`);
      if (response.ok) {
        const data = await response.json();
        let position = 'Available unit will be assigned';
        
        if (data.unitNumber) {
          const unitNum = parseInt(data.unitNumber.replace('C', ''));
          position = unitNum % 2 === 0 ? 'Bottom (Preferred)' : 'Top';
        }
        
        setGuestInfo({
          unitNumber: data.unitNumber,
          autoAssign: data.autoAssign,
          guestName: data.guestName,
          phoneNumber: data.phoneNumber,
          email: data.email,
          expectedCheckoutDate: data.expectedCheckoutDate,
          position: position
        });
        
        if (data.expiresAt) {
          setTokenExpiresAt(new Date(data.expiresAt));
        }

        if (data.guestName) {
          form.setValue("nameAsInDocument", data.guestName);
        }
        if (data.phoneNumber) {
          form.setValue("phoneNumber", data.phoneNumber);
        }
      } else {
        toast({
          title: t.expiredLink,
          description: t.expiredLinkDesc,
          variant: "destructive",
        });
        setLocation('/');
        return;
      }
    } catch (error) {
      toast({
        title: t.error,
        description: t.validationError,
        variant: "destructive",
      });
      setLocation('/');
      return;
    }
    setIsLoading(false);
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= steps.length) {
      setCurrentStep(step);
    }
  };

  const onSubmit = async (data: GuestSelfCheckin) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/guest-checkin/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        setIsSuccess(true);
        setEditToken(result.editToken);
        setEditExpiresAt(new Date(result.editExpiresAt));
        setCanEdit(true);
        setunitIssues(result.unitIssues || []);
        setAssignedunitNumber(result.unitNumber);
        toast({
          title: t.checkInSuccess,
          description: `${t.checkInSuccessDesc} ${result.unitNumber || 'your assigned unit'}.`,
        });
      } else {
        const errorData = await response.json();
        console.error("Server error:", errorData);
        toast({
          title: t.checkInFailed,
          description: errorData.message || "Please check all required fields and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: t.error,
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  return {
    // State
    currentStep,
    steps,
    token,
    guestInfo,
    isLoading,
    isSubmitting,
    isSuccess,
    editToken,
    editExpiresAt,
    canEdit,
    unitIssues,
    assignedunitNumber,
    tokenExpiresAt,
    timeRemaining,
    
    // Form
    form,
    
    // Actions
    nextStep,
    prevStep,
    goToStep,
    onSubmit,
    setCurrentStep,
  };
}
