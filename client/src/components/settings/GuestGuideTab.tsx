import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimeSelect } from "@/components/ui/time-select";
import { GuideTimeSelect } from "./GuideTimeSelect";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, MessageSquare, FileText, Camera, Globe, Video, Clock, CheckCircle, Wifi, MapPin, Smartphone, Monitor, Printer, Send, Save, Key, ClipboardList, HelpCircle, AlertTriangle, FolderOpen
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function GuestGuideTab({ settings, form, updateSettingsMutation, queryClient, toast }: any) {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('mobile');
  const [activeSubTab, setActiveSubTab] = useState<'content' | 'preview'>('content');
  const [isQuickTemplatesExpanded, setIsQuickTemplatesExpanded] = useState(true);

  // Query to get CSV file path with debouncing
  const { data: csvPathData, error: csvPathError } = useQuery<{ path: string; exists: boolean }>({
    queryKey: ["/api/settings/csv-path"],
    enabled: !!settings && activeSubTab === 'content', // Only run when authenticated and on content tab
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Debug log for CSV path data
  useEffect(() => {
    if (csvPathData) {
      console.log('💾 CSV Path Data:', csvPathData);
    }
    if (csvPathError) {
      console.error('❌ CSV Path Error:', csvPathError);
    }
  }, [csvPathData, csvPathError]);

  // Ensure key sections are shown to guests by default if unset
  useEffect(() => {
    const keysToDefaultTrue = [
      'guideShowAddress',
      'guideShowWifi',
      'guideShowCheckin',
      'guideShowOther',
      // Quick links visibility
      'guideShowHostelPhotos',
      'guideShowGoogleMaps',
      'guideShowCheckinVideo',
    ];
    keysToDefaultTrue.forEach((k) => {
      const current = form.getValues(k as any);
      if (current === undefined || current === null) {
        form.setValue(k as any, true, { shouldDirty: false, shouldTouch: false });
      }
    });
  }, [form]);

  const guideTemplates: Array<{ id: string; name: string; intro: string; checkin: string; other: string; faq: string; }>
    = [
      {
        id: 'capsule_standard',
        name: 'Capsule Hostel – Standard',
        intro:
          'Welcome to Pelangi Capsule Hostel! Enjoy private sleeping pods with fresh linens, personal light, and power socket. Shared bathrooms are cleaned multiple times daily. Quiet hours are from 10:00 PM to 7:00 AM. Reception is available from 8:00 AM–10:00 PM; night staff is on call.',
        checkin:
          '1) Proceed to the front desk with your IC/passport.\n2) Provide your booking name or show the self check-in token.\n3) Make payment if applicable and receive your capsule number and locker key.\n4) Locate your capsule following the signage (Front/Middle/Back).\n5) Check-out time is 12:00 PM. Late check-out is subject to availability and charges.',
        other:
          'House Rules:\n- No smoking inside the building.\n- Keep noise to a minimum, especially during quiet hours.\n- Food is allowed in the pantry only.\nAmenities:\n- Free high-speed Wi‑Fi throughout the hostel.\n- Pantry with kettle, microwave, and fridge (label your items).\n- Laundry service (self-service machines on Level 2).',
        faq:
          'Q: What time are check-in/check-out?\nA: Check-in 2:00 PM, Check-out 12:00 PM.\n\nQ: Where can I store luggage?\nA: Free luggage storage at reception before check-in or after check-out.\n\nQ: Are towels provided?\nA: Yes, one towel per guest per stay.\n\nQ: Do you have parking?\nA: Limited street parking nearby; public car park is 3 minutes walk.',
      },
      {
        id: 'homestay_budget',
        name: 'Budget Homestay',
        intro:
          'Welcome to our cozy homestay. Perfect for short stays with essential comforts. Please treat the home with care and respect the neighbors.',
        checkin:
          'Self Check‑in:\n1) We will send a smart-lock PIN on the day of arrival.\n2) Enter the PIN and press "✓".\n3) Wi‑Fi details are on the fridge.\n4) On check‑out, please place keys on the table and lock the door behind you.',
        other:
          'House Rules:\n- No parties or loud music after 9:00 PM.\n- No shoes inside the house.\n- Switch off air‑cond and lights when leaving.\nFacilities:\n- Kitchenette: basic cookware, microwave, kettle.\n- Drinking water filter in pantry.\n- Laundry: washer and dryer (usage instructions provided).',
        faq:
          'Q: Early check‑in available?\nA: Subject to housekeeping; we will try our best.\n\nQ: Extra bedding?\nA: One foldable mattress can be arranged with advance notice.\n\nQ: Parking?\nA: Free street parking; please do not block neighbors gates.',
      },
      {
        id: 'city_hotel',
        name: 'City Hotel',
        intro:
          'Thank you for choosing Pelangi City Hotel. We offer comfortable rooms, 24‑hour reception, and easy access to attractions, dining, and public transport.',
        checkin:
          '1) Present your IC/passport at reception.\n2) A refundable deposit will be collected.\n3) You will receive key‑card(s) and breakfast coupons (if included).\n4) Breakfast is served 7:00–10:00 AM at the café on Level 1.\n5) Check‑out is 12:00 PM; late check‑out until 2:00 PM may be arranged.',
        other:
          'Facilities:\n- Fitness room (6:00 AM–10:00 PM).\n- Business corner with printer (Level 2).\n- Airport shuttle available on request.\nPolicies:\n- No smoking in rooms (penalty applies).\n- Lost key‑card fee RM20.',
        faq:
          'Q: Can I store luggage after check‑out?\nA: Yes, complimentary at reception.\n\nQ: Connecting rooms?\nA: Limited rooms; please request during booking.\n\nQ: Late check‑in?\nA: Our reception is 24‑hour; you may arrive anytime.',
      },
    ];

  const applyTemplate = (tplId: string) => {
    const tpl = guideTemplates.find((t) => t.id === tplId);
    if (!tpl) return;
    form.setValue('guideIntro' as any, tpl.intro);
    form.setValue('guideCheckin' as any, tpl.checkin);
    form.setValue('guideOther' as any, tpl.other);
    form.setValue('guideFaq' as any, tpl.faq);
    setIsQuickTemplatesExpanded(false);
  };

  const watchedValues = {
    intro: form.watch('guideIntro'),
    address: form.watch('guideAddress'),
    wifiName: form.watch('guideWifiName'),
    wifiPassword: form.watch('guideWifiPassword'),
    checkin: form.watch('guideCheckin'),
    other: form.watch('guideOther'),
    faq: form.watch('guideFaq'),
    importantReminders: form.watch('guideImportantReminders'),
    hostelPhotosUrl: form.watch('guideHostelPhotosUrl'),
    googleMapsUrl: form.watch('guideGoogleMapsUrl'),
    checkinVideoUrl: form.watch('guideCheckinVideoUrl'),
    checkinTime: form.watch('guideCheckinTime'),
    checkoutTime: form.watch('guideCheckoutTime'),
    doorPassword: form.watch('guideDoorPassword'),
    showIntro: form.watch('guideShowIntro'),
    showAddress: form.watch('guideShowAddress'),
    showWifi: form.watch('guideShowWifi'),
    showCheckin: form.watch('guideShowCheckin'),
    showOther: form.watch('guideShowOther'),
    showFaq: form.watch('guideShowFaq'),
    showCapsuleIssues: form.watch('guideShowCapsuleIssues'),
    showSelfCheckinMessage: form.watch('guideShowSelfCheckinMessage'),
    showHostelPhotos: form.watch('guideShowHostelPhotos'),
    showGoogleMaps: form.watch('guideShowGoogleMaps'),
    showCheckinVideo: form.watch('guideShowCheckinVideo'),
    showTimeAccess: form.watch('guideShowTimeAccess'),
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            Guest Guide Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { id: 'content', label: 'Content', icon: '📝' },
              { id: 'preview', label: 'Preview', icon: '👁️' },
            ].map((tab: any) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeSubTab === tab.id
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content Tab */}
      {activeSubTab === 'content' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Guest Guide Content Editor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                <strong>💡 Tip:</strong> Edit the content below to customize what guests see after successful check-in.
                Use the "Preview" tab to see a real-time preview of your changes.
                Toggle visibility switches below to show/hide specific sections.
              </p>
            </div>

            {/* Quick Templates Section */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Quick Templates
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsQuickTemplatesExpanded(!isQuickTemplatesExpanded)}
                  className="text-xs px-3 py-1"
                >
                  {isQuickTemplatesExpanded ? 'Collapse' : 'Quick Templates'}
                </Button>
              </div>

              {isQuickTemplatesExpanded && (
                <>
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    <span className="text-sm font-medium text-gray-700">Quick Templates:</span>
                    {guideTemplates.map((t) => (
                      <Button key={t.id} type="button" variant="outline" size="sm" onClick={() => applyTemplate(t.id)}>
                        {t.name}
                      </Button>
                    ))}
                    <span className="text-xs text-gray-500">Click a template to populate Introduction, How to Check‑in, Other Guidance, and FAQ.</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {guideTemplates.map((template) => (
                      <Card key={template.id} className="border-2 hover:border-indigo-200 transition-colors">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 mb-1">Introduction</h4>
                            <p className="text-xs text-gray-600 line-clamp-3">{template.intro}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 mb-1">Check-in</h4>
                            <p className="text-xs text-gray-600 line-clamp-3">{template.checkin}</p>
                          </div>
                          <Button 
                            onClick={() => applyTemplate(template.id)} 
                            className="w-full"
                            size="sm"
                          >
                            Apply Template
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit((data: any) => updateSettingsMutation.mutate(data))} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField name={"guideIntro" as any} control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-indigo-600" />
                        Introduction
                        <FormField name={"guideShowIntro" as any} control={form.control} render={({ field: visibilityField }) => (
                          <FormItem className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={!!visibilityField.value} 
                              onChange={(e) => visibilityField.onChange(e.target.checked)}
                              className="h-4 w-4"
                            />
                            <span className="text-xs text-gray-500">Show to guests</span>
                          </FormItem>
                        )} />
                      </FormLabel>
                      <Textarea rows={6} placeholder="Intro to your place..." {...field} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField name={"guideAddress" as any} control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-orange-600" />
                        Address
                        <FormField name={"guideShowAddress" as any} control={form.control} render={({ field: visibilityField }) => (
                          <FormItem className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={!!visibilityField.value} 
                              onChange={(e) => visibilityField.onChange(e.target.checked)}
                              className="h-4 w-4"
                            />
                            <span className="text-xs text-gray-500">Show to guests</span>
                          </FormItem>
                        )} />
                      </FormLabel>
                      <Textarea rows={4} placeholder="Address details..." {...field} />
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField name={"guideWifiName" as any} control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Wifi className="h-4 w-4 text-blue-600" />
                        WiFi Name (SSID)
                        <FormField name={"guideShowWifi" as any} control={form.control} render={({ field: visibilityField }) => (
                          <FormItem className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={!!visibilityField.value} 
                              onChange={(e) => visibilityField.onChange(e.target.checked)}
                              className="h-4 w-4"
                            />
                            <span className="text-xs text-gray-500">Show to guests</span>
                          </FormItem>
                        )} />
                      </FormLabel>
                      <Input placeholder="e.g., PelangiHostel" {...field} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField name={"guideWifiPassword" as any} control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-amber-600" />
                        WiFi Password
                        <FormField name={"guideShowWifi" as any} control={form.control} render={({ field: visibilityField }) => (
                          <FormItem className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={!!visibilityField.value} 
                              onChange={(e) => visibilityField.onChange(e.target.checked)}
                              className="h-4 w-4"
                            />
                            <span className="text-xs text-gray-500">Show to guests</span>
                          </FormItem>
                        )} />
                      </FormLabel>
                      <Input placeholder="WiFi password" {...field} />
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField name={"guideCheckin" as any} control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-emerald-600" />
                      How to Check In
                      <FormField name={"guideShowCheckin" as any} control={form.control} render={({ field: visibilityField }) => (
                        <FormItem className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={!!visibilityField.value} 
                            onChange={(e) => visibilityField.onChange(e.target.checked)}
                            className="h-4 w-4"
                          />
                          <span className="text-xs text-gray-500">Show to guests</span>
                        </FormItem>
                      )} />
                    </FormLabel>
                    <Textarea rows={6} placeholder="Step-by-step check-in guidance..." {...field} />
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField name={"guideOther" as any} control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-600" />
                      Other Guidance
                      <FormField name={"guideShowOther" as any} control={form.control} render={({ field: visibilityField }) => (
                        <FormItem className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={!!visibilityField.value} 
                            onChange={(e) => visibilityField.onChange(e.target.checked)}
                            className="h-4 w-4"
                          />
                          <span className="text-xs text-gray-500">Show to guests</span>
                        </FormItem>
                      )} />
                    </FormLabel>
                    <Textarea rows={6} placeholder="House rules, notes, etc..." {...field} />
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Quick Links Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-600" />
                    Quick Links Configuration
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Configure the links that appear in the "Quick Links" section of the guest success page.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField name={"guideHostelPhotosUrl" as any} control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          Hostel Photos URL
                          <FormField name={"guideShowHostelPhotos" as any} control={form.control} render={({ field: visibilityField }) => (
                            <FormItem className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={!!visibilityField.value} 
                                onChange={(e) => visibilityField.onChange(e.target.checked)}
                                className="h-4 w-4"
                              />
                              <span className="text-xs text-gray-500">Show to guests</span>
                            </FormItem>
                          )} />
                        </FormLabel>
                        <Input placeholder="https://example.com/photos" {...field} />
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField name={"guideGoogleMapsUrl" as any} control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Google Maps URL
                          <FormField name={"guideShowGoogleMaps" as any} control={form.control} render={({ field: visibilityField }) => (
                            <FormItem className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={!!visibilityField.value} 
                                onChange={(e) => visibilityField.onChange(e.target.checked)}
                                className="h-4 w-4"
                              />
                              <span className="text-xs text-gray-500">Show to guests</span>
                            </FormItem>
                          )} />
                        </FormLabel>
                        <Input placeholder="https://maps.google.com/..." {...field} />
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField name={"guideCheckinVideoUrl" as any} control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Check-in Video URL
                        <FormField name={"guideShowCheckinVideo" as any} control={form.control} render={({ field: visibilityField }) => (
                          <FormItem className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={!!visibilityField.value} 
                              onChange={(e) => visibilityField.onChange(e.target.checked)}
                              className="h-4 w-4"
                            />
                            <span className="text-xs text-gray-500">Show to guests</span>
                          </FormItem>
                        )} />
                      </FormLabel>
                      <Input placeholder="https://youtube.com/watch?v=..." {...field} />
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Time and Access Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      Time and Access Settings
                    </h3>
                    <FormField name={"guideShowTimeAccess" as any} control={form.control} render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={!!field.value} 
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="h-4 w-4"
                        />
                        <span className="text-xs text-gray-500">Show to guests</span>
                      </FormItem>
                    )} />
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Configure the check-in/check-out times and door password that appear in the guest success page.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField name={"guideCheckinTime" as any} control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <span>🕒</span>
                          Check-in Time
                        </FormLabel>
                        <FormControl>
                          <GuideTimeSelect 
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select check-in time"
                            mode="checkin"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField name={"guideCheckoutTime" as any} control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <span>🕛</span>
                          Check-out Time
                        </FormLabel>
                        <FormControl>
                          <GuideTimeSelect 
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select check-out time"
                            mode="checkout"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField name={"guideDoorPassword" as any} control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <span>🔐</span>
                        Door Password
                      </FormLabel>
                      <Input placeholder="1270#" {...field} />
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField name={"guideFaq" as any} control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-violet-600" />
                      FAQ
                      <FormField name={"guideShowFaq" as any} control={form.control} render={({ field: visibilityField }) => (
                        <FormItem className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={!!visibilityField.value} 
                            onChange={(e) => visibilityField.onChange(e.target.checked)}
                            className="h-4 w-4"
                          />
                          <span className="text-xs text-gray-500">Show to guests</span>
                        </FormItem>
                      )} />
                    </FormLabel>
                    <Textarea rows={8} placeholder="Frequently asked questions..." {...field} />
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField name={"guideImportantReminders" as any} control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      Important Reminders
                    </FormLabel>
                    <Textarea 
                      rows={6} 
                      placeholder={`• 🚫 Do not leave your card inside the capsule and close the door\n• 🚭 No Smoking in hostel area\n• 🎥 CCTV monitored - Violation (e.g., smoking) may result in RM300 penalty`} 
                      {...field} 
                    />
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="pt-2 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Button type="submit" disabled={updateSettingsMutation.isPending} className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      {updateSettingsMutation.isPending ? "Saving..." : "Save Guide"}
                    </Button>
                    
{/* CSV Path Display - Always show for development, conditionally for production */}
                    {(csvPathData?.path || process.env.NODE_ENV === 'development') && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border">
                        <FolderOpen className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">CSV File:</span>
                        <code className="bg-white px-2 py-1 rounded border text-xs font-mono text-gray-800 max-w-xs sm:max-w-md truncate" title={csvPathData?.path || 'C:\\Users\\Jyue\\Desktop\\PelangiManager\\settings.csv'}>
                          {csvPathData?.path || 'C:\\Users\\Jyue\\Desktop\\PelangiManager\\settings.csv'}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const pathToCopy = csvPathData?.path || 'C:\\Users\\Jyue\\Desktop\\PelangiManager\\settings.csv';
                            navigator.clipboard.writeText(pathToCopy);
                            toast?.({
                              title: "Path Copied",
                              description: "CSV file path copied to clipboard",
                            });
                          }}
                          className="text-xs px-2 py-1 h-auto"
                        >
                          Copy Path
                        </Button>
                      </div>
                    )}
                    
                    {/* Debug info - remove after testing */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="text-xs text-gray-400 bg-gray-100 p-2 rounded">
                        Debug: csvPathData = {JSON.stringify(csvPathData)} | csvPathError = {JSON.stringify(csvPathError)} | settings = {settings ? 'loaded' : 'null'}
                      </div>
                    )}
                  </div>
                  
                  {(csvPathData?.path || process.env.NODE_ENV === 'development') && (
                    <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">💡</span>
                        <div>
                          <strong>Manual Editing:</strong> You can directly edit the CSV file at the path above using any text editor (Excel, Notepad, VSCode, etc.). 
                          After making changes, refresh this page to see the updates. The CSV format is: <code>key,value,description,updated_by,updated_at</code>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Preview Section */}
      {activeSubTab === 'preview' && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {previewMode === 'mobile' ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                Preview - Guest Success Page
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={previewMode} onValueChange={(v: any) => setPreviewMode(v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile">Mobile</SelectItem>
                    <SelectItem value="desktop">Desktop</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="secondary">{previewMode === 'mobile' ? 'Mobile View' : 'Desktop View'}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`preview-content ${previewMode === 'mobile' ? 'max-w-sm' : 'max-w-2xl'} mx-auto border rounded-lg overflow-hidden bg-gradient-to-br from-orange-50 to-pink-50 shadow-xl`}>
              <div className="p-6">
                {/* Success Header */}
                <div className="text-center mb-6">
                  <div className={`${previewMode === 'mobile' ? 'text-3xl mb-3' : 'text-4xl mb-4'}`}>🎉</div>
                  <h1 className={`${previewMode === 'mobile' ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 mb-2`}>Good Day, Our Honorable Guest!</h1>
                  <div className={`${previewMode === 'mobile' ? 'text-xl mb-3' : 'text-2xl mb-4'}`}>🎉</div>
                </div>

                {/* Welcome Section */}
                {watchedValues.showIntro && watchedValues.intro && (
                  <div className={`bg-gradient-to-r from-orange-100 to-pink-100 rounded-xl ${previewMode === 'mobile' ? 'p-4' : 'p-6'} mb-6`}>
                    <h2 className={`${previewMode === 'mobile' ? 'text-lg' : 'text-xl'} font-bold text-gray-800 mb-4 flex items-center justify-center gap-2`}>
                      Welcome to Pelangi Capsule Hostel <span className={`${previewMode === 'mobile' ? 'text-xl' : 'text-2xl'}`}>🌈</span>
                    </h2>
                    {/* Essential Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {/* Address Section */}
                      {watchedValues.showAddress && watchedValues.address && (
                        <div className="bg-white/60 rounded-lg p-3">
                          <div className="flex items-start gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-orange-600 mt-0.5" />
                            <div>
                              <div className="font-semibold text-gray-800 mb-1">Address</div>
                              <div className="text-gray-700 whitespace-pre-line text-xs">
                                {watchedValues.address}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* WiFi Section */}
                      {watchedValues.showWifi && (watchedValues.wifiName || watchedValues.wifiPassword) && (
                        <div className="bg-white/60 rounded-lg p-3">
                          <div className="flex items-start gap-2 mb-2">
                            <Wifi className="h-4 w-4 text-blue-600 mt-0.5" />
                            <div>
                              <div className="font-semibold text-gray-800 mb-1">WiFi Access</div>
                              <div className="text-gray-700 text-xs">
                                {watchedValues.wifiName && (
                                  <div><span className="font-medium">Network:</span> {watchedValues.wifiName}</div>
                                )}
                                {watchedValues.wifiPassword && (
                                  <div><span className="font-medium">Password:</span> {watchedValues.wifiPassword}</div>
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {watchedValues.showHostelPhotos && watchedValues.hostelPhotosUrl && (
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2 h-auto py-3 px-4"
                      onClick={() => window.open(watchedValues.hostelPhotosUrl, '_blank')}
                    >
                      <Camera className="h-4 w-4" />
                      <span className="text-sm">Hostel Photos</span>
                    </Button>
                  )}
                  {watchedValues.showGoogleMaps && watchedValues.googleMapsUrl && (
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2 h-auto py-3 px-4"
                      onClick={() => window.open(watchedValues.googleMapsUrl, '_blank')}
                    >
                      <Globe className="h-4 w-4" />
                      <span className="text-sm">Google Maps</span>
                    </Button>
                  )}
                  {watchedValues.showCheckinVideo && watchedValues.checkinVideoUrl && (
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2 h-auto py-3 px-4"
                      onClick={() => window.open(watchedValues.checkinVideoUrl, '_blank')}
                    >
                      <Video className="h-4 w-4" />
                      <span className="text-sm">Check-in Video</span>
                    </Button>
                  )}
                  {(!watchedValues.showHostelPhotos || !watchedValues.hostelPhotosUrl) && 
                   (!watchedValues.showGoogleMaps || !watchedValues.googleMapsUrl) && 
                   (!watchedValues.showCheckinVideo || !watchedValues.checkinVideoUrl) && (
                    <div className="col-span-3 text-center text-gray-500 text-sm py-4">
                      No quick links configured or visible. Add URLs in the Quick Links Configuration section above.
                    </div>
                  )}
                </div>

                {/* Time and Access Information */}
                {watchedValues.showTimeAccess && (
                  <div className="border-t border-gray-200 py-6 space-y-4">
                    {/* Time Information */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        Check-in & Check-out Times
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600">🕒</span>
                          <span className="font-medium">Check-in:</span>
                          <span className="font-semibold">{watchedValues.checkinTime || 'From 3:00 PM'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600">🕛</span>
                          <span className="font-medium">Check-out:</span>
                          <span className="font-semibold">{watchedValues.checkoutTime || 'Before 12:00 PM'}</span>
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
                          <span className="text-blue-600">🔐</span>
                          <span className="font-medium">Door Password:</span>
                          <span className="font-mono text-lg font-bold text-green-600 bg-white px-2 py-1 rounded border">
                            {watchedValues.doorPassword || '1270#'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600">🛌</span>
                          <span className="font-medium">Capsule:</span>
                          <span className="font-bold text-lg text-orange-600 bg-white px-2 py-1 rounded border">
                            Assigned based on availability
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600">🃏</span>
                        <span className="font-medium">Access Card:</span>
                        <span className="text-sm text-gray-600">Collect from reception upon arrival</span>
                      </div>

                      {/* Capsule Issues Preview */}
                      {watchedValues.showCapsuleIssues && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-yellow-600">⚠️</span>
                            <span className="font-medium text-yellow-800">Capsule Issues</span>
                          </div>
                          <div className="space-y-2">
                            <div className="text-sm text-yellow-700 bg-white/60 p-2 rounded border">
                              <div className="font-medium">Air conditioning not working properly</div>
                              <div className="text-xs text-yellow-600 mt-1">
                                Reported: {new Date().toLocaleDateString()}
                              </div>
                            </div>
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
                {watchedValues.showCheckin && watchedValues.checkin && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-gray-800">How to Check In:</h3>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{watchedValues.checkin}</div>
                  </div>
                )}

                {/* Other Guidance */}
                {watchedValues.showOther && watchedValues.other && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-gray-800">Additional Information:</h3>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{watchedValues.other}</div>
                  </div>
                )}

                {/* FAQ */}
                {watchedValues.showFaq && watchedValues.faq && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-gray-800">Frequently Asked Questions:</h3>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{watchedValues.faq}</div>
                  </div>
                )}

                {/* Important Reminders */}
                {watchedValues.importantReminders && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                      <span>⚠</span> Important Reminders:
                    </h3>
                    <div className="text-sm text-red-700 whitespace-pre-wrap">
                      {watchedValues.importantReminders}
                    </div>
                  </div>
                )}

                <div className="text-center text-gray-600 text-sm">
                  For any assistance, please contact reception.<br />
                  Enjoy your stay at Pelangi Capsule Hostel! 💼🌟
                </div>

                {/* Print and Email buttons for testing */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const printContent = document.querySelector('.preview-content') as HTMLElement;
                      if (printContent) {
                        const originalDisplay = printContent.style.display;
                        printContent.style.display = 'block';
                        window.print();
                        printContent.style.display = originalDisplay;
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Print Check-in Slip
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const guestName = "Test Guest";
                      const capsuleNumber = "C12";
                      const checkinTime = watchedValues.checkinTime || 'From 3:00 PM';
                      const checkoutTime = watchedValues.checkoutTime || 'Before 12:00 PM';
                      const subject = encodeURIComponent('Your Check-in Slip - Pelangi Capsule Hostel');
                      const body = encodeURIComponent(`
Dear ${guestName},

Welcome to Pelangi Capsule Hostel! Here is your check-in slip:

🏨 PELANGI CAPSULE HOSTEL - CHECK-IN SLIP

Guest Name: ${guestName}
Capsule Number: ${capsuleNumber}
Check-in: ${checkinTime}
Check-out: ${checkoutTime}
Door Password: ${watchedValues.doorPassword || '1270#'}
Capsule Access Card: Placed on your pillow

⚠️ IMPORTANT REMINDERS:
• Do not leave your card inside the capsule and close the door
• No Smoking in hostel area
• CCTV monitored – Violation (e.g., smoking) may result in RM300 penalty

📍 Address: (configure in Guest Guide)

For any assistance, please contact reception.
Enjoy your stay at Pelangi Capsule Hostel! 💼🌟

---
This email was generated by Pelangi Capsule Hostel Management System
                      `);
                      const mailtoLink = `mailto:test@example.com?subject=${subject}&body=${body}`;
                      window.open(mailtoLink, '_blank');
                    }}
                    className="flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Send via Email Client
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}