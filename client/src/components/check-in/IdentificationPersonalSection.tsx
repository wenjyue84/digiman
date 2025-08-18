import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreditCard, Camera, Calendar } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { useToast } from "@/hooks/use-toast";
import { NATIONALITIES } from "@/lib/nationalities";
import { getHolidayLabel, hasPublicHoliday } from "@/lib/holidays";
import type { InsertGuest } from "@shared/schema";

interface IdentificationPersonalSectionProps {
  form: UseFormReturn<InsertGuest>;
  profilePhotoUrl: string;
  setProfilePhotoUrl: (url: string) => void;
}

export default function IdentificationPersonalSection({
  form,
  profilePhotoUrl,
  setProfilePhotoUrl
}: IdentificationPersonalSectionProps) {
  const { toast } = useToast();

  // FIXED: Upload failure issue - Request upload URL from server instead of generating locally
  // This follows the correct API flow documented in DEVELOPMENT_REFERENCE.md
  const handleGetUploadParameters = async () => {
    try {
      // Step 1: Request upload parameters from server
      // Server generates unique upload URL and returns it
      const response = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Empty body as per API spec
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Upload URL request failed:', errorData);
        throw new Error('Failed to get upload URL');
      }

      const data = await response.json();
      console.log('Server upload response:', data);

      if (!data.uploadURL) {
        throw new Error('No upload URL returned from server');
      }

      const uploadURL = data.uploadURL;
      console.log('Upload URL received from server:', uploadURL);

      // Store URL for later use in upload result handler
      (window as any).__lastProfileUploadUrl = uploadURL;

      // Return parameters that Uppy will use for the actual upload
      return {
        method: 'PUT' as const,
        url: uploadURL, // Full URL like http://localhost:5000/api/objects/dev-upload/12345
      };
    } catch (error) {
      console.error('Error getting upload parameters:', error);
      throw new Error('Failed to get upload URL');
    }
  };

  const handlePhotoUpload = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    console.log('=== Photo Upload Handler ===');
    console.log('Full result:', JSON.stringify(result, null, 2));
    
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      console.log('Uploaded file object:', uploadedFile);
      
      const uploadURL = uploadedFile.uploadURL || (window as any).__lastProfileUploadUrl;
      console.log('Upload URL:', uploadURL);

      if (!uploadURL) {
        console.error('No upload URL found');
        toast({
          title: 'Upload Error',
          description: 'No upload URL found. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      try {
        let objectId: string | undefined;

        if (uploadURL.includes('/api/objects/dev-upload/')) {
          const parts = uploadURL.split('/api/objects/dev-upload/');
          objectId = parts[parts.length - 1];
        } else if (uploadURL.startsWith('http://') || uploadURL.startsWith('https://')) {
          const url = new URL(uploadURL);
          objectId = url.pathname.split('/').pop();
        } else if (uploadURL.startsWith('/')) {
          objectId = uploadURL.split('/').pop();
        }

        if (!objectId) {
          throw new Error('Could not extract object ID from upload URL');
        }

        const baseUrl = window.location.origin;
        const photoUrl = `${baseUrl}/objects/uploads/${objectId}`;
        setProfilePhotoUrl(photoUrl);
        toast({
          title: 'Photo uploaded',
          description: 'Document photo uploaded successfully',
        });
      } catch (error) {
        console.error('Error processing upload URL:', error);
        toast({
          title: 'Upload Error',
          description: error instanceof Error ? error.message : 'Failed to process uploaded file',
          variant: 'destructive',
        });
      } finally {
        (window as any).__lastProfileUploadUrl = null;
      }
    } else {
      console.error('Upload failed or no files uploaded');
      console.error('Result:', result);
      
      // Check if there are any failed uploads with error messages
      if (result.failed && result.failed.length > 0) {
        const failedFile = result.failed[0];
        const errorMessage = failedFile.error?.message || 'Upload failed';
        console.error('Upload failed:', errorMessage);
        
        toast({
          title: 'Upload Failed',
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Upload Failed',
          description: 'No files were uploaded successfully. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div className="bg-orange-50 rounded-lg p-3 sm:p-4 border border-orange-200">
      <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
        <CreditCard className="mr-2 h-4 w-4" />
        Identification & Personal Details <span className="text-gray-500 text-xs ml-2">(Optional for admin)</span>
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {/* Nationality FIRST */}
        <div>
          <Label htmlFor="nationality" className="text-sm font-medium text-hostel-text">
            Nationality
          </Label>
          <select
            id="nationality"
            className="w-full mt-1 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            defaultValue="Malaysian"
            {...form.register("nationality")}
          >
            {NATIONALITIES.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </select>
          {form.formState.errors.nationality && (
            <p className="text-hostel-error text-sm mt-1">{form.formState.errors.nationality.message}</p>
          )}
        </div>

        {/* Dynamic IC/Passport number SECOND */}
        <div>
          <Label htmlFor="idNumber" className="text-sm font-medium text-hostel-text">
            {form.watch("nationality") === "Malaysian" ? "IC Number" : "Passport Number"}
          </Label>
          <Input
            id="idNumber"
            type="text"
            placeholder={form.watch("nationality") === "Malaysian" ? "IC Number" : "Passport Number"}
            className="mt-1"
            {...form.register("idNumber")}
          />
          {form.formState.errors.idNumber && (
            <p className="text-hostel-error text-sm mt-1">{form.formState.errors.idNumber.message}</p>
          )}
        </div>

        {/* Dynamic document photo THIRD */}
        <div>
          <Label className="text-sm font-medium text-hostel-text">
            <Camera className="mr-2 h-4 w-4 inline" />
            {form.watch("nationality") === "Malaysian" ? "IC Photo" : "Passport Photo"} 
            <span className="text-gray-500 text-xs ml-2">(Optional for admin)</span>
          </Label>
          <div className="mt-2 space-y-2">
            {profilePhotoUrl ? (
              <div className="flex items-center gap-3">
                <img
                  src={profilePhotoUrl}
                  alt="Profile"
                  className="w-16 h-20 object-cover rounded border border-gray-300"
                />
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setProfilePhotoUrl("")}
                    className="text-xs"
                  >
                    Remove Photo
                  </Button>
                  <span className="text-xs text-gray-500">
                    Photo uploaded successfully
                  </span>
                </div>
              </div>
            ) : (
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={5 * 1024 * 1024}
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handlePhotoUpload}
                buttonClassName="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                directFileUpload={true}
                showCameraOption={true}
              >
                <Camera className="mr-2 h-4 w-4" />
                {`Upload ${form.watch("nationality") === "Malaysian" ? "IC Photo" : "Passport Photo"}`}
              </ObjectUploader>
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="expectedCheckoutDate" className="text-sm font-medium text-hostel-text flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            Expected Checkout Date
          </Label>
          <Input
            id="expectedCheckoutDate"
            type="date"
            className="mt-1"
            {...form.register("expectedCheckoutDate")}
          />
          {(() => {
            const dateStr = form.watch("expectedCheckoutDate");
            const label = getHolidayLabel(dateStr);
            if (!label) return null;
            const isPH = hasPublicHoliday(dateStr);
            return (
              <div className={`${isPH ? "text-green-700 bg-green-50 border-green-200" : "text-blue-700 bg-blue-50 border-blue-200"} mt-2 text-sm rounded border p-2 flex items-start gap-2`}
              >
                <span>{isPH ? "🎉" : "🗓️"}</span>
                <span>
                  {isPH ? "Public holiday" : "Festival"}: {label}. Consider extending stay to enjoy the celebrations.
                </span>
              </div>
            );
          })()}
          {form.formState.errors.expectedCheckoutDate && (
            <p className="text-hostel-error text-sm mt-1">{form.formState.errors.expectedCheckoutDate.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}