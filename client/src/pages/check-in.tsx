import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useVisibilityQuery } from "@/hooks/useVisibilityQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, User, Bed, Phone, Mail, CreditCard, Calendar, Users } from "lucide-react";
import { insertGuestSchema, type InsertGuest, type Capsule, type Guest } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/components/auth-provider";
import GuestTokenGenerator from "@/components/guest-token-generator";
import { useAccommodationLabels } from "@/hooks/useAccommodationLabels";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { NATIONALITIES } from "@/lib/nationalities";

export default function CheckIn() {
  const labels = useAccommodationLabels();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [showCheckinConfirmation, setShowCheckinConfirmation] = useState(false);
  const [formDataToSubmit, setFormDataToSubmit] = useState<InsertGuest | null>(null);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [completed, setCompleted] = useState(false);
  
  const { data: availableCapsules = [], isLoading: capsulesLoading } = useVisibilityQuery<Capsule[]>({
    queryKey: ["/api/capsules/available"],
    // Uses smart config: nearRealtime (30s stale, 60s refetch)
  });

  // Get the default collector name
  const getDefaultCollector = useCallback(() => {
    if (!user) return "";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.email === "admin@pelangi.com") {
      return "Admin";
    }
    return user.email || "";
  }, [user]);

  // Fetch current guest count for auto-incrementing names
  const { data: guestData = { data: [] } } = useVisibilityQuery<{ data: Guest[] }>({
    queryKey: ["/api/guests/checked-in"],
  });

  // Get the next guest number
  const getNextGuestNumber = useCallback(() => {
    const existingGuests = guestData.data || [];
    const guestNumbers = existingGuests
      .map(guest => {
        const match = guest.name.match(/^Guest(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => num > 0);
    
    const maxNumber = guestNumbers.length > 0 ? Math.max(...guestNumbers) : 0;
    return `Guest${maxNumber + 1}`;
  }, [guestData]);

  // Gender-based capsule assignment logic
  const getRecommendedCapsule = useCallback((gender: string) => {
    if (!availableCapsules || availableCapsules.length === 0) return "";
    
    // Parse capsule numbers for sorting
    const capsulesWithNumbers = availableCapsules.map(capsule => {
      const match = capsule.number.match(/C(\d+)/);
      const numericValue = match ? parseInt(match[1]) : 0;
      return { ...capsule, numericValue, originalNumber: capsule.number };
    });

    if (gender === "female") {
      // For females: back capsules with lowest number first, prefer bottom (even numbers)
      const backCapsules = capsulesWithNumbers
        .filter(c => c.section === "back") // Back section
        .sort((a, b) => {
          const aIsBottom = a.numericValue % 2 === 0;
          const bIsBottom = b.numericValue % 2 === 0;
          if (aIsBottom && !bIsBottom) return -1;
          if (!aIsBottom && bIsBottom) return 1;
          return a.numericValue - b.numericValue;
        });
      
      if (backCapsules.length > 0) {
        return backCapsules[0].originalNumber;
      }
    } else {
      // For non-females: front bottom capsules with lowest number first
      const frontBottomCapsules = capsulesWithNumbers
        .filter(c => c.section === "front" && c.numericValue % 2 === 0) // Front section, bottom (even numbers)
        .sort((a, b) => a.numericValue - b.numericValue);
      
      if (frontBottomCapsules.length > 0) {
        return frontBottomCapsules[0].originalNumber;
      }
    }

    // Fallback: any available capsule, prefer bottom (even numbers)
    const sortedCapsules = capsulesWithNumbers.sort((a, b) => {
      const aIsBottom = a.numericValue % 2 === 0;
      const bIsBottom = b.numericValue % 2 === 0;
      if (aIsBottom && !bIsBottom) return -1;
      if (!aIsBottom && bIsBottom) return 1;
      return a.numericValue - b.numericValue;
    });

    return sortedCapsules[0]?.originalNumber || "";
  }, [availableCapsules]);

  const form = useForm<InsertGuest>({
    resolver: zodResolver(insertGuestSchema),
    defaultValues: {
      name: "",
      capsuleNumber: "",
      paymentAmount: "45", // Default to RM45
      paymentMethod: "cash" as const,
      paymentCollector: "",
      gender: undefined,
      nationality: "Malaysian",
      phoneNumber: "",
      email: "",
      idNumber: "",
      emergencyContact: "",
      emergencyPhone: "",
      age: "",
      expectedCheckoutDate: (() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
      })(),
    },
  });

  // Get next day date for default checkout
  const getNextDayDate = useCallback(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  }, []);

  // Set defaults when user is available
  useEffect(() => {
    if (user && !form.getValues("paymentCollector")) {
      form.setValue("paymentCollector", getDefaultCollector());
    }
    if (!form.getValues("name")) {
      form.setValue("name", getNextGuestNumber());
    }
    if (!form.getValues("expectedCheckoutDate")) {
      form.setValue("expectedCheckoutDate", getNextDayDate());
    }
  }, [user, form, getDefaultCollector, getNextGuestNumber, getNextDayDate]);

  // Auto-assign capsule based on gender
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "gender" && value.gender && availableCapsules.length > 0) {
        // Always suggest a new capsule when gender changes
        const recommendedCapsule = getRecommendedCapsule(value.gender);
        
        if (recommendedCapsule && recommendedCapsule !== form.getValues("capsuleNumber")) {
          form.setValue("capsuleNumber", recommendedCapsule);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [availableCapsules, getRecommendedCapsule]); // Removed 'form' from dependencies to prevent infinite loop

  const checkinMutation = useMutation({
    mutationFn: async (data: InsertGuest) => {
      const response = await apiRequest("POST", "/api/guests/checkin", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests/checked-in"] });
      queryClient.invalidateQueries({ queryKey: ["/api/occupancy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capsules/available"] });
      form.reset();
      toast({
        title: "Success",
        description: "Guest checked in successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to check in guest",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertGuest) => {
    setFormDataToSubmit(data);
    setShowCheckinConfirmation(true);
    setCurrentStep(2);
  };

  const confirmCheckin = () => {
    if (formDataToSubmit) {
      setCurrentStep(3);
      checkinMutation.mutate(formDataToSubmit);
      setShowCheckinConfirmation(false);
      setFormDataToSubmit(null);
    }
  };

  const handleClear = () => {
    setShowClearConfirmation(true);
  };

  const confirmClear = () => {
    form.reset({
      name: getNextGuestNumber(),
      capsuleNumber: "",
      paymentAmount: "45", // Reset to default RM45
      paymentMethod: "cash" as const,
      paymentCollector: getDefaultCollector(),
      gender: undefined,
      nationality: "Malaysian",
      phoneNumber: "",
      email: "",
      idNumber: "",
      emergencyContact: "",
      emergencyPhone: "",
      age: "",
      expectedCheckoutDate: getNextDayDate(),
    });
    setShowClearConfirmation(false);
    toast({
      title: "Form Cleared",
      description: "All fields have been reset to default values",
    });
  };

  // Handle payment amount preset selection
  const handlePaymentPreset = (amount: string) => {
    form.setValue("paymentAmount", amount);
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    const dateString = now.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    return { timeString, dateString };
  };

  const { timeString, dateString } = getCurrentDateTime();

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 sm:px-6">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold text-hostel-text">Guest Check-In</CardTitle>
            <p className="text-gray-600 mt-2">Smart check-in with auto-assignment and preset payment options</p>
            <div className="mt-4">
              <div className="flex items-center justify-center gap-3 text-xs text-gray-600">
                <div className={`flex items-center gap-2`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${currentStep >= 1 ? 'bg-blue-600' : 'bg-gray-300'}`}></span>
                  <span>Details</span>
                </div>
                <div className={`h-[2px] w-10 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                <div className={`flex items-center gap-2`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></span>
                  <span>Payment</span>
                </div>
                <div className={`h-[2px] w-10 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                <div className={`flex items-center gap-2`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></span>
                  <span>Confirm</span>
                </div>
              </div>
              {completed && (
                <div className="mt-2 text-green-700 text-sm">Completed successfully!</div>
              )}
            </div>
            <div className="flex justify-center mt-4">
              <GuestTokenGenerator onTokenCreated={() => queryClient.invalidateQueries({ queryKey: ["/api/capsules/available"] })} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            <div>
              <Label htmlFor="name" className="flex items-center text-sm font-medium text-hostel-text mb-2">
                <User className="mr-2 h-4 w-4" />
                Guest Name *
              </Label>
              <div className="space-y-2">
                <Input
                  id="name"
                  type="text"
                  placeholder="Guest name (auto-generated, editable)"
                  className="w-full"
                  {...form.register("name")}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => form.setValue("name", getNextGuestNumber())}
                    className="text-xs"
                  >
                    Reset to {getNextGuestNumber()}
                  </Button>
                </div>
              </div>
              {form.formState.errors.name && (
                <p className="text-hostel-error text-sm mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Gender Selection - Moved here for smart capsule assignment */}
            <div>
              <Label htmlFor="gender" className="flex items-center text-sm font-medium text-hostel-text mb-2">
                <Users className="mr-2 h-4 w-4" />
                Gender <span className="text-gray-500 text-xs ml-2">(For smart capsule assignment)</span>
              </Label>
              <Select
                value={form.watch("gender") || ""}
                onValueChange={(value) => form.setValue("gender", value as "male" | "female" | "other" | "prefer-not-to-say")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select gender to enable smart capsule assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male (Front section preferred)</SelectItem>
                  <SelectItem value="female">Female (Back section preferred)</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.gender && (
                <p className="text-hostel-error text-sm mt-1">{form.formState.errors.gender.message}</p>
              )}
            </div>

            <div>
               <Label htmlFor="capsuleNumber" className="flex items-center text-sm font-medium text-hostel-text mb-2">
                <Bed className="mr-2 h-4 w-4" />
                 {labels.singular} Assignment *
              </Label>
              <p className="text-xs text-gray-600 mb-2">
                💡 Smart Assignment: Select gender first for automatic {labels.lowerSingular} recommendation!
              </p>
              {capsulesLoading ? (
                <Skeleton className="w-full h-10" />
              ) : (
                <Select
                  value={form.watch("capsuleNumber")}
                  onValueChange={(value) => form.setValue("capsuleNumber", value)}
                >
                  <SelectTrigger className="w-full">
                     <SelectValue placeholder={`Select ${labels.lowerSingular} (⭐ = bottom/preferred)`} />
                  </SelectTrigger>
                  <SelectContent>
                     {availableCapsules.length === 0 ? (
                       <SelectItem value="no-capsules" disabled>No {labels.lowerPlural} available</SelectItem>
                    ) : (
                      // Sort capsules: bottom (even numbers) first, then top (odd numbers)
                      availableCapsules
                        .sort((a, b) => {
                          const aNum = parseInt(a.number.replace('C', ''));
                          const bNum = parseInt(b.number.replace('C', ''));
                          const aIsBottom = aNum % 2 === 0;
                          const bIsBottom = bNum % 2 === 0;
                          
                          // Bottom capsules first
                          if (aIsBottom && !bIsBottom) return -1;
                          if (!aIsBottom && bIsBottom) return 1;
                          
                          // Within same position, sort by number
                          return aNum - bNum;
                        })
                        .map((capsule) => {
                          const capsuleNum = parseInt(capsule.number.replace('C', ''));
                          const isBottom = capsuleNum % 2 === 0;
                          const position = isBottom ? "Bottom" : "Top";
                          const preference = isBottom ? "⭐ Preferred" : "";
                          const genderMatch = form.watch("gender");
                          let suitability = "";
                          
                          if (genderMatch === "female" && capsule.section === "back") {
                            suitability = " 🎯 Recommended";
                          } else if (genderMatch !== "female" && genderMatch && capsule.section === "front" && isBottom) {
                            suitability = " 🎯 Recommended";
                          }
                          
                          return (
                            <SelectItem key={capsule.number} value={capsule.number}>
                              <div className="flex items-center justify-between w-full">
                                <span>
                                  {capsule.number} - {position} {preference}{suitability}
                                </span>
                                <span className="text-xs text-gray-500 capitalize">
                                  {capsule.section}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })
                    )}
                  </SelectContent>
                </Select>
              )}
              {form.formState.errors.capsuleNumber && (
                <p className="text-hostel-error text-sm mt-1">{form.formState.errors.capsuleNumber.message}</p>
              )}
            </div>

            {/* Payment Information */}
            <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
              <h3 className="text-sm font-medium text-hostel-text mb-3">Payment Information</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                <div>
                  <Label htmlFor="paymentAmount" className="text-sm font-medium text-hostel-text">
                    Amount (RM)
                  </Label>
                  <Select
                    value={["45", "48", "650"].includes(form.watch("paymentAmount") || "45") ? form.watch("paymentAmount") || "45" : "custom"}
                    onValueChange={(value) => {
                      if (value === "custom") {
                        // Clear the field and let user type custom amount
                        form.setValue("paymentAmount", "");
                        return;
                      }
                      form.setValue("paymentAmount", value);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select amount" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="45">RM45 (Standard)</SelectItem>
                      <SelectItem value="48">RM48 (Premium)</SelectItem>
                      <SelectItem value="650">RM650 (Monthly Package)</SelectItem>
                      <SelectItem value="custom">Custom Amount...</SelectItem>
                    </SelectContent>
                  </Select>
                  {!["45", "48", "650"].includes(form.watch("paymentAmount") || "") && (
                    <Input
                      id="customPaymentAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter custom amount (e.g., 35.50)"
                      className="w-full mt-2"
                      value={form.watch("paymentAmount") || ""}
                      onChange={(e) => form.setValue("paymentAmount", e.target.value)}
                      autoFocus
                    />
                  )}
                  {form.formState.errors.paymentAmount && (
                    <p className="text-hostel-error text-sm mt-1">{form.formState.errors.paymentAmount.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="paymentMethod" className="text-sm font-medium text-hostel-text">
                    Payment Method
                  </Label>
                  <Select
                    value={form.watch("paymentMethod")}
                    onValueChange={(value) => form.setValue("paymentMethod", value as "cash" | "tng" | "bank" | "platform")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="tng">Touch 'n Go</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="platform">Online Platform</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.paymentMethod && (
                    <p className="text-hostel-error text-sm mt-1">{form.formState.errors.paymentMethod.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="paymentCollector" className="text-sm font-medium text-hostel-text">
                    Payment Collector
                  </Label>
                  <Select
                    value={form.watch("paymentCollector")}
                    onValueChange={(value) => form.setValue("paymentCollector", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select payment collector" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={getDefaultCollector()}>{getDefaultCollector()} (Current User)</SelectItem>
                      <SelectItem value="Alston">Alston</SelectItem>
                      <SelectItem value="Jay">Jay</SelectItem>
                      <SelectItem value="Le">Le</SelectItem>
                      <SelectItem value="Kakar">Kakar</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.paymentCollector && (
                    <p className="text-hostel-error text-sm mt-1">{form.formState.errors.paymentCollector.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-green-50 rounded-lg p-3 sm:p-4 border border-green-200">
              <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
                <Phone className="mr-2 h-4 w-4" />
                Contact Information <span className="text-gray-500 text-xs ml-2">(Optional for admin)</span>
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <Label htmlFor="phoneNumber" className="text-sm font-medium text-hostel-text">
                    Phone Number
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="e.g., +60123456789"
                    className="mt-1"
                    {...form.register("phoneNumber")}
                  />
                  {form.formState.errors.phoneNumber && (
                    <p className="text-hostel-error text-sm mt-1">{form.formState.errors.phoneNumber.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-hostel-text">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="guest@example.com"
                    className="mt-1"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-hostel-error text-sm mt-1">{form.formState.errors.email.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Identification & Personal Details */}
            <div className="bg-orange-50 rounded-lg p-3 sm:p-4 border border-orange-200">
              <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
                <CreditCard className="mr-2 h-4 w-4" />
                Identification & Personal Details <span className="text-gray-500 text-xs ml-2">(Optional for admin)</span>
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                <div>
                  <Label htmlFor="idNumber" className="text-sm font-medium text-hostel-text">
                    ID/Passport Number
                  </Label>
                  <Input
                    id="idNumber"
                    type="text"
                    placeholder="IC or Passport No."
                    className="mt-1"
                    {...form.register("idNumber")}
                  />
                  {form.formState.errors.idNumber && (
                    <p className="text-hostel-error text-sm mt-1">{form.formState.errors.idNumber.message}</p>
                  )}
                </div>

                        {/* Age is automatically calculated from IC number */}

                <div>
                  <Label htmlFor="nationality" className="text-sm font-medium text-hostel-text">
                    Nationality
                  </Label>
                  <Select
                    value={form.watch("nationality") || "Malaysian"}
                    onValueChange={(value) => form.setValue("nationality", value)}
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Select nationality" />
                    </SelectTrigger>
                    <SelectContent>
                      {NATIONALITIES.map((n) => (
                        <SelectItem key={n.value} value={n.value}>
                          {n.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.nationality && (
                    <p className="text-hostel-error text-sm mt-1">{form.formState.errors.nationality.message}</p>
                  )}
                </div>


                <div className="sm:col-span-2">
                  <Label htmlFor="expectedCheckoutDate" className="text-sm font-medium text-hostel-text flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    Expected Checkout Date
                  </Label>
                  <Input
                    id="expectedCheckoutDate"
                    type="date"
                    className="mt-1"
                    {...form.register("expectedCheckoutDate")}
                  />
                  {form.formState.errors.expectedCheckoutDate && (
                    <p className="text-hostel-error text-sm mt-1">{form.formState.errors.expectedCheckoutDate.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
                <Users className="mr-2 h-4 w-4" />
                Emergency Contact (Optional)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergencyContact" className="text-sm font-medium text-hostel-text">
                    Emergency Contact Name
                  </Label>
                  <Input
                    id="emergencyContact"
                    type="text"
                    placeholder="Full name of emergency contact"
                    className="mt-1"
                    {...form.register("emergencyContact")}
                  />
                  {form.formState.errors.emergencyContact && (
                    <p className="text-hostel-error text-sm mt-1">{form.formState.errors.emergencyContact.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="emergencyPhone" className="text-sm font-medium text-hostel-text">
                    Emergency Contact Phone
                  </Label>
                  <Input
                    id="emergencyPhone"
                    type="tel"
                    placeholder="Emergency contact phone number"
                    className="mt-1"
                    {...form.register("emergencyPhone")}
                  />
                  {form.formState.errors.emergencyPhone && (
                    <p className="text-hostel-error text-sm mt-1">{form.formState.errors.emergencyPhone.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-sm font-medium text-hostel-text mb-3">Additional Notes (Optional)</h3>
              
              {/* Early/Late Check-in Options */}
              <div className="mb-3 flex gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2 rounded border-gray-300"
                    onChange={(e) => {
                      if (e.target.checked) {
                        const currentNotes = form.getValues("notes") || "";
                        form.setValue("notes", currentNotes + (currentNotes ? "\n" : "") + "Early check-in requested at: ");
                      } else {
                        const currentNotes = form.getValues("notes") || "";
                        form.setValue("notes", currentNotes.replace(/\nEarly check-in requested at:.*/, "").replace(/^Early check-in requested at:.*/, ""));
                      }
                    }}
                  />
                  <span className="text-sm">Early Check-in</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2 rounded border-gray-300"
                    onChange={(e) => {
                      if (e.target.checked) {
                        const currentNotes = form.getValues("notes") || "";
                        form.setValue("notes", currentNotes + (currentNotes ? "\n" : "") + "Late check-in requested at: ");
                      } else {
                        const currentNotes = form.getValues("notes") || "";
                        form.setValue("notes", currentNotes.replace(/\nLate check-in requested at:.*/, "").replace(/^Late check-in requested at:.*/, ""));
                      }
                    }}
                  />
                  <span className="text-sm">Late Check-in</span>
                </label>
              </div>
              
              <div>
                <Label htmlFor="notes" className="text-sm font-medium text-hostel-text">
                  Special Requirements or Notes
                </Label>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <textarea
                          id="notes"
                          rows={3}
                          placeholder="Any special requirements, allergies, accessibility needs, or additional notes..."
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-hostel-primary focus:ring-hostel-primary sm:text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border">
              <h3 className="text-sm font-medium text-hostel-text mb-3">Check-in Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{dateString}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">{timeString}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Staff:</span>
                  <span className="font-medium">Admin User</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-hostel-accent bg-opacity-10 text-hostel-accent">
                    Pending Check-in
                  </span>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button 
                type="submit"
                disabled={checkinMutation.isPending || availableCapsules.length === 0}
                isLoading={checkinMutation.isPending}
                className="flex-1 bg-hostel-secondary hover:bg-green-600 text-white font-medium"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Complete Check-In</span>
                <span className="sm:hidden">Complete</span>
              </Button>
              <Button 
                type="button"
                variant="outline"
                onClick={handleClear}
                className="px-6 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Clear
              </Button>
            </div>
          </form>
          </Form>
          
          {/* Smart Features - Moved to bottom */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800 mb-2">✨ Smart Features:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Auto-incrementing guest names (Guest1, Guest2...)</li>
              <li>• Gender-based {labels.lowerSingular} assignment (Front for males, Back for females)</li>
              <li>• Quick payment presets: RM45, RM48, RM650 (Monthly)</li>
              <li>• Admin form: Only name, capsule & payment required</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Check-in Confirmation Dialog */}
      {formDataToSubmit && (
        <ConfirmationDialog
          open={showCheckinConfirmation}
          onOpenChange={setShowCheckinConfirmation}
          title="Confirm Guest Check-In"
          description={`Please confirm the check-in details for ${formDataToSubmit.name} in capsule ${formDataToSubmit.capsuleNumber}. Payment: RM ${formDataToSubmit.paymentAmount} via ${formDataToSubmit.paymentMethod}.`}
          confirmText="Confirm Check-In"
          cancelText="Review Details"
          onConfirm={confirmCheckin}
          variant="info"
          icon={<UserPlus className="h-6 w-6 text-blue-600" />}
          isLoading={checkinMutation.isPending}
        />
      )}
      
      {/* Clear Confirmation Dialog */}
      <ConfirmationDialog
        open={showClearConfirmation}
        onOpenChange={setShowClearConfirmation}
        title="Clear Form"
        description="Are you sure you want to clear all fields? This will reset the form to default values."
        confirmText="Yes, Clear Form"
        cancelText="Cancel"
        onConfirm={confirmClear}
        variant="warning"
      />
    </div>
  );
}
