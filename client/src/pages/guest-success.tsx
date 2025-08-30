import React, { Suspense } from "react";
import { useSuccessPageValidation } from "@/hooks/guest-checkin/useSuccessPageValidation";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle } from "lucide-react";
import { GuestGuideProvider, useGuestGuide } from "@/lib/contexts/guest-guide-context";
import GuestSuccessPageTemplate from "@/components/guest-success/GuestSuccessPageTemplate";

// Lazy load the success screen component
const LazySuccessScreen = React.lazy(() => import("@/components/guest-checkin/SuccessScreen"));

/**
 * Enhanced Success Page Component with Context Integration
 * Uses the exact same approach as the preview to ensure perfect synchronization
 */
const EnhancedGuestSuccessPage: React.FC<{
  guestInfo: any;
  settings: any;
}> = ({ guestInfo, settings }) => {
  const { settings: contextSettings, isLoading: contextLoading, error } = useGuestGuide();
  
  // Use context settings if available (same as preview), fallback to API settings
  const useContextSettings = !contextLoading && !error && contextSettings?.content;
  
  // Handler functions for success screen actions
  const handlePrint = () => {
    window.print();
  };

  const handleSaveAsPdf = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    console.log("Send email functionality would be implemented here");
  };

  const handleShare = () => {
    const guestName = guestInfo?.name || 'Guest';
    const capsule = guestInfo?.capsuleNumber || '';
    const contentToUse = useContextSettings ? contextSettings.content : settings;
    const checkinTime = contentToUse?.checkinTime || contentToUse?.guideCheckinTime || "3:00 PM";
    const checkoutTime = contentToUse?.checkoutTime || contentToUse?.guideCheckoutTime || "12:00 PM";
    const doorPassword = contentToUse?.doorPassword || contentToUse?.guideDoorPassword || "1270#";
    const address = contentToUse?.address || contentToUse?.guideAddress || '26A, Jalan Perang, Taman Pelangi, 80400 Johor Bahru, Johor, Malaysia';

    const shareText = `🏨 Pelangi Capsule Hostel - My Stay Information

Name: ${guestName}
Capsule: ${capsule}
Arrival: ${checkinTime}
Departure: ${checkoutTime}
Door Password: ${doorPassword}

Address: ${address?.split('\n')[0] || address}

Welcome to Pelangi Capsule Hostel! 🌈`;

    if (navigator.share) {
      navigator.share({
        title: 'Pelangi Capsule Hostel - My Stay Information',
        text: shareText,
      }).catch(() => {
        navigator.clipboard.writeText(shareText);
      });
    } else {
      navigator.clipboard.writeText(shareText).catch(() => {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
      });
    }
  };

  // Debug logging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('[EnhancedGuestSuccessPage] Debug Info:', {
      useContextSettings,
      contextLoading,
      error,
      hasContextContent: !!contextSettings?.content,
      hasApiSettings: !!settings
    });
  }

  return (
    <div className="min-h-screen py-8">
      <GuestSuccessPageTemplate
        viewMode="desktop"
        isPreview={false}
        guestInfo={{
          capsuleNumber: guestInfo.capsuleNumber,
          guestName: guestInfo.name,
          phoneNumber: guestInfo.phoneNumber,
          email: guestInfo.email,
          expectedCheckoutDate: guestInfo.expectedCheckoutDate,
        }}
        assignedCapsuleNumber={guestInfo.capsuleNumber}
        capsuleIssues={[]}
        // Use the SAME approach as preview: pass settings=null when using context
        settings={useContextSettings ? null : settings}
        // Pass content and visibility directly from context (same as preview)
        content={useContextSettings ? contextSettings.content : undefined}
        visibility={useContextSettings ? contextSettings.visibility : undefined}
        actions={{
          onPrint: handlePrint,
          onSavePDF: handleSaveAsPdf,
          onEmail: handleSendEmail,
          onShare: handleShare,
          onExtend: () => {
            // Extend functionality would be implemented here
          },
        }}
      />
    </div>
  );
};

/**
 * Permanent Guest Success Page
 * This page can be accessed indefinitely by guests who have completed check-in
 * They can return to this URL anytime to book again or access their information
 */
export default function GuestSuccessPage() {
  const { t } = useI18n();

  // Validate token for success page access (allows used tokens)
  const { token, guestInfo, isLoading, isValidAccess } = useSuccessPageValidation({ t });

  // Fetch settings for displaying accommodation info
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
    enabled: isValidAccess,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });


  // Show loading state while validating access
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="text-2xl font-bold text-gray-900">Validating Access</h2>
          <p className="text-gray-600 max-w-md">
            We're checking your access to this success page...
          </p>
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
            <Skeleton className="h-4 w-2/3 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // Show the success screen if access is valid
  if (isValidAccess && guestInfo) {
    return (
      <GuestGuideProvider>
        <div className="min-h-screen bg-hostel-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Header indicating this is permanent access */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-200">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">✨ Your Permanent Check-in Success Page</span>
              </div>
              <p className="text-gray-600 mt-2 text-sm">
                Bookmark this page! You can return here anytime to extend your stay or access your information.
              </p>
            </div>

            <Suspense fallback={
              <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Your Success Page...</h2>
                  <Skeleton className="h-8 w-64 mx-auto" />
                </div>
              </div>
            }>
              <EnhancedGuestSuccessPage
                guestInfo={guestInfo}
                settings={settings}
              />
            </Suspense>
          </div>
        </div>
      </GuestGuideProvider>
    );
  }

  // If we reach here, something went wrong
  return (
    <div className="min-h-screen bg-hostel-background flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600">
          Unable to access this success page. Please check your link or contact support.
        </p>
      </div>
    </div>
  );
}
