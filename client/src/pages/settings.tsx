import { useState, useContext, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings, Clock, Save, RotateCcw, Wrench, Users, MessageSquare, Plus, Trash2, Edit, Building, Cog, UserCheck, BookOpen, TestTube, Eye, MapPin, Camera, Globe, Video, Smartphone, Monitor, Wifi, Printer, Send, FileText, CheckCircle, MoreHorizontal } from "lucide-react";
import MaintenanceTab from "../components/settings/MaintenanceTab";
import UsersTab from "../components/settings/UsersTab";
import CapsulesTab from "../components/settings/CapsulesTab";
import MessagesTab from "../components/settings/MessagesTab";
import GeneralSettingsTab from "../components/settings/GeneralSettingsTab";
import TestsTab from "../components/settings/TestsTab";
import GuestGuideTab from "../components/settings/GuestGuideTab";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimeSelect } from "@/components/ui/time-select";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useAccommodationLabels } from "@/hooks/useAccommodationLabels";
import { useToast } from "@/hooks/use-toast";
import { AuthContext } from "@/lib/auth";
import { updateSettingsSchema, type UpdateSettings, type CapsuleProblem, type User, type InsertUser, insertUserSchema, type PaginatedResponse, type Capsule, insertCapsuleSchema, updateCapsuleSchema } from "@shared/schema";
import { z } from "zod";

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const authContext = useContext(AuthContext);
  const isAuthenticated = authContext?.isAuthenticated || false;
  const [activeTab, setActiveTab] = useState("general");
  const labels = useAccommodationLabels();

  // General settings queries
  const { data: settings, isLoading } = useQuery<{ accommodationType?: string; selfCheckinSuccessMessage?: string }>({
    queryKey: ["/api/settings"],
    enabled: isAuthenticated,
  });

  // Capsule problems queries
  const { data: problemsResponse, isLoading: problemsLoading } = useQuery<PaginatedResponse<CapsuleProblem>>({
    queryKey: ["/api/problems"],
    enabled: isAuthenticated && activeTab === "maintenance",
  });
  
  const problems = problemsResponse?.data || [];

  // Capsules query for dropdown and capsules management
  const { data: capsules = [] } = useQuery<Capsule[]>({
    queryKey: ["/api/capsules"],
    enabled: isAuthenticated && (activeTab === "maintenance" || activeTab === "capsules"),
  });

  // Users queries
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated && activeTab === "users",
  });

  const form = useForm<UpdateSettings>({
    resolver: zodResolver(updateSettingsSchema),
    defaultValues: {
      accommodationType: (settings as any)?.accommodationType || "capsule",
    },
  });

  // Update form when settings are loaded - populate ALL fields from CSV
  useEffect(() => {
    if (settings) {
      console.log('🔄 Resetting form with settings from CSV:', settings);
      form.reset({
        // Basic settings
        accommodationType: (settings as any).accommodationType || "capsule",
        
        // Guide content
        guideIntro: (settings as any).guideIntro || "",
        guideAddress: (settings as any).guideAddress || "",
        guideWifiName: (settings as any).guideWifiName || "",
        guideWifiPassword: (settings as any).guideWifiPassword || "",
        guideCheckin: (settings as any).guideCheckin || "",
        guideOther: (settings as any).guideOther || "",
        guideFaq: (settings as any).guideFaq || "",
        guideImportantReminders: (settings as any).guideImportantReminders || "",
        
        // Quick links
        guideHostelPhotosUrl: (settings as any).guideHostelPhotosUrl || "",
        guideGoogleMapsUrl: (settings as any).guideGoogleMapsUrl || "",
        guideCheckinVideoUrl: (settings as any).guideCheckinVideoUrl || "",
        
        // Time and access
        guideCheckinTime: (settings as any).guideCheckinTime || "",
        guideCheckoutTime: (settings as any).guideCheckoutTime || "",
        guideDoorPassword: (settings as any).guideDoorPassword || "",
        
        // Visibility toggles
        guideShowIntro: (settings as any).guideShowIntro === true,
        guideShowAddress: (settings as any).guideShowAddress === true,
        guideShowWifi: (settings as any).guideShowWifi === true,
        guideShowCheckin: (settings as any).guideShowCheckin === true,
        guideShowOther: (settings as any).guideShowOther === true,
        guideShowFaq: (settings as any).guideShowFaq === true,
        guideShowCapsuleIssues: (settings as any).guideShowCapsuleIssues === true,
        guideShowSelfCheckinMessage: (settings as any).guideShowSelfCheckinMessage === true,
        guideShowHostelPhotos: (settings as any).guideShowHostelPhotos === true,
        guideShowGoogleMaps: (settings as any).guideShowGoogleMaps === true,
        guideShowCheckinVideo: (settings as any).guideShowCheckinVideo === true,
        guideShowTimeAccess: (settings as any).guideShowTimeAccess === true,
      } as any);
      console.log('✅ Form reset complete with CSV data');
    }
  }, [settings, form]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: UpdateSettings) => {
      const response = await apiRequest("PATCH", "/api/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateSettings) => {
    // Remove empty optional URL fields to avoid triggering URL validation
    const cleaned: any = { ...data };
    [
      'guideHostelPhotosUrl',
      'guideGoogleMapsUrl',
      'guideCheckinVideoUrl',
    ].forEach((k) => {
      const v = (cleaned as any)[k];
      if (typeof v === 'string' && v.trim() === '') {
        delete (cleaned as any)[k];
      }
    });
    updateSettingsMutation.mutate(cleaned);
  };

  const resetToDefault = () => {
    (form as any).setValue?.("accommodationType", "capsule");
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access the settings.</p>
          <a href="/login" className="text-orange-600 hover:text-orange-700 font-medium">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
            <Settings className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Configure system settings and preferences</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TooltipProvider>
          {/* Desktop: Show all 6 tabs directly */}
          <TabsList className="hidden md:grid w-full grid-cols-6">
            <TabsTrigger value="general" className="flex items-center justify-start gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-100">
                    <Cog className="h-3 w-3 text-blue-600" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">General system settings and configuration</TooltipContent>
              </Tooltip>
              <span>General</span>
            </TabsTrigger>
            <TabsTrigger value="capsules" className="flex items-center justify-start gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center h-5 w-5 rounded-full bg-purple-100">
                    <Building className="h-3 w-3 text-purple-600" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">Manage {labels.singular.toLowerCase()} listings and availability</TooltipContent>
              </Tooltip>
              <span>{labels.plural}</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center justify-start gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center h-5 w-5 rounded-full bg-orange-100">
                    <Wrench className="h-3 w-3 text-orange-600" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">Report and track maintenance issues</TooltipContent>
              </Tooltip>
              <span>Maintenance</span>
            </TabsTrigger>
            <TabsTrigger value="guide" className="flex items-center justify-start gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center h-5 w-5 rounded-full bg-indigo-100">
                    <BookOpen className="h-3 w-3 text-indigo-600" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">Configure guest success page content and settings</TooltipContent>
              </Tooltip>
              <span>Guest Guide</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center justify-start gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center h-5 w-5 rounded-full bg-green-100">
                    <UserCheck className="h-3 w-3 text-green-600" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">Manage user accounts and permissions</TooltipContent>
              </Tooltip>
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="tests" className="flex items-center justify-start gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center h-5 w-5 rounded-full bg-pink-100">
                    <TestTube className="h-3 w-3 text-pink-600" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">System tests and development tools</TooltipContent>
              </Tooltip>
              <span>Tests</span>
            </TabsTrigger>
          </TabsList>

          {/* Mobile: Show 4 main tabs + More dropdown */}
          <TabsList className="md:hidden grid w-full grid-cols-5">
            <TabsTrigger value="general" className="flex items-center justify-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-100">
                    <Cog className="h-3 w-3 text-blue-600" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">General system settings and configuration</TooltipContent>
              </Tooltip>
            </TabsTrigger>
            <TabsTrigger value="capsules" className="flex items-center justify-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center h-5 w-5 rounded-full bg-purple-100">
                    <Building className="h-3 w-3 text-purple-600" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">Manage {labels.singular.toLowerCase()} listings and availability</TooltipContent>
              </Tooltip>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center justify-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center h-5 w-5 rounded-full bg-orange-100">
                    <Wrench className="h-3 w-3 text-orange-600" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">Report and track maintenance issues</TooltipContent>
              </Tooltip>
            </TabsTrigger>
            <TabsTrigger value="guide" className="flex items-center justify-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center h-5 w-5 rounded-full bg-indigo-100">
                    <BookOpen className="h-3 w-3 text-indigo-600" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">Configure guest success page content and settings</TooltipContent>
              </Tooltip>
            </TabsTrigger>
            
            {/* More dropdown for mobile */}
            <div className="flex items-center justify-center">
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex items-center justify-center gap-1 h-full w-full">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="text-xs">More</span>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Additional settings tabs</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onSelect={() => setActiveTab("users")} className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-4 w-4 rounded-full bg-green-100">
                      <UserCheck className="h-2.5 w-2.5 text-green-600" />
                    </div>
                    <span>Users</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setActiveTab("tests")} className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-4 w-4 rounded-full bg-pink-100">
                      <TestTube className="h-2.5 w-2.5 text-pink-600" />
                    </div>
                    <span>Tests</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TabsList>
        </TooltipProvider>

        <TabsContent value="general" className="space-y-6">
          <GeneralSettingsTab
            settings={settings}
            isLoading={isLoading}
            form={form}
            onSubmit={onSubmit}
            resetToDefault={resetToDefault}
            updateSettingsMutation={updateSettingsMutation}
          />
        </TabsContent>

        <TabsContent value="capsules" className="space-y-6">
          <CapsulesTab
            capsules={capsules}
            queryClient={queryClient}
            toast={toast}
            labels={labels}
          />
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <MaintenanceTab
            problems={problems}
            capsules={capsules}
            isLoading={problemsLoading}
            queryClient={queryClient}
            toast={toast}
            labels={labels}
          />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UsersTab
            users={users}
            isLoading={usersLoading}
            queryClient={queryClient}
            toast={toast}
          />
        </TabsContent>

        <TabsContent value="guide" className="space-y-6">
          <GuestGuideTab 
            settings={settings} 
            form={form} 
            updateSettingsMutation={updateSettingsMutation}
            queryClient={queryClient}
            toast={toast}
          />
        </TabsContent>


        <TabsContent value="tests" className="space-y-6">
          <TestsTab />
        </TabsContent>

      </Tabs>
    </div>
  );
}
