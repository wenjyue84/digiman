/**
 * Guest Success Page Preview Component
 * Provides real-time preview functionality with context integration
 * Supports both mobile and desktop preview modes
 */

import React, { memo } from 'react';
import { useGuestGuide } from '@/lib/contexts/guest-guide-context';
import GuestSuccessPageTemplate from '@/components/guest-success/GuestSuccessPageTemplate';
import { Button } from '@/components/ui/button';
import { Monitor, Smartphone, RotateCcw } from 'lucide-react';
import { PREVIEW_CONFIGURATIONS } from '@/lib/types/guest-guide';

interface GuestSuccessPagePreviewProps {
  className?: string;
  showControls?: boolean;
  showTitle?: boolean;
  guestInfo?: {
    capsuleNumber?: string;
    guestName: string;
    phoneNumber: string;
    email?: string;
    expectedCheckoutDate?: string;
  } | null;
}

const GuestSuccessPagePreview: React.FC<GuestSuccessPagePreviewProps> = ({
  className = '',
  showControls = true,
  showTitle = true,
  guestInfo = null
}) => {
  const { 
    settings, 
    previewMode, 
    setPreviewMode, 
    isLoading,
    error 
  } = useGuestGuide();

  const previewConfig = PREVIEW_CONFIGURATIONS[previewMode];

  // Mock guest info for preview if not provided
  const mockGuestInfo = guestInfo || {
    guestName: 'John Doe',
    phoneNumber: '+60 12-345 6789',
    email: 'john.doe@example.com',
    expectedCheckoutDate: '2024-01-15',
    capsuleNumber: 'C12'
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="text-gray-600">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center space-y-4">
          <div className="text-red-500 text-xl">⚠️</div>
          <p className="text-gray-600">Error loading preview: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Preview Controls */}
      {showControls && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-2">
            {showTitle && (
              <h3 className="font-semibold text-gray-800">Preview Mode:</h3>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant={previewMode === 'desktop' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode('desktop')}
                className="flex items-center gap-2"
              >
                <Monitor className="h-4 w-4" />
                Desktop
              </Button>
              <Button
                variant={previewMode === 'mobile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode('mobile')}
                className="flex items-center gap-2"
              >
                <Smartphone className="h-4 w-4" />
                Mobile
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <RotateCcw className="h-4 w-4" />
            <span>Updates automatically</span>
          </div>
        </div>
      )}

      {/* Preview Frame */}
      <div className="relative">
        {previewConfig.showFrame ? (
          /* Mobile Frame with Device Mockup */
          <div className="mx-auto bg-gray-900 rounded-[2.5rem] p-4 shadow-2xl" 
               style={{ width: previewConfig.width + 40, height: previewConfig.height + 80 }}>
            <div className="bg-white rounded-[2rem] overflow-hidden h-full relative">
              {/* Mobile Status Bar Mockup */}
              <div className="bg-gray-100 h-6 flex items-center justify-between px-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-2 bg-gray-300 rounded-full"></div>
                  <span>Pelangi</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>100%</span>
                  <div className="w-6 h-3 border border-gray-400 rounded-sm">
                    <div className="w-full h-full bg-green-500 rounded-sm"></div>
                  </div>
                </div>
              </div>
              
              {/* Content Area */}
              <div className="h-[calc(100%-24px)] overflow-auto">
                <GuestSuccessPageTemplate
                  viewMode={previewMode}
                  isPreview={true}
                  guestInfo={mockGuestInfo}
                  settings={null} // We'll pass content directly
                  content={settings.content}
                  visibility={settings.visibility}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Desktop Frame - No Device Mockup */
          <div className="border rounded-lg overflow-hidden shadow-lg bg-white">
            <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full border">
                  🌐 guest-success.pelangicapsule.com
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Desktop Preview ({previewConfig.width}px)
              </div>
            </div>
            <div style={{ height: previewConfig.height }} className="overflow-auto">
              <GuestSuccessPageTemplate
                viewMode={previewMode}
                isPreview={true}
                guestInfo={mockGuestInfo}
                settings={null} // We'll pass content directly
                content={settings.content}
                visibility={settings.visibility}
              />
            </div>
          </div>
        )}

        {/* Preview Overlay for Real-time Updates */}
        <div className="absolute top-0 right-0 m-2">
          <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            Live Preview
          </div>
        </div>
      </div>

      {/* Preview Information */}
      {showControls && (
        <div className="text-xs text-gray-500 text-center p-2 bg-blue-50 rounded-lg">
          <p>
            This preview updates in real-time as you make changes. 
            The actual guest success page will look exactly like this preview.
          </p>
        </div>
      )}
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export default memo(GuestSuccessPagePreview);

// Standalone preview component for use outside of context
export const StandaloneGuestSuccessPagePreview: React.FC<GuestSuccessPagePreviewProps & {
  content?: any;
  visibility?: any;
  previewMode?: 'mobile' | 'desktop';
}> = ({ content, visibility, previewMode = 'desktop', ...props }) => {
  const mockGuestInfo = props.guestInfo || {
    guestName: 'John Doe',
    phoneNumber: '+60 12-345 6789',
    email: 'john.doe@example.com',
    expectedCheckoutDate: '2024-01-15',
    capsuleNumber: 'C12'
  };

  const previewConfig = PREVIEW_CONFIGURATIONS[previewMode];

  return (
    <div className={`space-y-4 ${props.className}`}>
      {/* Simple Controls */}
      <div className="text-center p-2 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          {previewMode === 'mobile' ? '📱' : '💻'} {previewMode.charAt(0).toUpperCase() + previewMode.slice(1)} Preview
        </p>
      </div>

      {/* Preview Content */}
      <div className="border rounded-lg overflow-hidden shadow-lg bg-white">
        <div style={{ height: previewConfig.height }} className="overflow-auto">
          <GuestSuccessPageTemplate
            viewMode={previewMode}
            isPreview={true}
            guestInfo={mockGuestInfo}
            settings={null}
            content={content}
            visibility={visibility}
          />
        </div>
      </div>
    </div>
  );
};