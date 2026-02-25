import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, Wifi, Camera, Globe, Video, Clock, CheckCircle, Phone, Mail, Printer, Send, Download, Share, Calendar } from "lucide-react";
import { DEFAULT_BUSINESS_CONFIG } from "@shared/business-config";

interface GuestSuccessPageTemplateProps {
  // Display mode
  viewMode?: 'mobile' | 'desktop';
  isPreview?: boolean;

  // Guest-specific data (for actual success page)
  guestInfo?: {
    unitNumber?: string;
    guestName: string;
    phoneNumber: string;
    email?: string;
    expectedCheckoutDate?: string;
  } | null;
  assignedUnitNumber?: string | null;
  /** @deprecated Use assignedUnitNumber */
  assignedunitNumber?: string | null;
  unitIssues?: any[];

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
    showUnitIssues?: boolean;
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
    onPrint?: () => void;
    onSavePDF?: () => void;
    onEmail?: () => void;
    onShare?: () => void;
    onExtend?: () => void;
  };
}

export default function GuestSuccessPageTemplate({
  viewMode = 'mobile',
  isPreview = false,
  guestInfo,
  assignedUnitNumber,
  assignedunitNumber,
  unitIssues = [],
  settings,
  visibility = {},
  content = {},
  actions = {}
}: GuestSuccessPageTemplateProps) {
  const mergedUnitIssues = unitIssues;

  // Use content from props for preview, or settings for actual page
  const effectiveContent = {
    intro: content.intro || settings?.guideIntro || '',
    address: content.address || settings?.guideAddress || DEFAULT_BUSINESS_CONFIG.address,
    wifiName: content.wifiName || settings?.guideWifiName || 'your wifi name',
    wifiPassword: content.wifiPassword || settings?.guideWifiPassword || 'your wifi password',
    checkin: content.checkin || settings?.guideCheckin || '',
    other: content.other || settings?.guideOther || '',
    faq: content.faq || settings?.guideFaq || '',
    importantReminders: content.importantReminders || settings?.guideImportantReminders || '',
    hostelPhotosUrl: content.hostelPhotosUrl || settings?.guideHostelPhotosUrl || 'https://photos.app.goo.gl/NLJARWwjuLy5wdGn7',
    googleMapsUrl: content.googleMapsUrl || settings?.guideGoogleMapsUrl || 'https://maps.app.goo.gl/maLXetUqYS5MtSLD9?g_st=iwb',
    checkinVideoUrl: content.checkinVideoUrl || settings?.guideCheckinVideoUrl || 'https://youtube.com/shorts/6Ux11oBZaQQ?feature=share',
    checkinTime: content.checkinTime || settings?.guideCheckinTime || '2:00 PM',
    checkoutTime: content.checkoutTime || settings?.guideCheckoutTime || '12:00 PM',
    doorPassword: content.doorPassword || settings?.guideDoorPassword || '0830#'
  };

  // Use visibility from props for preview, or default true for actual page
  const effectiveVisibility = {
    showIntro: visibility.showIntro ?? settings?.guideShowIntro ?? true,
    showAddress: visibility.showAddress ?? settings?.guideShowAddress ?? true,
    showWifi: visibility.showWifi ?? settings?.guideShowWifi ?? true,
    showCheckin: visibility.showCheckin ?? settings?.guideShowCheckin ?? true,
    showOther: visibility.showOther ?? settings?.guideShowOther ?? true,
    showFaq: visibility.showFaq ?? settings?.guideShowFaq ?? true,
    showUnitIssues: visibility.showUnitIssues ?? settings?.guideshowUnitIssues ?? false,
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

  const unitNumber = isPreview
    ? 'Assigned based on availability'
    : (assignedUnitNumber || assignedunitNumber || guestInfo?.unitNumber || 'C01');

  return (
    <div className={`${viewMode === 'mobile' ? 'max-w-sm' : 'max-w-2xl'} mx-auto ${isPreview ? '' : 'px-4'}`}>
      <div className={`${isPreview ? 'border rounded-lg overflow-hidden' : ''} bg-gradient-to-br from-orange-50 to-pink-50 ${isPreview ? 'shadow-xl' : ''}`}>
        <div className={viewMode === 'mobile' ? 'p-4' : 'p-6'}>
          {/* Success Header */}
          <div className="text-center mb-6">
            <div className={`${viewMode === 'mobile' ? 'text-3xl mb-3' : 'text-4xl mb-4'}`}>🎉</div>
            <h1 className={`${viewMode === 'mobile' ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 mb-2`}>Guest Success page</h1>
            <div className={`${viewMode === 'mobile' ? 'text-xl mb-3' : 'text-2xl mb-4'}`}>🎉</div>
          </div>

          {/* Welcome Section */}
          {effectiveVisibility.showIntro && effectiveContent.intro && (
            <div className={`bg-gradient-to-r from-orange-100 to-pink-100 rounded-xl ${viewMode === 'mobile' ? 'p-4' : 'p-6'} mb-6`}>
              <h2 className={`${viewMode === 'mobile' ? 'text-lg' : 'text-xl'} font-bold text-gray-800 mb-4 flex items-center justify-center gap-2`}>
                Welcome to {DEFAULT_BUSINESS_CONFIG.name} <span className={`${viewMode === 'mobile' ? 'text-xl' : 'text-2xl'}`}>🌈</span>
              </h2>

              {/* Essential Information Grid */}
              <div className="grid grid-cols-1 gap-4 text-sm">
                {/* Address Section */}
                {effectiveVisibility.showAddress && (effectiveContent.address || streetAddress) && (
                  <div className="bg-gradient-to-r from-orange-50 to-pink-50 border-2 border-orange-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-5 w-5 text-orange-600" />
                      <div className="font-bold text-orange-800 text-base">Address 📍</div>
                    </div>
                    <div className="bg-white/80 rounded-md p-3">
                      <div className="text-gray-800 text-sm font-medium leading-relaxed">
                        {effectiveContent.address || streetAddress}
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
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Wifi className="h-5 w-5 text-blue-600" />
                      <div className="font-bold text-blue-800 text-base">WiFi 📡</div>
                    </div>
                    <div className="space-y-2">
                      {effectiveContent.wifiName && (
                        <div className="bg-white/80 rounded-md p-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700 text-sm">Id:</span>
                            <span className="font-mono font-bold text-blue-700">{effectiveContent.wifiName}</span>
                          </div>
                        </div>
                      )}
                      {effectiveContent.wifiPassword && (
                        <div className="bg-white/80 rounded-md p-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700 text-sm">Pw:</span>
                            <span className="font-mono font-bold text-blue-700">{effectiveContent.wifiPassword}</span>
                          </div>
                        </div>
                      )}
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
                    <span className="font-medium">Unit:</span>
                    <span className="font-bold text-lg text-orange-600 bg-white px-2 py-1 rounded border">
                      {unitNumber}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">🃏</span>
                  <span className="font-medium">Access Card:</span>
                  <span className="text-sm text-gray-600">Collect from reception upon arrival</span>
                </div>

                {/* Unit Issues */}
                {effectiveVisibility.showUnitIssues && mergedUnitIssues.length > 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-600">⚠️</span>
                      <span className="font-medium text-yellow-800">Unit Issues</span>
                    </div>
                    <div className="space-y-2">
                      {mergedUnitIssues.map((issue, index) => (
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
                      You may choose to accept this unit or contact reception for alternatives.
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
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-orange-300 rounded-xl p-5 mt-6">
            <h3 className="font-bold text-orange-800 mb-4 text-lg flex items-center gap-2">
              <span className="text-2xl">🎊</span> Good Day Our Honorable Guest
            </h3>
            <div className="space-y-3 text-sm">
              <div className="bg-white/70 rounded-lg p-3">
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔑</span>
                    <span className="font-medium text-gray-800">Check in:</span>
                    <span className="font-semibold text-orange-600">{effectiveContent.checkinTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🗝</span>
                    <span className="font-medium text-gray-800">Check out:</span>
                    <span className="font-semibold text-orange-600">{effectiveContent.checkoutTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🚪</span>
                    <span className="font-medium text-gray-800">Door password:</span>
                    <span className="font-mono font-bold text-lg text-green-600 bg-green-50 px-3 py-1 rounded border-2 border-green-200">
                      {effectiveContent.doorPassword}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💊</span>
                    <span className="font-medium text-gray-800">Unit No:</span>
                    <span className="font-bold text-lg text-orange-600">{unitNumber}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
                <div className="flex items-start gap-2">
                  <span className="text-lg">🛏</span>
                  <div className="text-sm text-blue-800">
                    <span className="font-semibold">Unit Card On The Pillow</span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded-r-lg">
                <div className="flex items-start gap-2">
                  <span className="text-lg">🚨</span>
                  <div className="text-sm text-yellow-800">
                    <span className="font-semibold">Don't leave your card inside unit and closed the door</span>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">🚭</span>
                    <div className="text-sm text-red-800">
                      <span className="font-semibold">Smoking in Area is Prohibited</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-lg">💸</span>
                    <div className="text-sm text-red-800">
                      <span className="font-semibold">Catch by CCTV or complain Penalty RM300</span>
                    </div>
                  </div>
                </div>
              </div>

              {effectiveContent.importantReminders && (
                <div className="bg-white/70 rounded-lg p-3">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {effectiveContent.importantReminders}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {(actions.onPrint || actions.onSavePDF || actions.onEmail || actions.onShare || actions.onExtend) && (
            <div className="border-t border-gray-200 pt-6 mt-6">
              <TooltipProvider>
                <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
                  {actions.onPrint && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={actions.onPrint}
                          className={`flex items-center ${viewMode === 'mobile' ? 'w-12 h-12 p-0 justify-center' : 'gap-2'}`}
                        >
                          <Printer className="h-4 w-4" />
                          {viewMode === 'desktop' && <span>Print</span>}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Print this page</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {actions.onSavePDF && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={actions.onSavePDF}
                          className={`flex items-center ${viewMode === 'mobile' ? 'w-12 h-12 p-0 justify-center' : 'gap-2'}`}
                        >
                          <Download className="h-4 w-4" />
                          {viewMode === 'desktop' && <span>PDF</span>}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Save as PDF</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {actions.onEmail && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={actions.onEmail}
                          className={`flex items-center ${viewMode === 'mobile' ? 'w-12 h-12 p-0 justify-center' : 'gap-2'}`}
                        >
                          <Send className="h-4 w-4" />
                          {viewMode === 'desktop' && <span>Email</span>}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Send via email</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {actions.onShare && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={actions.onShare}
                          className={`flex items-center ${viewMode === 'mobile' ? 'w-12 h-12 p-0 justify-center' : 'gap-2'}`}
                        >
                          <Share className="h-4 w-4" />
                          {viewMode === 'desktop' && <span>Share</span>}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Share with others</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {actions.onExtend && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="default"
                          onClick={actions.onExtend}
                          className={`flex items-center bg-blue-600 hover:bg-blue-700 text-white ${viewMode === 'mobile' ? 'w-12 h-12 p-0 justify-center' : 'gap-2'}`}
                        >
                          <Calendar className="h-4 w-4" />
                          {viewMode === 'desktop' && <span>Extend Stay</span>}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Extend your current stay</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TooltipProvider>
            </div>
          )}

          {!isPreview && (
            <div className="text-center text-gray-600 text-sm mt-6">
              For any assistance, please contact reception.<br />
              Enjoy your stay at {DEFAULT_BUSINESS_CONFIG.name}! 💼🌟
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
