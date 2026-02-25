
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Clock, CheckCircle, User, CheckCheck, Undo2 } from "lucide-react";
import { useAccommodationLabels } from "@/hooks/useAccommodationLabels";
import { apiRequest } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Unit } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { List, Table as TableIcon, CreditCard } from 'lucide-react';

interface MarkCleanedDialogProps {
  Unit: Unit;
  onSuccess: () => void;
}

function MarkCleanedDialog({ Unit, onSuccess }: MarkCleanedDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const labels = useAccommodationLabels();

  const mutation = useMutation({
    mutationFn: async (data: { UnitNumber: string }) => {
      await apiRequest("POST", `/api/units/${data.UnitNumber}/mark-cleaned`, {
        cleanedBy: "Staff"
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${labels.singular} ${Unit.number} marked as cleaned successfully`,
      });
      setOpen(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark Unit as cleaned",
        variant: "destructive",
      });
    },
  });

  const handleMarkCleaned = () => {
    mutation.mutate({
      UnitNumber: Unit.number,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-green-600 hover:bg-green-700">
          <Sparkles className="h-4 w-4 mr-1" />
          Mark Cleaned
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark {labels.singular} {Unit.number} as Cleaned</DialogTitle>
          <DialogDescription>
            Are you sure you want to mark this {labels.lowerSingular} as cleaned?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            This will mark the {labels.lowerSingular} as cleaned and ready for new guests.
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMarkCleaned}
            disabled={mutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {mutation.isPending ? "Marking..." : "Mark as Cleaned"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface UndoCleanedDialogProps {
  Unit: Unit;
  onSuccess: () => void;
}

function UndoCleanedDialog({ Unit, onSuccess }: UndoCleanedDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const labels = useAccommodationLabels();

  const mutation = useMutation({
    mutationFn: async (data: { UnitNumber: string }) => {
      await apiRequest("POST", `/api/units/${data.UnitNumber}/undo-cleaned`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${labels.singular} ${Unit.number} cleaning undone successfully`,
      });
      setOpen(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to undo Unit cleaning",
        variant: "destructive",
      });
    },
  });

  const handleUndoCleaned = () => {
    mutation.mutate({
      UnitNumber: Unit.number,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-50">
          <Undo2 className="h-4 w-4 mr-1" />
          Undo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Undo Cleaning for {labels.singular} {Unit.number}</DialogTitle>
          <DialogDescription>
            Are you sure you want to undo the cleaning status for this {labels.lowerSingular}?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            This will mark the {labels.lowerSingular} as "needs cleaning" and it will no longer be available for new guest assignments until cleaned again.
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUndoCleaned}
            disabled={mutation.isPending}
            variant="outline"
            className="text-orange-600 border-orange-300 hover:bg-orange-50"
          >
            {mutation.isPending ? "Undoing..." : "Undo Cleaning"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface UnitCleaningCardProps {
  Unit: Unit;
  onRefresh: () => void;
}

function UnitCleaningCard({ Unit, onRefresh }: UnitCleaningCardProps) {
  const isClean = Unit.cleaningStatus === "cleaned";
  const needsCleaning = Unit.cleaningStatus === "to_be_cleaned";
  const isUnavailable = !Unit.isAvailable;
  
  // Determine card styling based on status
  let cardClass = "";
  let badgeText = "";
  let badgeClass = "";
  
  if (isUnavailable) {
    cardClass = "border-red-200 bg-red-50";
    badgeText = "Unavailable";
    badgeClass = "bg-red-500 text-white";
  } else if (needsCleaning) {
    cardClass = "border-orange-200 bg-orange-50";
    badgeText = "Needs Cleaning";
    badgeClass = "bg-orange-500 text-white";
  } else if (isClean) {
    cardClass = "border-green-200 bg-green-50";
    badgeText = "Clean";
    badgeClass = "bg-green-600 text-white";
  } else {
    cardClass = "border-gray-200 bg-gray-50";
    badgeText = Unit.cleaningStatus || "Unknown";
    badgeClass = "bg-gray-500 text-white";
  }
  
  return (
    <Card className={cardClass}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{Unit.number}</h3>
            <Badge 
              variant="secondary"
              className={badgeClass}
            >
              {badgeText}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground capitalize">
            {Unit.section}
          </div>
        </div>
        
        <div className="space-y-2 mb-4">
          {isClean && Unit.lastCleanedAt && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Cleaned {new Date(Unit.lastCleanedAt).toLocaleDateString()}</span>
            </div>
          )}
          
          {isClean && Unit.lastCleanedBy && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <User className="h-4 w-4" />
              <span>By {Unit.lastCleanedBy}</span>
            </div>
          )}
          
          {needsCleaning && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <Clock className="h-4 w-4" />
              <span>Requires cleaning after guest checkout</span>
            </div>
          )}
          
          {isUnavailable && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <Clock className="h-4 w-4" />
              <span>Unavailable (may have maintenance issues)</span>
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            To Rent: {Unit.toRent !== false ? "Yes" : "No"}
          </div>
          
          {needsCleaning && (
            <MarkCleanedDialog Unit={Unit} onSuccess={onRefresh} />
          )}
          
          {isClean && (
            <UndoCleanedDialog Unit={Unit} onSuccess={onRefresh} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function UnitCleaningStatus() {
  const queryClient = useQueryClient();
  const labels = useAccommodationLabels();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'card' | 'list' | 'table'>('card');

  useEffect(() => {
    if (isMobile) {
      setViewMode('list');
    }
  }, [isMobile]);
  
  const { data: UnitsToClean = [], isLoading: loadingToClean, refetch: refetchToClean } = useQuery<Unit[]>({
    queryKey: ["/api/units/needs-attention"],
    staleTime: 30000, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    enabled: true, // Ensure query is enabled
  });

  const { data: cleanedUnits = [], isLoading: loadingCleaned, refetch: refetchCleaned } = useQuery<Unit[]>({
    queryKey: ["/api/units/cleaning-status/cleaned"],
    staleTime: 30000, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    enabled: true, // Ensure query is enabled
  });

  const handleRefresh = async () => {
    // Explicitly refetch both queries
    await Promise.all([
      refetchToClean(),
      refetchCleaned(),
      queryClient.invalidateQueries({ queryKey: ["/api/units/needs-attention"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/units/cleaning-status/cleaned"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/units"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/occupancy"] }),
    ]);
  };

  const { toast } = useToast();
  const bulkCleanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/units/mark-cleaned-all", {});
      return res.json();
    },
    onSuccess: (data: any) => {
      handleRefresh();
      toast({ title: "Success", description: `Marked ${data.count} as cleaned.` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to mark all as cleaned", variant: "destructive" });
    },
  });

  if (loadingToClean || loadingCleaned) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {labels.singular} Cleaning Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading cleaning status...</div>
        </CardContent>
      </Card>
    );
  }

  const renderNeedsCleaning = () => {
    switch (viewMode) {
      case 'table':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>To Rent</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {UnitsToClean.map((Unit) => {
                const needsCleaning = Unit.cleaningStatus === "to_be_cleaned";
                const isUnavailable = !Unit.isAvailable;
                
                let badgeText = "";
                let badgeClass = "";
                
                if (Unit.toRent !== false) {
                  badgeText = "Yes";
                  badgeClass = "bg-green-600 text-white";
                } else {
                  badgeText = "No";
                  badgeClass = "bg-red-500 text-white";
                }
                
                return (
                  <TableRow key={Unit.id}>
                    <TableCell>{Unit.number}</TableCell>
                    <TableCell>{Unit.section}</TableCell>
                    <TableCell>
                      <Badge className={badgeClass}>{badgeText}</Badge>
                    </TableCell>
                    <TableCell>
                      {needsCleaning && <MarkCleanedDialog Unit={Unit} onSuccess={handleRefresh} />}
                      {isUnavailable && <span className="text-sm text-red-600">Needs maintenance</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        );
      case 'list':
        return (
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {UnitsToClean.map((Unit) => {
              const needsCleaning = Unit.cleaningStatus === "to_be_cleaned";
              const isUnavailable = !Unit.isAvailable;
              
              let badgeText = "";
              let badgeClass = "";
              let borderClass = "";
              let bgClass = "";
              
              if (Unit.toRent !== false) {
                badgeText = "Yes";
                badgeClass = "bg-green-600 text-white";
                borderClass = "border-green-200";
                bgClass = "bg-green-50";
              } else {
                badgeText = "No";
                badgeClass = "bg-red-500 text-white";
                borderClass = "border-red-200";
                bgClass = "bg-red-50";
              }
              
              return (
                <div key={Unit.id} className={`flex items-center justify-between rounded-md border ${borderClass} ${bgClass} px-3 py-2`}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{Unit.number}</span>
                    <Badge className={badgeClass}>{badgeText}</Badge>
                    <span className="text-xs text-muted-foreground capitalize">{Unit.section}</span>
                  </div>
                  {needsCleaning && <MarkCleanedDialog Unit={Unit} onSuccess={handleRefresh} />}
                  {isUnavailable && <span className="text-xs text-red-600">Maintenance</span>}
                </div>
              );
            })}
          </div>
        );
      case 'card':
        return (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {UnitsToClean.map((Unit) => (
              <UnitCleaningCard
                key={Unit.id}
                Unit={Unit}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  const renderRecentlyCleaned = () => {
    switch (viewMode) {
      case 'table':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>To Rent</TableHead>
                <TableHead>Cleaned At</TableHead>
                <TableHead>Cleaned By</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cleanedUnits.map((Unit) => (
                <TableRow key={Unit.id}>
                  <TableCell>{Unit.number}</TableCell>
                  <TableCell>{Unit.section}</TableCell>
                  <TableCell>
                    <Badge className={Unit.toRent !== false ? "bg-green-600 text-white" : "bg-red-500 text-white"}>
                      {Unit.toRent !== false ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell>{Unit.lastCleanedAt ? new Date(Unit.lastCleanedAt).toLocaleString() : 'Never'}</TableCell>
                  <TableCell>{Unit.lastCleanedBy}</TableCell>
                  <TableCell>
                    <UndoCleanedDialog Unit={Unit} onSuccess={handleRefresh} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );
      case 'list':
        return (
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {cleanedUnits
              .sort((a, b) => {
                if (!a.lastCleanedAt || !b.lastCleanedAt) return 0;
                return new Date(b.lastCleanedAt).getTime() - new Date(a.lastCleanedAt).getTime();
              })
              .slice(0, 6) // Show only recent 6 cleaned Units
              .map((Unit) => (
                <div key={Unit.id} className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{Unit.number}</span>
                    <Badge className={Unit.toRent !== false ? "bg-green-600 text-white" : "bg-red-500 text-white"}>
                      {Unit.toRent !== false ? "Yes" : "No"}
                    </Badge>
                    <span className="text-xs text-muted-foreground capitalize">{Unit.section}</span>
                  </div>
                  <UndoCleanedDialog Unit={Unit} onSuccess={handleRefresh} />
                </div>
              ))}
          </div>
        );
      case 'card':
        return (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {cleanedUnits
              .sort((a, b) => {
                if (!a.lastCleanedAt || !b.lastCleanedAt) return 0;
                return new Date(b.lastCleanedAt).getTime() - new Date(a.lastCleanedAt).getTime();
              })
              .slice(0, 6) // Show only recent 6 cleaned Units
              .map((Unit) => (
                <UnitCleaningCard
                  key={Unit.id}
                  Unit={Unit}
                  onRefresh={handleRefresh}
                />
              ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          {labels.singular} Cleaning Status
        </CardTitle>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm text-muted-foreground">
            Track and manage {labels.lowerSingular} cleaning after guest checkout
          </p>
          
          <div className="flex items-center gap-2">
            <Button variant={viewMode === 'card' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('card')}>
              <CreditCard className="h-4 w-4 mr-1" />
              Card
            </Button>
            <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')}>
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
            <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('table')}>
              <TableIcon className="h-4 w-4 mr-1" />
              Table
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Refresh
            </Button>
          </div>

        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Units needing cleaning */}
        <div>
          <div className="flex items-center gap-2 mb-4 justify-between flex-wrap">
            <Clock className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold text-lg">Need Cleaning ({UnitsToClean.length})</h3>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => bulkCleanMutation.mutate()}
              disabled={bulkCleanMutation.isPending || UnitsToClean.length === 0}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              {bulkCleanMutation.isPending ? "Marking..." : "Mark Cleaned for All"}
            </Button>
          </div>
          
          {UnitsToClean.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>All {labels.lowerPlural} are clean! Great work!</p>
            </div>
          ) : (
            renderNeedsCleaning()
          )}
        </div>

        <Separator />

        {/* Recently cleaned Units */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-green-500" />
            <h3 className="font-semibold text-lg">Recently Cleaned ({cleanedUnits.length})</h3>
          </div>
          
          {cleanedUnits.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <p>No recently cleaned {labels.lowerPlural}</p>
            </div>
          ) : (
            renderRecentlyCleaned()
          )}
        </div>
      </CardContent>
    </Card>
  );
}
