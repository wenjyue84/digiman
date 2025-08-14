import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, User, Phone, Mail, Calendar, MapPin, CheckCircle, Upload, Camera, Globe, Video, CreditCard, Users, Banknote, DollarSign, HelpCircle, Info, Clock, Printer, Send, Wifi, Download } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { guestSelfCheckinSchema, type GuestSelfCheckin } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import qrCodeImage from "@assets/WhatsApp Image 2025-08-08 at 19.49.44_5bbbcb18_1754653834112.jpg";
import { NATIONALITIES } from "@/lib/nationalities";
import { getHolidayLabel, hasPublicHoliday } from "@/lib/holidays";
import SuccessScreen from "@/components/guest-checkin/SuccessScreen";
import LoadingScreen from "@/components/guest-checkin/LoadingScreen";
import { GuestInfoStep } from "@/components/guest-checkin/GuestInfoStep";
import { EmergencyContactSection } from "@/components/guest-checkin/EmergencyContactSection";
import { HelpFAQSection } from "@/components/guest-checkin/HelpFAQSection";
import { AdditionalNotesSection } from "@/components/guest-checkin/AdditionalNotesSection";
import { PaymentInformationSection } from "@/components/guest-checkin/PaymentInformationSection";
import { DocumentUploadSection } from "@/components/guest-checkin/DocumentUploadSection";
import { useTokenValidation } from "@/hooks/guest-checkin/useTokenValidation";
import { useAutoSave } from "@/hooks/guest-checkin/useAutoSave";
import CountdownTimer from "@/components/guest-checkin/CountdownTimer";


export default function GuestCheckin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Add error handling for useI18n
  let t: any;
  try {
    const i18nResult = useI18n();
    t = i18nResult.t;
  } catch (error) {
    console.error('i18n error:', error);
    // Fallback object
    t = {
      invalidLink: "Invalid Link",
      invalidLinkDesc: "This link is invalid or expired",
      expiredLink: "Expired Link", 
      expiredLinkDesc: "This link has expired",
      error: "Error",
      validationError: "Validation failed",
      checkInSuccess: "Check-in Successful",
      checkInSuccessDesc: "Successfully checked in to",
      checkInFailed: "Check-in Failed",
      personalInfo: "Personal Information",
      fullNameLabel: "Full Name",
      fullNamePlaceholder: "Enter your full name",
      nameHint: "Enter name as shown on ID",
      contactNumberLabel: "Contact Number", 
      contactNumberPlaceholder: "Enter phone number",
      phoneHint: "Include country code",
      genderLabel: "Gender",
      genderPlaceholder: "Select gender",
      genderHint: "Select your gender",
      male: "Male",
      female: "Female",
      nationalityLabel: "Nationality",
      nationalityHint: "Select your nationality"
    };
  }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [capsuleIssues, setCapsuleIssues] = useState<any[]>([]);
  const [icDocumentUrl, setIcDocumentUrl] = useState<string>("");
  const [passportDocumentUrl, setPassportDocumentUrl] = useState<string>("");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailForSlip, setEmailForSlip] = useState("");
  
  // Local state for submission results
  const [localEditToken, setEditToken] = useState<string>("");
  const [localEditExpiresAt, setEditExpiresAt] = useState<Date | null>(null);
  const [localCanEdit, setCanEdit] = useState(false);
  const [localAssignedCapsuleNumber, setAssignedCapsuleNumber] = useState<string | null>(null);

  // Fetch settings for quick links and time/access info
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
  }>({
    queryKey: ["/api/settings"],
    enabled: true,
  });

  const form = useForm<GuestSelfCheckin>({
    resolver: zodResolver(guestSelfCheckinSchema),
    defaultValues: {
      nameAsInDocument: "",
      phoneNumber: "",
      gender: undefined,
      nationality: "Malaysian",
      checkInDate: new Date().toISOString().split('T')[0], // Default to today
      checkOutDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to tomorrow
      icNumber: "",
      passportNumber: "",
      icDocumentUrl: "",
      passportDocumentUrl: "",
      paymentMethod: undefined,
      guestPaymentDescription: "",
      emergencyContact: "",
      emergencyPhone: "",
      notes: "",
    },
  });

  const watchedPaymentMethod = form.watch("paymentMethod");
  const watchedNationality = form.watch("nationality");
  const watchedIcNumber = form.watch("icNumber");
  const watchedPassportNumber = form.watch("passportNumber");
  const watchedCheckInDate = form.watch("checkInDate");
  const watchedCheckOutDate = form.watch("checkOutDate");
  const isMalaysian = watchedNationality === "Malaysian";
  
  // Determine which fields should be disabled based on mutual exclusivity
  const isIcFieldDisabled = !!(watchedPassportNumber && watchedPassportNumber.trim().length > 0);
  const isPassportFieldDisabled = !!(watchedIcNumber && watchedIcNumber.trim().length > 0);
  
  // Validate check-out date is after check-in date
  const isCheckOutDateValid = !watchedCheckInDate || !watchedCheckOutDate || 
    new Date(watchedCheckOutDate) > new Date(watchedCheckInDate);

  // Use custom hooks for token validation and auto-save
  const { 
    token, 
    guestInfo, 
    isLoading, 
    editToken, 
    editExpiresAt, 
    canEdit, 
    assignedCapsuleNumber, 
    tokenExpiresAt, 
    timeRemaining 
  } = useTokenValidation({ t, form });
  
  useAutoSave({ form, token });

  // Clear the disabled field when the other field is filled
  useEffect(() => {
    if (watchedIcNumber && watchedIcNumber.trim().length > 0) {
      // Clear passport fields when IC is filled - set to empty strings which will be converted to undefined by schema
      if (watchedPassportNumber) {
        form.setValue("passportNumber", "");
      }
      if (passportDocumentUrl) {
        form.setValue("passportDocumentUrl", "");
        setPassportDocumentUrl("");
      }
    }
  }, [watchedIcNumber]);

  useEffect(() => {
    if (watchedPassportNumber && watchedPassportNumber.trim().length > 0) {
      // Clear IC fields when passport is filled - set to empty strings which will be converted to undefined by schema
      if (watchedIcNumber) {
        form.setValue("icNumber", "");
      }
      if (icDocumentUrl) {
        form.setValue("icDocumentUrl", "");
        setIcDocumentUrl("");
      }
    }
  }, [watchedPassportNumber]);

  // When nationality is Malaysian, ensure passport fields are cleared and not used
  useEffect(() => {
    if (isMalaysian) {
      if (watchedPassportNumber) {
        form.setValue("passportNumber", "");
      }
      if (passportDocumentUrl) {
        form.setValue("passportDocumentUrl", "");
        setPassportDocumentUrl("");
      }
    }
  }, [isMalaysian]);



  const onSubmit = async (data: GuestSelfCheckin) => {
    setIsSubmitting(true);
    try {
      // Update document URLs based on what's uploaded
      const submitData = { 
        ...data, 
        icDocumentUrl: icDocumentUrl || undefined,
        passportDocumentUrl: passportDocumentUrl || undefined,
      };
      
      // Log submission data for debugging
      console.log("Submitting data:", submitData);
      console.log("Form errors:", form.formState.errors);
      
      const response = await fetch(`/api/guest-checkin/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        const result = await response.json();
        setIsSuccess(true);
        setEditToken(result.editToken);
        setEditExpiresAt(new Date(result.editExpiresAt));
        setCanEdit(true);
        setCapsuleIssues(result.capsuleIssues || []);
        setAssignedCapsuleNumber(result.capsuleNumber);
        toast({
          title: t.checkInSuccess,
          description: `${t.checkInSuccessDesc} ${result.capsuleNumber || 'your assigned capsule'}.`,
        });
      } else {
        const errorData = await response.json();
        console.error("Server error:", errorData);
        toast({
          title: t.checkInFailed,
          description: errorData.message || "Please check all required fields and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: t.error,
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  // Scroll to first error field on invalid submit
  const onInvalid = (errors: any) => {
    const firstKey = Object.keys(errors)[0];
    const idMap: Record<string, string> = {
      nameAsInDocument: 'nameAsInDocument',
      phoneNumber: 'phoneNumber',
      gender: 'gender',
      nationality: 'nationality',
      icNumber: 'icNumber',
      passportNumber: 'passportNumber',
      paymentMethod: 'paymentMethod',
      emergencyContact: 'emergencyContact',
      emergencyPhone: 'emergencyPhone',
      notes: 'notes',
    };
    const id = idMap[firstKey];
    if (id) {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // @ts-ignore
      el?.focus?.();
    }
  };

  const handleGetUploadParameters = async () => {
    const response = await fetch('/api/objects/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Upload URL request failed:', errorData);
      throw new Error('Failed to get upload URL');
    }
    
    const data = await response.json();
    console.log('Server upload response:', data); // Debug logging
    
    if (!data.uploadURL) {
      throw new Error('No upload URL returned from server');
    }
    
    // Store the upload URL for later reference
    const uploadUrl = data.uploadURL;
    console.log('Upload URL:', uploadUrl);
    
    // Store URL in a way we can retrieve it later
    (window as any).__lastUploadUrl = uploadUrl;
    
    return {
      method: 'PUT' as const,
      url: uploadUrl,
    };
  };

  const handleDocumentUpload = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>, documentType: 'ic' | 'passport') => {
    console.log('=== Document Upload Handler ===');
    console.log('Full result:', JSON.stringify(result, null, 2));
    
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      console.log('Uploaded file object:', uploadedFile);
      console.log('Uploaded file keys:', Object.keys(uploadedFile));
      
      // Log all possible URL locations
      console.log('Checking URL locations:');
      console.log('- uploadURL:', uploadedFile.uploadURL);
      console.log('- response:', (uploadedFile as any).response);
      console.log('- meta:', (uploadedFile as any).meta);
      console.log('- xhrUpload:', (uploadedFile as any).xhrUpload);
      
      // The uploadURL might be in different places depending on the upload method
      // For AWS S3 plugin, the URL used for upload is stored in uploadURL
      // For local dev uploads, we need to extract from the request URL
      
      // Check if we stored the URL during upload parameters
      const storedUploadUrl = (uploadedFile as any).meta?.uploadUrl || 
                             (uploadedFile as any).meta?.uploadURL;
      console.log('Stored upload URL from meta:', storedUploadUrl);
      
      // Also check window storage
      const windowStoredUrl = (window as any).__lastUploadUrl;
      console.log('Window stored URL:', windowStoredUrl);
      
      const uploadURL = uploadedFile.uploadURL || 
                       storedUploadUrl ||
                       windowStoredUrl ||
                       (uploadedFile as any).response?.uploadURL || 
                       (uploadedFile as any).meta?.responseUrl ||
                       (uploadedFile as any).xhrUpload?.endpoint;
      
      console.log('Final uploadURL:', uploadURL);
      
      if (uploadURL) {
        let objectId: string | undefined;
        try {
          // Handle different URL formats
          
          // Validate URL format first
          if (typeof uploadURL !== 'string' || uploadURL.trim() === '') {
            throw new Error('Upload URL is empty or not a string');
          }
          
          console.log('Processing upload URL:', uploadURL);
          
          if (uploadURL.includes('/api/objects/dev-upload/')) {
            // Dev upload URL (can be full or relative)
            const parts = uploadURL.split('/api/objects/dev-upload/');
            objectId = parts[parts.length - 1];
            console.log('Extracted objectId from dev upload URL:', objectId);
          } else if (uploadURL.startsWith('http://') || uploadURL.startsWith('https://')) {
            // Full URL - validate it's a proper URL
            try {
              const url = new URL(uploadURL);
              objectId = url.pathname.split('/').pop();
              console.log('Extracted objectId from full URL:', objectId);
            } catch (urlError) {
              console.error('Invalid URL format:', uploadURL);
              throw new Error(`Invalid URL format: ${uploadURL}`);
            }
          } else if (uploadURL.startsWith('/')) {
            // Relative URL
            objectId = uploadURL.split('/').pop();
            console.log('Extracted objectId from relative URL:', objectId);
          } else {
            // Unknown format
            console.error('Unknown URL format:', uploadURL);
            throw new Error(`Unknown URL format: ${uploadURL}`);
          }
          
          if (!objectId) {
            throw new Error('Could not extract object ID from upload URL');
          }
          
          // Construct full URL that points to our object serving endpoint
          const baseUrl = window.location.origin;
          const documentUrl = `${baseUrl}/objects/uploads/${objectId}`;
          
          console.log('Final document URL:', documentUrl);
          
          if (documentType === 'ic') {
            setIcDocumentUrl(documentUrl);
            form.setValue("icDocumentUrl", documentUrl);
          } else {
            setPassportDocumentUrl(documentUrl);
            form.setValue("passportDocumentUrl", documentUrl);
          }
          
          // Clear stored URL after successful use
          (window as any).__lastUploadUrl = null;
          
          toast({
            title: "Document Uploaded",
            description: `Your ${documentType === 'ic' ? 'IC' : 'passport'} document has been uploaded successfully.`,
          });
        } catch (error) {
          console.error('Error processing upload URL:', error);
          console.error('Error details:', {
            uploadURL,
            objectId,
            error: error instanceof Error ? error.message : error
          });
          toast({
            title: "Upload Error",
            description: error instanceof Error ? error.message : "Failed to process uploaded file. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        console.error('No upload URL found in any of the expected locations');
        console.error('Available data:', {
          uploadedFileKeys: Object.keys(uploadedFile),
          response: (uploadedFile as any).response,
          meta: (uploadedFile as any).meta,
        });
        toast({
          title: "Upload Error",
          description: "Unable to find upload URL. Please check console for details and try again.",
          variant: "destructive",
        });
      }
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Save as PDF function
  const handleSaveAsPdf = () => {
    // Create a new window with the content to be saved as PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Please allow popups to save as PDF",
        variant: "destructive",
      });
      return;
    }

    // Get guest guide settings
    const getCheckinTimes = () => {
      return {
        checkinTime: settings?.guideCheckinTime || "From 3:00 PM",
        checkoutTime: settings?.guideCheckoutTime || "Before 12:00 PM",
        doorPassword: settings?.guideDoorPassword || "1270#",
        importantReminders: settings?.guideImportantReminders || "• Do not leave your card inside the capsule and close the door\n• No Smoking in hostel area\n• CCTV monitored – Violation (e.g., smoking) may result in RM300 penalty"
      };
    };

    const { checkinTime, checkoutTime, doorPassword, importantReminders } = getCheckinTimes();

    // Create PDF content
    const pdfContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Check-in Slip - Pelangi Capsule Hostel</title>
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
          <h1>Check-in Slip</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="section">
          <div class="section-title">Guest Information</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="label">Name:</div>
              <div class="value">${form.getValues("nameAsInDocument") || guestInfo?.guestName || 'Guest'}</div>
            </div>
            <div class="info-item">
              <div class="label">Capsule:</div>
              <div class="value">${guestInfo?.capsuleNumber || 'Assigned based on availability'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Access Information</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="label">Check-in Time:</div>
              <div class="value">${checkinTime}</div>
            </div>
            <div class="info-item">
              <div class="label">Check-out Time:</div>
              <div class="value">${checkoutTime}</div>
            </div>
            <div class="info-item">
              <div class="label">Door Password:</div>
              <div class="value">${doorPassword}</div>
            </div>
            <div class="info-item">
              <div class="label">Access Card:</div>
              <div class="value">Placed on your pillow</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Address</div>
          <p>26A, Jalan Perang, Taman Pelangi, 80400 Johor Bahru, Johor, Malaysia</p>
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

    // Wait for content to load then trigger print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };

    toast({
      title: "PDF Ready",
      description: "Your check-in slip is ready to save as PDF",
    });
  };

  // Email function - using browser mailto (no API key required)
  const handleSendEmail = () => {
    if (!emailForSlip || !emailForSlip.includes('@')) {
      toast({
        title: t.invalidEmail,
        description: t.pleaseEnterValidEmail,
        variant: "destructive",
      });
      return;
    }

    // Get guest guide settings for check-in times, door password, and important reminders
    const getCheckinTimes = () => {
      return {
        checkinTime: settings?.guideCheckinTime || "From 3:00 PM",
        checkoutTime: settings?.guideCheckoutTime || "Before 12:00 PM",
        doorPassword: settings?.guideDoorPassword || "1270#",
        importantReminders: settings?.guideImportantReminders || "• Do not leave your card inside the capsule and close the door\n• No Smoking in hostel area\n• CCTV monitored – Violation (e.g., smoking) may result in RM300 penalty"
      };
    };

    const { checkinTime, checkoutTime, doorPassword, importantReminders } = getCheckinTimes();
    
    // Create email content
    const subject = encodeURIComponent('Your Check-in Slip - Pelangi Capsule Hostel');
    const body = encodeURIComponent(`
Dear ${form.getValues("nameAsInDocument") || guestInfo?.guestName || 'Guest'},

Welcome to Pelangi Capsule Hostel! Here is your check-in slip:

🏨 PELANGI CAPSULE HOSTEL - CHECK-IN SLIP

Guest Name: ${form.getValues("nameAsInDocument") || guestInfo?.guestName || 'Guest'}
Capsule Number: ${guestInfo?.capsuleNumber || 'Assigned based on availability'}
Check-in: ${checkinTime}
Check-out: ${checkoutTime}
Door Password: ${doorPassword}
Capsule Access Card: Placed on your pillow

⚠️ IMPORTANT REMINDERS:
${importantReminders}

📍 Address: 26A, Jalan Perang, Taman Pelangi, 80400 Johor Bahru

For any assistance, please contact reception.
Enjoy your stay at Pelangi Capsule Hostel! 💼🌟

---
This email was generated by Pelangi Capsule Hostel Management System
    `);

    // Create mailto link
    const mailtoLink = `mailto:${emailForSlip}?subject=${subject}&body=${body}`;
    
    // Open default email client
    window.open(mailtoLink, '_blank');
    
    // Update guest email if different
    if (guestInfo?.email !== emailForSlip) {
      // Store the email for future reference (could be sent to backend if needed)
      localStorage.setItem('lastGuestEmail', emailForSlip);
    }
    
    toast({
      title: "Email Client Opened",
      description: `Your default email client has opened with the check-in slip ready to send to ${emailForSlip}`,
    });
    
    setShowEmailDialog(false);
  };

  if (isSuccess) {
    return (
      <SuccessScreen
        guestInfo={guestInfo}
        settings={settings}
        assignedCapsuleNumber={assignedCapsuleNumber}
        capsuleIssues={capsuleIssues}
        canEdit={canEdit}
        editExpiresAt={editExpiresAt}
        editToken={editToken}
        showEmailDialog={showEmailDialog}
        setShowEmailDialog={setShowEmailDialog}
        emailForSlip={emailForSlip}
        setEmailForSlip={setEmailForSlip}
        handlePrint={handlePrint}
        handleSaveAsPdf={handleSaveAsPdf}
        handleSendEmail={handleSendEmail}
      />
    );
  }

  return (
    <div className="min-h-screen bg-hostel-background py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader className="text-center pb-6">
            <div>
              <CardTitle className="text-2xl font-bold text-hostel-text">{t.welcomeTitle}</CardTitle>
              <p className="text-lg font-medium text-gray-700 mt-2">Self Check-in Form</p>
              <p className="text-gray-600 mt-1">{t.completeCheckIn}</p>
              <div className="mt-4">
                <LanguageSwitcher variant="compact" className="mx-auto" />
              </div>
              <div className="mt-3 flex justify-center">
                <CountdownTimer 
                  timeRemaining={timeRemaining} 
                  tokenExpiresAt={tokenExpiresAt} 
                  t={t}
                />
              </div>
              {guestInfo && (
                <div className="mt-4 space-y-2">
                  {!guestInfo.autoAssign && (
                    <div className="rounded-lg p-3 bg-orange-50">
                      <div className="flex items-center justify-center text-sm font-medium text-orange-800">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{t.assignedCapsule}: {guestInfo.capsuleNumber} - {guestInfo.position}</span>
                      </div>
                    </div>
                  )}
                  {(guestInfo.guestName || guestInfo.phoneNumber || guestInfo.email) && (
                    <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                      <div className="font-medium">{t.prefilledInfo}</div>
                      {guestInfo.guestName && <div>Name: {guestInfo.guestName}</div>}
                      {guestInfo.phoneNumber && <div>Phone: {guestInfo.phoneNumber}</div>}
                      {guestInfo.email && <div>Email: {guestInfo.email}</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Quick help at the top */}
            <div className="mb-4 p-3 rounded-md bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-2 text-amber-800 text-sm">
                <HelpCircle className="h-4 w-4 mt-0.5" />
                <div>
                  <div className="font-medium mb-1">{t.tipsTitle}</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>{t.tipHaveDocument}</li>
                    <li>{t.tipPhoneFormat}</li>
                    <li>{t.tipGenderPrivacy}</li>
                    <li>{t.tipLanguageSwitch}</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Mobile-specific document upload reminder */}
            <div className="mb-4 p-3 rounded-md bg-blue-50 border border-blue-200">
              <div className="flex items-start gap-2 text-blue-800 text-sm">
                <Camera className="h-4 w-4 mt-0.5" />
                <div>
                  <div className="font-medium mb-1">📱 Mobile Check-in Ready</div>
                  <p className="text-xs text-blue-700">Have your IC or passport ready. You'll need to upload a photo using your phone's camera.</p>
                </div>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              // Manually set document URLs in form before validation
              if (icDocumentUrl) {
                form.setValue("icDocumentUrl", icDocumentUrl);
              }
              if (passportDocumentUrl) {
                form.setValue("passportDocumentUrl", passportDocumentUrl);
              }
              
              // Validate required document uploads based on nationality
              const nat = form.getValues("nationality");
              if (nat === 'Malaysian') {
                if (!icDocumentUrl) {
                  toast({
                    title: "IC Upload Required",
                    description: "Please upload a photo of your IC to continue.",
                    variant: "destructive",
                  });
                  return;
                }
              } else {
                if (!icDocumentUrl && !passportDocumentUrl) {
                  toast({
                    title: "Document Upload Required",
                    description: "Please upload a photo of your IC or passport. This is mandatory for check-in.",
                    variant: "destructive",
                  });
                  return;
                }
              }
              
              form.handleSubmit(onSubmit, onInvalid)(e);
            }} className="space-y-6">
              {/* Personal Information */}
              <GuestInfoStep
                form={form}
                errors={form.formState.errors}
                t={t}
              />

              {/* Identity Documents */}
              <DocumentUploadSection 
                form={form}
                errors={form.formState.errors}
                t={t}
                isMalaysian={isMalaysian}
                icDocumentUrl={icDocumentUrl}
                passportDocumentUrl={passportDocumentUrl}
                handleGetUploadParameters={handleGetUploadParameters}
                handleDocumentUpload={handleDocumentUpload}
              />

              {/* Emergency Contact */}
              <EmergencyContactSection 
                form={form}
                errors={form.formState.errors}
                t={t}
              />

              {/* Additional Notes */}
              <AdditionalNotesSection 
                form={form}
                errors={form.formState.errors}
                t={t}
              />

              {/* Payment Information */}
              <PaymentInformationSection 
                form={form}
                errors={form.formState.errors}
                t={t}
                watchedPaymentMethod={watchedPaymentMethod}
              />

              {/* Help & FAQ */}
              <HelpFAQSection t={t} />

              <div className="sticky bottom-0 left-0 right-0 z-10 -mx-6 px-6 py-3 bg-gradient-to-t from-background via-background/95 to-transparent">
                {/* Document upload reminder */}
                {((isMalaysian && !icDocumentUrl) || (!isMalaysian && !passportDocumentUrl)) && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                      <Upload className="h-4 w-4" />
                      <span className="text-sm font-medium">{isMalaysian ? 'IC Upload Required' : 'Document Upload Required'}</span>
                    </div>
                    <p className="text-xs text-red-600 mt-1">
                      <span className="hidden sm:inline">{isMalaysian ? 'Please upload a photo of your IC before completing check-in.' : 'Please upload a photo of your passport before completing check-in.'}</span>
                      <span className="sm:hidden">{isMalaysian ? 'Please upload your IC photo to continue.' : 'Please upload your passport photo to continue.'}</span>
                    </p>
                  </div>
                )}
                
                {/* Check-out date validation reminder */}
                {!isCheckOutDateValid && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm font-medium">Invalid Check-out Date</span>
                    </div>
                    <p className="text-xs text-red-600 mt-1">
                      Please ensure your check-out date is after your check-in date.
                    </p>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base bg-orange-600 hover:bg-orange-700"
                  disabled={isSubmitting || (isMalaysian ? !icDocumentUrl : !passportDocumentUrl) || !isCheckOutDateValid}
                  isLoading={isSubmitting}
                >
                  <span className="hidden sm:inline">Complete Check-in</span>
                  <span className="sm:hidden">Complete</span>
                </Button>
              </div>
              
              {/* Show validation errors summary if form was submitted */}
              {form.formState.isSubmitted && Object.keys(form.formState.errors).length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {Object.entries(form.formState.errors).map(([field, error]) => (
                      <li key={field} className="text-sm text-red-600">
                        {error?.message || `Error in ${field} field`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}