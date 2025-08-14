import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface TokenValidationResult {
  token: string;
  guestInfo: {
    capsuleNumber?: string;
    autoAssign?: boolean;
    guestName: string;
    phoneNumber: string;
    email?: string;
    expectedCheckoutDate?: string;
    position: string;
  } | null;
  isLoading: boolean;
  editToken: string;
  editExpiresAt: Date | null;
  canEdit: boolean;
  assignedCapsuleNumber: string | null;
  tokenExpiresAt: Date | null;
  timeRemaining: string;
}

interface UseTokenValidationProps {
  t: any; // i18n translation function
  form: any; // form instance for pre-filling
}

export function useTokenValidation({ t, form }: UseTokenValidationProps): TokenValidationResult {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [token, setToken] = useState<string>("");
  const [guestInfo, setGuestInfo] = useState<{
    capsuleNumber?: string;
    autoAssign?: boolean;
    guestName: string;
    phoneNumber: string;
    email?: string;
    expectedCheckoutDate?: string;
    position: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editToken, setEditToken] = useState<string>("");
  const [editExpiresAt, setEditExpiresAt] = useState<Date | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [assignedCapsuleNumber, setAssignedCapsuleNumber] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Extract token from URL and validate
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
        let position = 'Available capsule will be assigned';
        
        if (data.capsuleNumber) {
          const capsuleNum = parseInt(data.capsuleNumber.replace('C', ''));
          position = capsuleNum % 2 === 0 ? 'Bottom (Preferred)' : 'Top';
        }
        
        setGuestInfo({
          capsuleNumber: data.capsuleNumber,
          autoAssign: data.autoAssign,
          guestName: data.guestName,
          phoneNumber: data.phoneNumber,
          email: data.email,
          expectedCheckoutDate: data.expectedCheckoutDate,
          position: position
        });
        
        // Set token expiration
        if (data.expiresAt) {
          setTokenExpiresAt(new Date(data.expiresAt));
        }

        // Pre-fill form with existing information if available
        if (data.guestName) {
          form.setValue("nameAsInDocument", data.guestName);
        }
        if (data.phoneNumber) {
          form.setValue("phoneNumber", data.phoneNumber);
        }
        
        // If the guest has an assigned capsule already, track it
        if (data.capsuleNumber) {
          setAssignedCapsuleNumber(data.capsuleNumber);
        }
        
        // If there's an edit token and it's still valid, enable editing
        if (data.editToken && data.editExpiresAt) {
          const editExpiry = new Date(data.editExpiresAt);
          if (editExpiry > new Date()) {
            setEditToken(data.editToken);
            setEditExpiresAt(editExpiry);
            setCanEdit(true);
          }
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

  return {
    token,
    guestInfo,
    isLoading,
    editToken,
    editExpiresAt,
    canEdit,
    assignedCapsuleNumber,
    tokenExpiresAt,
    timeRemaining,
  };
}