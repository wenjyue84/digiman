import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { UploadResult } from "@uppy/core";

export interface UploadHookOptions {
  onSuccess?: (url: string, objectId: string) => void;
  onError?: (error: string) => void;
  showToast?: boolean;
}

export function useFileUpload(options: UploadHookOptions = {}) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const { onSuccess, onError, showToast = true } = options;

  const handleGetUploadParameters = async () => {
    try {
      // Generate a unique ID for this upload
      const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      // Return full URL as required by Uppy AWS S3 plugin
      const baseUrl = window.location.origin;
      const uploadUrl = `${baseUrl}/api/objects/dev-upload/${uploadId}`;
      
      console.log('Generated upload URL:', uploadUrl);
      
      // Store URL for later retrieval
      (window as any).__lastUploadUrl = uploadUrl;
      
      return {
        method: 'PUT' as const,
        url: uploadUrl,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get upload parameters';
      if (showToast) {
        toast({
          title: "Upload Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
      onError?.(errorMessage);
      throw error;
    }
  };

  const handleUpload = (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>,
    successMessage?: string
  ) => {
    console.log('=== File Upload Handler ===');
    console.log('Full result:', JSON.stringify(result, null, 2));
    
    setIsUploading(true);
    
    try {
      if (result.successful && result.successful.length > 0) {
        const uploadedFile = result.successful[0];
        console.log('Uploaded file object:', uploadedFile);
        
        // Extract upload URL from various possible locations
        const storedUploadUrl = (uploadedFile as any).meta?.uploadUrl || 
                               (uploadedFile as any).meta?.uploadURL;
        const windowStoredUrl = (window as any).__lastUploadUrl;
        
        const uploadURL = uploadedFile.uploadURL || 
                         storedUploadUrl ||
                         windowStoredUrl ||
                         (uploadedFile as any).response?.uploadURL || 
                         (uploadedFile as any).meta?.responseUrl ||
                         (uploadedFile as any).xhrUpload?.endpoint;
        
        console.log('Final uploadURL:', uploadURL);
        
        if (uploadURL) {
          let objectId: string | undefined;
          
          // Validate URL format
          if (typeof uploadURL !== 'string' || uploadURL.trim() === '') {
            throw new Error('Upload URL is empty or not a string');
          }
          
          console.log('Processing upload URL:', uploadURL);
          
          if (uploadURL.includes('/api/objects/dev-upload/')) {
            // Dev upload URL
            const parts = uploadURL.split('/api/objects/dev-upload/');
            objectId = parts[parts.length - 1];
            console.log('Extracted objectId from dev upload URL:', objectId);
          } else if (uploadURL.startsWith('http://') || uploadURL.startsWith('https://')) {
            // Full URL
            const url = new URL(uploadURL);
            objectId = url.pathname.split('/').pop();
            console.log('Extracted objectId from full URL:', objectId);
          } else if (uploadURL.startsWith('/')) {
            // Relative URL
            objectId = uploadURL.split('/').pop();
            console.log('Extracted objectId from relative URL:', objectId);
          } else {
            throw new Error(`Unknown URL format: ${uploadURL}`);
          }
          
          if (!objectId) {
            throw new Error('Could not extract object ID from upload URL');
          }
          
          // Construct full URL that points to our object serving endpoint
          const baseUrl = window.location.origin;
          const documentUrl = `${baseUrl}/objects/uploads/${objectId}`;
          
          console.log('Final document URL:', documentUrl);
          
          // Clear stored URL after successful use
          (window as any).__lastUploadUrl = null;
          
          if (showToast) {
            toast({
              title: "Upload Successful",
              description: successMessage || "File has been uploaded successfully.",
            });
          }
          
          onSuccess?.(documentUrl, objectId);
          
        } else {
          throw new Error('No upload URL found in result');
        }
      } else {
        throw new Error('Upload failed - no successful files');
      }
    } catch (error) {
      console.error('Error processing upload:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process uploaded file';
      
      if (showToast) {
        toast({
          title: "Upload Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return {
    handleGetUploadParameters,
    handleUpload,
    isUploading,
  };
}

// Specialized hook for document uploads (IC/Passport)
export function useDocumentUpload(
  onIcUpload?: (url: string) => void,
  onPassportUpload?: (url: string) => void
) {
  const [icDocumentUrl, setIcDocumentUrl] = useState<string>("");
  const [passportDocumentUrl, setPassportDocumentUrl] = useState<string>("");

  const { handleGetUploadParameters, handleUpload, isUploading } = useFileUpload();

  const handleDocumentUpload = (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>,
    documentType: 'ic' | 'passport'
  ) => {
    const successMessage = `Your ${documentType === 'ic' ? 'IC' : 'passport'} document has been uploaded successfully.`;
    
    handleUpload(result, successMessage);
    
    // Handle success callback within the upload handler
    const originalOnSuccess = (url: string) => {
      if (documentType === 'ic') {
        setIcDocumentUrl(url);
        onIcUpload?.(url);
      } else {
        setPassportDocumentUrl(url);
        onPassportUpload?.(url);
      }
    };

    // Override success handling temporarily
    const uploadOptions = { onSuccess: originalOnSuccess, showToast: true };
    handleUpload(result, successMessage);
  };

  return {
    icDocumentUrl,
    passportDocumentUrl,
    setIcDocumentUrl,
    setPassportDocumentUrl,
    handleGetUploadParameters,
    handleDocumentUpload,
    isUploading,
  };
}