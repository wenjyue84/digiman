import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useVisibilityQuery } from "@/hooks/useVisibilityQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import CheckinConfirmation from "@/components/guest-checkin/CheckinConfirmation";
import { NATIONALITIES } from "@/lib/nationalities";
import { getHolidayLabel, hasPublicHoliday } from "@/lib/holidays";
import GuestSuccessPageTemplate from "@/components/guest-success/GuestSuccessPageTemplate";
import { useQuery } from "@tanstack/react-query";
import {
  getCurrentDateTime,
  getNextDayDate,
  getNextGuestNumber,
  getDefaultCollector,
  getRecommendedCapsule
} from "@/components/check-in/utils";
import { getClientEnvironment } from "@shared/utils";
import PaymentInformationSection from "@/components/check-in/PaymentInformationSection";
import ContactInformationSection from "@/components/check-in/ContactInformationSection";
import IdentificationPersonalSection from "@/components/check-in/IdentificationPersonalSection";
import EmergencyContactSection from "@/components/check-in/EmergencyContactSection";
import AdditionalNotesSection from "@/components/check-in/AdditionalNotesSection";
import CapsuleAssignmentSection from "@/components/check-in/CapsuleAssignmentSection";
import CheckInDetailsSection from "@/components/check-in/CheckInDetailsSection";
import SmartFeaturesSection from "@/components/check-in/SmartFeaturesSection";
import StepProgressIndicator from "@/components/check-in/StepProgressIndicator";

// Removed SmartPhotoUploader in favor of ObjectUploader in IdentificationPersonalSection

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
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>("");
  const [showSuccessPage, setShowSuccessPage] = useState(false);
  const [checkedInGuest, setCheckedInGuest] = useState<any>(null);
  const [assignedCapsuleNumber, setAssignedCapsuleNumber] = useState<string | null>(null);
  
  // Add new state for capsule assignment warnings
  const [showCapsuleWarning, setShowCapsuleWarning] = useState(false);
  const [capsuleWarningMessage, setCapsuleWarningMessage] = useState("");

  // Add state for pre-selected capsule from Dashboard
  const [preSelectedCapsule, setPreSelectedCapsule] = useState<string | null>(null);
  const [isCapsuleLocked, setIsCapsuleLocked] = useState(false);

  // Check for pre-selected capsule from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const capsuleParam = urlParams.get('capsule');
    if (capsuleParam) {
      setPreSelectedCapsule(capsuleParam);
      setIsCapsuleLocked(true);
      // Show toast to inform user
      toast({
        title: "Capsule Pre-selected",
        description: `${labels.singular} ${capsuleParam} has been pre-selected from Dashboard. You can now enter guest information.`,
      });
    }
  }, [toast, labels.singular]);

  const { data: availableCapsules = [], isLoading: capsulesLoading } = useVisibilityQuery<(Capsule & { canAssign: boolean })[]>({
    queryKey: ["/api/capsules/available-with-status"],
    // Uses smart config: nearRealtime (30s stale, 60s refetch)
  });

  // Get the default collector name
  const defaultCollector = getDefaultCollector(user);

  // Fetch current guest count for auto-incrementing names
  const { data: guestData = { data: [] } } = useVisibilityQuery<{ data: Guest[] }>({
    queryKey: ["/api/guests/checked-in"],
  });

  // Get the next guest number
  const nextGuestNumber = getNextGuestNumber(guestData.data || []);

  // Fetch settings for guest success page
  const { data: settings } = useQuery<{
    guideHostelPhotosUrl?: string;
    guideGoogleMapsUrl?: string;
    guideCheckinVideoUrl?: string;
    guideCheckinTime?: string;
    guideCheckoutTime?: string;
    guideDoorPassword?: string;
    guideImportantReminders?: string;
    guideAddress?: string;
    guideWifiName?: string;
    guideWifiPassword?: string;
    guideShowCapsuleIssues?: boolean;
    guideIntro?: string;
    guideCheckin?: string;
    guideOther?: string;
    guideFaq?: string;
    guideShowIntro?: boolean;
    guideShowAddress?: boolean;
    guideShowWifi?: boolean;
    guideShowCheckin?: boolean;
    guideShowOther?: boolean;
    guideShowFaq?: boolean;
    guideShowTimeAccess?: boolean;
    guideShowHostelPhotos?: boolean;
    guideShowGoogleMaps?: boolean;
    guideShowCheckinVideo?: boolean;
  }>({
    queryKey: ["/api/settings"],
    enabled: true,
  });


  const form = useForm<InsertGuest>({
    resolver: zodResolver(insertGuestSchema),
    defaultValues: {
      name: "",
      capsuleNumber: "",
              paymentAmount: "45", // Default to RM45 per night
      paymentMethod: "cash" as const,
      paymentCollector: defaultCollector,
      gender: "male" as const,
      nationality: "Malaysian",
      phoneNumber: "",
      email: "",
      idNumber: "",
      emergencyContact: "",
      emergencyPhone: "",
      age: "",
      checkInDate: new Date().toISOString().split('T')[0], // Default to current date
      expectedCheckoutDate: getNextDayDate(),
    },
  });


  // Set defaults when user is available
  useEffect(() => {
    if (user && !form.getValues("paymentCollector")) {
      form.setValue("paymentCollector", defaultCollector);
    }
    if (!form.getValues("name")) {
      form.setValue("name", nextGuestNumber);
    }
    if (!form.getValues("expectedCheckoutDate")) {
      form.setValue("expectedCheckoutDate", getNextDayDate());
    }
  }, [user, form, defaultCollector, nextGuestNumber]);

  // Auto-assign capsule when form loads with default gender
  useEffect(() => {
    const currentGender = form.getValues("gender");
    const currentCapsule = form.getValues("capsuleNumber");
    
    // If we have a pre-selected capsule from Dashboard, use that instead of auto-assignment
    if (preSelectedCapsule && availableCapsules.length > 0) {
      const capsuleExists = availableCapsules.some(capsule => capsule.number === preSelectedCapsule);
      if (capsuleExists) {
        form.setValue("capsuleNumber", preSelectedCapsule);
        return; // Skip auto-assignment when capsule is pre-selected
      }
    }
    
    // Debug logging for environment detection
    const env = getClientEnvironment();
    console.log('🌍 Environment Debug:', {
      isLocalhost: env.isLocalhost,
      isReplit: env.isReplit,
      hostname: env.hostname,
      currentGender,
      currentCapsule,
      availableCapsulesCount: availableCapsules?.length || 0
    });

    // Auto-assign capsule if we have a gender (default "male") but no capsule selected
    if (currentGender && availableCapsules.length > 0 && !currentCapsule) {
      console.log('🤖 Attempting smart assignment for gender:', currentGender);
      
      // Only recommend capsules that can be assigned (cleaned)
      const assignableCapsules = availableCapsules.filter(capsule => capsule.canAssign);
      console.log('✅ Assignable capsules for smart assignment:', assignableCapsules.length);
      
      const recommendedCapsule = getRecommendedCapsule(currentGender, assignableCapsules);
      if (recommendedCapsule) {
        console.log('🎯 Smart assignment result:', recommendedCapsule);
        form.setValue("capsuleNumber", recommendedCapsule);
      } else {
        console.warn('⚠️ No capsule recommended by smart assignment');
      }
    }
  }, [availableCapsules, form, preSelectedCapsule]);

  // Auto-assign capsule based on gender changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Skip auto-assignment if capsule is locked from Dashboard
      if (isCapsuleLocked) return;
      
      if (name === "gender" && value.gender && availableCapsules.length > 0) {
        console.log('🔄 Gender changed to:', value.gender);
        
        // Always suggest a new capsule when gender changes
        // Only recommend capsules that can be assigned (cleaned)
        const assignableCapsules = availableCapsules.filter(capsule => capsule.canAssign);
        console.log('✅ Available capsules for gender change assignment:', assignableCapsules.length);
        
        const recommendedCapsule = getRecommendedCapsule(value.gender, assignableCapsules);
        
        if (recommendedCapsule && recommendedCapsule !== form.getValues("capsuleNumber")) {
          console.log('🎯 Gender-based assignment result:', recommendedCapsule);
          form.setValue("capsuleNumber", recommendedCapsule);
        } else {
          console.warn('⚠️ No new capsule recommended for gender change');
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [availableCapsules, form, isCapsuleLocked]);

  const checkinMutation = useMutation({
    mutationFn: async (data: InsertGuest) => {
      const response = await apiRequest("POST", "/api/guests/checkin", data);
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests/checked-in"] });
      queryClient.invalidateQueries({ queryKey: ["/api/occupancy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capsules/available"] });
      
      // Set capsule number and show success page
      setAssignedCapsuleNumber(result.capsuleNumber || checkedInGuest?.capsuleNumber || null);
      setShowSuccessPage(true);
      setCompleted(true);
      
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
    // Check if selected capsule has issues
    const selectedCapsule = availableCapsules.find(c => c.number === data.capsuleNumber);
    
    if (selectedCapsule && !selectedCapsule.canAssign) {
      // Show warning but allow admin to proceed
      let warningMessage = "";
      
      if (selectedCapsule.cleaningStatus === "to_be_cleaned") {
        warningMessage = `⚠️ WARNING: ${selectedCapsule.number} needs cleaning before it can be assigned. Are you sure you want to proceed with manual assignment?`;
      } else if (selectedCapsule.toRent === false) {
        warningMessage = `🚫 WARNING: ${selectedCapsule.number} is marked as "Not Suitable for Rent" due to major maintenance issues. Are you sure you want to assign it manually?`;
      } else if (!selectedCapsule.isAvailable) {
        warningMessage = `⚠️ WARNING: ${selectedCapsule.number} is currently unavailable. Are you sure you want to proceed with manual assignment?`;
      } else {
        warningMessage = `⚠️ WARNING: ${selectedCapsule.number} has some issues but can be manually assigned. Are you sure you want to proceed?`;
      }
      
      setCapsuleWarningMessage(warningMessage);
      setShowCapsuleWarning(true);
      return;
    }
    
    // Normal flow - no issues
    setFormDataToSubmit(data);
    setShowCheckinConfirmation(true);
    setCurrentStep(2);
  };

  const confirmCapsuleWarning = () => {
    if (formDataToSubmit) {
      setShowCapsuleWarning(false);
      setCapsuleWarningMessage("");
      // Proceed with check-in despite capsule issues
      setShowCheckinConfirmation(true);
      setCurrentStep(2);
    }
  };

  const confirmCheckin = () => {
    if (formDataToSubmit) {
      setCurrentStep(3);
      const payload: InsertGuest = {
        ...formDataToSubmit,
        ...(profilePhotoUrl ? { profilePhotoUrl } : {}),
      } as InsertGuest;
      // Store the guest data before clearing formDataToSubmit
      setCheckedInGuest(formDataToSubmit);
      checkinMutation.mutate(payload);
      setShowCheckinConfirmation(false);
      setFormDataToSubmit(null);
    }
  };

  const handleClear = () => {
    setShowClearConfirmation(true);
  };

  const confirmClear = () => {
    form.reset({
      name: getNextGuestNumber(guestData.data || []),
      capsuleNumber: "",
              paymentAmount: "45", // Reset to default RM45 per night
      paymentMethod: "cash" as const,
      paymentCollector: getDefaultCollector(user),
      gender: "male" as const,
      nationality: "Malaysian",
      phoneNumber: "",
      email: "",
      idNumber: "",
      emergencyContact: "",
      emergencyPhone: "",
      age: "",
      expectedCheckoutDate: getNextDayDate(),
    });
    setProfilePhotoUrl(""); // Clear profile photo
    setShowClearConfirmation(false);
    toast({
      title: "Form Cleared",
      description: "All fields have been reset to default values",
    });
  };

  const handleBackToForm = () => {
    setShowSuccessPage(false);
    setCheckedInGuest(null);
    setAssignedCapsuleNumber(null);
    setCurrentStep(1);
    setCompleted(false);
    form.reset({
      name: getNextGuestNumber(guestData.data || []),
      capsuleNumber: "",
      paymentAmount: "45",
      paymentMethod: "cash" as const,
      paymentCollector: getDefaultCollector(user),
      gender: "male" as const,
      nationality: "Malaysian",
      phoneNumber: "",
      email: "",
      idNumber: "",
      emergencyContact: "",
      emergencyPhone: "",
      age: "",
      expectedCheckoutDate: getNextDayDate(),
    });
    setProfilePhotoUrl("");
  };

  // Handle payment amount preset selection
  const handlePaymentPreset = (amount: string) => {
    form.setValue("paymentAmount", amount);
  };

  const { timeString, dateString } = getCurrentDateTime();

  // Action handlers for success page
  const handlePrint = () => {
    window.print();
  };

  const handleSaveAsPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Please allow popups to save as PDF",
        variant: "destructive",
      });
      return;
    }

    const guestName = checkedInGuest?.name || 'Guest';
    const capsule = assignedCapsuleNumber || checkedInGuest?.capsuleNumber || '';
    const checkinTime = settings?.guideCheckinTime || "3:00 PM";
    const checkoutTime = settings?.guideCheckoutTime || "12:00 PM";
    const doorPassword = settings?.guideDoorPassword || "1270#";
    const importantReminders = settings?.guideImportantReminders || "• Please keep your room key safe\n• Quiet hours are from 10:00 PM to 7:00 AM\n• No smoking inside the building";

    const pdfContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Check-in Information - Pelangi Capsule Hostel</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; color: #f97316; margin-bottom: 10px; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; color: #374151; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .info-item { padding: 10px; background: #f9fafb; border-radius: 8px; }
          .label { font-weight: bold; color: #374151; }
          .value { color: #6b7280; }
          .important { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🌈 PELANGI CAPSULE HOSTEL</div>
          <h1>Guest Information</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="section">
          <div class="section-title">Guest Information</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="label">Name:</div>
              <div class="value">${guestName}</div>
            </div>
            <div class="info-item">
              <div class="label">Capsule:</div>
              <div class="value">${capsule}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Access Information</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="label">Arrival Time:</div>
              <div class="value">${checkinTime}</div>
            </div>
            <div class="info-item">
              <div class="label">Departure Time:</div>
              <div class="value">${checkoutTime}</div>
            </div>
            <div class="info-item">
              <div class="label">Door Password:</div>
              <div class="value">${doorPassword}</div>
            </div>
            <div class="info-item">
              <div class="label">Access Card:</div>
              <div class="value">Collect from reception upon arrival</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Address</div>
          <p>${settings?.guideAddress || '26A, Jalan Perang, Taman Pelangi, 80400 Johor Bahru, Johor, Malaysia'}</p>
        </div>

        <div class="important">
          <div class="section-title">Important Reminders</div>
          <p>${importantReminders}</p>
        </div>

        <div class="footer">
          <p>For assistance, please contact reception</p>
          <p>Enjoy your stay at Pelangi Capsule Hostel! 💼🌟</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(pdfContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };

    toast({
      title: "PDF Ready",
      description: "Your information is ready to save as PDF",
    });
  };

  const handleEmail = () => {
    const guestName = checkedInGuest?.name || 'Guest';
    const capsule = assignedCapsuleNumber || checkedInGuest?.capsuleNumber || '';
    const checkinTime = settings?.guideCheckinTime || "3:00 PM";
    const checkoutTime = settings?.guideCheckoutTime || "12:00 PM";
    const doorPassword = settings?.guideDoorPassword || "1270#";
    const importantReminders = settings?.guideImportantReminders || "• Please keep your room key safe\n• Quiet hours are from 10:00 PM to 7:00 AM\n• No smoking inside the building";

    const subject = encodeURIComponent('Your Stay Information - Pelangi Capsule Hostel');
    const body = encodeURIComponent(`
Dear ${guestName},

Welcome to Pelangi Capsule Hostel! Here is your stay information:

🏨 PELANGI CAPSULE HOSTEL - GUEST INFORMATION

Guest Name: ${guestName}
Capsule Number: ${capsule}
Arrival Time: ${checkinTime}
Departure Time: ${checkoutTime}
Door Password: ${doorPassword}

⚠️ IMPORTANT REMINDERS:
${importantReminders}

📍 Address: ${settings?.guideAddress || '26A, Jalan Perang, Taman Pelangi, 80400 Johor Bahru, Johor, Malaysia'}

For any assistance, please contact reception.
Enjoy your stay at Pelangi Capsule Hostel! 💼🌟

---
This email was generated by Pelangi Capsule Hostel Management System
    `);

    const mailtoLink = `mailto:${checkedInGuest?.email || ''}?subject=${subject}&body=${body}`;
    window.open(mailtoLink, '_blank');
    
    toast({
      title: "Email Client Opened",
      description: "Your default email client has opened with the guest information",
    });
  };

  const handleShare = () => {
    const guestName = checkedInGuest?.name || 'Guest';
    const capsule = assignedCapsuleNumber || checkedInGuest?.capsuleNumber || '';
    const checkinTime = settings?.guideCheckinTime || "3:00 PM";
    const checkoutTime = settings?.guideCheckoutTime || "12:00 PM";
    const doorPassword = settings?.guideDoorPassword || "1270#";

    const shareText = `🏨 Pelangi Capsule Hostel - Guest Information

Name: ${guestName}
Capsule: ${capsule}
Arrival: ${checkinTime}
Departure: ${checkoutTime}
Door Password: ${doorPassword}

Address: ${settings?.guideAddress || '26A, Jalan Perang, Taman Pelangi, 80400 Johor Bahru, Johor, Malaysia'}

Welcome to Pelangi Capsule Hostel! 🌈`;

    if (navigator.share) {
      navigator.share({
        title: 'Pelangi Capsule Hostel - Guest Information',
        text: shareText,
      }).catch(() => {
        // Fallback to copying to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
          toast({
            title: "Copied to Clipboard",
            description: "Guest information has been copied to clipboard for sharing",
          });
        });
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText).then(() => {
        toast({
          title: "Copied to Clipboard",
          description: "Guest information has been copied to clipboard for sharing",
        });
      }).catch(() => {
        // Final fallback: WhatsApp share
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
        toast({
          title: "Opening WhatsApp",
          description: "WhatsApp is opening with the guest information ready to share",
        });
      });
    }
  };

  const handleBookAgain = () => {
    // Use the expected checkout date as the new check-in date
    const checkoutDate = checkedInGuest?.expectedCheckoutDate;
    if (checkoutDate) {
      const checkoutDateObj = new Date(checkoutDate);
      const nextCheckinDate = checkoutDateObj.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      window.location.href = `/check-in?checkin=${nextCheckinDate}`;
    } else {
      // Fallback to check-in page with no preset date
      window.location.href = '/check-in';
    }
  };

  // Show success page after successful check-in
  if (showSuccessPage && checkedInGuest) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 mb-6">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Guest Successfully Checked In!</h1>
            <p className="text-gray-600 mb-4">Share this information with the guest or use it for reference</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={handleBackToForm}
                    variant="outline"
                    className="mb-4"
                  >
                    ← Back to Check-In Form
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Return to check-in form for new guest</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <GuestSuccessPageTemplate
          viewMode="desktop"
          isPreview={false}
          guestInfo={{
            capsuleNumber: assignedCapsuleNumber || undefined,
            guestName: checkedInGuest.name,
            phoneNumber: checkedInGuest.phoneNumber,
            email: checkedInGuest.email,
            expectedCheckoutDate: checkedInGuest.expectedCheckoutDate,
          }}
          assignedCapsuleNumber={assignedCapsuleNumber}
          capsuleIssues={[]}
          settings={settings}
          actions={{
            onPrint: handlePrint,
            onSavePDF: handleSaveAsPdf,
            onEmail: handleEmail,
            onShare: handleShare,
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 sm:px-6">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold text-hostel-text">Guest Check-In</CardTitle>
            <p className="text-gray-600 mt-2">Smart check-in with auto-assignment and preset payment options</p>
            <StepProgressIndicator currentStep={currentStep} completed={completed} />
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
                  onFocus={(e) => e.target.select()}
                />
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => form.setValue("name", getNextGuestNumber(guestData.data || []))}
                        className="text-xs"
                      >
                        Reset to {nextGuestNumber}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Reset guest name to next auto-generated number</p>
                    </TooltipContent>
                  </Tooltip>
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

            <CapsuleAssignmentSection 
              form={form} 
              availableCapsules={availableCapsules} 
              capsulesLoading={capsulesLoading}
              isCapsuleLocked={isCapsuleLocked}
            />

            <PaymentInformationSection form={form} defaultCollector={defaultCollector} />

            <ContactInformationSection form={form} />

            <IdentificationPersonalSection 
              form={form} 
              profilePhotoUrl={profilePhotoUrl} 
              setProfilePhotoUrl={setProfilePhotoUrl} 
            />

            <EmergencyContactSection form={form} />

            <AdditionalNotesSection form={form} />

            <CheckInDetailsSection form={form} />

            {/* Add warning message when no capsules can be auto-assigned */}
            {availableCapsules.filter(capsule => capsule.canAssign).length === 0 && (
              <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 text-orange-700">
                  <Bed className="h-4 w-4" />
                  <span className="text-sm font-medium">No Capsules Available for Auto-Assignment</span>
                </div>
                <p className="text-xs text-orange-600 mt-1">
                  All available capsules need cleaning, maintenance, or have other issues. 
                  You can still manually assign a capsule by selecting one from the dropdown above, 
                  but please ensure the guest is aware of any potential issues.
                </p>
              </div>
            )}

            <div className="flex space-x-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    type="submit"
                    disabled={checkinMutation.isPending}
                    isLoading={checkinMutation.isPending}
                    className="flex-1 bg-hostel-secondary hover:bg-green-600 text-white font-medium"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Complete Check-In</span>
                    <span className="sm:hidden">Complete</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Process guest check-in and assign capsule</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleClear}
                    className="px-6 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Clear
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear all form fields and start over</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </form>
          </Form>
          
          <SmartFeaturesSection />
        </CardContent>
      </Card>

      {/* Check-in Confirmation Dialog */}
      {formDataToSubmit && (
        <ConfirmationDialog
          open={showCheckinConfirmation}
          onOpenChange={setShowCheckinConfirmation}
          title="Confirm Guest Check-In"
          description={ <CheckinConfirmation guest={formDataToSubmit} /> }
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
      
      {/* Add capsule assignment warning dialog */}
      <ConfirmationDialog
        open={showCapsuleWarning}
        onOpenChange={setShowCapsuleWarning}
        title="Capsule Assignment Warning"
        description={capsuleWarningMessage}
        confirmText="Yes, Proceed with Manual Assignment"
        cancelText="Cancel and Choose Different Capsule"
        onConfirm={confirmCapsuleWarning}
        variant="warning"
        icon={<Bed className="h-6 w-6 text-orange-600" />}
      />
    </div>
  );
}
