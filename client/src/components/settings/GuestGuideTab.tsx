/**
 * Updated Guest Guide Tab - Redirects to New Guest Guide Content Editor
 * Replaces old Content/Preview tab system with new comprehensive editor
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight, Sparkles, Edit, Eye, Settings, Zap } from "lucide-react";

export default function GuestGuideTab({ settings, form, updateSettingsMutation, queryClient, toast }: any) {
  
  const handleRedirectToGuestGuide = () => {
    // Redirect to the new Guest Guide Content Editor
    window.location.href = '/guest-guide';
  };

  return (
    <div className="space-y-6">
      {/* Main Redirect Card */}
      <Card className="border-2 border-gradient-to-r from-orange-200 to-pink-200 bg-gradient-to-br from-orange-50 to-pink-50">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-gray-900 mb-2">
            New & Improved Guest Guide Editor
          </CardTitle>
          <p className="text-gray-600 text-lg">
            We've upgraded to a more powerful, user-friendly editor with real-time preview and better organization
          </p>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <Edit className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Enhanced Editor</h3>
              <p className="text-sm text-gray-600 text-center">
                Intuitive content management with organized sections and validation
              </p>
            </div>

            <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                <Eye className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Live Preview</h3>
              <p className="text-sm text-gray-600 text-center">
                See exactly how guests will see your page in real-time
              </p>
            </div>

            <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Auto-sync</h3>
              <p className="text-sm text-gray-600 text-center">
                Changes automatically sync between preview and actual guest page
              </p>
            </div>
          </div>

          {/* Action Button */}
          <Button 
            onClick={handleRedirectToGuestGuide}
            size="lg"
            className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white text-lg px-8 py-3 flex items-center gap-3 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            <BookOpen className="h-6 w-6" />
            Open Guest Guide Editor
            <ArrowRight className="h-5 w-5" />
          </Button>

          <div className="mt-4 text-sm text-gray-500">
            All your existing settings have been preserved and migrated to the new editor
          </div>
        </CardContent>
      </Card>

      {/* Migration Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            What's Changed?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-blue-800">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></span>
              <div>
                <strong>Better Organization:</strong> Content is now organized in logical sections for easier management
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></span>
              <div>
                <strong>Real-time Preview:</strong> See changes instantly as you type, with mobile and desktop views
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></span>
              <div>
                <strong>Perfect Synchronization:</strong> Preview matches exactly what guests see after check-in
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></span>
              <div>
                <strong>Auto-save:</strong> Your changes are automatically saved as you work
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup Information */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="pt-6">
          <div className="text-xs text-gray-600 text-center">
            <strong>Note:</strong> Your old Guest Guide configuration has been safely backed up to the archive folder. 
            All existing settings have been migrated to the new editor automatically.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}