import { useState, useRef } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { OptimizedPhotoUploader } from "@/components/OptimizedPhotoUploader";

interface EnhancedObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
  disabled?: boolean;
  directFileUpload?: boolean;
  showCameraOption?: boolean;
  useOptimization?: boolean; // New prop to enable image optimization
  uploadType?: 'document' | 'expense';
}

/**
 * Enhanced ObjectUploader with optional image optimization support
 * 
 * When useOptimization=true, it will use the OptimizedPhotoUploader for better
 * compression and faster uploads. Falls back to standard ObjectUploader behavior
 * when optimization is disabled or fails.
 */
export function EnhancedObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 15728640, // 15MB default
  allowedFileTypes = ['image/*', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', 'image/heic', 'image/heif'],
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
  disabled = false,
  directFileUpload = false,
  showCameraOption = false,
  useOptimization = true, // Enable optimization by default
  uploadType = 'document',
}: EnhancedObjectUploaderProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [isUsingOptimization, setIsUsingOptimization] = useState(useOptimization);

  // Enhanced photo upload handler that integrates with ObjectUploader's onComplete
  const handleOptimizedPhotoSelected = async (photoUrl: string, photoData?: File) => {
    console.log('=== EnhancedObjectUploader Debug ===');
    console.log('Received photoUrl:', photoUrl);
    console.log('Received photoData:', photoData?.name, photoData?.size);
    
    // Extract filename from photoUrl for object ID compatibility
    let objectId: string;
    try {
      if (photoUrl.includes('/uploads/')) {
        // Extract filename from URL like "http://localhost:5000/uploads/filename.jpg"
        objectId = photoUrl.split('/uploads/')[1];
        console.log('Extracted objectId from uploads path:', objectId);
      } else {
        // Fallback - use timestamp
        objectId = `optimized-${Date.now()}`;
        console.log('Using fallback objectId:', objectId);
      }
    } catch (error) {
      objectId = `optimized-${Date.now()}`;
      console.log('Error extracting objectId, using fallback:', objectId);
    }

    // Create upload URL that matches expected pattern for handleDocumentUpload
    const uploadURL = `/api/objects/dev-upload/${objectId}`;
    console.log('Created uploadURL:', uploadURL);

    if (!photoData) {
      // Base64 fallback - create mock result
      const mockResult: UploadResult<Record<string, unknown>, Record<string, unknown>> = {
        successful: [{
          id: 'base64-upload',
          name: 'optimized-photo',
          size: 0,
          type: 'image/jpeg',
          extension: 'jpg',
          uploadURL: uploadURL,
          data: photoData,
          meta: { 
            name: 'optimized-photo',
            actualPhotoUrl: photoUrl // Store actual URL for reference
          },
          source: 'optimized',
          isRemote: false,
          isGhost: false,
          progress: { uploadComplete: true, uploadStarted: Date.now(), percentage: 100, bytesUploaded: 0, bytesTotal: 0 },
          remote: { body: {}, companionUrl: '', requestClientId: '', url: photoUrl },
          preview: undefined
        }],
        failed: []
      };
      
      onComplete?.(mockResult);
      return;
    }

    // Server upload success - create proper result object with correct uploadURL format
    const mockResult: UploadResult<Record<string, unknown>, Record<string, unknown>> = {
      successful: [{
        id: photoData.name,
        name: photoData.name,
        size: photoData.size,
        type: photoData.type,
        extension: photoData.name.split('.').pop() || '',
        uploadURL: uploadURL, // Use formatted URL that handleDocumentUpload expects
        data: photoData,
        meta: { 
          name: photoData.name,
          actualPhotoUrl: photoUrl // Store actual URL for reference
        },
        source: 'optimized',
        isRemote: false,
        isGhost: false,
        progress: { uploadComplete: true, uploadStarted: Date.now(), percentage: 100, bytesUploaded: photoData.size, bytesTotal: photoData.size },
        remote: { body: {}, companionUrl: '', requestClientId: '', url: photoUrl },
        preview: undefined
      }],
      failed: []
    };

    onComplete?.(mockResult);
  };

  // Standard Uppy configuration for fallback
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes,
      },
      autoProceed: true,
      locale: {
        strings: {
          dropPasteFiles: '📁 Drop files here or %{browseFiles}',
        },
        pluralize: (count: number) => count === 1 ? 0 : 1,
      },
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async (file: any) => {
          const base = await onGetUploadParameters();
          return {
            ...base,
            headers: {
              'Content-Type': file?.type || 'application/octet-stream',
            },
          } as any;
        },
      })
      .on("complete", (result) => {
        onComplete?.(result);
        setShowModal(false);
      })
      .on('restriction-failed', (_file, error) => {
        toast({
          title: 'File not allowed',
          description: error?.message || 'Please choose a supported image under 15MB (HEIC/HEIF/JPG/PNG).',
          variant: 'destructive',
        });
      })
      .on('upload-error', (_file, error, _resp) => {
        toast({
          title: 'Upload failed',
          description: (error as any)?.message || 'Please check your internet and try again.',
          variant: 'destructive',
        });
      })
      .on('error', (error) => {
        // If there's an error with optimization, fall back to standard upload
        console.warn('Uppy error, falling back to standard upload:', error);
        setIsUsingOptimization(false);
      })
  );

  // Direct file upload handling (fallback)
  const handleDirectFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    const isValidType = allowedFileTypes.some(type => {
      if (type === 'image/*') return file.type.startsWith('image/');
      if (type.startsWith('.')) return file.name.toLowerCase().endsWith(type.toLowerCase());
      return file.type === type;
    });

    if (!isValidType) {
      toast({
        title: 'File not allowed',
        description: 'Please choose a supported image file (HEIC/HEIF/JPG/PNG).',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      toast({
        title: 'File too large',
        description: `Please choose a file under ${Math.round(maxFileSize / (1024 * 1024))}MB.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const uploadParams = await onGetUploadParameters();
      
      const uploadResponse = await fetch(uploadParams.url, {
        method: uploadParams.method,
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const mockResult: UploadResult<Record<string, unknown>, Record<string, unknown>> = {
        successful: [{
          id: file.name,
          name: file.name,
          size: file.size,
          type: file.type,
          extension: file.name.split('.').pop() || '',
          uploadURL: uploadParams.url,
          data: file,
          meta: { name: file.name },
          source: 'direct',
          isRemote: false,
          isGhost: false,
          progress: { uploadComplete: true, uploadStarted: Date.now(), percentage: 100, bytesUploaded: file.size, bytesTotal: file.size },
          remote: { body: {}, companionUrl: '', requestClientId: '', url: uploadParams.url },
          preview: undefined
        }],
        failed: []
      };

      onComplete?.(mockResult);
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Please check your internet connection and try again.',
        variant: 'destructive',
      });
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleDirectFileUpload(event.target.files);
    event.target.value = '';
  };

  const triggerFileSelect = () => {
    if (directFileUpload) {
      fileInputRef.current?.click();
    } else {
      setShowModal(true);
    }
  };

  const triggerCameraCapture = () => {
    if (directFileUpload && showCameraOption && isMobile) {
      cameraInputRef.current?.click();
    }
  };

  // Use optimized uploader if enabled and available
  if (isUsingOptimization && directFileUpload) {
    return (
      <OptimizedPhotoUploader
        onPhotoSelected={handleOptimizedPhotoSelected}
        buttonText={typeof children === 'string' ? children : 'Upload Document'}
        className={buttonClassName}
        uploadType={uploadType}
        disabled={disabled}
        showCameraOption={showCameraOption}
      />
    );
  }

  // Fall back to original ObjectUploader behavior
  return (
    <div>
      {/* Hidden file inputs for direct upload */}
      {directFileUpload && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept={allowedFileTypes.join(',')}
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
            multiple={maxNumberOfFiles > 1}
          />
          {showCameraOption && isMobile && (
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
          )}
        </>
      )}

      {/* Main upload button */}
      {directFileUpload ? (
        showCameraOption && isMobile ? (
          <div className="flex gap-2">
            <Button 
              onClick={triggerFileSelect} 
              className={buttonClassName}
              disabled={disabled}
              type="button"
            >
              {children}
            </Button>
            <Button 
              onClick={triggerCameraCapture}
              className={buttonClassName}
              disabled={disabled}
              type="button"
              variant="outline"
            >
              📷 Camera
            </Button>
          </div>
        ) : (
          <Button 
            onClick={triggerFileSelect} 
            className={buttonClassName}
            disabled={disabled}
            type="button"
          >
            {children}
          </Button>
        )
      ) : (
        <Button 
          onClick={() => setShowModal(true)} 
          className={buttonClassName}
          disabled={disabled}
          type="button"
        >
          {children}
        </Button>
      )}

      {/* Modal for non-direct uploads */}
      {!directFileUpload && (
        <DashboardModal
          uppy={uppy}
          open={showModal}
          onRequestClose={() => setShowModal(false)}
          proudlyDisplayPoweredByUppy={false}
          note="📷 Upload a clear photo of your document"
        />
      )}
    </div>
  );
}