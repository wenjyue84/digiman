/**
 * Guest Guide Utility Functions
 * Centralized utilities for data mapping, validation, and processing
 */

import {
  GuestGuideSettings,
  DEFAULT_GUEST_GUIDE_SETTINGS,
  validateGuestGuideContent
} from '@/lib/types/guest-guide';

/**
 * Safely parse JSON from localStorage with validation
 */
export const safeParseStoredSettings = (stored: string): GuestGuideSettings | null => {
  try {
    const parsed = JSON.parse(stored);
    
    // Basic structure validation
    if (!parsed || typeof parsed !== 'object') {
      console.warn('[GuestGuide] Invalid stored settings structure');
      return null;
    }

    // Validate required properties exist
    if (!parsed.content || !parsed.visibility) {
      console.warn('[GuestGuide] Missing required properties in stored settings');
      return null;
    }

    // Ensure dates are properly parsed
    if (parsed.lastModified) {
      parsed.lastModified = new Date(parsed.lastModified);
    }

    // Validate content structure
    const contentValidation = validateGuestGuideContent(parsed.content);
    if (!contentValidation.isValid) {
      console.warn('[GuestGuide] Invalid content in stored settings:', contentValidation.errors);
      return null;
    }

    return {
      ...DEFAULT_GUEST_GUIDE_SETTINGS,
      ...parsed,
      lastModified: parsed.lastModified || new Date(),
      version: parsed.version || '1.0.0',
      isActive: parsed.isActive ?? true
    };
  } catch (error) {
    console.error('[GuestGuide] Error parsing stored settings:', error);
    return null;
  }
};

/**
 * Map API settings to GuestGuideSettings format
 * Centralized mapping logic to avoid duplication
 */
export const mapApiToGuestGuideSettings = (apiSettings: any): GuestGuideSettings => {
  return {
    content: {
      intro: apiSettings.guideIntro || DEFAULT_GUEST_GUIDE_SETTINGS.content.intro,
      address: apiSettings.guideAddress || DEFAULT_GUEST_GUIDE_SETTINGS.content.address,
      wifiName: apiSettings.guideWifiName || DEFAULT_GUEST_GUIDE_SETTINGS.content.wifiName,
      wifiPassword: apiSettings.guideWifiPassword || DEFAULT_GUEST_GUIDE_SETTINGS.content.wifiPassword,
      checkin: apiSettings.guideCheckin || DEFAULT_GUEST_GUIDE_SETTINGS.content.checkin,
      other: apiSettings.guideOther || DEFAULT_GUEST_GUIDE_SETTINGS.content.other,
      faq: apiSettings.guideFaq || DEFAULT_GUEST_GUIDE_SETTINGS.content.faq,
      importantReminders: apiSettings.guideImportantReminders || DEFAULT_GUEST_GUIDE_SETTINGS.content.importantReminders,
      hostelPhotosUrl: apiSettings.guideHostelPhotosUrl || DEFAULT_GUEST_GUIDE_SETTINGS.content.hostelPhotosUrl,
      googleMapsUrl: apiSettings.guideGoogleMapsUrl || DEFAULT_GUEST_GUIDE_SETTINGS.content.googleMapsUrl,
      checkinVideoUrl: apiSettings.guideCheckinVideoUrl || DEFAULT_GUEST_GUIDE_SETTINGS.content.checkinVideoUrl,
      checkinTime: apiSettings.guideCheckinTime || DEFAULT_GUEST_GUIDE_SETTINGS.content.checkinTime,
      checkoutTime: apiSettings.guideCheckoutTime || DEFAULT_GUEST_GUIDE_SETTINGS.content.checkoutTime,
      doorPassword: apiSettings.guideDoorPassword || DEFAULT_GUEST_GUIDE_SETTINGS.content.doorPassword
    },
    visibility: {
      showIntro: apiSettings.guideShowIntro ?? DEFAULT_GUEST_GUIDE_SETTINGS.visibility.showIntro,
      showAddress: apiSettings.guideShowAddress ?? DEFAULT_GUEST_GUIDE_SETTINGS.visibility.showAddress,
      showWifi: apiSettings.guideShowWifi ?? DEFAULT_GUEST_GUIDE_SETTINGS.visibility.showWifi,
      showCheckin: apiSettings.guideShowCheckin ?? DEFAULT_GUEST_GUIDE_SETTINGS.visibility.showCheckin,
      showOther: apiSettings.guideShowOther ?? DEFAULT_GUEST_GUIDE_SETTINGS.visibility.showOther,
      showFaq: apiSettings.guideShowFaq ?? DEFAULT_GUEST_GUIDE_SETTINGS.visibility.showFaq,
      showunitIssues: apiSettings.guideShowunitIssues ?? DEFAULT_GUEST_GUIDE_SETTINGS.visibility.showunitIssues,
      showTimeAccess: apiSettings.guideShowTimeAccess ?? DEFAULT_GUEST_GUIDE_SETTINGS.visibility.showTimeAccess,
      showHostelPhotos: apiSettings.guideShowHostelPhotos ?? DEFAULT_GUEST_GUIDE_SETTINGS.visibility.showHostelPhotos,
      showGoogleMaps: apiSettings.guideShowGoogleMaps ?? DEFAULT_GUEST_GUIDE_SETTINGS.visibility.showGoogleMaps,
      showCheckinVideo: apiSettings.guideShowCheckinVideo ?? DEFAULT_GUEST_GUIDE_SETTINGS.visibility.showCheckinVideo
    },
    lastModified: new Date(),
    version: '1.0.0',
    isActive: true
  };
};

/**
 * Debug logger that can be easily disabled in production
 */
export const debugLog = (context: string, message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    if (data) {
      console.log(`[GuestGuide:${context}] ${message}`, data);
    } else {
      console.log(`[GuestGuide:${context}] ${message}`);
    }
  }
};

/**
 * Determine if context settings should be used over API settings
 */
export const shouldUseContextSettings = (
  contextLoading: boolean, 
  error: string | null, 
  contextSettings: any
): boolean => {
  return !contextLoading && !error && !!contextSettings?.content;
};

/**
 * Get effective content from either context or API settings
 */
export const getEffectiveContent = (
  useContext: boolean,
  contextSettings: any,
  apiSettings: any,
  field: string
) => {
  if (useContext && contextSettings?.content) {
    return contextSettings.content[field];
  }
  
  // Handle API settings with guide prefix
  const apiField = `guide${field.charAt(0).toUpperCase() + field.slice(1)}`;
  return apiSettings?.[apiField];
};

/**
 * Get content with fallback logic for both context and API formats
 * This handles the complex fallback pattern used in guest-success sharing
 */
export const getContentWithFallback = (
  contentSource: any,
  field: string,
  defaultValue: string
): string => {
  if (!contentSource) return defaultValue;
  
  // Try context format first (field name as-is)
  if (contentSource[field]) {
    return contentSource[field];
  }
  
  // Try API format (with guide prefix)
  const apiField = `guide${field.charAt(0).toUpperCase() + field.slice(1)}`;
  if (contentSource[apiField]) {
    return contentSource[apiField];
  }
  
  return defaultValue;
};
