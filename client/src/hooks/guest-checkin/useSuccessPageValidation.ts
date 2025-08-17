import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface SuccessPageData {
  token: string;
  guestInfo: {
    id: string;
    name: string;
    capsuleNumber: string;
    phoneNumber: string;
    email?: string;
    checkinTime: string;
    expectedCheckoutDate?: string;
    paymentAmount?: string;
    paymentMethod?: string;
    notes?: string;
    isPaid?: boolean;
  } | null;
  isLoading: boolean;
  isValidAccess: boolean;
}

interface UseSuccessPageValidationProps {
  t: any; // i18n translation function
}

export function useSuccessPageValidation({ t }: UseSuccessPageValidationProps): SuccessPageData {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [token, setToken] = useState<string>("");
  const [guestInfo, setGuestInfo] = useState<{
    id: string;
    name: string;
    capsuleNumber: string;
    phoneNumber: string;
    email?: string;
    checkinTime: string;
    expectedCheckoutDate?: string;
    paymentAmount?: string;
    paymentMethod?: string;
    notes?: string;
    isPaid?: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidAccess, setIsValidAccess] = useState(false);

  // Extract token from URL and validate for success page access
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    
    if (!urlToken) {
      toast({
        title: t.invalidLink || "Invalid Link",
        description: t.invalidLinkDesc || "This link is invalid or missing a token",
        variant: "destructive",
      });
      setLocation('/');
      return;
    }

    setToken(urlToken);
    validateSuccessPageToken(urlToken);
  }, [toast, setLocation, t]);

  const validateSuccessPageToken = async (tokenValue: string) => {
    try {
      // Call with successPage=true to allow used tokens
      const response = await fetch(`/api/guest-tokens/${tokenValue}?successPage=true`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Check if this is a success page access with guest data
        if (data.isSuccessPageAccess && data.guestData) {
          setGuestInfo({
            id: data.guestData.id,
            name: data.guestData.name,
            capsuleNumber: data.guestData.capsuleNumber,
            phoneNumber: data.guestData.phoneNumber,
            email: data.guestData.email,
            checkinTime: data.guestData.checkinTime,
            expectedCheckoutDate: data.guestData.expectedCheckoutDate,
            paymentAmount: data.guestData.paymentAmount,
            paymentMethod: data.guestData.paymentMethod,
            notes: data.guestData.notes,
            isPaid: data.guestData.isPaid
          });
          setIsValidAccess(true);
        } else {
          // This is a regular unused token - redirect to form
          setLocation(`/guest-checkin?token=${tokenValue}`);
          return;
        }
      } else {
        const errorData = await response.json();
        
        if (response.status === 400 && errorData.message === "Token already used") {
          toast({
            title: t.tokenUsed || "Token Already Used",
            description: t.tokenUsedDesc || "This check-in link has been used. If you need to make a new booking, please contact us for a new link.",
            variant: "destructive",
          });
        } else {
          toast({
            title: t.expiredLink || "Invalid Link",
            description: t.expiredLinkDesc || "This link is invalid or has expired",
            variant: "destructive",
          });
        }
        setLocation('/');
        return;
      }
    } catch (error) {
      console.error("Error validating success page token:", error);
      toast({
        title: t.error || "Error",
        description: t.validationError || "Unable to validate access to this page",
        variant: "destructive",
      });
      setLocation('/');
      return;
    }
    setIsLoading(false);
  };

  return {
    token,
    guestInfo,
    isLoading,
    isValidAccess
  };
}
