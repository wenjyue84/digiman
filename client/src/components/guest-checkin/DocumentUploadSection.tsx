import { Upload, Camera, CheckCircle, Info, Calendar, X } from "lucide-react";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { UseFormReturn } from "react-hook-form";
import { GuestSelfCheckin } from "@shared/schema";
import { OptimizedPhotoUploader } from "@/components/OptimizedPhotoUploader";

interface DocumentUploadSectionProps {
  form: UseFormReturn<GuestSelfCheckin>;
  errors: Record<string, any>;
  t: any;
  isMalaysian: boolean;
  icDocumentUrl: string;
  passportDocumentUrl: string;
  onIcDocumentUpload: (photoUrl: string) => void;
  onPassportDocumentUpload: (photoUrl: string) => void;
}

export function DocumentUploadSection({
  form,
  errors,
  t,
  isMalaysian,
  icDocumentUrl,
  passportDocumentUrl,
  onIcDocumentUpload,
  onPassportDocumentUpload
}: DocumentUploadSectionProps) {
  return (
    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
      <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
        <Calendar className="mr-2 h-4 w-4" />
        {t.identityDocs}
      </h3>
      <Accordion type="single" collapsible className="mb-4">
        <AccordionItem value="instructions">
          <AccordionTrigger className="text-sm text-blue-800 py-2">
            📋 Instructions & Tips
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-medium text-blue-800 mb-2">📋 Document Requirements</p>
              <p className="text-gray-600">
                {isMalaysian
                  ? <span>Provide your IC number and upload your IC photo. <strong>Both IC number and IC photo are required for Malaysian guests.</strong></span>
                  : <span>Provide your passport number and upload your passport photo. <strong>Both passport number and photo are required for non-Malaysian guests.</strong></span>
                }
              </p>
            </div>
            
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-800 mb-2">📱 Mobile Check-in</p>
              <p className="text-green-700 text-sm">All guests must upload a document photo. Use your phone's camera for best results.</p>
              <p className="text-green-600 text-xs mt-1">
                <strong>🚀 Pro Tip:</strong> {isMalaysian ? "Have your IC ready to quickly type the number and take a clear photo." : "Have your passport ready to quickly type the number and take a clear photo."}
              </p>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                {t.photoTipsTitle}
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                <li>{t.photoTipLighting}</li>
                <li>{t.photoTipGlare}</li>
                <li>{t.photoTipSize}</li>
              </ul>
              <p className="text-gray-600 text-xs mt-2">
                <strong>📱 Mobile Tips:</strong> Hold your phone steady, ensure good lighting, and avoid shadows on the document.
              </p>
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
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-800">📸 {isMalaysian ? 'IC Photo Required' : 'Passport Photo Required'}</p>
            <p className="text-xs text-gray-600 mt-1">Use the buttons below to upload your document photo</p>
          </div>

          {/* IC Document Upload */}
          {isMalaysian ? (
            <div>
              <Label className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                IC Photo (Required)
              </Label>
              {icDocumentUrl ? (
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-green-50 border border-green-300 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">IC Photo Uploaded</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">Document uploaded successfully</p>
                    <p className="text-xs text-blue-600 mt-1">📍 Stored in server uploads folder</p>
                    <p className="text-xs text-gray-600 mt-1">🗂️ Server Path: /uploads/photos/[filename]</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onIcDocumentUpload("");
                      form.setValue("icDocumentUrl", "");
                    }}
                    className="w-full h-8 text-xs text-red-600"
                  >
                    <X className="mr-2 h-3 w-3" />
                    Remove Photo
                  </Button>
                  <OptimizedPhotoUploader
                    onPhotoSelected={onIcDocumentUpload}
                    buttonText="Change IC Photo"
                    className="w-full h-12 border-2 border-dashed border-gray-300"
                    uploadType="document"
                    showCameraOption={true}
                  />
                </div>
              ) : (
                <div className="mt-2">
                  <OptimizedPhotoUploader
                    onPhotoSelected={onIcDocumentUpload}
                    buttonText="📸 Upload IC Photo"
                    className="w-full h-12 border-2 border-dashed border-gray-300"
                    uploadType="document"
                    showCameraOption={true}
                  />
                </div>
              )}
            </div>
          ) : (
            /* Passport Document Upload */
            <div>
              <Label className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Passport Photo (Required)
              </Label>
              {passportDocumentUrl ? (
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-green-50 border border-green-300 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Passport Photo Uploaded</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">Document uploaded successfully</p>
                    <p className="text-xs text-blue-600 mt-1">📍 Stored in server uploads folder</p>
                    <p className="text-xs text-gray-600 mt-1">🗂️ Server Path: /uploads/photos/[filename]</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onPassportDocumentUpload("");
                      form.setValue("passportDocumentUrl", "");
                    }}
                    className="w-full h-8 text-xs text-red-600"
                  >
                    <X className="mr-2 h-3 w-3" />
                    Remove Photo
                  </Button>
                  <OptimizedPhotoUploader
                    onPhotoSelected={onPassportDocumentUpload}
                    buttonText="Change Passport Photo"
                    className="w-full h-12 border-2 border-dashed border-gray-300"
                    uploadType="document"
                    showCameraOption={true}
                  />
                </div>
              ) : (
                <div className="mt-2">
                  <OptimizedPhotoUploader
                    onPhotoSelected={onPassportDocumentUpload}
                    buttonText="📸 Upload Passport Photo"
                    className="w-full h-12 border-2 border-dashed border-gray-300"
                    uploadType="document"
                    showCameraOption={true}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
