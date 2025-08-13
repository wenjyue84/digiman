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


export default function GuestCheckin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useI18n();
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [editToken, setEditToken] = useState<string>("");
  const [editExpiresAt, setEditExpiresAt] = useState<Date | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [icDocumentUrl, setIcDocumentUrl] = useState<string>("");
  const [passportDocumentUrl, setPassportDocumentUrl] = useState<string>("");
  const [nationalityFilter, setNationalityFilter] = useState("");
  const saveTimerRef = useRef<number | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailForSlip, setEmailForSlip] = useState("");

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
  const watchedIcNumber = form.watch("icNumber");
  const watchedPassportNumber = form.watch("passportNumber");
  
  // Determine which fields should be disabled based on mutual exclusivity
  const isIcFieldDisabled = !!(watchedPassportNumber && watchedPassportNumber.trim().length > 0);
  const isPassportFieldDisabled = !!(watchedIcNumber && watchedIcNumber.trim().length > 0);

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

  // Filter nationalities based on search input
  const filteredNationalities = NATIONALITIES.filter(nationality =>
    nationality.label.toLowerCase().includes(nationalityFilter.toLowerCase())
  );

  useEffect(() => {
    // Get token from URL parameters
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

  // Restore draft values per token
  useEffect(() => {
    if (!token) return;
    try {
      const draftRaw = localStorage.getItem(`guest-checkin-draft:${token}`);
      if (draftRaw) {
        const draft = JSON.parse(draftRaw);
        Object.entries(draft).forEach(([k, v]) => {
          if (v !== undefined) {
            // @ts-ignore
            form.setValue(k as any, v as any, { shouldDirty: true });
          }
        });
      }
    } catch {}
  }, [token]);

  // Autosave draft on change (debounced)
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (!token) return;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        try {
          const toSave: any = {
            nameAsInDocument: values.nameAsInDocument,
            phoneNumber: values.phoneNumber,
            gender: values.gender,
            nationality: values.nationality,
            icNumber: values.icNumber,
            passportNumber: values.passportNumber,
            paymentMethod: values.paymentMethod,
            emergencyContact: values.emergencyContact,
            emergencyPhone: values.emergencyPhone,
            notes: values.notes,
          };
          localStorage.setItem(`guest-checkin-draft:${token}`, JSON.stringify(toSave));
        } catch {}
      }, 500);
    });
    return () => subscription.unsubscribe();
  }, [form.watch, token]);

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
    return (
      <div className="min-h-screen bg-hostel-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">{t.validatingLink}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Card className="shadow-xl">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">🎉</div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.goodDay}</h1>
                <div className="text-2xl mb-4">🎉</div>
              </div>

              <div className="bg-gradient-to-r from-orange-100 to-pink-100 rounded-xl p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-2">
                  {t.welcomeHostel} <span className="text-2xl">🌈</span>
                </h2>
                
                {/* Essential Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {/* Address Section */}
                  <div className="bg-white/60 rounded-lg p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-orange-600 mt-0.5" />
                      <div>
                        <div className="font-semibold text-gray-800 mb-1">Address</div>
                        <div className="text-gray-700 whitespace-pre-line text-xs">
                          {settings?.guideAddress || '26A, Jalan Perang, Taman Pelangi, 80400 Johor Bahru, Johor, Malaysia'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* WiFi Section */}
                  <div className="bg-white/60 rounded-lg p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <Wifi className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div>
                        <div className="font-semibold text-gray-800 mb-1">WiFi Access</div>
                        <div className="text-gray-700 text-xs">
                          <div><span className="font-medium">Network:</span> {settings?.guideWifiName || 'Pelangi_Guest'}</div>
                          <div><span className="font-medium">Password:</span> {settings?.guideWifiPassword || 'Pelangi2024!'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {settings?.guideHostelPhotosUrl && (
                  <Button variant="outline" className="flex items-center gap-2 h-auto py-3 px-4" onClick={() => window.open(settings.guideHostelPhotosUrl, '_blank')}>
                    <Camera className="h-4 w-4" />
                    <span className="text-sm">{t.hostelPhotos}</span>
                  </Button>
                )}
                {settings?.guideGoogleMapsUrl && (
                  <Button variant="outline" className="flex items-center gap-2 h-auto py-3 px-4" onClick={() => window.open(settings.guideGoogleMapsUrl, '_blank')}>
                    <Globe className="h-4 w-4" />
                    <span className="text-sm">{t.googleMaps}</span>
                  </Button>
                )}
                {settings?.guideCheckinVideoUrl && (
                  <Button variant="outline" className="flex items-center gap-2 h-auto py-3 px-4" onClick={() => window.open(settings.guideCheckinVideoUrl, '_blank')}>
                    <Video className="h-4 w-4" />
                    <span className="text-sm">{t.checkInVideo}</span>
                  </Button>
                )}
                {!settings?.guideHostelPhotosUrl && !settings?.guideGoogleMapsUrl && !settings?.guideCheckinVideoUrl && (
                  <div className="col-span-3 text-center text-gray-500 text-sm py-4">
                    Quick links not configured
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 py-6 space-y-4">
                {/* Time Information */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    Check-in & Check-out Times
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">🕒</span>
                      <span className="font-medium">Check-in:</span>
                      <span className="font-semibold">{settings?.guideCheckinTime || '2:00 PM'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">🕛</span>
                      <span className="font-medium">Check-out:</span>
                      <span className="font-semibold">{settings?.guideCheckoutTime || '12:00 PM'}</span>
                    </div>
                  </div>
                </div>

                {/* Access Information */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Access & Room Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">🔐</span>
                      <span className="font-medium">Door Password:</span>
                      <span className="font-mono text-lg font-bold text-green-600 bg-white px-2 py-1 rounded border">
                        {settings?.guideDoorPassword || '1270#'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">🛌</span>
                      <span className="font-medium">Capsule:</span>
                      {guestInfo?.autoAssign ? (
                        <span className="font-bold text-lg text-green-600">Assigned based on availability</span>
                      ) : (
                        <span className="font-bold text-lg text-orange-600 bg-white px-2 py-1 rounded border">
                          {guestInfo?.capsuleNumber} ({guestInfo?.position})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">🃏</span>
                    <span className="font-medium">Access Card:</span>
                    <span className="text-sm text-gray-600">Collect from reception upon arrival</span>
                  </div>
                </div>

                {/* Important Reminders */}
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                  <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                    <span className="text-red-600">⚠️</span> 
                    Important Reminders
                  </h3>
                  <div className="text-sm text-red-700 whitespace-pre-wrap leading-relaxed">
                    {settings?.guideImportantReminders || 'Please keep your room key safe. Quiet hours are from 10:00 PM to 7:00 AM. No smoking inside the building. Keep shared spaces clean.'}
                  </div>
                </div>

                {canEdit && editExpiresAt && new Date() < editExpiresAt && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm font-medium text-yellow-800">{t.infoEditable}</span>
                    </div>
                    <p className="text-xs text-yellow-700">
                      {t.editUntil} {editExpiresAt.toLocaleTimeString()}.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => {
                        // Navigate back to edit form
                        window.location.href = `/guest-edit?token=${editToken}`;
                      }}
                    >
                      {t.editMyInfo}
                    </Button>
                  </div>
                )}

                {/* Print, Email, and Save buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                  <Button
                    variant="outline"
                    onClick={handlePrint}
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    {t.printCheckInSlip}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEmailForSlip(guestInfo?.email || "");
                      setShowEmailDialog(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Email
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSaveAsPdf}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {t.saveAsPdf}
                  </Button>
                </div>

                <div className="text-center text-gray-600 text-sm">
                  {t.assistance} <br />
                  {t.enjoyStay}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Email Dialog */}
        <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t.sendCheckInSlipEmail}</DialogTitle>
              <DialogDescription>
                {t.enterEmailForSlip}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="email-slip">{t.emailAddress}</Label>
                <Input
                  id="email-slip"
                  type="email"
                  placeholder="your.email@example.com"
                  value={emailForSlip}
                  onChange={(e) => setEmailForSlip(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowEmailDialog(false)}
                >
                  {t.cancel}
                </Button>
                <Button
                  onClick={handleSendEmail}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Email
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
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
              {timeRemaining && (
                <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-orange-700">
                      {t.linkExpiresIn || "Link expires in"}: <span className="font-mono">{timeRemaining}</span>
                    </span>
                  </div>
                </div>
              )}
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
              
              // Validate that at least one document is uploaded
              if (!icDocumentUrl && !passportDocumentUrl) {
                toast({
                  title: "Document Upload Required",
                  description: "Please upload a photo of your IC or passport. This is mandatory for check-in.",
                  variant: "destructive",
                });
                return;
              }
              
              form.handleSubmit(onSubmit, onInvalid)(e);
            }} className="space-y-6">
              {/* Personal Information */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  {t.personalInfo}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="nameAsInDocument" className="text-sm font-medium text-hostel-text">
                      {t.fullNameLabel}
                    </Label>
                    <Input
                      id="nameAsInDocument"
                      type="text"
                      placeholder={t.fullNamePlaceholder}
                      className="w-full mt-1"
                      autoComplete="name"
                      {...form.register("nameAsInDocument")}
                    />
                    <p className="text-xs text-gray-500 mt-1">{t.nameHint}</p>
                    {form.formState.errors.nameAsInDocument && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.nameAsInDocument.message}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="phoneNumber" className="text-sm font-medium text-hostel-text flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {t.contactNumberLabel}
                    </Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder={t.contactNumberPlaceholder}
                      className="w-full mt-1"
                      autoComplete="tel"
                      inputMode="tel"
                      {...form.register("phoneNumber")}
                    />
                    <p className="text-xs text-gray-500 mt-1">{t.phoneHint}</p>
                    {form.formState.errors.phoneNumber && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.phoneNumber.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="gender" className="text-sm font-medium text-hostel-text">
                      {t.genderLabel}
                    </Label>
                    <Select
                      value={form.watch("gender") || ""}
                      onValueChange={(value) => form.setValue("gender", value as "male" | "female" | "other" | "prefer-not-to-say")}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder={t.genderPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t.male}</SelectItem>
                        <SelectItem value="female">{t.female}</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">{t.genderHint}</p>
                    {form.formState.errors.gender && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.gender.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="nationality" className="text-sm font-medium text-hostel-text">
                      {t.nationalityLabel}
                    </Label>
                    <Select
                      value={form.watch("nationality") || "Malaysian"}
                      onValueChange={(value) => form.setValue("nationality", value)}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Select nationality" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <Input
                            placeholder="Search nationality..."
                            value={nationalityFilter}
                            onChange={(e) => setNationalityFilter(e.target.value)}
                            className="mb-2"
                          />
                        </div>
                        {filteredNationalities.map((nationality) => (
                          <SelectItem key={nationality.value} value={nationality.value}>
                            {nationality.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">{t.nationalityHint}</p>
                    {form.formState.errors.nationality && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.nationality.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Identity Documents */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  {t.identityDocs}
                </h3>
                <div className="mb-3 p-2 bg-green-100 border border-green-300 rounded text-xs text-green-700">
                  <p className="font-medium">📱 Mobile Check-in:</p>
                  <p>All guests must upload a document photo. Use your phone's camera for best results.</p>
                </div>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium mb-1">📋 Document Selection Rule</p>
                    <p className="text-sm text-gray-600">Provide either IC number OR passport number (only one required). When you enter one, the other field will be automatically disabled. <strong>Document photo upload is mandatory for all guests.</strong></p>
                    <div className="mt-2 p-2 bg-blue-100 border border-blue-200 rounded text-xs text-blue-700">
                      <p className="font-medium">📱 Mobile Note:</p>
                      <p>You can enter the document number first, then upload the photo, or upload the photo directly without entering the number.</p>
                      <div className="mt-1 p-1 bg-green-50 border border-green-200 rounded text-xs text-green-600">
                        <p className="font-medium">🚀 Pro Tip:</p>
                        <p>For fastest check-in, just upload the photo directly - no need to type document numbers!</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-start gap-2 text-sm text-gray-700">
                      <Info className="h-4 w-4 mt-0.5 text-gray-600" />
                      <div>
                        <div className="font-medium mb-1">{t.photoTipsTitle}</div>
                        <ul className="list-disc list-inside space-y-1">
                          <li>{t.photoTipLighting}</li>
                          <li>{t.photoTipGlare}</li>
                          <li>{t.photoTipSize}</li>
                        </ul>
                        <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                          <p className="font-medium">📱 Mobile Tips:</p>
                          <p>Hold your phone steady, ensure good lighting, and avoid shadows on the document.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="icNumber" className="text-sm font-medium text-hostel-text">
                        IC Number (e.g., 881014015523) <span className="text-gray-500 text-xs">(Optional if photo uploaded)</span>
                        {isIcFieldDisabled && <span className="text-gray-500 text-xs ml-2">(Disabled - passport entered)</span>}
                      </Label>
                      <Input
                        id="icNumber"
                        type="text"
                        placeholder={isIcFieldDisabled ? "Disabled - clear passport to enable" : "881014015523"}
                        className={`w-full mt-1 ${isIcFieldDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        disabled={isIcFieldDisabled}
                        inputMode="numeric"
                        autoComplete="off"
                        {...form.register("icNumber")}
                      />
                      <p className="text-xs text-gray-500 mt-1">{t.icHint}</p>
                      {form.formState.errors.icNumber && (
                        <p className="text-red-500 text-sm mt-1">{form.formState.errors.icNumber.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="passportNumber" className="text-sm font-medium text-hostel-text">
                        {t.passportNumberLabel} <span className="text-gray-500 text-xs">(Optional if photo uploaded)</span>
                        {isPassportFieldDisabled && <span className="text-gray-500 text-xs ml-2">(Disabled - IC entered)</span>}
                      </Label>
                      <Input
                        id="passportNumber"
                        type="text"
                        placeholder={isPassportFieldDisabled ? "Disabled - clear IC to enable" : t.passportNumberPlaceholder}
                        className={`w-full mt-1 ${isPassportFieldDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        disabled={isPassportFieldDisabled}
                        autoComplete="off"
                        {...form.register("passportNumber")}
                      />
                      <p className="text-xs text-gray-500 mt-1">{t.passportHint}</p>
                      {form.formState.errors.passportNumber && (
                        <p className="text-red-500 text-sm mt-1">{form.formState.errors.passportNumber.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Document Upload Section - Required for All Users */}
                  <div>
                    <Label className="text-sm font-medium text-hostel-text flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload IC/Passport Photo <span className="text-red-500">*</span>
                    </Label>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                      <p className="text-sm text-amber-800 font-medium mb-1">📸 Photo Requirement</p>
                      <p className="text-sm text-gray-700">All guests must upload a clear photo of their IC or passport. This is mandatory for check-in.</p>
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                        <p className="font-medium mb-1">📱 Mobile Users:</p>
                        <p>Use your phone's camera to take a clear photo. Ensure good lighting and avoid glare on the document.</p>
                      </div>
                    </div>
                    
                    {(icDocumentUrl || passportDocumentUrl) ? (
                      <div className="mt-2 p-3 bg-green-100 border border-green-300 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="text-2xl">✅</span>
                          </div>
                          <span className="text-sm text-green-700">
                            {icDocumentUrl && "IC document uploaded successfully"}
                            {passportDocumentUrl && "Passport document uploaded successfully"}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-green-600">
                          {icDocumentUrl && "✅ IC photo uploaded"}
                          {passportDocumentUrl && "✅ Passport photo uploaded"}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          <span className="hidden sm:inline">Use the buttons below to change your uploaded document photo if needed.</span>
                          <span className="sm:hidden">Tap below to change photo if needed.</span>
                        </p>
                        <div className="mt-2 flex flex-col sm:flex-row gap-2">
                          <ObjectUploader
                            maxNumberOfFiles={1}
                            maxFileSize={10485760} // 10MB
                            onGetUploadParameters={handleGetUploadParameters}
                            onComplete={(result) => handleDocumentUpload(result, 'ic')}
                            buttonClassName="flex-1 h-12 text-sm"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Change IC Photo</span>
                            <span className="sm:hidden">Change IC</span>
                          </ObjectUploader>
                          <ObjectUploader
                            maxNumberOfFiles={1}
                            maxFileSize={10485760} // 10MB
                            onGetUploadParameters={handleGetUploadParameters}
                            onComplete={(result) => handleDocumentUpload(result, 'passport')}
                            buttonClassName="flex-1 h-12 text-sm"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Change Passport Photo</span>
                            <span className="sm:hidden">Change Passport</span>
                          </ObjectUploader>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Camera className="h-8 w-8 text-gray-400" />
                          <span className="text-2xl">📸</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">
                          Upload a clear photo of your IC or passport
                        </p>
                        <p className="text-xs text-gray-500 mb-3">{t.photoHint}</p>
                        <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                          <p className="font-medium mb-1">💡 Tip:</p>
                          <p><span className="hidden sm:inline">Tap either button below to upload your document photo. You only need to upload one document type.</span>
                          <span className="sm:hidden">Tap either button to upload. You only need one document type.</span></p>
                          <div className="mt-1 p-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-600">
                            <p className="font-medium">📱 Quick Upload:</p>
                            <p>You can upload photos directly without entering document numbers first.</p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <ObjectUploader
                            maxNumberOfFiles={1}
                            maxFileSize={10485760} // 10MB
                            onGetUploadParameters={handleGetUploadParameters}
                            onComplete={(result) => handleDocumentUpload(result, 'ic')}
                            buttonClassName="flex-1 h-12 text-sm"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Upload IC Photo</span>
                            <span className="sm:hidden">IC Photo</span>
                          </ObjectUploader>
                          <ObjectUploader
                            maxNumberOfFiles={1}
                            maxFileSize={10485760} // 10MB
                            onGetUploadParameters={handleGetUploadParameters}
                            onComplete={(result) => handleDocumentUpload(result, 'passport')}
                            buttonClassName="flex-1 h-12 text-sm"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Upload Passport Photo</span>
                            <span className="sm:hidden">Passport Photo</span>
                          </ObjectUploader>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          <span className="hidden sm:inline">You can upload either IC or passport photo. Both are not required.</span>
                          <span className="sm:hidden">Choose one document type to upload. Both not needed.</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  Emergency Contact
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
                    <p className="text-xs text-gray-500 mt-1">{t.emergencyContactHint}</p>
                    {form.formState.errors.emergencyContact && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.emergencyContact.message}</p>
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
                      autoComplete="tel"
                      inputMode="tel"
                      {...form.register("emergencyPhone")}
                    />
                    <p className="text-xs text-gray-500 mt-1">{t.emergencyPhoneHint}</p>
                    {form.formState.errors.emergencyPhone && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.emergencyPhone.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-sm font-medium text-hostel-text mb-3">Additional Notes</h3>
                <div>
                  <Label htmlFor="notes" className="text-sm font-medium text-hostel-text">
                    Special Requirements or Notes
                  </Label>
                  {/* Quick-select common notes */}
                  <div className="mt-2 mb-2">
                    <div className="text-xs text-gray-700 mb-1 font-medium">{t.commonNotesTitle}</div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="px-2 py-1 text-xs border rounded-md hover:bg-white" onClick={() => {
                        const cur = form.getValues("notes") || "";
                        const v = t.commonNoteLateArrival;
                        form.setValue("notes", cur ? `${cur}\n${v}` : v);
                      }}>{t.commonNoteLateArrival}</button>
                      <button type="button" className="px-2 py-1 text-xs border rounded-md hover:bg-white" onClick={() => {
                        const cur = form.getValues("notes") || "";
                        const v = t.commonNoteBottomCapsule;
                        form.setValue("notes", cur ? `${cur}\n${v}` : v);
                      }}>{t.commonNoteBottomCapsule}</button>
                      <button type="button" className="px-2 py-1 text-xs border rounded-md hover:bg-white" onClick={() => {
                        const cur = form.getValues("notes") || "";
                        const v = t.commonNoteArriveEarly;
                        form.setValue("notes", cur ? `${cur}\n${v}` : v);
                      }}>{t.commonNoteArriveEarly}</button>
                      <button type="button" className="px-2 py-1 text-xs border rounded-md hover:bg-white" onClick={() => {
                        const cur = form.getValues("notes") || "";
                        const v = t.commonNoteQuietArea;
                        form.setValue("notes", cur ? `${cur}\n${v}` : v);
                      }}>{t.commonNoteQuietArea}</button>
                      <button type="button" className="px-2 py-1 text-xs border rounded-md hover:bg-white" onClick={() => {
                        const cur = form.getValues("notes") || "";
                        const v = t.commonNoteExtraBedding;
                        form.setValue("notes", cur ? `${cur}\n${v}` : v);
                      }}>{t.commonNoteExtraBedding}</button>
                    </div>
                  </div>
                  <Textarea
                    id="notes"
                    rows={3}
                    placeholder="Any special requirements, allergies, accessibility needs, or additional notes..."
                    className="mt-1"
                    {...form.register("notes")}
                  />
                  <p className="text-xs text-gray-500 mt-1">{t.notesHint}</p>
                  {form.formState.errors.notes && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.notes.message}</p>
                  )}
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Payment Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="paymentMethod" className="text-sm font-medium text-hostel-text">
                      Payment Method
                    </Label>
                    <Select
                      value={form.watch("paymentMethod") || ""}
                      onValueChange={(value) => form.setValue("paymentMethod", value as "cash" | "bank" | "online_platform")}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" />
                            <span>Cash (Paid to Guest/Person)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="bank">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <span>Bank Transfer</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="online_platform">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            <span>Online Platform (Booking.com, Agoda, etc.)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">{t.paymentMethodHint}</p>
                    {form.formState.errors.paymentMethod && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.paymentMethod.message}</p>
                    )}
                  </div>

                  {/* Cash Payment Description */}
                  {watchedPaymentMethod === "cash" && (
                    <div>
                      <Label htmlFor="guestPaymentDescription" className="text-sm font-medium text-hostel-text">
                        Describe whom you gave the payment to
                      </Label>
                      <Textarea
                        id="guestPaymentDescription"
                        placeholder="e.g., Paid RM50 to Ahmad at the front desk"
                        className="w-full mt-1"
                        {...form.register("guestPaymentDescription")}
                      />
                      <p className="text-xs text-gray-500 mt-1">{t.cashDescriptionHint}</p>
                      {form.formState.errors.guestPaymentDescription && (
                        <p className="text-red-500 text-sm mt-1">{form.formState.errors.guestPaymentDescription.message}</p>
                      )}
                    </div>
                  )}

                  {/* Bank Transfer Details */}
                  {watchedPaymentMethod === "bank" && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 mb-3">Bank Account Details</h4>
                      <div className="space-y-2 text-sm">
                        <div><strong>Account Name:</strong> Pelangi Capsule Hostel</div>
                        <div><strong>Account Number:</strong> 551128652007</div>
                        <div><strong>Bank:</strong> Maybank</div>
                      </div>
                      <div className="mt-4 text-center">
                        <p className="text-sm text-blue-700 mb-2">QR Code for Payment</p>
                        <img 
                          src={qrCodeImage} 
                          alt="Payment QR Code" 
                          className="w-32 h-auto mx-auto border border-gray-200 rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Help & FAQ */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-hostel-text mb-2 flex items-center">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  {t.faqNeedHelp}
                </h3>
                <p className="text-xs text-gray-600 mb-3">{t.faqIntro}</p>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="ic-vs-passport">
                    <AccordionTrigger className="text-sm">{t.faqIcVsPassportQ}</AccordionTrigger>
                    <AccordionContent className="text-sm text-gray-700">
                      {t.faqIcVsPassportA}
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="photo-upload">
                    <AccordionTrigger className="text-sm">{t.faqPhotoUploadQ}</AccordionTrigger>
                    <AccordionContent className="text-sm text-gray-700">
                      {t.faqPhotoUploadA}
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="phone-format">
                    <AccordionTrigger className="text-sm">{t.faqPhoneFormatQ}</AccordionTrigger>
                    <AccordionContent className="text-sm text-gray-700">
                      {t.faqPhoneFormatA}
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="gender-why">
                    <AccordionTrigger className="text-sm">{t.faqGenderWhyQ}</AccordionTrigger>
                    <AccordionContent className="text-sm text-gray-700">
                      {t.faqGenderWhyA}
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="privacy">
                    <AccordionTrigger className="text-sm">{t.faqPrivacyQ}</AccordionTrigger>
                    <AccordionContent className="text-sm text-gray-700">
                      {t.faqPrivacyA}
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="edit-after">
                    <AccordionTrigger className="text-sm">{t.faqEditAfterQ}</AccordionTrigger>
                    <AccordionContent className="text-sm text-gray-700">
                      {t.faqEditAfterA}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              <div className="sticky bottom-0 left-0 right-0 z-10 -mx-6 px-6 py-3 bg-gradient-to-t from-background via-background/95 to-transparent">
                {/* Document upload reminder */}
                {!icDocumentUrl && !passportDocumentUrl && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                      <Upload className="h-4 w-4" />
                      <span className="text-sm font-medium">Document Upload Required</span>
                    </div>
                    <p className="text-xs text-red-600 mt-1">
                      <span className="hidden sm:inline">Please upload a photo of your IC or passport before completing check-in.</span>
                      <span className="sm:hidden">Please upload your IC or passport photo to continue.</span>
                    </p>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base bg-orange-600 hover:bg-orange-700"
                  disabled={isSubmitting || (!icDocumentUrl && !passportDocumentUrl)}
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