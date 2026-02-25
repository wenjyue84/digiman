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
import { 
  safeParseStoredSettings, 
  mapApiToGuestGuideSettings,
  debugLog 
} from '@/lib/utils/guest-guide-utils';
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

  // Load initial settings on mount - immediate loading for better synchronization
  useEffect(() => {
    const loadInitialSettings = () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      try {
        // Try to load from localStorage first (for immediate loading)
        const storedSettings = localStorage.getItem(STORAGE_KEY);
        if (storedSettings) {
          const parsed = safeParseStoredSettings(storedSettings);
          if (parsed) {
            debugLog('Context', 'Loaded from localStorage', parsed);
            dispatch({ type: 'SET_SETTINGS', payload: parsed });
            return;
          } else {
            debugLog('Context', 'Invalid localStorage data, removing corrupted data');
            localStorage.removeItem(STORAGE_KEY);
          }
        }

        // If no localStorage, try API settings
        if (apiSettings && !apiLoading) {
          const mappedSettings = mapApiToGuestGuideSettings(apiSettings);
          debugLog('Context', 'Loaded from API settings', mappedSettings);
          dispatch({ type: 'SET_SETTINGS', payload: mappedSettings });
          return;
        }

        // Final fallback to default settings if nothing else available
        if (!apiLoading) {
          debugLog('Context', 'Using default settings');
          dispatch({ type: 'SET_SETTINGS', payload: DEFAULT_GUEST_GUIDE_SETTINGS });
        }
      } catch (error) {
        console.error('[GuestGuideContext] Error loading settings:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load settings' });
        dispatch({ type: 'SET_SETTINGS', payload: DEFAULT_GUEST_GUIDE_SETTINGS });
      }
    };

    // Load immediately on mount
    loadInitialSettings();
  }, []);

  // Separate effect for API settings updates
  useEffect(() => {
    if (apiSettings && !localStorage.getItem(STORAGE_KEY)) {
      // Only update from API if no localStorage exists
      const mappedSettings = mapApiToGuestGuideSettings(apiSettings);
      debugLog('Context', 'Updated from API settings (no localStorage)', mappedSettings);
      dispatch({ type: 'SET_SETTINGS', payload: mappedSettings });
    }
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

  // Auto-save to localStorage with debouncing and corruption recovery
  useEffect(() => {
    if (state.isDirty) {
      const timeoutId = setTimeout(() => {
        try {
          // Create backup before saving
          const currentStored = localStorage.getItem(STORAGE_KEY);
          if (currentStored) {
            try {
              // Validate current stored data before backing it up
              const parsed = JSON.parse(currentStored);
              if (parsed && typeof parsed === 'object') {
                localStorage.setItem(BACKUP_STORAGE_KEY, currentStored);
              }
            } catch (backupError) {
              debugLog('Context', 'Corrupted data found, not backing up', backupError);
            }
          }
          
          // Validate settings before saving
          const settingsToSave = JSON.stringify(state.settings);
          JSON.parse(settingsToSave); // Test if it can be parsed back
          
          // Save current settings
          localStorage.setItem(STORAGE_KEY, settingsToSave);
          
          toast({
            title: 'Settings Auto-saved',
            description: 'Your changes have been saved locally',
            duration: 2000
          });
        } catch (error) {
          console.error('Error saving settings:', error);
          
          // Try to recover from backup
          const backupSettings = localStorage.getItem(BACKUP_STORAGE_KEY);
          if (backupSettings) {
            const parsedBackup = safeParseStoredSettings(backupSettings);
            if (parsedBackup) {
              debugLog('Context', 'Recovered from backup due to save error');
              toast({
                title: 'Recovery Mode',
                description: 'Restored from backup due to save error',
                variant: 'default'
              });
              dispatch({ type: 'SET_SETTINGS', payload: parsedBackup });
              return;
            }
          }
          
          toast({
            title: 'Save Error',
            description: 'Failed to save settings. Changes may be lost.',
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
        const parsed = safeParseStoredSettings(storedSettings);
        if (parsed) {
          dispatch({ type: 'SET_SETTINGS', payload: parsed });
        } else {
          debugLog('Context', 'Invalid stored settings during reset, using default');
          dispatch({ type: 'RESET_SETTINGS' });
        }
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
