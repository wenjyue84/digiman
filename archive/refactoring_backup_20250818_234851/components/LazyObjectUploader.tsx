import React, { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";

// Dynamic import with error boundary
const ObjectUploader = React.lazy(() => 
  import("@/components/ObjectUploader").then(module => ({ 
    default: module.ObjectUploader 
  })).catch(() => 
    // Fallback component if ObjectUploader fails to load
    Promise.resolve({ 
      default: () => (
        <div className="p-4 border border-gray-200 rounded-lg bg-red-50">
          <p className="text-red-600 text-center">
            Upload feature temporarily unavailable. Please try refreshing the page.
          </p>
        </div>
      )
    })
  )
);

interface LazyObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: any
  ) => void;
  buttonClassName?: string;
  children: React.ReactNode;
  disabled?: boolean;
  directFileUpload?: boolean;
  showCameraOption?: boolean;
}

export default function LazyObjectUploader(props: LazyObjectUploaderProps) {
  return (
    <Suspense fallback={
      <div className="space-y-4 p-6 border border-gray-200 rounded-lg bg-gray-50">
        <div className="flex items-center justify-center space-x-2">
          <Clock className="h-5 w-5 text-gray-500 animate-pulse" />
          <span className="text-gray-600 text-sm">Loading file upload feature...</span>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    }>
      <ObjectUploader {...props} />
    </Suspense>
  );
}
