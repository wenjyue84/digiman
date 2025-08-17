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

interface ObjectUploaderProps {
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
  directFileUpload?: boolean; // New prop to enable direct file selection
  showCameraOption?: boolean; // New prop to show camera option on mobile
}

/**
 * A file upload component that renders as a button and provides a modal interface for
 * file management.
 * 
 * Features:
 * - Renders as a customizable button that opens a file upload modal
 * - Provides a modal interface for:
 *   - File selection
 *   - File preview
 *   - Upload progress tracking
 *   - Upload status display
 * - Files are automatically uploaded once selected (no manual upload button needed)
 * 
 * The component uses Uppy under the hood to handle all file upload functionality.
 * All file management features are automatically handled by the Uppy dashboard modal.
 * 
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed to be uploaded
 *   (default: 1)
 * @param props.maxFileSize - Maximum file size in bytes (default: 10MB)
 * @param props.allowedFileTypes - Array of allowed file types (default: images only)
 * @param props.onGetUploadParameters - Function to get upload parameters (method and URL).
 *   Typically used to fetch a presigned URL from the backend server for direct-to-S3
 *   uploads.
 * @param props.onComplete - Callback function called when upload is complete. Typically
 *   used to make post-upload API calls to update server state and set object ACL
 *   policies.
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Content to be rendered inside the button
 * @param props.disabled - Whether the upload button should be disabled
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 15728640, // 15MB default
  // Accept common image MIME types and HEIC/HEIF for iPhone
  allowedFileTypes = ['image/*', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', 'image/heic', 'image/heif'],
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
  disabled = false,
  directFileUpload = false,
  showCameraOption = false,
}: ObjectUploaderProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
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
          console.log('Upload parameters:', base); // Debug logging
          return {
            ...base,
            headers: {
              'Content-Type': file?.type || 'application/octet-stream',
            },
          } as any;
        },
      })
      .on("complete", (result) => {
        console.log('Uppy complete event:', result); // Debug logging
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
        toast({
          title: 'Unexpected error',
          description: (error as any)?.message || 'Something went wrong while preparing the upload.',
          variant: 'destructive',
        });
      })
  );

  // Direct file upload handling
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
      // Get upload parameters
      const uploadParams = await onGetUploadParameters();
      
      // Upload directly to S3
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

      // Create a mock result that matches the Uppy format
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

      // Call the completion callback
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
    // Reset input so the same file can be selected again
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
              capture="environment" // Use back camera for documents
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