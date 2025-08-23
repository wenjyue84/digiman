import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Bed, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useAccommodationLabels } from "@/hooks/useAccommodationLabels";
import type { Guest, Capsule } from "@shared/schema";

// Constants
const MAX_MAINTENANCE_REMARK_LENGTH = 500;
const CAPSULES_API_ENDPOINT = "/api/capsules/available-with-status";
const SWITCH_API_ENDPOINT = "/api/capsules/switch";

interface CapsuleChangeDialogProps {
  guest: Guest | null;
  isOpen: boolean;
  onClose: () => void;
}

interface EnhancedCapsule extends Capsule {
  canAssign: boolean;
  warningLevel?: string;
  canManualAssign?: boolean;
}

// Utility Functions
const getWarningMessage = (capsule: EnhancedCapsule, lowerSingular: string): string | null => {
  if (!capsule || typeof capsule.toRent === 'undefined') return null;
  
  if (capsule.toRent === false) {
    return `⚠️ WARNING: This ${lowerSingular} is marked as "Not Suitable for Rent" due to major maintenance issues. Are you sure you want to assign it?`;
  }
  if (capsule.cleaningStatus === 'to_be_cleaned') {
    return `⚠️ WARNING: This ${lowerSingular} needs cleaning before it can be assigned. Are you sure you want to assign it without cleaning?`;
  }
  return null;
};

const sortCapsulesByNumber = (capsules: EnhancedCapsule[]): EnhancedCapsule[] => {
  return capsules
    .filter(capsule => capsule && capsule.number)
    .sort((a, b) => {
      const aNum = parseInt(a.number.replace('C', ''));
      const bNum = parseInt(b.number.replace('C', ''));
      return aNum - bNum;
    });
};

const validateCapsuleSelection = (
  value: string, 
  capsules: EnhancedCapsule[], 
  currentCapsule: string | undefined
): { capsule: EnhancedCapsule | null; needsWarning: boolean; warningMessage: string | null } => {
  if (value === currentCapsule) {
    return { capsule: null, needsWarning: false, warningMessage: null };
  }

  const selectedCapsule = capsules.find(c => c.number === value);
  if (!selectedCapsule) {
    return { capsule: null, needsWarning: false, warningMessage: null };
  }

  const warningMessage = getWarningMessage(selectedCapsule, 'capsule');
  const needsWarning = Boolean(warningMessage && !selectedCapsule.canAssign);
  
  return { 
    capsule: selectedCapsule, 
    needsWarning, 
    warningMessage 
  };
};

export default function CapsuleChangeDialog({ guest, isOpen, onClose }: CapsuleChangeDialogProps) {
  const [selectedCapsule, setSelectedCapsule] = useState<string>("");
  const [availableCapsules, setAvailableCapsules] = useState<EnhancedCapsule[]>([]);
  const [maintenanceRemark, setMaintenanceRemark] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCapsules, setIsLoadingCapsules] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [pendingCapsule, setPendingCapsule] = useState<string>("");
  const [warningMessage, setWarningMessage] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const labels = useAccommodationLabels();

  // Load available capsules when dialog opens
  useEffect(() => {
    if (isOpen && guest) {
      loadAvailableCapsules();
      setSelectedCapsule("");
      setMaintenanceRemark("");
      setShowWarningDialog(false);
      setPendingCapsule("");
      setWarningMessage("");
    }
  }, [isOpen, guest]);

  const loadAvailableCapsules = async (retryCount = 0) => {
    if (!guest) return;
    
    setIsLoadingCapsules(true);
    try {
      const response = await apiRequest("GET", CAPSULES_API_ENDPOINT);
      if (response.ok) {
        const capsules = await response.json();
        setAvailableCapsules(capsules);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to load available capsules:", error);
      
      // Retry logic for network failures
      if (retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        setTimeout(() => loadAvailableCapsules(retryCount + 1), delay);
        return;
      }
      
      toast({
        title: "Error Loading Capsules",
        description: `Failed to load available capsules. ${error instanceof Error ? error.message : 'Network error.'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoadingCapsules(false);
    }
  };

  // Memoized sorted capsules for performance
  const sortedCapsules = useMemo(() => {
    return sortCapsulesByNumber(availableCapsules);
  }, [availableCapsules]);

  // Handle capsule selection with warning check
  const handleCapsuleSelection = (value: string) => {
    const validation = validateCapsuleSelection(value, availableCapsules, guest?.capsuleNumber);
    
    if (validation.needsWarning && validation.warningMessage) {
      setPendingCapsule(value);
      setWarningMessage(validation.warningMessage);
      setShowWarningDialog(true);
    } else {
      setSelectedCapsule(value);
    }
  };

  // Confirm problematic capsule assignment
  const confirmWarningAssignment = () => {
    setSelectedCapsule(pendingCapsule);
    setShowWarningDialog(false);
    setPendingCapsule("");
    setWarningMessage("");
  };

  // Cancel problematic capsule assignment
  const cancelWarningAssignment = () => {
    setShowWarningDialog(false);
    setPendingCapsule("");
    setWarningMessage("");
  };

  const handleCapsuleChange = async () => {
    if (!guest || !selectedCapsule || selectedCapsule === guest.capsuleNumber) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      // Sanitize maintenance remark on frontend as well
      const sanitizedRemark = maintenanceRemark.trim()
        .substring(0, MAX_MAINTENANCE_REMARK_LENGTH);
      
      const response = await apiRequest("POST", SWITCH_API_ENDPOINT, {
        guestId: guest.id,
        oldCapsuleNumber: guest.capsuleNumber,
        newCapsuleNumber: selectedCapsule,
        maintenanceRemark: sanitizedRemark || null
      });

      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: "Capsule Switched Successfully",
          description: (
            <div className="space-y-1">
              <p>{guest.name} moved from {guest.capsuleNumber} to {selectedCapsule}</p>
              {sanitizedRemark && (
                <p className="text-xs text-gray-600">Maintenance note: {sanitizedRemark}</p>
              )}
            </div>
          ),
        });
        
        // Batch invalidate queries for better performance
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/guests/checked-in"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/occupancy"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/capsules/available"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/capsules/available-with-status"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/capsules"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/capsules/needs-attention"] })
        ]);
        
        onClose();
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to switch capsule");
      }
    } catch (error) {
      console.error("Failed to switch capsule:", error);
      
      // More specific error messages based on status codes
      let errorMessage = "Failed to switch capsule";
      if (error instanceof Error) {
        if (error.message.includes('409')) {
          errorMessage = "This capsule was just assigned to another guest. Please try a different capsule.";
        } else if (error.message.includes('404')) {
          errorMessage = "Guest or capsule not found. Please refresh the page and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Capsule Switch Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!guest) return null;

  return (
    <>
      {/* Main Capsule Switch Dialog */}
      <Dialog open={isOpen && !showWarningDialog} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bed className="h-5 w-5" />
              Switch {labels.singular} Assignment
            </DialogTitle>
            <DialogDescription>
              Move {guest?.name} to a different {labels.singular.toLowerCase()}. The previous capsule will be released.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current → New Capsule Flow */}
            <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <Label className="text-xs text-gray-500 uppercase">Current</Label>
                <div className="mt-1">
                  <Badge variant="outline" className="bg-blue-600 text-white border-blue-600">
                    {guest?.capsuleNumber}
                  </Badge>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
              <div className="text-center">
                <Label className="text-xs text-gray-500 uppercase">New</Label>
                <div className="mt-1">
                  {selectedCapsule ? (
                    <Badge variant="outline" className="bg-green-600 text-white border-green-600">
                      {selectedCapsule}
                    </Badge>
                  ) : (
                    <div className="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded">
                      Not selected
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* New capsule selection */}
            <div className="space-y-2">
              <Label htmlFor="new-capsule" className="flex items-center text-sm font-medium">
                <Bed className="mr-2 h-4 w-4" />
                Select New {labels.singular} *
              </Label>
              <div className="space-y-1 mb-2">
                <p className="text-xs text-gray-600">
                  💡 Available capsules are shown with status indicators
                </p>
                <p className="text-xs text-orange-600">
                  ⚠️ Orange capsules may need cleaning or have maintenance issues
                </p>
                <p className="text-xs text-red-600">
                  🚫 Red capsules are not suitable for rent due to major issues
                </p>
              </div>

              <Select value={selectedCapsule} onValueChange={handleCapsuleSelection}>
                <SelectTrigger id="new-capsule">
                  <SelectValue placeholder={`Select new ${labels.lowerSingular} (⭐ = bottom bed)`} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingCapsules ? (
                    <SelectItem value="" disabled>
                      Loading capsules...
                    </SelectItem>
                  ) : availableCapsules.length === 0 ? (
                    <SelectItem value="no-capsules" disabled>
                      No capsules available
                    </SelectItem>
                  ) : (
                    sortedCapsules.map(capsule => {
                        const isCurrent = capsule.number === guest?.capsuleNumber;
                        const isRecommended = capsule.canAssign;
                        const hasWarning = capsule.warningLevel === 'warning' || capsule.warningLevel === 'error';
                        const isDisabled = !capsule.canManualAssign && !isCurrent;
                        
                        return (
                          <SelectItem 
                            key={capsule.number} 
                            value={capsule.number}
                            disabled={isDisabled}
                            className={`
                              ${hasWarning && !isCurrent ? 'text-orange-600' : ''}
                              ${isRecommended ? 'font-medium' : ''}
                              ${isCurrent ? 'bg-blue-50 text-blue-700' : ''}
                            `}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>
                                {capsule.number}
                                {isCurrent && ' (current)'}
                                {capsule.section && ` - ${capsule.section}`}
                                {capsule.position && ` ${capsule.position}`}
                              </span>
                              <div className="flex items-center gap-1">
                                {capsule.position === 'bottom' && <span title="Bottom bed">⭐</span>}
                                {hasWarning && !isCurrent && <span title="Warning">⚠️</span>}
                                {!isRecommended && !isCurrent && <span title="Not recommended">🚫</span>}
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Maintenance remark for old capsule */}
            <div className="space-y-2">
              <Label htmlFor="maintenance-remark" className="text-sm font-medium">
                Maintenance Remark for {guest?.capsuleNumber} (Optional)
              </Label>
              <Textarea
                id="maintenance-remark"
                value={maintenanceRemark}
                onChange={(e) => setMaintenanceRemark(e.target.value)}
                placeholder="Leave blank if no maintenance issues. Examples: 'No issues', 'Needs light replacement', 'Minor cleaning required', etc."
                className="min-h-[80px]"
                maxLength={MAX_MAINTENANCE_REMARK_LENGTH}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Default: No maintenance issues recorded</span>
                <span>{maintenanceRemark.length}/{MAX_MAINTENANCE_REMARK_LENGTH}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button 
                onClick={handleCapsuleChange} 
                disabled={isLoading || !selectedCapsule || selectedCapsule === guest?.capsuleNumber || isLoadingCapsules}
              >
                {isLoading ? "Switching..." : "Switch Capsule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warning Dialog for Problematic Capsules */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Assignment Warning
            </DialogTitle>
            <DialogDescription className="text-sm">
              {warningMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={cancelWarningAssignment}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmWarningAssignment}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Assign Anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
