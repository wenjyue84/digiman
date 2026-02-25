import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { extractDetailedError, createErrorToast } from "@/lib/errorHandler";
import type { Guest, PaginatedResponse, UpdateGuestTokenUnit } from "@shared/schema";
import { isGuestPaid, getGuestBalance } from "@/lib/guest";
import { formatShortDate } from "./utils";
import { compareUnitNumbers } from "./useGuestSorting";
import { DEFAULT_BUSINESS_CONFIG } from "@shared/business-config";

// Define proper context interface for checkout mutation
interface CheckoutMutationContext {
  previousGuests: PaginatedResponse<Guest> | null;
}

interface UseGuestMutationsArgs {
  guests: Guest[];
  exportUnits?: Array<{
    id: string;
    number: string;
    section: string;
    isAvailable: boolean;
    cleaningStatus: string;
    toRent: boolean;
    lastCleanedAt: string | null;
    lastCleanedBy: string | null;
    color: string | null;
    purchaseDate: string | null;
    position: string | null;
    remark: string | null;
  }>;
  /** @deprecated Use exportUnits */
  exportCapsules?: Array<{
    id: string;
    number: string;
    section: string;
    isAvailable: boolean;
    cleaningStatus: string;
    toRent: boolean;
    lastCleanedAt: string | null;
    lastCleanedBy: string | null;
    color: string | null;
    purchaseDate: string | null;
    position: string | null;
    remark: string | null;
  }>;
  activeTokens: Array<{
    id: string;
    token: string;
    unitNumber: string;
    guestName: string | null;
    phoneNumber: string | null;
    createdAt: string;
    expiresAt: string;
  }>;
}

export function useGuestMutations({ guests, exportUnits, exportCapsules, activeTokens }: UseGuestMutationsArgs) {
  const exportUnitsData = exportUnits ?? exportCapsules ?? [];
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Modal / dialog state
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [extendGuest, setExtendGuest] = useState<Guest | null>(null);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [checkoutGuest, setCheckoutGuest] = useState<Guest | null>(null);
  const [showCheckoutConfirmation, setShowCheckoutConfirmation] = useState(false);
  const [undoGuest, setUndoGuest] = useState<Guest | null>(null);
  const [showUndoConfirmation, setShowUndoConfirmation] = useState(false);
  const [alertDialogGuest, setAlertDialogGuest] = useState<Guest | null>(null);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);

  // ---------- Mutations ----------

  const checkoutMutation = useMutation({
    mutationFn: async (guestId: string) => {
      const response = await apiRequest("POST", "/api/guests/checkout", { id: guestId });
      return response.json();
    },
    onMutate: async (guestId: string): Promise<CheckoutMutationContext> => {
      await queryClient.cancelQueries({ queryKey: ["/api/guests/checked-in"] });
      const previousGuests = queryClient.getQueryData<PaginatedResponse<Guest>>(["/api/guests/checked-in"]);
      if (!previousGuests) {
        return { previousGuests: null };
      }
      const filteredData = previousGuests.data.filter(guest => guest.id !== guestId);
      const updatedGuests = { ...previousGuests, data: filteredData };
      queryClient.setQueryData(["/api/guests/checked-in"], updatedGuests);
      toast({
        title: "Processing Checkout...",
        description: "Guest is being checked out. Row will disappear momentarily.",
        duration: 2000,
      });
      return { previousGuests };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests/checked-in"] });
      queryClient.invalidateQueries({ queryKey: ["/api/occupancy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units/available-with-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units/cleaning-status/cleaned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units/cleaning-status/to_be_cleaned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units/needs-attention"] });

      toast({
        title: "Guest Checked Out Successfully",
        description: (
          <div className="space-y-2">
            <p>The guest has been checked out successfully. The guest list updates automatically every 30 seconds.</p>
            <div className="flex flex-col space-y-1">
              <button
                onClick={() => {
                  queryClient.refetchQueries({ queryKey: ["/api/guests/checked-in"], type: 'active' });
                  queryClient.refetchQueries({ queryKey: ["/api/occupancy"], type: 'active' });
                  toast({
                    title: "Refreshing...",
                    description: "Guest list is being updated with fresh data.",
                    duration: 2000,
                  });
                }}
                className="inline-flex items-center text-green-600 hover:text-green-800 underline text-sm font-medium w-fit"
              >
                Refresh guest list now
              </button>
              <button
                onClick={() => setLocation("/cleaning")}
                className="inline-flex items-center text-blue-600 hover:text-blue-800 underline text-sm font-medium w-fit gap-1"
              >
                Clean
              </button>
            </div>
          </div>
        ),
        duration: 8000,
      });
    },
    onError: (error: any, _guestId: string, context: CheckoutMutationContext | undefined) => {
      if (context?.previousGuests) {
        queryClient.setQueryData(["/api/guests/checked-in"], context.previousGuests);
      }
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      const isAlreadyCheckedOut = /already|not found|checked out/i.test(errorMessage);

      if (isAlreadyCheckedOut) {
        toast({
          title: "Guest Already Checked Out",
          description: "This guest has already been checked out. The list will refresh to show the current state.",
          variant: "default",
        });
        queryClient.refetchQueries({ queryKey: ["/api/guests/checked-in"] });
        queryClient.refetchQueries({ queryKey: ["/api/occupancy"] });
      } else {
        toast({
          title: "Error",
          description: "Failed to check out guest. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const cancelTokenMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      console.log(`Attempting to cancel guest token: ${tokenId}`);
      const response = await apiRequest("DELETE", `/api/guest-tokens/${tokenId}`);
      console.log(`API response received:`, response);
      return response;
    },
    onSuccess: () => {
      console.log(`Guest token cancelled successfully, invalidating queries`);
      queryClient.invalidateQueries({ queryKey: ["/api/guest-tokens/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/occupancy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units/available"] });
      toast({
        title: "Success",
        description: "Pending check-in cancelled successfully",
      });
    },
    onError: (error: any) => {
      const detailedError = extractDetailedError(error);
      const toastOptions = createErrorToast(detailedError);
      toast({
        title: toastOptions.title,
        description: toastOptions.description + (toastOptions.debugDetails ? `\n\n${toastOptions.debugDetails}` : ''),
        variant: toastOptions.variant,
        duration: 8000,
      });
    },
  });

  const undoCheckoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/guests/undo-recent-checkout");
      return response.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/guests/checked-in"] });
      queryClient.refetchQueries({ queryKey: ["/api/units/needs-attention"] });
      queryClient.invalidateQueries({ queryKey: ["/api/occupancy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({
        title: "Success",
        description: "Check-out undone successfully",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Failed to undo checkout';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (showAllUnits: boolean) => {
      const response = await apiRequest("PATCH", "/api/settings", {
        showAllUnits: showAllUnits
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (_error: any) => {
      toast({
        title: "Error",
        description: "Failed to save setting. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTokenUnitMutation = useMutation({
    mutationFn: async ({ tokenId, updateData }: { tokenId: string; updateData: UpdateGuestTokenUnit }) => {
      const response = await apiRequest("PATCH", `/api/guest-tokens/${tokenId}/unit`, updateData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/guest-tokens/active"] });
      toast({
        title: "Unit Updated",
        description: data.message || "Guest token unit assignment updated successfully",
      });
    },
    onError: (error: any) => {
      const errorToast = createErrorToast(extractDetailedError(error));
      toast({
        title: errorToast.title,
        description: errorToast.description,
        variant: errorToast.variant,
      });
    },
  });

  // ---------- Handlers ----------

  const handleCheckout = (guestId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to check out guests. Redirecting to login page...",
        variant: "destructive",
        duration: 3000,
      });
      setTimeout(() => { setLocation('/login'); }, 1000);
      return;
    }
    const guest = guests.find(g => g.id === guestId);
    if (guest) {
      setCheckoutGuest(guest);
      setShowCheckoutConfirmation(true);
    }
  };

  const confirmCheckout = () => {
    if (checkoutGuest) {
      checkoutMutation.mutate(checkoutGuest.id);
      setShowCheckoutConfirmation(false);
      setCheckoutGuest(null);
    }
  };

  const handleUndo = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to undo checkouts. Redirecting to login page...",
        variant: "destructive",
        duration: 3000,
      });
      setTimeout(() => { window.location.href = '/login'; }, 1000);
      return;
    }
    try {
      const response = await apiRequest("GET", "/api/guests/undo-recent-checkout");
      const result = await response.json();
      if (result.statusCode === 200 && result.data?.guest) {
        setUndoGuest(result.data.guest);
        setShowUndoConfirmation(true);
      } else {
        toast({
          title: "No Recent Checkout",
          description: "No recently checked-out guest found to undo.",
          variant: "default",
        });
      }
    } catch (_error: any) {
      toast({
        title: "Error",
        description: "Failed to find recent checkout to undo",
        variant: "destructive",
      });
    }
  };

  const confirmUndo = () => {
    if (undoGuest) {
      undoCheckoutMutation.mutate();
      setShowUndoConfirmation(false);
      setUndoGuest(null);
    }
  };

  const handleCancelToken = (tokenId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to cancel pending check-ins. Redirecting to login page...",
        variant: "destructive",
        duration: 3000,
      });
      setTimeout(() => { window.location.href = '/login'; }, 1000);
      return;
    }
    cancelTokenMutation.mutate(tokenId);
  };

  const handleTokenUnitChange = (tokenId: string, unitNumber: string | null, autoAssign?: boolean) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to update unit assignments. Redirecting to login page...",
        variant: "destructive",
        duration: 3000,
      });
      setTimeout(() => { window.location.href = '/login'; }, 1000);
      return;
    }
    const updateData: UpdateGuestTokenUnit = autoAssign
      ? { autoAssign: true }
      : { unitNumber: unitNumber! };
    updateTokenUnitMutation.mutate({ tokenId, updateData });
  };

  const handleGuestClick = (guest: Guest) => {
    setSelectedGuest(guest);
    setIsDetailsModalOpen(true);
  };

  const handleExtend = (guest: Guest) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to extend guest stays",
        variant: "destructive",
      });
      const currentPath = window.location.pathname;
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      return;
    }
    setExtendGuest(guest);
    setIsExtendOpen(true);
  };

  const openAlertDialog = (guest: Guest) => {
    setAlertDialogGuest(guest);
    setAlertDialogOpen(true);
  };

  const handleUnitChange = async (guest: Guest, newUnitNumber: string) => {
    if (newUnitNumber === guest.unitNumber) return;
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to change unit assignments",
        variant: "destructive",
      });
      const currentPath = window.location.pathname;
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      return;
    }
    try {
      const response = await fetch(`/api/guests/${guest.id}/unit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          unitNumber: newUnitNumber,
          reason: 'Unit change from dashboard'
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      await response.json();
      toast({
        title: "Unit Changed",
        description: `${guest.name} moved to unit ${newUnitNumber}`,
      });
      queryClient.refetchQueries({ queryKey: ["/api/guests/checked-in"] });
      queryClient.refetchQueries({ queryKey: ["/api/units/available"] });
      queryClient.refetchQueries({ queryKey: ["/api/occupancy"] });
    } catch (error) {
      console.error('Error changing unit:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change unit. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCloseModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedGuest(null);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied!", description: "Check-in link copied to clipboard" });
    } catch (_error) {
      toast({ title: "Copy failed", description: "Please copy the link manually", variant: "destructive" });
    }
  };

  const getCheckinLink = (token: string) => {
    return `${window.location.origin}/guest-checkin?token=${token}`;
  };

  const handlePendingCheckinClick = (tokenId: string) => {
    const token = activeTokens.find(t => t.id === tokenId);
    if (token) {
      copyToClipboard(getCheckinLink(token.token));
    }
  };

  const handleEmptyUnitClick = (unitNumber: string) => {
    setLocation(`/check-in?unit=${unitNumber}`);
  };

  const handleWhatsAppExport = useCallback(() => {
    const checkedInGuests = guests || [];

    let whatsappText = `*${DEFAULT_BUSINESS_CONFIG.shortName.toUpperCase()} UNIT STATUS*\n\n`;

    // Handle FRONT SECTION (units 11-24)
    whatsappText += '*FRONT SECTION*\n';
    const frontSectionUnits = exportUnitsData.filter(unit => {
      const num = parseInt(unit.number.replace('C', ''));
      return num >= 11 && num <= 24;
    }).sort((a, b) => compareUnitNumbers(a.number, b.number));

    frontSectionUnits.forEach(unit => {
      const guest = checkedInGuests.find(g => g.unitNumber === unit.number);
      if (guest) {
        const isPaid = isGuestPaid(guest);
        const checkoutDate = guest.expectedCheckoutDate ? formatShortDate(guest.expectedCheckoutDate) : '';
        const paymentStatus = isPaid ? 'PAID' : 'UNPAID';
        const balance = getGuestBalance(guest);
        const outstandingText = balance > 0 ? ` (Outstanding RM${balance})` : '';
        whatsappText += `${unit.number.replace('C', '')}) ${guest.name} ${paymentStatus}${checkoutDate}${outstandingText}\n`;
      } else {
        whatsappText += `${unit.number.replace('C', '')})\n`;
      }
    });

    whatsappText += '\n';

    // Handle special sections - Living Room (units 25, 26)
    whatsappText += '*LIVING ROOM*\n';
    const livingRoomUnits = exportUnitsData.filter(unit => {
      const num = parseInt(unit.number.replace('C', ''));
      return num === 25 || num === 26;
    }).sort((a, b) => compareUnitNumbers(a.number, b.number));

    livingRoomUnits.forEach(unit => {
      const guest = checkedInGuests.find(g => g.unitNumber === unit.number);
      if (guest) {
        const isPaid = isGuestPaid(guest);
        const checkoutDate = guest.expectedCheckoutDate ? formatShortDate(guest.expectedCheckoutDate) : '';
        const paymentStatus = isPaid ? 'PAID' : 'UNPAID';
        const balance = getGuestBalance(guest);
        const outstandingText = balance > 0 ? ` (Outstanding RM${balance})` : '';
        whatsappText += `${unit.number.replace('C', '')}) ${guest.name} ${paymentStatus}${checkoutDate}${outstandingText}\n`;
      } else {
        whatsappText += `${unit.number.replace('C', '')})\n`;
      }
    });

    // Handle special sections - Room (units 1-6)
    whatsappText += '\n*ROOM*\n';
    const roomUnits = exportUnitsData.filter(unit => {
      const num = parseInt(unit.number.replace('C', ''));
      return num >= 1 && num <= 6;
    }).sort((a, b) => compareUnitNumbers(a.number, b.number));

    roomUnits.forEach(unit => {
      const guest = checkedInGuests.find(g => g.unitNumber === unit.number);
      if (guest) {
        const isPaid = isGuestPaid(guest);
        const checkoutDate = guest.expectedCheckoutDate ? formatShortDate(guest.expectedCheckoutDate) : '';
        const paymentStatus = isPaid ? 'PAID' : 'UNPAID';
        const balance = getGuestBalance(guest);
        const outstandingText = balance > 0 ? ` (Outstanding RM${balance})` : '';
        whatsappText += `${unit.number.replace('C', '')}) ${guest.name} ${paymentStatus}${checkoutDate}${outstandingText}\n`;
      } else {
        whatsappText += `${unit.number.replace('C', '')})\n`;
      }
    });

    whatsappText += '\n---\n';
    whatsappText += '*Last Updated:* ' + new Date().toLocaleDateString('en-GB') + '\n';
    whatsappText += '*Time:* ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    navigator.clipboard.writeText(whatsappText).then(() => {
      toast({
        title: "WhatsApp Export Ready!",
        description: "Unit status copied to clipboard. You can now paste it in WhatsApp!",
        variant: "default",
      });
    }).catch(() => {
      const textArea = document.createElement('textarea');
      textArea.value = whatsappText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast({
        title: "WhatsApp Export Ready!",
        description: "Unit status copied to clipboard. You can now paste it in WhatsApp!",
        variant: "default",
      });
    });
  }, [exportUnitsData, guests, toast]);

  return {
    // Mutations
    checkoutMutation,
    cancelTokenMutation,
    undoCheckoutMutation,
    updateSettingsMutation,
    updateTokenUnitMutation,
    /** @deprecated Use updateTokenUnitMutation */
    updateTokenCapsuleMutation: updateTokenUnitMutation,

    // Modal state
    selectedGuest,
    isDetailsModalOpen,
    extendGuest,
    isExtendOpen,
    setIsExtendOpen,
    setExtendGuest,
    checkoutGuest,
    showCheckoutConfirmation,
    setShowCheckoutConfirmation,
    undoGuest,
    showUndoConfirmation,
    setShowUndoConfirmation,
    alertDialogGuest,
    alertDialogOpen,
    setAlertDialogOpen,

    // Handlers
    handleCheckout,
    confirmCheckout,
    handleUndo,
    confirmUndo,
    handleCancelToken,
    handleTokenUnitChange,
    /** @deprecated Use handleTokenUnitChange */
    handleTokenCapsuleChange: handleTokenUnitChange,
    handleGuestClick,
    handleExtend,
    openAlertDialog,
    handleUnitChange,
    /** @deprecated Use handleUnitChange */
    handleCapsuleChange: handleUnitChange,
    handleCloseModal,
    copyToClipboard,
    getCheckinLink,
    handlePendingCheckinClick,
    handleEmptyUnitClick,
    /** @deprecated Use handleEmptyUnitClick */
    handleEmptyCapsuleClick: handleEmptyUnitClick,
    handleWhatsAppExport,
  };
}
