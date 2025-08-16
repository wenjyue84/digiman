import { Button } from "@/components/ui/button";
import { MapPin, Wifi, Camera, Globe, Video, Clock, CheckCircle, Phone, Mail } from "lucide-react";

interface GuestSuccessPageTemplateProps {
  // Display mode
  viewMode?: 'mobile' | 'desktop';
  isPreview?: boolean;
  
  // Guest-specific data (for actual success page)
  guestInfo?: {
    capsuleNumber?: string;
    guestName: string;
    phoneNumber: string;
    email?: string;
    expectedCheckoutDate?: string;
  } | null;
  assignedCapsuleNumber?: string | null;
  capsuleIssues?: any[];
  
  // Settings data
  settings: any;
  
  // Visibility settings (for preview)
  visibility?: {
    showIntro?: boolean;
    showAddress?: boolean;
    showWifi?: boolean;
    showCheckin?: boolean;
    showOther?: boolean;
    showFaq?: boolean;
    showCapsuleIssues?: boolean;
    showTimeAccess?: boolean;
    showHostelPhotos?: boolean;
    showGoogleMaps?: boolean;
    showCheckinVideo?: boolean;
  };
  
  // Content (for preview)
  content?: {
    intro?: string;
    address?: string;
    wifiName?: string;
    wifiPassword?: string;
    checkin?: string;
    other?: string;
    faq?: string;
    importantReminders?: string;
    hostelPhotosUrl?: string;
    googleMapsUrl?: string;
    checkinVideoUrl?: string;
    checkinTime?: string;
    checkoutTime?: string;
    doorPassword?: string;
  };
  
  // Actions (for actual success page)
  actions?: {
    onHostelPhotos?: () => void;
    onGoogleMaps?: () => void;
    onCheckinVideo?: () => void;
  };
}

export default function GuestSuccessPageTemplate({
  viewMode = 'mobile',
  isPreview = false,
  guestInfo,
  assignedCapsuleNumber,
  capsuleIssues = [],
  settings,
  visibility = {},
  content = {},
  actions = {}
}: GuestSuccessPageTemplateProps) {
  
  // Use content from props for preview, or settings for actual page
  const effectiveContent = {
    intro: content.intro || settings?.guideIntro || '',
    address: content.address || settings?.guideAddress || '',
    wifiName: content.wifiName || settings?.guideWifiName || '',
    wifiPassword: content.wifiPassword || settings?.guideWifiPassword || '',
    checkin: content.checkin || settings?.guideCheckin || '',
    other: content.other || settings?.guideOther || '',
    faq: content.faq || settings?.guideFaq || '',
    importantReminders: content.importantReminders || settings?.guideImportantReminders || '',
    hostelPhotosUrl: content.hostelPhotosUrl || settings?.guideHostelPhotosUrl || '',
    googleMapsUrl: content.googleMapsUrl || settings?.guideGoogleMapsUrl || '',
    checkinVideoUrl: content.checkinVideoUrl || settings?.guideCheckinVideoUrl || '',
    checkinTime: content.checkinTime || settings?.guideCheckinTime || '3:00 PM',
    checkoutTime: content.checkoutTime || settings?.guideCheckoutTime || '12:00 PM',
    doorPassword: content.doorPassword || settings?.guideDoorPassword || '1270#'
  };

  // Use visibility from props for preview, or default true for actual page
  const effectiveVisibility = {
    showIntro: visibility.showIntro ?? settings?.guideShowIntro ?? true,
    showAddress: visibility.showAddress ?? settings?.guideShowAddress ?? true,
    showWifi: visibility.showWifi ?? settings?.guideShowWifi ?? true,
    showCheckin: visibility.showCheckin ?? settings?.guideShowCheckin ?? true,
    showOther: visibility.showOther ?? settings?.guideShowOther ?? true,
    showFaq: visibility.showFaq ?? settings?.guideShowFaq ?? true,
    showCapsuleIssues: visibility.showCapsuleIssues ?? settings?.guideShowCapsuleIssues ?? false,
    showTimeAccess: visibility.showTimeAccess ?? settings?.guideShowTimeAccess ?? true,
    showHostelPhotos: visibility.showHostelPhotos ?? settings?.guideShowHostelPhotos ?? true,
    showGoogleMaps: visibility.showGoogleMaps ?? settings?.guideShowGoogleMaps ?? true,
    showCheckinVideo: visibility.showCheckinVideo ?? settings?.guideShowCheckinVideo ?? true,
  };

  // Parse address into components for better display
  const parseAddress = (addressText: string) => {
    const lines = addressText.split('\n').filter(line => line.trim());
    const address = lines.find(line => !line.includes('Phone:') && !line.includes('Email:')) || '';
    const phone = lines.find(line => line.includes('Phone:'))?.replace('Phone:', '').trim() || '';
    const email = lines.find(line => line.includes('Email:'))?.replace('Email:', '').trim() || '';
    return { address, phone, email };
  };

  const { address: streetAddress, phone, email } = parseAddress(effectiveContent.address);

  const capsuleNumber = isPreview 
    ? 'Assigned based on availability'
    : (assignedCapsuleNumber || guestInfo?.capsuleNumber || 'C01');

  return (
    <div className={`${viewMode === 'mobile' ? 'max-w-sm' : 'max-w-2xl'} mx-auto ${isPreview ? '' : 'px-4'}`}>
      <div className={`${isPreview ? 'border rounded-lg overflow-hidden' : ''} bg-gradient-to-br from-orange-50 to-pink-50 ${isPreview ? 'shadow-xl' : ''}`}>
        <div className={viewMode === 'mobile' ? 'p-4' : 'p-6'}>
          {/* Success Header */}
          <div className="text-center mb-6">
            <div className={`${viewMode === 'mobile' ? 'text-3xl mb-3' : 'text-4xl mb-4'}`}>🎉</div>
            <h1 className={`${viewMode === 'mobile' ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 mb-2`}>Good Day, Our Honorable Guest!</h1>
            <div className={`${viewMode === 'mobile' ? 'text-xl mb-3' : 'text-2xl mb-4'}`}>🎉</div>
          </div>

          {/* Welcome Section */}
          {effectiveVisibility.showIntro && effectiveContent.intro && (
            <div className={`bg-gradient-to-r from-orange-100 to-pink-100 rounded-xl ${viewMode === 'mobile' ? 'p-4' : 'p-6'} mb-6`}>
              <h2 className={`${viewMode === 'mobile' ? 'text-lg' : 'text-xl'} font-bold text-gray-800 mb-4 flex items-center justify-center gap-2`}>
                Welcome to Pelangi Capsule Hostel <span className={`${viewMode === 'mobile' ? 'text-xl' : 'text-2xl'}`}>🌈</span>
              </h2>
              
              {/* Essential Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {/* Address Section */}
                {effectiveVisibility.showAddress && streetAddress && (
                  <div className="bg-white/70 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-800 mb-1">Address</div>
                        <div className="text-gray-700 text-xs leading-relaxed">
                          {streetAddress}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Phone Section */}
                {effectiveVisibility.showAddress && phone && (
                  <div className="bg-white/70 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-800 mb-1">Phone</div>
                        <div className="text-gray-700 text-xs font-mono">
                          {phone}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Email Section */}
                {effectiveVisibility.showAddress && email && (
                  <div className="bg-white/70 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-800 mb-1">Email</div>
                        <div className="text-gray-700 text-xs font-mono break-all">
                          {email}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* WiFi Section */}
                {effectiveVisibility.showWifi && (effectiveContent.wifiName || effectiveContent.wifiPassword) && (
                  <div className="bg-white/70 rounded-lg p-3 md:col-span-3">
                    <div className="flex items-start gap-2">
                      <Wifi className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-800 mb-1">WiFi Access</div>
                        <div className="text-gray-700 text-xs space-y-1">
                          {effectiveContent.wifiName && (
                            <div><span className="font-medium">Network:</span> <span className="font-mono">{effectiveContent.wifiName}</span></div>
                          )}
                          {effectiveContent.wifiPassword && (
                            <div><span className="font-medium">Password:</span> <span className="font-mono">{effectiveContent.wifiPassword}</span></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Links */}
          {(effectiveVisibility.showHostelPhotos || effectiveVisibility.showGoogleMaps || effectiveVisibility.showCheckinVideo) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {effectiveVisibility.showHostelPhotos && effectiveContent.hostelPhotosUrl && (
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 h-auto py-3 px-4"
                  onClick={actions.onHostelPhotos || (() => window.open(effectiveContent.hostelPhotosUrl, '_blank'))}
                >
                  <Camera className="h-4 w-4" />
                  <span className="text-sm">Hostel Photos</span>
                </Button>
              )}
              
              {effectiveVisibility.showGoogleMaps && effectiveContent.googleMapsUrl && (
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 h-auto py-3 px-4"
                  onClick={actions.onGoogleMaps || (() => window.open(effectiveContent.googleMapsUrl, '_blank'))}
                >
                  <Globe className="h-4 w-4" />
                  <span className="text-sm">Google Maps</span>
                </Button>
              )}
              
              {effectiveVisibility.showCheckinVideo && effectiveContent.checkinVideoUrl && (
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 h-auto py-3 px-4"
                  onClick={actions.onCheckinVideo || (() => window.open(effectiveContent.checkinVideoUrl, '_blank'))}
                >
                  <Video className="h-4 w-4" />
                  <span className="text-sm">How-to Video</span>
                </Button>
              )}
              
              {(!effectiveVisibility.showHostelPhotos || !effectiveContent.hostelPhotosUrl) && 
               (!effectiveVisibility.showGoogleMaps || !effectiveContent.googleMapsUrl) && 
               (!effectiveVisibility.showCheckinVideo || !effectiveContent.checkinVideoUrl) && isPreview && (
                <div className="col-span-3 text-center text-gray-500 text-sm py-4">
                  No quick links configured or visible. Add URLs in the Quick Links Configuration section above.
                </div>
              )}
            </div>
          )}

          {/* Time and Access Information */}
          {effectiveVisibility.showTimeAccess && (
            <div className="border-t border-gray-200 py-6 space-y-4">
              {/* Time Information */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Operating Hours
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">🕒</span>
                    <span className="font-medium">Arrival:</span>
                    <span className="font-semibold">{effectiveContent.checkinTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">🕛</span>
                    <span className="font-medium">Departure:</span>
                    <span className="font-semibold">{effectiveContent.checkoutTime}</span>
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
                      {effectiveContent.doorPassword}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">🛌</span>
                    <span className="font-medium">Capsule:</span>
                    <span className="font-bold text-lg text-orange-600 bg-white px-2 py-1 rounded border">
                      {capsuleNumber}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">🃏</span>
                  <span className="font-medium">Access Card:</span>
                  <span className="text-sm text-gray-600">Collect from reception upon arrival</span>
                </div>

                {/* Capsule Issues */}
                {effectiveVisibility.showCapsuleIssues && capsuleIssues.length > 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-600">⚠️</span>
                      <span className="font-medium text-yellow-800">Capsule Issues</span>
                    </div>
                    <div className="space-y-2">
                      {capsuleIssues.map((issue, index) => (
                        <div key={index} className="text-sm text-yellow-700 bg-white/60 p-2 rounded border">
                          <div className="font-medium">{issue.description}</div>
                          <div className="text-xs text-yellow-600 mt-1">
                            Reported: {new Date(issue.reportedAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-yellow-700">
                      <strong>Note:</strong> These issues have been reported and are being addressed. 
                      You may choose to accept this capsule or contact reception for alternatives.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Check-in Instructions */}
          {effectiveVisibility.showCheckin && effectiveContent.checkin && (
            <div className="border-t border-gray-200 pt-6 space-y-2">
              <h3 className="font-bold text-gray-800">How to Arrive:</h3>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{effectiveContent.checkin}</div>
            </div>
          )}

          {/* Other Guidance */}
          {effectiveVisibility.showOther && effectiveContent.other && (
            <div className="border-t border-gray-200 pt-6 space-y-2">
              <h3 className="font-bold text-gray-800">Additional Information:</h3>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{effectiveContent.other}</div>
            </div>
          )}

          {/* FAQ */}
          {effectiveVisibility.showFaq && effectiveContent.faq && (
            <div className="border-t border-gray-200 pt-6 space-y-2">
              <h3 className="font-bold text-gray-800">Frequently Asked Questions:</h3>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{effectiveContent.faq}</div>
            </div>
          )}

          {/* Important Reminders */}
          {effectiveContent.importantReminders && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg mt-6">
              <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                <span className="text-red-600">⚠️</span> Important Reminders
              </h3>
              <div className="text-sm text-red-700 whitespace-pre-wrap">
                {effectiveContent.importantReminders}
              </div>
            </div>
          )}

          {!isPreview && (
            <div className="text-center text-gray-600 text-sm mt-6">
              For any assistance, please contact reception.<br />
              Enjoy your stay at Pelangi Capsule Hostel! 💼🌟
            </div>
          )}
        </div>
      </div>
    </div>
  );
}