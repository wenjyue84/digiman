import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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
}: ObjectUploaderProps) {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes,
      },
      autoProceed: true,
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

  return (
    <div>
      <Button 
        onClick={() => setShowModal(true)} 
        className={buttonClassName}
        disabled={disabled}
        type="button"
      >
        {children}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
      />
    </div>
  );
}