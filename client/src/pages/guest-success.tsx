import React, { Suspense } from "react";
import { useSuccessPageValidation } from "@/hooks/guest-checkin/useSuccessPageValidation";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle } from "lucide-react";

// Lazy load the success screen component
const LazySuccessScreen = React.lazy(() => import("@/components/guest-checkin/SuccessScreen"));

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
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Handler functions for success screen actions
  const handlePrint = () => {
    window.print();
  };

  const handleSaveAsPdf = () => {
    // This would typically use a PDF generation library
    // For now, just trigger print dialog
    window.print();
  };

  const handleSendEmail = async () => {
    // This would send check-in details via email
    // Implementation would call the email API endpoint
    console.log("Send email functionality would be implemented here");
  };

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
            <LazySuccessScreen
              guestInfo={{
                guestName: guestInfo.name,
                phoneNumber: guestInfo.phoneNumber,
                email: guestInfo.email,
                expectedCheckoutDate: guestInfo.expectedCheckoutDate,
                capsuleNumber: guestInfo.capsuleNumber,
                autoAssign: false,
                position: guestInfo.capsuleNumber ? 
                  (parseInt(guestInfo.capsuleNumber.replace('C', '')) % 2 === 0 ? 'Bottom (Preferred)' : 'Top') 
                  : 'Available'
              }}
              settings={settings}
              assignedCapsuleNumber={guestInfo.capsuleNumber}
              capsuleIssues={[]} // No issues to show on success page
              canEdit={false} // No editing allowed on permanent success page
              editExpiresAt={null}
              editToken=""
              showEmailDialog={false}
              setShowEmailDialog={() => {}}
              emailForSlip={guestInfo.email || ""}
              setEmailForSlip={() => {}}
              handlePrint={handlePrint}
              handleSaveAsPdf={handleSaveAsPdf}
              handleSendEmail={handleSendEmail}
              guestData={{
                id: guestInfo.id,
                name: guestInfo.name,
                capsuleNumber: guestInfo.capsuleNumber,
                expectedCheckoutDate: guestInfo.expectedCheckoutDate,
                paymentAmount: guestInfo.paymentAmount,
                notes: guestInfo.notes,
                isPaid: guestInfo.isPaid
              }}
              onRefresh={() => {
                // Force refresh of the guest data
                window.location.reload();
              }}
            />
          </Suspense>
        </div>
      </div>
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
