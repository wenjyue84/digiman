import { Upload, Camera, CheckCircle, Info, Calendar } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { UseFormReturn } from "react-hook-form";
import { GuestSelfCheckin } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

interface DocumentUploadSectionProps {
  form: UseFormReturn<GuestSelfCheckin>;
  errors: Record<string, any>;
  t: any;
  isMalaysian: boolean;
  icDocumentUrl: string;
  passportDocumentUrl: string;
  handleGetUploadParameters: () => Promise<{ method: 'PUT'; url: string }>;
  handleDocumentUpload: (result: UploadResult<Record<string, unknown>, Record<string, unknown>>, documentType: 'ic' | 'passport') => void;
}

export function DocumentUploadSection({
  form,
  errors,
  t,
  isMalaysian,
  icDocumentUrl,
  passportDocumentUrl,
  handleGetUploadParameters,
  handleDocumentUpload
}: DocumentUploadSectionProps) {
  return (
    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
      <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
        <Calendar className="mr-2 h-4 w-4" />
        {t.identityDocs}
      </h3>
      <Accordion type="multiple" className="mb-4 space-y-2">
        <AccordionItem value="mobile-checkin">
          <AccordionTrigger className="text-xs text-green-700">
            📱 Mobile Check-in
          </AccordionTrigger>
          <AccordionContent className="text-xs text-green-700">
            All guests must upload a document photo. Use your phone's camera for best results.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="doc-rule">
          <AccordionTrigger className="text-sm text-blue-800">
            📋 Document Selection Rule
          </AccordionTrigger>
          <AccordionContent className="text-sm text-gray-600">
            {isMalaysian
              ? <span>Provide your IC number and upload your IC photo. <strong>Both IC number and IC photo are required for Malaysian guests.</strong></span>
              : <span>Provide your passport number and upload your passport photo. <strong>Both passport number and photo are required for non-Malaysian guests.</strong></span>
            }
            <div className="mt-2 text-xs text-blue-700">
              <strong>📱 Mobile Note:</strong> {isMalaysian ? "Enter your IC number and upload your IC photo." : "Enter your passport number and upload your passport photo."}
              <div className="mt-1 text-green-600">
                <strong>🚀 Pro Tip:</strong> {isMalaysian ? "Have your IC ready to quickly type the number and take a clear photo." : "Have your passport ready to quickly type the number and take a clear photo."}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="photo-tips">
          <AccordionTrigger className="text-sm text-gray-700 flex items-center gap-2">
            <Info className="h-4 w-4 text-gray-600" />
            {t.photoTipsTitle}
          </AccordionTrigger>
          <AccordionContent className="text-sm text-gray-600">
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>{t.photoTipLighting}</li>
              <li>{t.photoTipGlare}</li>
              <li>{t.photoTipSize}</li>
            </ul>
            <div className="mt-2 text-xs">
              <strong>📱 Mobile Tips:</strong> Hold your phone steady, ensure good lighting, and avoid shadows on the document.
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isMalaysian && (
          <div>
            <Label htmlFor="icNumber" className="text-sm font-medium text-hostel-text">
              IC Number (12 digits, e.g., 881014015523) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="icNumber"
              type="text"
              placeholder={"881014015523"}
              className={`w-full mt-1`}
              inputMode="numeric"
              autoComplete="off"
              {...form.register("icNumber")}
            />
            <p className="text-xs text-gray-500 mt-1">{t.icHint}</p>
            {form.formState.errors.icNumber && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.icNumber.message}</p>
            )}
          </div>
          )}
          {!isMalaysian && (
            <div>
              <Label htmlFor="passportNumber" className="text-sm font-medium text-hostel-text">
                {t.passportNumberLabel} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="passportNumber"
                type="text"
                placeholder={t.passportNumberPlaceholder}
                className={`w-full mt-1`}
                autoComplete="off"
                {...form.register("passportNumber")}
              />
              <p className="text-xs text-gray-500 mt-1">{t.passportHint}</p>
              {form.formState.errors.passportNumber && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.passportNumber.message}</p>
              )}
            </div>
          )}
        </div>

        {/* Document Upload Section - Required for All Users */}
        <div>
          <Label className="text-sm font-medium text-hostel-text flex items-center gap-2">
            <Upload className="h-4 w-4" />
            {isMalaysian ? 'Upload IC Photo' : 'Upload Passport Photo'} <span className="text-red-500">*</span>
          </Label>
          <Accordion type="single" collapsible className="mb-3">
            <AccordionItem value="photo-req">
              <AccordionTrigger className="text-sm text-amber-800">📸 Photo Requirement</AccordionTrigger>
              <AccordionContent className="text-sm text-gray-700">
                {isMalaysian ? 'Malaysian guests must upload a clear photo of their IC.' : 'Non-Malaysian guests must upload a clear photo of their passport.'}
                <div className="mt-2 text-xs text-blue-700">
                  <strong>📱 Mobile Users:</strong> Use your phone's camera to take a clear photo. Ensure good lighting and avoid glare on the document.
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {(isMalaysian ? !!icDocumentUrl : !!passportDocumentUrl) ? (
            <div className="mt-2 p-3 bg-green-100 border border-green-300 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-2xl">✅</span>
                </div>
                <span className="text-sm text-green-700">
                  {isMalaysian ? "IC document uploaded successfully" : "Passport document uploaded successfully"}
                </span>
              </div>
              <div className="mt-2 text-xs text-green-600">
                {isMalaysian ? "✅ IC photo uploaded" : "✅ Passport photo uploaded"}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                <span className="hidden sm:inline">Use the buttons below to change your uploaded document photo if needed.</span>
                <span className="sm:hidden">Tap below to change photo if needed.</span>
              </p>
              <div className="mt-2 flex flex-col sm:flex-row gap-2">
                {isMalaysian ? (
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10485760} // 10MB
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={(result) => handleDocumentUpload(result, 'ic')}
                    buttonClassName="flex-1 h-12 text-sm"
                    directFileUpload={true}
                    showCameraOption={true}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Change IC Photo</span>
                    <span className="sm:hidden">Change IC</span>
                  </ObjectUploader>
                ) : (
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10485760} // 10MB
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={(result) => handleDocumentUpload(result, 'passport')}
                    buttonClassName="flex-1 h-12 text-sm"
                    directFileUpload={true}
                    showCameraOption={true}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Change Passport Photo</span>
                    <span className="sm:hidden">Change Passport</span>
                  </ObjectUploader>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center flex flex-col items-center justify-center min-h-[50vh] sm:min-h-[40vh]">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Camera className="h-8 w-8 text-gray-400" />
                <span className="text-2xl">📸</span>
              </div>
              <p className="text-sm text-gray-500 mb-2">
                {isMalaysian ? 'Upload a clear photo of your IC' : 'Upload a clear photo of your passport'}
              </p>
              <p className="text-xs text-gray-500 mb-3">{t.photoHint}</p>
              <Accordion type="single" collapsible className="mb-3 text-xs">
                <AccordionItem value="upload-tip">
                  <AccordionTrigger>💡 Tip</AccordionTrigger>
                  <AccordionContent className="text-gray-600">
                    <p>
                      <span className="hidden sm:inline">{isMalaysian ? 'Tap the button below to select your IC photo. It will upload automatically once selected.' : 'Tap the button below to select your passport photo. It will upload automatically once selected.'}</span>
                      <span className="sm:hidden">{isMalaysian ? 'Tap the button to select IC photo. It uploads automatically.' : 'Tap the button to select passport photo. It uploads automatically.'}</span>
                    </p>
                    <div className="mt-1 text-blue-600">
                      <strong>📱 Quick Upload:</strong> Photos upload automatically once selected. No need to click upload button.
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <div className="flex flex-col sm:flex-row gap-2 justify-center items-center w-full">
                {isMalaysian ? (
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10485760} // 10MB
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={(result) => handleDocumentUpload(result, 'ic')}
                    buttonClassName="flex-1 h-12 text-sm"
                    directFileUpload={true}
                    showCameraOption={true}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Select IC Photo</span>
                    <span className="sm:hidden">IC Photo</span>
                  </ObjectUploader>
                ) : (
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10485760} // 10MB
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={(result) => handleDocumentUpload(result, 'passport')}
                    buttonClassName="flex-1 h-12 text-sm"
                    directFileUpload={true}
                    showCameraOption={true}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Select Passport Photo</span>
                    <span className="sm:hidden">Passport Photo</span>
                  </ObjectUploader>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                <span className="hidden sm:inline">{isMalaysian ? 'Upload IC photo.' : 'Upload passport photo.'}</span>
                <span className="sm:hidden">{isMalaysian ? 'Upload IC photo.' : 'Upload passport photo.'}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}