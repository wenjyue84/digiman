/**
 * Core TypeScript types for Guest Guide Content Management System
 * Provides comprehensive type safety and intellisense for the guest success page editor
 */

export interface GuestGuideContent {
  // Basic intro and welcome content
  intro: string;
  
  // Contact and location information
  address: string;
  
  // Connectivity information
  wifiName: string;
  wifiPassword: string;
  
  // Check-in guidance
  checkin: string;
  
  // Additional guidance and information
  other: string;
  
  // Frequently asked questions
  faq: string;
  
  // Critical reminders and notices
  importantReminders: string;
  
  // External resources and quick links
  hostelPhotosUrl: string;
  googleMapsUrl: string;
  checkinVideoUrl: string;
  
  // Time and access configuration
  checkinTime: string;
  checkoutTime: string;
  doorPassword: string;
}

export interface GuestGuideVisibility {
  // Section visibility controls
  showIntro: boolean;
  showAddress: boolean;
  showWifi: boolean;
  showCheckin: boolean;
  showOther: boolean;
  showFaq: boolean;
  showCapsuleIssues: boolean;
  showTimeAccess: boolean;
  showHostelPhotos: boolean;
  showGoogleMaps: boolean;
  showCheckinVideo: boolean;
}

export interface GuestGuideSettings {
  content: GuestGuideContent;
  visibility: GuestGuideVisibility;
  lastModified: Date;
  version: string;
  isActive: boolean;
}

export interface GuestGuideContextState {
  settings: GuestGuideSettings;
  isLoading: boolean;
  isEditing: boolean;
  isDirty: boolean; // Indicates unsaved changes
  previewMode: 'mobile' | 'desktop';
  error: string | null;
}

export interface GuestGuideActions {
  updateContent: (content: Partial<GuestGuideContent>) => void;
  updateVisibility: (visibility: Partial<GuestGuideVisibility>) => void;
  setPreviewMode: (mode: 'mobile' | 'desktop') => void;
  saveSettings: () => Promise<void>;
  resetSettings: () => void;
  loadDefaultSettings: () => void;
  setIsEditing: (editing: boolean) => void;
}

export type GuestGuideContextValue = GuestGuideContextState & GuestGuideActions;

// Default content for initial setup
export const DEFAULT_GUEST_GUIDE_CONTENT: GuestGuideContent = {
  intro: 'Welcome to our establishment! We are thrilled to have you stay with us.',
  address: '26A, Jalan Perang, Taman Pelangi\n80400 Johor Bahru, Johor, Malaysia\nPhone: +60 7-354 8888\nEmail: info@pelangicapsule.com',
  wifiName: 'Pelangi-Guest',
  wifiPassword: 'welcome123',
  checkin: 'Welcome! Here are your check-in instructions:\n\n1. Arrive at the main entrance\n2. Use the intercom to contact reception\n3. Present your booking confirmation\n4. Collect your access card\n5. Proceed to your assigned capsule',
  other: 'Additional services available:\n\n• 24/7 reception support\n• Luggage storage facilities\n• Common area with kitchenette\n• Laundry facilities\n• Tour booking assistance',
  faq: 'Frequently Asked Questions:\n\nQ: What time is check-in?\nA: Check-in is available from 3:00 PM onwards.\n\nQ: Is there a curfew?\nA: No curfew, 24/7 access with your key card.\n\nQ: Are towels provided?\nA: Yes, towels and basic amenities are included.',
  importantReminders: '⚠️ IMPORTANT REMINDERS:\n\n• Keep your access card safe - replacement fee applies\n• Respect quiet hours (10 PM - 8 AM)\n• No smoking inside the premises\n• No outside food in capsule areas\n• Check-out by 12:00 PM to avoid late fees',
  hostelPhotosUrl: 'https://example.com/photos',
  googleMapsUrl: 'https://maps.google.com',
  checkinVideoUrl: 'https://example.com/checkin-video',
  checkinTime: '3:00 PM',
  checkoutTime: '12:00 PM',
  doorPassword: '1270#'
};

export const DEFAULT_GUEST_GUIDE_VISIBILITY: GuestGuideVisibility = {
  showIntro: true,
  showAddress: true,
  showWifi: true,
  showCheckin: true,
  showOther: true,
  showFaq: true,
  showCapsuleIssues: false,
  showTimeAccess: true,
  showHostelPhotos: true,
  showGoogleMaps: true,
  showCheckinVideo: true
};

export const DEFAULT_GUEST_GUIDE_SETTINGS: GuestGuideSettings = {
  content: DEFAULT_GUEST_GUIDE_CONTENT,
  visibility: DEFAULT_GUEST_GUIDE_VISIBILITY,
  lastModified: new Date(),
  version: '1.0.0',
  isActive: true
};

// Content validation utilities
export interface ContentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateGuestGuideContent = (content: Partial<GuestGuideContent>): ContentValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!content.intro?.trim()) {
    errors.push('Introduction text is required');
  }
  
  if (!content.address?.trim()) {
    errors.push('Address information is required');
  }
  
  if (!content.doorPassword?.trim()) {
    errors.push('Door password is required');
  }

  // URL validation for optional fields
  const urlFields = [
    { key: 'hostelPhotosUrl', label: 'Hostel Photos URL' },
    { key: 'googleMapsUrl', label: 'Google Maps URL' },
    { key: 'checkinVideoUrl', label: 'Check-in Video URL' }
  ];

  urlFields.forEach(({ key, label }) => {
    const url = content[key as keyof GuestGuideContent] as string;
    if (url && url.trim() && !isValidUrl(url)) {
      warnings.push(`${label} appears to be invalid`);
    }
  });

  // Content length validation
  if (content.intro && content.intro.length > 1000) {
    warnings.push('Introduction text is quite long - consider shortening for better readability');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// URL validation helper
const isValidUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

// Preview modes and configurations
export type PreviewDevice = 'mobile' | 'desktop';

export interface PreviewConfiguration {
  device: PreviewDevice;
  width: number;
  height: number;
  showFrame: boolean;
}

export const PREVIEW_CONFIGURATIONS: Record<PreviewDevice, PreviewConfiguration> = {
  mobile: {
    device: 'mobile',
    width: 375,
    height: 667,
    showFrame: true
  },
  desktop: {
    device: 'desktop',
    width: 768,
    height: 600,
    showFrame: false
  }
};