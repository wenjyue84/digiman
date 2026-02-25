import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MessageSquare, Save, RotateCcw, Edit } from "lucide-react";

import { apiRequest } from "@/lib/queryClient";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

// Schema for self check-in message settings
const selfCheckinMessageSchema = z.object({
  successMessage: z.string().min(10, "Message must be at least 10 characters").max(500, "Message must not exceed 500 characters"),
});

type SelfCheckinMessageData = z.infer<typeof selfCheckinMessageSchema>;

export default function MessagesTab({ settings, queryClient, toast }: any) {
  const business = useBusinessConfig();
  const defaultMessage = `Thank you for checking in! Your unit is ready. Please keep your belongings secure and enjoy your stay at ${business.name}.`;
  const [isEditing, setIsEditing] = useState(false);

  const messageForm = useForm<SelfCheckinMessageData>({
    resolver: zodResolver(selfCheckinMessageSchema),
    defaultValues: {
      successMessage: settings?.selfCheckinSuccessMessage || defaultMessage,
    },
  });

  // Update form when settings are loaded
  if (settings && messageForm.getValues().successMessage !== (settings.selfCheckinSuccessMessage || defaultMessage)) {
    messageForm.reset({
      successMessage: settings.selfCheckinSuccessMessage || defaultMessage,
    });
  }

  const updateMessageMutation = useMutation({
    mutationFn: async (data: SelfCheckinMessageData) => {
      await apiRequest("PATCH", "/api/settings", {
        selfCheckinSuccessMessage: data.successMessage,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      setIsEditing(false);
      toast({
        title: "Message Updated",
        description: "The self check-in success message has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update message",
        variant: "destructive",
      });
    },
  });

  const resetToDefault = () => {
    messageForm.setValue("successMessage", defaultMessage);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            Self Check-In Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3">Success Message</h4>
            <p className="text-sm text-gray-600 mb-4">
              This message is displayed to guests after they successfully complete the self check-in process.
            </p>

            {!isEditing ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h5 className="font-medium text-green-800 mb-2">Current Message:</h5>
                  <p className="text-green-700">
                    {settings?.selfCheckinSuccessMessage ||
                      defaultMessage}
                  </p>
                </div>
                <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Message
                </Button>
              </div>
            ) : (
              <Form {...messageForm}>
                <form
                  onSubmit={messageForm.handleSubmit((data) => updateMessageMutation.mutate(data))}
                  className="space-y-4"
                >
                  <FormField
                    control={messageForm.control}
                    name="successMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Success Message</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            className="min-h-32"
                            placeholder="Enter the message guests will see after successful check-in..."
                          />
                        </FormControl>
                        <div className="text-sm text-gray-600">
                          <p>Character count: {field.value?.length || 0}/500</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Keep it friendly and informative. Include any important information about their stay.
                          </p>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center gap-3 pt-4 border-t">
                    <Button type="submit" disabled={updateMessageMutation.isPending} className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      {updateMessageMutation.isPending ? "Saving..." : "Save Message"}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetToDefault} className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Reset to Default
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>

          {/* Preview Section */}
          <div className="border-t pt-6">
            <h4 className="font-semibold mb-3">Preview</h4>
            <p className="text-sm text-gray-600 mb-4">
              This is how the message will appear to guests:
            </p>
            <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-green-800 mb-3">Check-In Successful!</h3>
                <p className="text-green-700 max-w-md mx-auto">
                  {isEditing
                    ? messageForm.watch("successMessage")
                    : (settings?.selfCheckinSuccessMessage ||
                        defaultMessage)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
