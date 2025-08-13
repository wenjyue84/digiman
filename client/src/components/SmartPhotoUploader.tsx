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
  const [isReplitAvailable, setIsReplitAvailable] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Detect if we're on Replit
  useEffect(() => {
    const checkReplitStorage = async () => {
      try {
        // Try to call a Replit-specific endpoint
        const response = await fetch('/api/storage/check-replit');
        if (response.ok) {
          const data = await response.json();
          setIsReplitAvailable(data.available);
        } else {
          setIsReplitAvailable(false);
        }
      } catch {
        setIsReplitAvailable(false);
      }
    };
    
    checkReplitStorage();
  }, []);

  const handleFileSelect = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive",
      });
      return;
    }

    if (isReplitAvailable) {
      // Upload to Replit storage
      await uploadToReplit(file);
    } else {
      // Use Base64 for local development
      convertToBase64(file);
    }
  };

  const uploadToReplit = async (file: File) => {
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
      onPhotoSelected(data.url, file);
      
      toast({
        title: "Photo uploaded to Replit",
        description: "Photo stored permanently on server",
      });
    } catch (error) {
      console.error('Replit upload failed, falling back to Base64:', error);
      // Fallback to Base64 if Replit upload fails
      convertToBase64(file);
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
        <span className={`ml-2 text-xs px-2 py-1 rounded ${
          isReplitAvailable 
            ? "text-green-600 bg-green-100" 
            : "text-blue-600 bg-blue-100"
        }`}>
          {isReplitAvailable ? "Replit Storage" : "Local Storage"}
        </span>
      </label>
    </div>
  );
}
