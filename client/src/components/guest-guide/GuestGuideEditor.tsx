/**
 * Guest Guide Content Editor
 * Comprehensive editor with real-time preview synchronization
 * Provides intuitive content management with validation and persistence
 */

import React, { useState, useCallback } from 'react';
import { useGuestGuide } from '@/lib/contexts/guest-guide-context';
import GuestSuccessPagePreview from './GuestSuccessPagePreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Save, 
  RotateCcw, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Settings, 
  FileText, 
  MapPin, 
  Wifi, 
  Clock,
  Camera,
  Globe,
  Video,
  AlertTriangle,
  HelpCircle,
  Info
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function GuestGuideEditor() {
  const {
    settings,
    updateContent,
    updateVisibility,
    saveSettings,
    resetSettings,
    loadDefaultSettings,
    isDirty,
    isLoading,
    error
  } = useGuestGuide();

  const [activeTab, setActiveTab] = useState('content');
  const [localContent, setLocalContent] = useState(settings.content);
  const [localVisibility, setLocalVisibility] = useState(settings.visibility);

  // Update local state when settings change
  React.useEffect(() => {
    setLocalContent(settings.content);
    setLocalVisibility(settings.visibility);
  }, [settings]);

  // Debounced content update
  const debouncedUpdateContent = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (field: keyof typeof localContent, value: string) => {
        const newContent = { ...localContent, [field]: value };
        setLocalContent(newContent);
        
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          updateContent({ [field]: value });
        }, 300); // 300ms debounce
      };
    })(),
    [localContent, updateContent]
  );

  // Visibility toggle handler
  const handleVisibilityToggle = useCallback((field: keyof typeof localVisibility, value: boolean) => {
    const newVisibility = { ...localVisibility, [field]: value };
    setLocalVisibility(newVisibility);
    updateVisibility({ [field]: value });
  }, [localVisibility, updateVisibility]);

  // Save handler
  const handleSave = useCallback(async () => {
    try {
      await saveSettings();
      toast({
        title: 'Settings Saved',
        description: 'Guest guide settings have been saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    }
  }, [saveSettings]);

  // Reset handler
  const handleReset = useCallback(() => {
    resetSettings();
    toast({
      title: 'Changes Discarded',
      description: 'All unsaved changes have been reverted',
    });
  }, [resetSettings]);

  // Load defaults handler
  const handleLoadDefaults = useCallback(() => {
    if (confirm('This will replace all current content with default templates. Are you sure?')) {
      loadDefaultSettings();
    }
  }, [loadDefaultSettings]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Guest Guide Content Editor
              </h1>
              <p className="text-gray-600">
                Customize your guest success page content and preview changes in real-time
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isDirty && (
                <Badge variant="secondary" className="animate-pulse">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                  Unsaved Changes
                </Badge>
              )}
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={!isDirty || isLoading}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button
                variant="outline"
                onClick={handleLoadDefaults}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Load Defaults
              </Button>
              <Button
                onClick={handleSave}
                disabled={!isDirty || isLoading}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Editor Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Content Management
                </CardTitle>
                <CardDescription>
                  Edit content and visibility settings for your guest success page
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="content" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Content
                    </TabsTrigger>
                    <TabsTrigger value="visibility" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Visibility
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="content" className="space-y-6">
                    <ScrollArea className="h-[600px] pr-4">
                      {/* Welcome Section */}
                      <div className="space-y-4 mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Info className="h-4 w-4 text-blue-600" />
                          <h3 className="font-semibold text-gray-800">Welcome Message</h3>
                        </div>
                        <div>
                          <Label htmlFor="intro">Introduction Text</Label>
                          <Textarea
                            id="intro"
                            value={localContent.intro}
                            onChange={(e) => debouncedUpdateContent('intro', e.target.value)}
                            placeholder="Enter welcome message for guests..."
                            className="mt-2 min-h-[100px]"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            This appears at the top of the success page to welcome guests.
                          </p>
                        </div>
                      </div>

                      <Separator />

                      {/* Contact Information */}
                      <div className="space-y-4 my-6">
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin className="h-4 w-4 text-green-600" />
                          <h3 className="font-semibold text-gray-800">Contact & Location</h3>
                        </div>
                        <div>
                          <Label htmlFor="address">Address Information</Label>
                          <Textarea
                            id="address"
                            value={localContent.address}
                            onChange={(e) => debouncedUpdateContent('address', e.target.value)}
                            placeholder="Enter address, phone, and email information..."
                            className="mt-2 min-h-[120px]"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Include address, phone number, and email. Use separate lines for each.
                          </p>
                        </div>
                      </div>

                      <Separator />

                      {/* WiFi Information */}
                      <div className="space-y-4 my-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Wifi className="h-4 w-4 text-blue-600" />
                          <h3 className="font-semibold text-gray-800">WiFi Access</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="wifiName">Network Name</Label>
                            <Input
                              id="wifiName"
                              value={localContent.wifiName}
                              onChange={(e) => debouncedUpdateContent('wifiName', e.target.value)}
                              placeholder="WiFi network name"
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label htmlFor="wifiPassword">Password</Label>
                            <Input
                              id="wifiPassword"
                              value={localContent.wifiPassword}
                              onChange={(e) => debouncedUpdateContent('wifiPassword', e.target.value)}
                              placeholder="WiFi password"
                              className="mt-2"
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Time and Access */}
                      <div className="space-y-4 my-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="h-4 w-4 text-purple-600" />
                          <h3 className="font-semibold text-gray-800">Times & Access</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="checkinTime">Check-in Time</Label>
                            <Input
                              id="checkinTime"
                              value={localContent.checkinTime}
                              onChange={(e) => debouncedUpdateContent('checkinTime', e.target.value)}
                              placeholder="3:00 PM"
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label htmlFor="checkoutTime">Check-out Time</Label>
                            <Input
                              id="checkoutTime"
                              value={localContent.checkoutTime}
                              onChange={(e) => debouncedUpdateContent('checkoutTime', e.target.value)}
                              placeholder="12:00 PM"
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label htmlFor="doorPassword">Door Password</Label>
                            <Input
                              id="doorPassword"
                              value={localContent.doorPassword}
                              onChange={(e) => debouncedUpdateContent('doorPassword', e.target.value)}
                              placeholder="1270#"
                              className="mt-2"
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Quick Links */}
                      <div className="space-y-4 my-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Camera className="h-4 w-4 text-pink-600" />
                          <h3 className="font-semibold text-gray-800">Quick Links</h3>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="hostelPhotosUrl">
                              <Globe className="inline h-4 w-4 mr-2" />
                              Hostel Photos URL
                            </Label>
                            <Input
                              id="hostelPhotosUrl"
                              value={localContent.hostelPhotosUrl}
                              onChange={(e) => debouncedUpdateContent('hostelPhotosUrl', e.target.value)}
                              placeholder="https://example.com/photos"
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label htmlFor="googleMapsUrl">
                              <MapPin className="inline h-4 w-4 mr-2" />
                              Google Maps URL
                            </Label>
                            <Input
                              id="googleMapsUrl"
                              value={localContent.googleMapsUrl}
                              onChange={(e) => debouncedUpdateContent('googleMapsUrl', e.target.value)}
                              placeholder="https://maps.google.com/..."
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label htmlFor="checkinVideoUrl">
                              <Video className="inline h-4 w-4 mr-2" />
                              Check-in Video URL
                            </Label>
                            <Input
                              id="checkinVideoUrl"
                              value={localContent.checkinVideoUrl}
                              onChange={(e) => debouncedUpdateContent('checkinVideoUrl', e.target.value)}
                              placeholder="https://youtube.com/watch?v=..."
                              className="mt-2"
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Instructions & Information */}
                      <div className="space-y-6 my-6">
                        <div>
                          <Label htmlFor="checkin">Check-in Instructions</Label>
                          <Textarea
                            id="checkin"
                            value={localContent.checkin}
                            onChange={(e) => debouncedUpdateContent('checkin', e.target.value)}
                            placeholder="Step-by-step check-in instructions..."
                            className="mt-2 min-h-[120px]"
                          />
                        </div>
                        <div>
                          <Label htmlFor="other">Additional Information</Label>
                          <Textarea
                            id="other"
                            value={localContent.other}
                            onChange={(e) => debouncedUpdateContent('other', e.target.value)}
                            placeholder="Additional services, amenities, or information..."
                            className="mt-2 min-h-[120px]"
                          />
                        </div>
                        <div>
                          <Label htmlFor="faq">
                            <HelpCircle className="inline h-4 w-4 mr-2" />
                            FAQ Section
                          </Label>
                          <Textarea
                            id="faq"
                            value={localContent.faq}
                            onChange={(e) => debouncedUpdateContent('faq', e.target.value)}
                            placeholder="Frequently asked questions and answers..."
                            className="mt-2 min-h-[120px]"
                          />
                        </div>
                        <div>
                          <Label htmlFor="importantReminders">
                            <AlertTriangle className="inline h-4 w-4 mr-2" />
                            Important Reminders
                          </Label>
                          <Textarea
                            id="importantReminders"
                            value={localContent.importantReminders}
                            onChange={(e) => debouncedUpdateContent('importantReminders', e.target.value)}
                            placeholder="Critical notices, rules, or reminders for guests..."
                            className="mt-2 min-h-[100px]"
                          />
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="visibility" className="space-y-6">
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600 mb-4">
                          Control which sections are visible to guests on the success page.
                        </p>
                        
                        {Object.entries(localVisibility).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <Label htmlFor={key} className="font-medium cursor-pointer">
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              </Label>
                              <p className="text-xs text-gray-500 mt-1">
                                {getVisibilityDescription(key)}
                              </p>
                            </div>
                            <Switch
                              id={key}
                              checked={value}
                              onCheckedChange={(checked) => 
                                handleVisibilityToggle(key as keyof typeof localVisibility, checked)
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Live Preview
                </CardTitle>
                <CardDescription>
                  See exactly how your guests will see the success page
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GuestSuccessPagePreview 
                  showControls={true} 
                  showTitle={false}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function for visibility descriptions
const getVisibilityDescription = (key: string): string => {
  const descriptions: Record<string, string> = {
    showIntro: 'Display the welcome message and introduction section',
    showAddress: 'Show contact information and address details',
    showWifi: 'Display WiFi network name and password',
    showCheckin: 'Show check-in instructions and guidance',
    showOther: 'Display additional information and services',
    showFaq: 'Show frequently asked questions section',
    showunitIssues: 'Display any reported unit issues (if applicable)',
    showTimeAccess: 'Show operating hours and access information',
    showHostelPhotos: 'Display link to hostel photos',
    showGoogleMaps: 'Show Google Maps link',
    showCheckinVideo: 'Display check-in instruction video link'
  };
  return descriptions[key] || 'Control visibility of this section';
};
