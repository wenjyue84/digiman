import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Save } from "lucide-react";
import PushNotificationSettings from "@/components/ui/push-notification-settings";

export default function GeneralSettingsTab({ settings, isLoading, form, onSubmit, resetToDefault, updateSettingsMutation }: any) {

  return (
    <div className="grid grid-cols-1 gap-6">
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse w-32"></div>
        </div>
      ) : (
        <div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Accommodation Term Pane */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-purple-600" />
                    Accommodation Terminology
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name={"accommodationType" as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Accommodation Term</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="max-w-xs">
                            <SelectValue placeholder="Select term" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unit">Unit</SelectItem>
                            <SelectItem value="room">Room</SelectItem>
                            <SelectItem value="house">House</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="text-sm text-gray-600">
                          This term will be used across the system (e.g., Check-in forms, Maintenance, Dashboard).
                        </div>
                        <div className="text-sm text-gray-500 mt-2 space-y-1">
                          <div className="font-medium">Affected areas:</div>
                          <ol className="list-decimal list-inside space-y-1 ml-2 text-xs">
                            <li>Dashboard page &gt; Occupancy Cards &amp; Guest Table headers</li>
                            <li>Check-in page &gt; Assignment section &amp; Smart Features</li>
                            <li>Check-out page &gt; Table headers &amp; View modes (Card/List/Table)</li>
                            <li>Maintenance page &gt; Problem Reports &amp; status tracking</li>
                            <li>Settings navigation &gt; Tab labels</li>
                          </ol>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={updateSettingsMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {updateSettingsMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetToDefault}
                      disabled={updateSettingsMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </Form>
          
          {/* Push Notifications Card - Outside Form */}
          <PushNotificationSettings />
        </div>
      )}
    </div>
  );
}
