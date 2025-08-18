import { useState, useEffect } from "react";
import { Upload, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SmartPhotoUploaderProps {
  onPhotoSelected: (photoUrl: string, photoData?: File) => void;
  buttonText: string;
  className?: string;
}

export function SmartPhotoUploader({ 
  onPhotoSelected, 
  buttonText, 
  className = "w-full" 
}: SmartPhotoUploaderProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  // No environment detection needed; always try server upload first

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
      formData.append('photo', file);
      
      const response = await fetch('/api/upload-photo', {
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
      
      toast({
        title: "Photo uploaded",
        description: "Stored on server",
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
        title: "Photo converted to Base64",
        description: "Photo stored locally for development",
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
        className="hidden"
        id="photo-upload"
        disabled={isUploading}
      />
      <label
        htmlFor="photo-upload"
        className={`${className} flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Camera className="mr-2 h-4 w-4" />
        {isUploading ? "Uploading..." : buttonText}
      </label>
    </div>
  );
}
