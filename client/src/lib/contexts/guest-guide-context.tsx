/**
 * Guest Guide Context - Centralized State Management
 * Provides real-time synchronization between content editor and preview
 * Handles persistence, validation, and error states
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  GuestGuideContextValue,
  GuestGuideContextState,
  GuestGuideSettings,
  GuestGuideContent,
  GuestGuideVisibility,
  DEFAULT_GUEST_GUIDE_SETTINGS,
  validateGuestGuideContent,
  PreviewDevice
} from '@/lib/types/guest-guide';
import { toast } from '@/hooks/use-toast';

// Action types for state management
type GuestGuideAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SETTINGS'; payload: GuestGuideSettings }
  | { type: 'UPDATE_CONTENT'; payload: Partial<GuestGuideContent> }
  | { type: 'UPDATE_VISIBILITY'; payload: Partial<GuestGuideVisibility> }
  | { type: 'SET_PREVIEW_MODE'; payload: PreviewDevice }
  | { type: 'SET_IS_EDITING'; payload: boolean }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_SETTINGS' }
  | { type: 'LOAD_DEFAULT_SETTINGS' };

// Reducer function for state management
const guestGuideReducer = (state: GuestGuideContextState, action: GuestGuideAction): GuestGuideContextState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_SETTINGS':
      return {
        ...state,
        settings: action.payload,
        isLoading: false,
        isDirty: false,
        error: null
      };
    
    case 'UPDATE_CONTENT':
      return {
        ...state,
        settings: {
          ...state.settings,
          content: { ...state.settings.content, ...action.payload },
          lastModified: new Date()
        },
        isDirty: true
      };
    
    case 'UPDATE_VISIBILITY':
      return {
        ...state,
        settings: {
          ...state.settings,
          visibility: { ...state.settings.visibility, ...action.payload },
          lastModified: new Date()
        },
        isDirty: true
      };
    
    case 'SET_PREVIEW_MODE':
      return { ...state, previewMode: action.payload };
    
    case 'SET_IS_EDITING':
      return { ...state, isEditing: action.payload };
    
    case 'SET_DIRTY':
      return { ...state, isDirty: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'RESET_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings },
        isDirty: false
      };
    
    case 'LOAD_DEFAULT_SETTINGS':
      return {
        ...state,
        settings: { ...DEFAULT_GUEST_GUIDE_SETTINGS, lastModified: new Date() },
        isDirty: true
      };
    
    default:
      return state;
  }
};

// Initial state
const initialState: GuestGuideContextState = {
  settings: DEFAULT_GUEST_GUIDE_SETTINGS,
  isLoading: false,
  isEditing: false,
  isDirty: false,
  previewMode: 'desktop',
  error: null
};

// Context creation
const GuestGuideContext = createContext<GuestGuideContextValue | undefined>(undefined);

// Storage keys for persistence
const STORAGE_KEY = 'pelangi-guest-guide-settings';
const BACKUP_STORAGE_KEY = 'pelangi-guest-guide-backup';

// Guest Guide Provider Component
interface GuestGuideProviderProps {
  children: React.ReactNode;
}

export const GuestGuideProvider: React.FC<GuestGuideProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(guestGuideReducer, initialState);

  // Load settings from API or localStorage
  const { data: apiSettings, isLoading: apiLoading, error: apiError } = useQuery<any>({
    queryKey: ['/api/settings'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Load initial settings on mount
  useEffect(() => {
    const loadInitialSettings = () => {
      try {
        // Try to load from localStorage first
        const storedSettings = localStorage.getItem(STORAGE_KEY);
        if (storedSettings) {
          const parsed = JSON.parse(storedSettings);
          dispatch({ type: 'SET_SETTINGS', payload: parsed });
          return;
        }

        // Fallback to API settings if available
        if (apiSettings && !apiLoading) {
          const mappedSettings: GuestGuideSettings = {
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
              showCapsuleIssues: apiSettings.guideShowCapsuleIssues ?? DEFAULT_GUEST_GUIDE_SETTINGS.visibility.showCapsuleIssues,
              showTimeAccess: apiSettings.guideShowTimeAccess ?? DEFAULT_GUEST_GUIDE_SETTINGS.visibility.showTimeAccess,
              showHostelPhotos: apiSettings.guideShowHostelPhotos ?? DEFAULT_GUEST_GUIDE_SETTINGS.visibility.showHostelPhotos,
              showGoogleMaps: apiSettings.guideShowGoogleMaps ?? DEFAULT_GUEST_GUIDE_SETTINGS.visibility.showGoogleMaps,
              showCheckinVideo: apiSettings.guideShowCheckinVideo ?? DEFAULT_GUEST_GUIDE_SETTINGS.visibility.showCheckinVideo
            },
            lastModified: new Date(),
            version: '1.0.0',
            isActive: true
          };
          dispatch({ type: 'SET_SETTINGS', payload: mappedSettings });
          return;
        }

        // Final fallback to default settings
        dispatch({ type: 'SET_SETTINGS', payload: DEFAULT_GUEST_GUIDE_SETTINGS });
      } catch (error) {
        console.error('Error loading guest guide settings:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load settings' });
        dispatch({ type: 'SET_SETTINGS', payload: DEFAULT_GUEST_GUIDE_SETTINGS });
      }
    };

    loadInitialSettings();
  }, [apiSettings, apiLoading]);

  // Set API loading state
  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: apiLoading });
  }, [apiLoading]);

  // Handle API errors
  useEffect(() => {
    if (apiError) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load settings from server' });
    }
  }, [apiError]);

  // Auto-save to localStorage with debouncing
  useEffect(() => {
    if (state.isDirty) {
      const timeoutId = setTimeout(() => {
        try {
          // Create backup before saving
          const currentStored = localStorage.getItem(STORAGE_KEY);
          if (currentStored) {
            localStorage.setItem(BACKUP_STORAGE_KEY, currentStored);
          }
          
          // Save current settings
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
          
          toast({
            title: 'Settings Auto-saved',
            description: 'Your changes have been saved locally',
            duration: 2000
          });
        } catch (error) {
          console.error('Error saving settings:', error);
          toast({
            title: 'Save Error',
            description: 'Failed to save settings locally',
            variant: 'destructive'
          });
        }
      }, 1000); // 1 second debounce

      return () => clearTimeout(timeoutId);
    }
  }, [state.settings, state.isDirty]);

  // Context actions
  const updateContent = useCallback((content: Partial<GuestGuideContent>) => {
    // Validate content before updating
    const validation = validateGuestGuideContent(content);
    if (!validation.isValid) {
      toast({
        title: 'Validation Error',
        description: validation.errors.join(', '),
        variant: 'destructive'
      });
      return;
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      toast({
        title: 'Content Warning',
        description: validation.warnings.join(', '),
        variant: 'default'
      });
    }

    dispatch({ type: 'UPDATE_CONTENT', payload: content });
  }, []);

  const updateVisibility = useCallback((visibility: Partial<GuestGuideVisibility>) => {
    dispatch({ type: 'UPDATE_VISIBILITY', payload: visibility });
  }, []);

  const setPreviewMode = useCallback((mode: PreviewDevice) => {
    dispatch({ type: 'SET_PREVIEW_MODE', payload: mode });
  }, []);

  const setIsEditing = useCallback((editing: boolean) => {
    dispatch({ type: 'SET_IS_EDITING', payload: editing });
  }, []);

  const saveSettings = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Here you would typically call an API to save settings
      // For now, we'll just save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
      
      dispatch({ type: 'SET_DIRTY', payload: false });
      
      toast({
        title: 'Settings Saved',
        description: 'Guest guide settings have been saved successfully',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to save settings' });
      toast({
        title: 'Save Failed',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive'
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.settings]);

  const resetSettings = useCallback(() => {
    try {
      const storedSettings = localStorage.getItem(STORAGE_KEY);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        dispatch({ type: 'SET_SETTINGS', payload: parsed });
      } else {
        dispatch({ type: 'RESET_SETTINGS' });
      }
      
      toast({
        title: 'Settings Reset',
        description: 'Changes have been discarded',
      });
    } catch (error) {
      console.error('Error resetting settings:', error);
      dispatch({ type: 'RESET_SETTINGS' });
    }
  }, []);

  const loadDefaultSettings = useCallback(() => {
    dispatch({ type: 'LOAD_DEFAULT_SETTINGS' });
    toast({
      title: 'Default Settings Loaded',
      description: 'Guest guide has been reset to default content',
    });
  }, []);

  // Context value
  const contextValue: GuestGuideContextValue = {
    ...state,
    updateContent,
    updateVisibility,
    setPreviewMode,
    setIsEditing,
    saveSettings,
    resetSettings,
    loadDefaultSettings
  };

  return (
    <GuestGuideContext.Provider value={contextValue}>
      {children}
    </GuestGuideContext.Provider>
  );
};

// Custom hook for using the context
export const useGuestGuide = (): GuestGuideContextValue => {
  const context = useContext(GuestGuideContext);
  if (context === undefined) {
    throw new Error('useGuestGuide must be used within a GuestGuideProvider');
  }
  return context;
};

// HOC for wrapping components that need guest guide context
export const withGuestGuide = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => (
    <GuestGuideProvider>
      <Component {...props} />
    </GuestGuideProvider>
  );
};