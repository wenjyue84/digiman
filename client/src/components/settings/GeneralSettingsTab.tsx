import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Save, Download, Upload, FileText } from "lucide-react";
import PushNotificationSettings from "@/components/ui/push-notification-settings";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function GeneralSettingsTab({ settings, isLoading, form, onSubmit, resetToDefault, updateSettingsMutation }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [isImporting, setIsImporting] = useState(false);

  const handleExportJSON = async () => {
    try {
      console.log('Starting JSON export...');
      const res = await apiRequest("GET", "/api/settings/export");
      console.log('API response status:', res.status);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('Export data received:', data);
      const jsonString = JSON.stringify(data, null, 2);
      console.log('JSON string length:', jsonString.length);
      
      const blob = new Blob([jsonString], { type: 'application/json' });
      const stamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
      const filename = `pelangi-settings-export-${stamp}.json`;
      console.log('Attempting to download file:', filename);
      
      // Alternative approach - try window.open first
      const url = URL.createObjectURL(blob);
      console.log('Blob URL created:', url);
      
      // Try direct window download first
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        console.log('Link element added to DOM');
        
        // Force click
        link.click();
        console.log('Link clicked');
        
        // Cleanup after a delay
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
          URL.revokeObjectURL(url);
          console.log('Cleanup completed');
        }, 1000);
        
      } catch (downloadError) {
        console.error('Download error:', downloadError);
        // Fallback: open in new window
        window.open(url, '_blank');
      }
      
      toast({ title: "JSON Export", description: `File: ${filename} - Check your downloads folder.` });
    } catch (e: any) {
      console.error('Export error:', e);
      toast({ title: "Export failed", description: e?.message || "Unable to export.", variant: "destructive" });
    }
  };

  const handleExportCSV = async () => {
    try {
      console.log('Starting CSV export...');
      const res = await apiRequest("GET", "/api/settings/export");
      console.log('API response status:', res.status);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('Export data received:', data);
      
      // Create CSV content for settings
      const csvRows = [
        'Setting Key,Current Value,Description',
        ...data.settings.map((setting: any) => {
          const key = setting.key || '';
          const value = (setting.value || '').toString().replace(/"/g, '""'); // Escape quotes
          const description = (setting.description || '').replace(/"/g, '""');
          return `"${key}","${value}","${description}"`;
        })
      ];
      
      // Add capsule information
      csvRows.push('');
      csvRows.push('Capsule Number,Section,Available,Cleaning Status');
      data.capsules.forEach((capsule: any) => {
        const number = capsule.number || '';
        const section = capsule.section || '';
        const available = capsule.isAvailable ? 'Yes' : 'No';
        const cleaningStatus = capsule.cleaningStatus || '';
        csvRows.push(`"${number}","${section}","${available}","${cleaningStatus}"`);
      });
      
      const csvContent = csvRows.join('\n');
      console.log('CSV content length:', csvContent.length);
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const stamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
      const filename = `pelangi-settings-export-${stamp}.csv`;
      console.log('Attempting to download file:', filename);
      
      // Alternative approach with more debugging
      const url = URL.createObjectURL(blob);
      console.log('Blob URL created:', url);
      
      // Try direct window download first
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        console.log('Link element added to DOM');
        
        // Force click
        link.click();
        console.log('Link clicked');
        
        // Cleanup after a delay
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
          URL.revokeObjectURL(url);
          console.log('Cleanup completed');
        }, 1000);
        
      } catch (downloadError) {
        console.error('Download error:', downloadError);
        // Fallback: open in new window
        window.open(url, '_blank');
      }
      
      toast({ title: "CSV Export", description: `File: ${filename} - Check your downloads folder.` });
    } catch (e: any) {
      console.error('Export error:', e);
      toast({ title: "Export failed", description: e?.message || "Unable to export.", variant: "destructive" });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n');
    const settings = [];
    let i = 0;
    
    // Skip to settings section
    if (lines[0]?.includes('Setting Key')) {
      i = 1; // Skip header
      while (i < lines.length && lines[i].trim() !== '') {
        const line = lines[i].trim();
        if (line) {
          // Simple CSV parsing - handle quoted values
          const matches = line.match(/^"([^"]*)","([^"]*)","([^"]*)"$/);
          if (matches) {
            settings.push({
              key: matches[1],
              value: matches[2],
              description: matches[3]
            });
          }
        }
        i++;
      }
    }
    
    return { settings, capsules: [] }; // For now, only handle settings from CSV
  };

  const handleImport = async () => {
    if (!file) {
      toast({ title: "No file", description: "Choose a JSON or CSV file to import.", variant: "destructive" });
      return;
    }
    try {
      setIsImporting(true);
      const text = await file.text();
      
      let data;
      if (file.name.toLowerCase().endsWith('.csv')) {
        // Handle CSV import
        const csvData = parseCSV(text);
        data = {
          version: 1,
          settings: csvData.settings,
          capsules: csvData.capsules
        };
      } else {
        // Handle JSON import
        data = JSON.parse(text);
      }
      
      const payload = { ...data, mode };
      const res = await apiRequest("POST", "/api/settings/import", payload);
      const result = await res.json();
      toast({ title: "Import completed", description: `Settings: ${result?.summary?.settingsUpserted || 0}, Capsules created: ${result?.summary?.capsulesCreated || 0}, updated: ${result?.summary?.capsulesUpdated || 0}, deleted: ${result?.summary?.capsulesDeleted || 0}` });
    } catch (e: any) {
      toast({ title: "Import failed", description: e?.message || "Invalid file format or server error.", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse w-32"></div>
        </div>
      ) : (
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
                          <SelectItem value="capsule">Capsule</SelectItem>
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
                          <li>Cleaning page &gt; Status cards &amp; notifications</li>
                          <li>Settings tabs &gt; Maintenance problems &amp; Capsules management</li>
                          <li>Guest Details modal &gt; Assignment display &amp; summary</li>
                          <li>Daily Notifications &gt; Checkout reminders</li>
                          <li>Guest Token Generator &gt; Assignment options &amp; labels</li>
                          <li>Guest Check-in Success screen &gt; Assignment confirmation</li>
                          <li>Admin Notifications &gt; Self check-in alerts</li>
                          <li>Sortable Guest Table &gt; Column headers &amp; filters</li>
                          <li>Extend Stay Dialog &gt; Assignment references</li>
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

            {/* Export Configuration Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-blue-600" />
                  Export Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Download your settings and capsule data in different formats:
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Button type="button" onClick={handleExportCSV} className="flex items-center gap-2" variant="default">
                    <FileText className="h-4 w-4" />
                    Export CSV (Excel)
                  </Button>
                  <Button type="button" onClick={handleExportJSON} className="flex items-center gap-2" variant="outline">
                    <FileText className="h-4 w-4" />
                    Export JSON (Backup)
                  </Button>
                </div>
                <div className="mt-3 text-xs text-gray-500 space-y-1">
                  <div><strong>CSV:</strong> Easy to edit in Excel - perfect for updating Guest Guide settings, WiFi details, addresses, etc.</div>
                  <div><strong>JSON:</strong> Complete backup format for importing back into the system</div>
                </div>
              </CardContent>
            </Card>

            {/* Push Notifications Card */}
            <PushNotificationSettings />

            {/* Import Configuration Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-green-600" />
                  Import Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="importFile">Choose JSON or CSV file</Label>
                    <Input id="importFile" type="file" accept="application/json,.json,.csv,text/csv" onChange={handleFileChange} />
                    <p className="text-xs text-gray-500">
                      Upload CSV files exported from this system, or JSON backup files
                    </p>
                  </div>
                  <div className="grid gap-2 max-w-xs">
                    <Label>Import Mode</Label>
                    <Select value={mode} onValueChange={(v) => setMode(v as 'merge' | 'replace')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="merge">Merge (update existing, add new)</SelectItem>
                        <SelectItem value="replace">Replace (delete missing capsules, then import)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Replace will delete capsules not present in the file. Settings are always upserted.
                    </p>
                  </div>
                  <div>
                    <Button type="button" onClick={handleImport} disabled={!file || isImporting} className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      {isImporting ? 'Importing…' : file?.name.toLowerCase().endsWith('.csv') ? 'Import CSV' : 'Import File'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      )}
    </div>
  );
}