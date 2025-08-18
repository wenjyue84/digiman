import { Calendar, Camera, CheckCircle, Upload, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UseFormReturn } from "react-hook-form";
import { GuestSelfCheckin } from "@shared/schema";
import { ValidationHelpers } from "./shared/ValidationHelpers";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useDocumentUpload } from "@/hooks/guest-checkin/useDocumentUpload";

interface DocumentUploadStepProps {
  form: UseFormReturn<GuestSelfCheckin>;
  errors: Record<string, any>;
  t: any;
  isIcFieldDisabled: boolean;
  isPassportFieldDisabled: boolean;
}

export function DocumentUploadStep({ 
  form, 
  errors, 
  t, 
  isIcFieldDisabled, 
  isPassportFieldDisabled 
}: DocumentUploadStepProps) {
  const {
    icDocumentUrl,
    passportDocumentUrl,
    handleGetUploadParameters,
    handleDocumentUpload,
  } = useDocumentUpload(form);

  return (
    <div className="space-y-6">
      {/* Identity Documents */}
      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
          <Calendar className="mr-2 h-4 w-4" />
          {t.identityDocs}
        </h3>
        <div className="mb-3 p-2 bg-green-100 border border-green-300 rounded text-xs text-green-700">
          <p className="font-medium">📱 Mobile Check-in:</p>
          <p>All guests must upload a document photo. Use your phone's camera for best results.</p>
        </div>
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 font-medium mb-1">📋 Document Selection Rule</p>
            <p className="text-sm text-gray-600">Provide either IC number OR passport number (only one required). When you enter one, the other field will be automatically disabled. <strong>Document photo upload is mandatory for all guests.</strong></p>
            <div className="mt-2 p-2 bg-blue-100 border border-blue-200 rounded text-xs text-blue-700">
              <p className="font-medium">📱 Mobile Note:</p>
              <p>You can enter the document number first, then upload the photo, or upload the photo directly without entering the number.</p>
              <div className="mt-1 p-1 bg-green-50 border border-green-200 rounded text-xs text-green-600">
                <p className="font-medium">🚀 Pro Tip:</p>
                <p>For fastest check-in, just upload the photo directly - no need to type document numbers!</p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-start gap-2 text-sm text-gray-700">
              <Info className="h-4 w-4 mt-0.5 text-gray-600" />
              <div>
                <div className="font-medium mb-1">{t.photoTipsTitle}</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>{t.photoTipLighting}</li>
                  <li>{t.photoTipGlare}</li>
                  <li>{t.photoTipSize}</li>
                </ul>
                <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                  <p className="font-medium">📱 Mobile Tips:</p>
                  <p>Hold your phone steady, ensure good lighting, and avoid shadows on the document.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="icNumber" className="text-sm font-medium text-hostel-text">
                IC Number (e.g., 881014015523) <span className="text-gray-500 text-xs">(Optional if photo uploaded)</span>
                {isIcFieldDisabled && <span className="text-gray-500 text-xs ml-2">(Disabled - passport entered)</span>}
              </Label>
              <Input
                id="icNumber"
                type="text"
                placeholder={isIcFieldDisabled ? "Disabled - clear passport to enable" : "881014015523"}
                className={`w-full mt-1 ${isIcFieldDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                disabled={isIcFieldDisabled}
                inputMode="numeric"
                autoComplete="off"
                {...form.register("icNumber")}
              />
              <ValidationHelpers 
                errors={errors} 
                fieldName="icNumber" 
                hint={t.icHint} 
              />
            </div>
            
            <div>
              <Label htmlFor="passportNumber" className="text-sm font-medium text-hostel-text">
                {t.passportNumberLabel} <span className="text-gray-500 text-xs">(Optional if photo uploaded)</span>
                {isPassportFieldDisabled && <span className="text-gray-500 text-xs ml-2">(Disabled - IC entered)</span>}
              </Label>
              <Input
                id="passportNumber"
                type="text"
                placeholder={isPassportFieldDisabled ? "Disabled - clear IC to enable" : t.passportNumberPlaceholder}
                className={`w-full mt-1 ${isPassportFieldDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                disabled={isPassportFieldDisabled}
                autoComplete="off"
                {...form.register("passportNumber")}
              />
              <ValidationHelpers 
                errors={errors} 
                fieldName="passportNumber" 
                hint={t.passportHint} 
              />
            </div>
          </div>

          {/* Document Upload Section - Required for All Users */}
          <div>
            <Label className="text-sm font-medium text-hostel-text flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload IC/Passport Photo <span className="text-red-500">*</span>
            </Label>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
              <p className="text-sm text-amber-800 font-medium mb-1">📸 Photo Requirement</p>
              <p className="text-sm text-gray-700">All guests must upload a clear photo of their IC or passport. This is mandatory for check-in.</p>
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                <p className="font-medium mb-1">📱 Mobile Users:</p>
                <p>Use your phone's camera to take a clear photo. Ensure good lighting and avoid glare on the document.</p>
              </div>
            </div>
            
            {(icDocumentUrl || passportDocumentUrl) ? (
              <div className="mt-2 p-3 bg-green-100 border border-green-300 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-2xl">✅</span>
                  </div>
                  <span className="text-sm text-green-700">
                    {icDocumentUrl && "IC document uploaded successfully"}
                    {passportDocumentUrl && "Passport document uploaded successfully"}
                  </span>
                </div>
                <div className="mt-2 text-xs text-green-600">
                  {icDocumentUrl && "✅ IC photo uploaded"}
                  {passportDocumentUrl && "✅ Passport photo uploaded"}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  <span className="hidden sm:inline">Use the buttons below to change your uploaded document photo if needed.</span>
                  <span className="sm:hidden">Tap below to change photo if needed.</span>
                </p>
                <div className="mt-2 flex flex-col sm:flex-row gap-2">
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10485760} // 10MB
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={(result) => handleDocumentUpload(result, 'ic')}
                    buttonClassName="flex-1 h-12 text-sm"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Change IC Photo</span>
                    <span className="sm:hidden">Change IC</span>
                  </ObjectUploader>
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10485760} // 10MB
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={(result) => handleDocumentUpload(result, 'passport')}
                    buttonClassName="flex-1 h-12 text-sm"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Change Passport Photo</span>
                    <span className="sm:hidden">Change Passport</span>
                  </ObjectUploader>
                </div>
              </div>
            ) : (
              <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center flex flex-col items-center justify-center min-h-[50vh] sm:min-h-[40vh]">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Camera className="h-8 w-8 text-gray-400" />
                  <span className="text-2xl">📸</span>
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  Upload a clear photo of your IC or passport
                </p>
                <p className="text-xs text-gray-500 mb-3">{t.photoHint}</p>
                <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                  <p className="font-medium mb-1">💡 Tip:</p>
                  <p><span className="hidden sm:inline">Tap either button below to select your document photo. It will upload automatically once selected.</span>
                  <span className="sm:hidden">Tap either button to select photo. It uploads automatically.</span></p>
                  <div className="mt-1 p-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-600">
                    <p className="font-medium">📱 Quick Upload:</p>
                    <p>Photos upload automatically once selected. No need to click upload button.</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center items-center w-full">
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10485760} // 10MB
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={(result) => handleDocumentUpload(result, 'ic')}
                    buttonClassName="flex-1 h-12 text-sm"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Select IC Photo</span>
                    <span className="sm:hidden">IC Photo</span>
                  </ObjectUploader>
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10485760} // 10MB
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={(result) => handleDocumentUpload(result, 'passport')}
                    buttonClassName="flex-1 h-12 text-sm"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Select Passport Photo</span>
                    <span className="sm:hidden">Passport Photo</span>
                  </ObjectUploader>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  <span className="hidden sm:inline">You can upload either IC or passport photo. Both are not required.</span>
                  <span className="sm:hidden">Choose one document type to upload. Both not needed.</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
