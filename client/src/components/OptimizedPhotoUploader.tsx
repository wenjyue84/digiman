import { useState, useRef } from "react";
import { Upload, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export type PhotoUploadType = 'expense' | 'document';

interface OptimizedPhotoUploaderProps {
  onPhotoSelected: (photoUrl: string, photoData?: File) => void;
  buttonText: string;
  className?: string;
  uploadType?: PhotoUploadType;
  disabled?: boolean;
  showCameraOption?: boolean;
}

export function OptimizedPhotoUploader({ 
  onPhotoSelected, 
  buttonText, 
  className = "w-full",
  uploadType = 'expense',
  disabled = false,
  showCameraOption = false
}: OptimizedPhotoUploaderProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Determine endpoint based on upload type
  const getUploadEndpoint = () => {
    switch (uploadType) {
      case 'document':
        return '/api/upload-document';
      case 'expense':
      default:
        return '/api/upload-photo';
    }
  };

  // Get field name for FormData based on upload type
  const getFieldName = () => {
    switch (uploadType) {
      case 'document':
        return 'document';
      case 'expense':
      default:
        return 'photo';
    }
  };

  const handleFileSelect = async (file: File) => {
    // 5MB client-side limit with clear guidance
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5 MB. Tip: choose 'Small' when exporting/sharing from your phone.",
        variant: "destructive",
      });
      return;
    }

    // Always try to upload to server first; fallback to Base64
    const ok = await uploadToServer(file);
    if (!ok) convertToBase64(file);
  };

  const uploadToServer = async (file: File): Promise<boolean> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append(getFieldName(), file);
      
      const response = await fetch(getUploadEndpoint(), {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      const chosenUrl: string | undefined = (typeof data?.url === 'string' && data.url) || (typeof data?.absoluteUrl === 'string' && data.absoluteUrl);
      if (!chosenUrl) {
        throw new Error('Invalid upload response');
      }
      onPhotoSelected(chosenUrl, file);
      
      // Show compression info if available - enhanced for different upload types
      const compressionMessage = data?.compression?.message || `${uploadType === 'document' ? 'Document' : 'Photo'} uploaded successfully`;
      
      // Create enhanced success message showing upload location and full path
      const uploadLocation = chosenUrl.includes('/uploads/') ? 'Server Storage' : 'Cloud Storage';
      const fileName = file.name;
      const fileSize = (file.size / 1024 / 1024).toFixed(2); // Convert to MB
      
      // Extract the actual file path from the URL
      let fullFilePath = '';
      if (chosenUrl.includes('/uploads/')) {
        // Extract path like: /uploads/photos/1755192641713-nu6n8seecrr.jpg
        const urlPath = new URL(chosenUrl, window.location.origin).pathname;
        fullFilePath = `Server Path: ${urlPath}`;
      } else {
        fullFilePath = 'Cloud Storage URL';
      }
      
      const enhancedDescription = `${compressionMessage}\n📁 File: ${fileName}\n💾 Size: ${fileSize} MB\n📍 Location: ${uploadLocation}\n🗂️ ${fullFilePath}`;
      
      toast({
        title: `${uploadType === 'document' ? 'Document' : 'Photo'} uploaded & optimized`,
        description: enhancedDescription,
      });
      return true;
    } catch (error) {
      console.error('Server upload failed, falling back to Base64:', error);
      // Return false so caller can fallback to Base64
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const convertToBase64 = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onPhotoSelected(base64, file);
      
      toast({
        title: `${uploadType === 'document' ? 'Document' : 'Photo'} converted to Base64`,
        description: `${uploadType === 'document' ? 'Document' : 'Photo'} stored locally for development\n📁 File: ${file.name}\n💾 Size: ${(file.size / 1024 / 1024).toFixed(2)} MB\n📍 Location: Local Browser Storage\n🗂️ Path: Browser Memory (Base64 encoded)`,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset input so the same file can be selected again
    event.target.value = '';
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const triggerCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isUploading || disabled}
      />
      
      {showCameraOption && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment" // Use back camera for documents
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading || disabled}
        />
      )}

      {/* Main upload interface */}
      {showCameraOption ? (
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={triggerFileSelect}
            disabled={isUploading || disabled}
            className={`${className} flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? "Optimizing..." : buttonText}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={triggerCameraCapture}
            disabled={isUploading || disabled}
            className="px-4 py-2 flex items-center"
          >
            <Camera className="mr-2 h-4 w-4" />
            Camera
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          onClick={triggerFileSelect}
          disabled={isUploading || disabled}
          className={`${className} flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Camera className="mr-2 h-4 w-4" />
          {isUploading ? "Optimizing..." : buttonText}
        </Button>
      )}
    </div>
  );
}