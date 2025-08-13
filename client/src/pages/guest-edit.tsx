import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, User, Calendar, MapPin, Clock, Edit } from "lucide-react";
import { guestSelfCheckinSchema, type GuestSelfCheckin } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function GuestEdit() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string>("");
  const [guestInfo, setGuestInfo] = useState<any>(null);
  const [editExpiresAt, setEditExpiresAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<GuestSelfCheckin>({
    resolver: zodResolver(guestSelfCheckinSchema),
    defaultValues: {
      nameAsInDocument: "",
      gender: undefined,
      nationality: "",
      checkInDate: new Date().toISOString().split('T')[0],
      checkOutDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      icNumber: "",
      passportNumber: "",
      paymentMethod: undefined,
    },
  });

  useEffect(() => {
    // Get token from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    
    if (!urlToken) {
      toast({
        title: "Invalid Link",
        description: "This edit link is invalid or missing a token.",
        variant: "destructive",
      });
      setLocation('/');
      return;
    }

    setToken(urlToken);
    validateEditToken(urlToken);
  }, [toast, setLocation]);

  const validateEditToken = async (tokenValue: string) => {
    try {
      const response = await fetch(`/api/guest-edit/${tokenValue}`);
      if (response.ok) {
        const data = await response.json();
        setGuestInfo(data.guest);
        setEditExpiresAt(new Date(data.editExpiresAt));

        // Pre-fill form with existing data
        form.setValue("nameAsInDocument", data.guest.name || "");
        form.setValue("gender", data.guest.gender || undefined);
        form.setValue("nationality", data.guest.nationality || "");
        form.setValue("paymentMethod", data.guest.paymentMethod || undefined);
        
        // Set check-in and check-out dates
        if (data.guest.checkinTime) {
          const checkinDate = new Date(data.guest.checkinTime).toISOString().split('T')[0];
          form.setValue("checkInDate", checkinDate);
        }
        if (data.guest.expectedCheckoutDate) {
          form.setValue("checkOutDate", data.guest.expectedCheckoutDate);
        }
        
        // Parse IC/Passport from notes if available
        const notes = data.guest.notes || "";
        const icMatch = notes.match(/IC: ([^,\n]+)/);
        const passportMatch = notes.match(/Passport: ([^,\n]+)/);
        
        if (icMatch && icMatch[1] !== 'N/A') {
          form.setValue("icNumber", icMatch[1]);
        }
        if (passportMatch && passportMatch[1] !== 'N/A') {
          form.setValue("passportNumber", passportMatch[1]);
        }
      } else {
        const errorData = await response.json();
        toast({
          title: "Edit Not Available",
          description: errorData.message || "This edit link has expired or is invalid.",
          variant: "destructive",
        });
        setLocation('/');
        return;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate edit link.",
        variant: "destructive",
      });
      setLocation('/');
      return;
    }
    setIsLoading(false);
  };

  const onSubmit = async (data: GuestSelfCheckin) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/guest-edit/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        setIsSuccess(true);
        toast({
          title: "Information Updated!",
          description: "Your check-in information has been updated successfully.",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Update Failed",
          description: errorData.message || "Failed to update information.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update information.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  const getRemainingTime = () => {
    if (!editExpiresAt) return "";
    const now = new Date();
    const remaining = editExpiresAt.getTime() - now.getTime();
    if (remaining <= 0) return "Expired";
    
    const minutes = Math.floor(remaining / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-hostel-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Validating edit access...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-hostel-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <Edit className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Information Updated!</h2>
              <p className="text-gray-600 mb-4">
                Your check-in information has been successfully updated.
              </p>
              <p className="text-xs text-gray-500">
                You can continue to edit your information until the edit window expires.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hostel-background py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader className="text-center pb-6">
            <div>
              <div className="w-16 h-16 bg-hostel-secondary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Edit className="text-hostel-secondary h-8 w-8" />
              </div>
              <CardTitle className="text-2xl font-bold text-hostel-text">Edit Your Information</CardTitle>
              <p className="text-gray-600 mt-2">Update your check-in details</p>
              
              {guestInfo && (
                <div className="mt-4 space-y-2">
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="flex items-center justify-center text-sm font-medium text-orange-800">
                      <MapPin className="h-4 w-4 mr-2" />
                      Capsule: {guestInfo.capsuleNumber}
                    </div>
                  </div>
                  
                  {editExpiresAt && (
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <div className="flex items-center justify-center text-sm font-medium text-yellow-700">
                        <Clock className="h-4 w-4 mr-2" />
                        Edit window expires in: {getRemainingTime()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Information */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="nameAsInDocument" className="text-sm font-medium text-hostel-text">
                      Full Name as in IC/Passport *
                    </Label>
                    <Input
                      id="nameAsInDocument"
                      type="text"
                      placeholder="Enter your name as shown in ID"
                      className="w-full mt-1"
                      {...form.register("nameAsInDocument")}
                    />
                    {form.formState.errors.nameAsInDocument && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.nameAsInDocument.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="gender" className="text-sm font-medium text-hostel-text">
                      Gender *
                    </Label>
                    <Select
                      value={form.watch("gender") || ""}
                      onValueChange={(value) => form.setValue("gender", value as "male" | "female")}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.gender && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.gender.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="nationality" className="text-sm font-medium text-hostel-text">
                      Nationality *
                    </Label>
                    <Input
                      id="nationality"
                      type="text"
                      placeholder="e.g., Malaysian, Singaporean"
                      className="w-full mt-1"
                      {...form.register("nationality")}
                    />
                    {form.formState.errors.nationality && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.nationality.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Check-in & Check-out Dates */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  Check-in & Check-out Dates
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="checkInDate" className="text-sm font-medium text-hostel-text">
                      Check-in Date <span className="text-gray-500 text-xs">(Editable)</span>
                    </Label>
                    <Input
                      id="checkInDate"
                      type="date"
                      className="w-full mt-1"
                      {...form.register("checkInDate")}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      You can change this if you plan to arrive on a different date.
                    </p>
                    {form.formState.errors.checkInDate && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.checkInDate.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="checkOutDate" className="text-sm font-medium text-hostel-text">
                      Check-out Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="checkOutDate"
                      type="date"
                      className="w-full mt-1"
                      required
                      {...form.register("checkOutDate", { required: "Check-out date is required" })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Please select your planned check-out date.
                    </p>
                    {form.formState.errors.checkOutDate && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.checkOutDate.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Identity Documents */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  Identity Documents *
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="icNumber" className="text-sm font-medium text-hostel-text">
                        IC Number (for Malaysians)
                      </Label>
                      <Input
                        id="icNumber"
                        type="text"
                        placeholder="e.g., 950101-01-1234"
                        className="w-full mt-1"
                        {...form.register("icNumber")}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="passportNumber" className="text-sm font-medium text-hostel-text">
                        Passport Number (for Foreigners)
                      </Label>
                      <Input
                        id="passportNumber"
                        type="text"
                        placeholder="e.g., A12345678"
                        className="w-full mt-1"
                        {...form.register("passportNumber")}
                      />
                    </div>
                  </div>
                  {form.formState.errors.icNumber && (
                    <p className="text-red-500 text-sm">{form.formState.errors.icNumber.message}</p>
                  )}
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
                  Payment Method *
                </h3>
                <div>
                  <Select
                    value={form.watch("paymentMethod") || ""}
                    onValueChange={(value) => form.setValue("paymentMethod", value as "cash" | "card" | "online_transfer")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select preferred payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Credit/Debit Card</SelectItem>
                      <SelectItem value="online_transfer">Online Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.paymentMethod && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.paymentMethod.message}</p>
                  )}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-hostel-secondary hover:bg-orange-700 text-white py-3"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Updating Information..." : "Update Information"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}