import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NationalitySelect } from "@/components/ui/nationality-select";
import { User, Calendar, MapPin, Phone, Mail, CreditCard, Edit, Save, X, Flag, Printer } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { getGuestBalance, isGuestPaid } from "@/lib/guest";
import { useToast } from "@/hooks/use-toast";
import { useAccommodationLabels } from "@/hooks/useAccommodationLabels";
import { generateReceipt } from "@/lib/receiptGenerator";
import type { Guest } from "@shared/schema";

interface GuestDetailsModalProps {
  guest: Guest | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function GuestDetailsModal({ guest, isOpen, onClose }: GuestDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Guest>>({});
  const [isImageOpen, setIsImageOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const labels = useAccommodationLabels();

  const updateGuestMutation = useMutation({
    mutationFn: async (updates: Partial<Guest>) => {
      if (!guest) return;
      console.log('Making API request to update guest:', { guestId: guest.id, updates });
      try {
        const response = await apiRequest("PATCH", `/api/guests/${guest.id}`, updates);
        console.log('API response received:', response);
        return response.json();
      } catch (error) {
        console.error('API request failed:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests/checked-in"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/history"] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Guest information updated successfully",
      });
    },
    onError: (error: any) => {
      console.error('Guest update error:', error);
      
      // Show more specific error messages
      let errorMessage = "Failed to update guest information";
      
      if (error?.message) {
        if (error.message.includes('400:')) {
          try {
            const errorData = JSON.parse(error.message.split('400: ')[1]);
            if (errorData.errors && Array.isArray(errorData.errors)) {
              errorMessage = errorData.errors[0]?.message || errorMessage;
            } else if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch {
            // Fallback to generic message
          }
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    if (!guest) return;
    setEditData({
      name: guest.name,
      phoneNumber: guest.phoneNumber || "",
      email: guest.email || "",
      nationality: guest.nationality || "",
      gender: guest.gender || "",
      age: guest.age || "",
      idNumber: guest.idNumber || "",
      emergencyContact: guest.emergencyContact || "",
      emergencyPhone: guest.emergencyPhone || "",
      notes: guest.notes || "",
      paymentMethod: guest.paymentMethod || "cash",
      status: guest.status || null,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    console.log('Saving guest data:', editData);
    updateGuestMutation.mutate(editData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (checkinTime: string | Date): string => {
    const checkin = new Date(checkinTime);
    const now = new Date();
    const diff = now.getTime() - checkin.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    return `${hours}h`;
  };

  if (!guest) return null;
  const balance = getGuestBalance(guest);
  const paid = isGuestPaid(guest);
  const isSelfCheckin = guest.paymentCollector === 'Self Check-in' || !!guest.selfCheckinToken;
  
  // Get document photo URL from profilePhotoUrl field
  const documentPhotoUrl = guest.profilePhotoUrl;
  const hasDocumentPhoto = !!documentPhotoUrl;
  
  // Determine document type based on nationality and ID number
  const isMalaysian = guest.nationality === 'Malaysian';
  const hasICNumber = guest.idNumber && guest.idNumber.length === 12 && /^\d{12}$/.test(guest.idNumber);
  const documentType = isMalaysian && hasICNumber ? 'IC Document' : 'Passport Document';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-orange-600" />
              <DialogTitle className="text-lg font-semibold">Guest Details</DialogTitle>
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                {guest.capsuleNumber}
              </Badge>
            </div>
            {!isEditing ? (
              <Button onClick={handleEdit} size="sm" variant="outline">
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button 
                  onClick={handleSave} 
                  size="sm"
                  disabled={updateGuestMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {updateGuestMutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button onClick={handleCancel} size="sm" variant="outline">
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
          <DialogDescription>
            Viewing and managing guest information for {guest.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Photo + Summary side-by-side when photo exists */}
          {hasDocumentPhoto ? (
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="flex flex-col items-center sm:items-start">
                <button
                  type="button"
                  className="focus:outline-none"
                  onClick={() => setIsImageOpen(true)}
                  title={`Click to view ${documentType} in full size`}
                >
                  <img
                    src={documentPhotoUrl}
                    alt={`Guest ${documentType}`}
                    className="w-24 h-32 object-cover rounded border border-gray-300 hover:opacity-90"
                  />
                </button>
                <div className="text-xs text-gray-500 mt-1 text-center">
                  {documentType}<br/>{isSelfCheckin ? "Self check-in" : "Staff uploaded"}
                </div>
              </div>
              <div className="flex-1 w-full">
                <div className="p-3 rounded-lg border bg-gray-50">
                  <div className="flex flex-col gap-2 text-sm">
                    <div><span className="font-medium">Name:</span> {guest.name}</div>
                    <div className="flex flex-wrap gap-4">
                      <span><span className="font-medium">Phone:</span> {guest.phoneNumber || '—'}</span>
                      <span><span className="font-medium">Check‑in:</span> {formatDate(guest.checkinTime)}</span>
                      <span><span className="font-medium">Expected Checkout:</span> {guest.expectedCheckoutDate ? new Date(guest.expectedCheckoutDate.toString()).toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'}) : '—'}</span>
                      <span><span className="font-medium">Payment:</span> RM {guest.paymentAmount} • {guest.paymentMethod?.toUpperCase()}</span>
                      <span><span className="font-medium">Status:</span> {paid ? 'Paid' : 'Outstanding'}</span>
                      {balance > 0 && (
                        <span className="text-red-600 font-medium">Balance: RM{balance}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="flex flex-col items-center sm:items-start">
                <div className="w-24 h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                  <div className="text-center text-gray-500 text-xs">
                    <div className="mb-1">📷</div>
                    <div>No Photo</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-1 text-center">
                  No document photo uploaded
                </div>
                {!isEditing && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-2 text-xs"
                    onClick={() => {
                      // TODO: Implement photo upload functionality for staff
                      toast({
                        title: "Photo Upload",
                        description: "Photo upload functionality for existing guests will be implemented soon.",
                      });
                    }}
                  >
                    📤 Upload Photo
                  </Button>
                )}
              </div>
              <div className="flex-1 w-full">
                <div className="p-3 rounded-lg border bg-gray-50">
                  <div className="flex flex-col gap-2 text-sm">
                    <div><span className="font-medium">Name:</span> {guest.name}</div>
                    <div className="flex flex-wrap gap-4">
                      <span><span className="font-medium">Phone:</span> {guest.phoneNumber || '—'}</span>
                      <span><span className="font-medium">Check‑in:</span> {formatDate(guest.checkinTime)}</span>
                      <span><span className="font-medium">Expected Checkout:</span> {guest.expectedCheckoutDate ? new Date(guest.expectedCheckoutDate.toString()).toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'}) : '—'}</span>
                      <span><span className="font-medium">Payment:</span> RM {guest.paymentAmount} • {guest.paymentMethod?.toUpperCase()}</span>
                      <span><span className="font-medium">Status:</span> {paid ? 'Paid' : 'Outstanding'}</span>
                      {balance > 0 && (
                        <span className="text-red-600 font-medium">Balance: RM{balance}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Check-in Method Indicator */}
          <div className={`rounded-lg p-3 border ${
            guest.paymentCollector === 'Self Check-in' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              {guest.paymentCollector === 'Self Check-in' ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-700">Self Check-in</span>
                  <span className="text-xs text-green-600">• Guest completed check-in independently</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-700">Staff Assisted Check-in</span>
                  <span className="text-xs text-blue-600">• Checked in by {guest.paymentCollector}</span>
                </>
              )}
            </div>
          </div>

          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <User className="h-4 w-4 mr-2" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                {isEditing ? (
                  <Input
                    id="name"
                    value={editData.name || ""}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 text-sm font-medium">{guest.name}</div>
                )}
              </div>
              <div>
                <Label>Gender</Label>
                {isEditing ? (
                  <Select 
                    value={editData.gender || ""} 
                    onValueChange={(value) => setEditData({ ...editData, gender: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1 text-sm capitalize">{guest.gender || "Not specified"}</div>
                )}
              </div>
              <div>
                <Label>Age</Label>
                <div className="mt-1 text-sm">
                  {guest.age ? `${guest.age} years old` : "Not specified"}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Age is automatically calculated from IC number
                </p>
              </div>
              <div>
                <Label>Nationality</Label>
                {isEditing ? (
                  <Select
                    value={editData.nationality || ""}
                    onValueChange={(value) => {
                      console.log('Nationality changed to:', value);
                      setEditData({ ...editData, nationality: value });
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select nationality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Malaysian">Malaysian</SelectItem>
                      <SelectItem value="Singaporean">Singaporean</SelectItem>
                      <SelectItem value="American">American</SelectItem>
                      <SelectItem value="Australian">Australian</SelectItem>
                      <SelectItem value="British">British</SelectItem>
                      <SelectItem value="Canadian">Canadian</SelectItem>
                      <SelectItem value="Chinese">Chinese</SelectItem>
                      <SelectItem value="Filipino">Filipino</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="German">German</SelectItem>
                      <SelectItem value="Indonesian">Indonesian</SelectItem>
                      <SelectItem value="Indian">Indian</SelectItem>
                      <SelectItem value="Japanese">Japanese</SelectItem>
                      <SelectItem value="Korean">Korean</SelectItem>
                      <SelectItem value="Thai">Thai</SelectItem>
                      <SelectItem value="Vietnamese">Vietnamese</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1 text-sm">{guest.nationality || "Not specified"}</div>
                )}
              </div>
              <div>
                <Label>ID Number</Label>
                {isEditing ? (
                  <Input
                    value={editData.idNumber || ""}
                    onChange={(e) => setEditData({ ...editData, idNumber: e.target.value })}
                    className="mt-1"
                    placeholder="Passport/IC Number"
                  />
                ) : (
                  <div className="mt-1 text-sm">{guest.idNumber || "Not provided"}</div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Phone className="h-4 w-4 mr-2" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Phone Number</Label>
                {isEditing ? (
                  <Input
                    value={editData.phoneNumber || ""}
                    onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                    className="mt-1"
                    placeholder="Phone number"
                  />
                ) : (
                  <div className="mt-1 text-sm">{guest.phoneNumber || "Not provided"}</div>
                )}
              </div>
              <div>
                <Label>Email</Label>
                {isEditing ? (
                  <Input
                    value={editData.email || ""}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="mt-1"
                    placeholder="Email address"
                    type="email"
                  />
                ) : (
                  <div className="mt-1 text-sm">{guest.email || "Not provided"}</div>
                )}
              </div>
              <div>
                <Label>Emergency Contact</Label>
                {isEditing ? (
                  <Input
                    value={editData.emergencyContact || ""}
                    onChange={(e) => setEditData({ ...editData, emergencyContact: e.target.value })}
                    className="mt-1"
                    placeholder="Emergency contact name"
                  />
                ) : (
                  <div className="mt-1 text-sm">{guest.emergencyContact || "Not provided"}</div>
                )}
              </div>
              <div>
                <Label>Emergency Phone</Label>
                {isEditing ? (
                  <Input
                    value={editData.emergencyPhone || ""}
                    onChange={(e) => setEditData({ ...editData, emergencyPhone: e.target.value })}
                    className="mt-1"
                    placeholder="Emergency phone number"
                  />
                ) : (
                  <div className="mt-1 text-sm">{guest.emergencyPhone || "Not provided"}</div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Stay Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Stay Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{labels.singular}</Label>
                <div className="mt-1">
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                    <MapPin className="h-3 w-3 mr-1" />
                    {guest.capsuleNumber}
                  </Badge>
                </div>
              </div>
              <div>
                <Label>Duration</Label>
                <div className="mt-1 text-sm font-medium text-green-600">
                  {formatDuration(guest.checkinTime)}
                </div>
              </div>
              <div>
                <Label>Check-in Time</Label>
                <div className="mt-1 text-sm">{formatDate(guest.checkinTime)}</div>
              </div>
              <div>
                <Label>Expected Checkout</Label>
                <div className="mt-1 text-sm">
                  {guest.expectedCheckoutDate 
                    ? new Date(guest.expectedCheckoutDate.toString()).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : "Not specified"
                  }
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <CreditCard className="h-4 w-4 mr-2" />
              Payment Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Amount</Label>
                <div className={`mt-1 text-sm font-medium ${paid ? '' : 'text-red-600'}`}>
                  RM {guest.paymentAmount}
                  {balance > 0 && (
                    <span className="text-red-600 text-xs font-medium ml-1">
                      (Balance: RM{balance})
                    </span>
                  )}
                </div>
              </div>
              <div>
                <Label>Method</Label>
                {isEditing ? (
                  <Select 
                    value={editData.paymentMethod || ""} 
                    onValueChange={(value) => setEditData({ ...editData, paymentMethod: value as any })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="tng">Touch 'n Go</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="platform">Platform Booking</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1 text-sm capitalize">{guest.paymentMethod}</div>
                )}
              </div>
              <div>
                <Label>Status</Label>
                <div className="mt-1">
                  <Badge variant={paid ? "default" : "destructive"}>
                    {paid ? "Paid" : "Outstanding"}
                  </Badge>
                </div>
              </div>
              <div className="md:col-span-3">
                <Label>Collected By</Label>
                <div className="mt-1 text-sm">{guest.paymentCollector || "Not specified"}</div>
              </div>
            </div>
            {/* Print Receipt Button */}
            <div className="mt-4">
              <Button
                onClick={() => generateReceipt({ guest })}
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                data-testid="button-print-receipt"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Receipt
              </Button>
            </div>
          </div>

          <Separator />

          {/* Guest Status */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Flag className="h-4 w-4 mr-2" />
              Guest Status
            </h3>
            {isEditing ? (
              <Select
                value={editData.status ? editData.status : "none"}
                onValueChange={(value) => setEditData({ ...editData, status: value === "none" ? null : value as any })}
              >
                <SelectTrigger className="w-[180px] mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="blacklisted">Blacklisted</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="mt-1">
                {guest.status ? (
                  <Badge variant={guest.status === "blacklisted" ? "destructive" : "default"} data-testid="badge-guest-status">
                    {guest.status.charAt(0).toUpperCase() + guest.status.slice(1)}
                  </Badge>
                ) : (
                  <span className="text-sm text-gray-500" data-testid="text-guest-status-none">None</span>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          {(guest.notes || isEditing) && (
            <>
              <Separator />
              <div>
                <Label>Notes</Label>
                {isEditing ? (
                  <Textarea
                    value={editData.notes || ""}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    className="mt-1"
                    placeholder="Additional notes about the guest..."
                    rows={3}
                  />
                ) : (
                  <div className="mt-1 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {guest.notes || "No notes available"}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        {/* Fullscreen image preview */}
        {hasDocumentPhoto && (
          <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
            <DialogContent className="max-w-4xl p-0 bg-transparent border-0 shadow-none">
              <img
                src={documentPhotoUrl}
                alt={`Guest ${documentType} - Full Size`}
                className="w-full h-auto max-h-[85vh] object-contain rounded"
              />
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}