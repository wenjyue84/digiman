import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useAccommodationLabels } from "@/hooks/useAccommodationLabels";
import type { Guest } from "@shared/schema";

interface CapsuleChangeDialogProps {
  guest: Guest | null;
  isOpen: boolean;
  onClose: () => void;
}

interface AvailableCapsule {
  number: string;
  section: string;
  position: string;
  color?: string;
}

export default function CapsuleChangeDialog({ guest, isOpen, onClose }: CapsuleChangeDialogProps) {
  const [selectedCapsule, setSelectedCapsule] = useState<string>("");
  const [availableCapsules, setAvailableCapsules] = useState<AvailableCapsule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCapsules, setIsLoadingCapsules] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const labels = useAccommodationLabels();

  // Load available capsules when dialog opens
  useEffect(() => {
    if (isOpen && guest) {
      loadAvailableCapsules();
      setSelectedCapsule(guest.capsuleNumber);
    }
  }, [isOpen, guest]);

  const loadAvailableCapsules = async () => {
    if (!guest) return;
    
    setIsLoadingCapsules(true);
    try {
      const response = await apiRequest("GET", "/api/capsules/available");
      if (response.ok) {
        const capsules = await response.json();
        // Filter out the current capsule and add it to the list for reference
        const filteredCapsules = capsules.filter((cap: AvailableCapsule) => cap.number !== guest.capsuleNumber);
        setAvailableCapsules(filteredCapsules);
      }
    } catch (error) {
      console.error("Failed to load available capsules:", error);
      toast({
        title: "Error",
        description: "Failed to load available capsules",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCapsules(false);
    }
  };

  const handleCapsuleChange = async () => {
    if (!guest || !selectedCapsule || selectedCapsule === guest.capsuleNumber) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("PATCH", `/api/guests/${guest.id}`, {
        capsuleNumber: selectedCapsule,
      });

      if (response.ok) {
        toast({
          title: "Capsule Changed",
          description: `${guest.name} moved from ${guest.capsuleNumber} to ${selectedCapsule}`,
        });
        
        // Invalidate relevant queries to refresh the data
        queryClient.invalidateQueries({ queryKey: ["/api/guests/checked-in"] });
        queryClient.invalidateQueries({ queryKey: ["/api/occupancy"] });
        queryClient.invalidateQueries({ queryKey: ["/api/capsules/available"] });
        
        onClose();
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to change capsule");
      }
    } catch (error) {
      console.error("Failed to change capsule:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change capsule",
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change {labels.singular} Assignment</DialogTitle>
          <DialogDescription>
            Move {guest.name} to a different {labels.singular.toLowerCase()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current capsule info */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Current {labels.singular}</Label>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-600 text-white border-blue-600">
                {guest.capsuleNumber}
              </Badge>
              <span className="text-sm text-gray-600">(occupied)</span>
            </div>
          </div>

          {/* New capsule selection */}
          <div className="space-y-2">
            <Label htmlFor="new-capsule" className="text-sm font-medium">
              New {labels.singular}
            </Label>
            <Select value={selectedCapsule} onValueChange={setSelectedCapsule}>
              <SelectTrigger id="new-capsule">
                <SelectValue placeholder="Select a capsule" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingCapsules ? (
                  <SelectItem value="" disabled>
                    Loading capsules...
                  </SelectItem>
                ) : (
                  <>
                    <SelectItem value={guest.capsuleNumber}>
                      {guest.capsuleNumber} (current)
                    </SelectItem>
                    {availableCapsules.map((capsule) => (
                      <SelectItem key={capsule.number} value={capsule.number}>
                        {capsule.number} - {capsule.section} {capsule.position}
                        {capsule.color && ` (${capsule.color})`}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleCapsuleChange} 
              disabled={isLoading || selectedCapsule === guest.capsuleNumber || isLoadingCapsules}
            >
              {isLoading ? "Changing..." : "Change Capsule"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
