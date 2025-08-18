import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { GuestSelfCheckin } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import type { UploadResult } from "@uppy/core";

export function useDocumentUpload(form: UseFormReturn<GuestSelfCheckin>) {
  const { toast } = useToast();
  const [icDocumentUrl, setIcDocumentUrl] = useState<string>("");
  const [passportDocumentUrl, setPassportDocumentUrl] = useState<string>("");

  const handleGetUploadParameters = async () => {
    try {
      const response = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
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
      
      const uploadUrl = data.uploadURL;
      console.log('Upload URL:', uploadUrl);
      
      // Store URL in a way we can retrieve it later
      (window as any).__lastUploadUrl = uploadUrl;
      
      return {
        method: 'PUT' as const,
        url: uploadUrl,
      };
    } catch (error) {
      console.error('Error getting upload parameters:', error);
      throw new Error('Failed to get upload URL');
    }
  };

  const handleDocumentUpload = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>, documentType: 'ic' | 'passport') => {
    console.log('=== Document Upload Handler ===');
    console.log('Full result:', JSON.stringify(result, null, 2));
    
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      console.log('Uploaded file object:', uploadedFile);
      console.log('Uploaded file keys:', Object.keys(uploadedFile));
      
      // Log all possible URL locations
      console.log('Checking URL locations:');
      console.log('- uploadURL:', uploadedFile.uploadURL);
      console.log('- response:', (uploadedFile as any).response);
      console.log('- meta:', (uploadedFile as any).meta);
      console.log('- xhrUpload:', (uploadedFile as any).xhrUpload);
      
      // Check if we stored the URL during upload parameters
      const storedUploadUrl = (uploadedFile as any).meta?.uploadUrl || 
                             (uploadedFile as any).meta?.uploadURL;
      console.log('Stored upload URL from meta:', storedUploadUrl);
      
      // Also check window storage
      const windowStoredUrl = (window as any).__lastUploadUrl;
      console.log('Window stored URL:', windowStoredUrl);
      
      const uploadURL = uploadedFile.uploadURL || 
                       storedUploadUrl ||
                       windowStoredUrl ||
                       (uploadedFile as any).response?.uploadURL || 
                       (uploadedFile as any).meta?.responseUrl ||
                       (uploadedFile as any).xhrUpload?.endpoint;
      
      console.log('Final uploadURL:', uploadURL);
      
      if (uploadURL) {
        let objectId: string | undefined;
        try {
          // Validate URL format first
          if (typeof uploadURL !== 'string' || uploadURL.trim() === '') {
            throw new Error('Upload URL is empty or not a string');
          }
          
          console.log('Processing upload URL:', uploadURL);
          
          if (uploadURL.includes('/api/objects/dev-upload/')) {
            // Dev upload URL (can be full or relative)
            const parts = uploadURL.split('/api/objects/dev-upload/');
            objectId = parts[parts.length - 1];
            console.log('Extracted objectId from dev upload URL:', objectId);
          } else if (uploadURL.startsWith('http://') || uploadURL.startsWith('https://')) {
            // Full URL - validate it's a proper URL
            try {
              const url = new URL(uploadURL);
              objectId = url.pathname.split('/').pop();
              console.log('Extracted objectId from full URL:', objectId);
            } catch (urlError) {
              console.error('Invalid URL format:', uploadURL);
              throw new Error(`Invalid URL format: ${uploadURL}`);
            }
          } else if (uploadURL.startsWith('/')) {
            // Relative URL
            objectId = uploadURL.split('/').pop();
            console.log('Extracted objectId from relative URL:', objectId);
          } else {
            // Unknown format
            console.error('Unknown URL format:', uploadURL);
            throw new Error(`Unknown URL format: ${uploadURL}`);
          }
          
          if (!objectId) {
            throw new Error('Could not extract object ID from upload URL');
          }
          
          // Construct full URL that points to our object serving endpoint
          const baseUrl = window.location.origin;
          const documentUrl = `${baseUrl}/objects/uploads/${objectId}`;
          
          console.log('Final document URL:', documentUrl);
          
          if (documentType === 'ic') {
            setIcDocumentUrl(documentUrl);
            form.setValue("icDocumentUrl", documentUrl);
          } else {
            setPassportDocumentUrl(documentUrl);
            form.setValue("passportDocumentUrl", documentUrl);
          }
          
          // Clear stored URL after successful use
          (window as any).__lastUploadUrl = null;
          
          toast({
            title: "Document Uploaded",
            description: `Your ${documentType === 'ic' ? 'IC' : 'passport'} document has been uploaded successfully.`,
          });
        } catch (error) {
          console.error('Error processing upload URL:', error);
          console.error('Error details:', {
            uploadURL,
            objectId,
            error: error instanceof Error ? error.message : error
          });
          toast({
            title: "Upload Error",
            description: error instanceof Error ? error.message : "Failed to process uploaded file. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        console.error('No upload URL found in any of the expected locations');
        console.error('Available data:', {
          uploadedFileKeys: Object.keys(uploadedFile),
          response: (uploadedFile as any).response,
          meta: (uploadedFile as any).meta,
        });
        toast({
          title: "Upload Error",
          description: "Unable to find upload URL. Please check console for details and try again.",
          variant: "destructive",
        });
      }
    }
  };

  return {
    icDocumentUrl,
    passportDocumentUrl,
    setIcDocumentUrl,
    setPassportDocumentUrl,
    handleGetUploadParameters,
    handleDocumentUpload,
  };
}
