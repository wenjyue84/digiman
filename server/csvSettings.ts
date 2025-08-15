import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

export interface CsvSetting {
  key: string;
  value: string;
  description: string;
  updated_by: string;
  updated_at: string;
}

export class CsvSettingsManager {
  private csvFilePath: string;
  private settings: Map<string, CsvSetting> = new Map();

  constructor() {
    // Use different paths for development vs production (Replit)
    this.csvFilePath = process.env.REPLIT_SLUG 
      ? '/home/runner/workspace/settings.csv'  // Replit path
      : path.join(process.cwd(), 'settings.csv'); // Local development
    
    this.loadSettings();
  }

  private loadSettings(): void {
    try {
      if (!fs.existsSync(this.csvFilePath)) {
        // Create default settings file if it doesn't exist
        this.createDefaultSettings();
      }

      const csvData = fs.readFileSync(this.csvFilePath, 'utf-8');
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }) as CsvSetting[];

      // Load into memory map for fast access
      this.settings.clear();
      records.forEach(record => {
        this.settings.set(record.key, record);
      });

      console.log(`✅ Loaded ${this.settings.size} settings from CSV: ${this.csvFilePath}`);
    } catch (error) {
      console.error('❌ Error loading settings from CSV:', error);
      this.createDefaultSettings();
    }
  }

  private createDefaultSettings(): void {
    console.log('📝 Creating default settings CSV file...');
    const defaultSettings: CsvSetting[] = [
      { key: 'accommodationType', value: 'capsule', description: 'Type of accommodation (capsule/room/house)', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideIntro', value: 'Welcome to Pelangi Capsule Hostel! Enjoy private sleeping pods with fresh linens, personal light, and power socket. Shared bathrooms are cleaned multiple times daily. Quiet hours are from 10:00 PM to 7:00 AM. Reception is available from 8:00 AM–10:00 PM; night staff is on call.', description: 'Guest guide introduction', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideAddress', value: '26A, Jalan Perang, Taman Pelangi, 80400 Johor Bahru, Johor, Malaysia\\nPhone: +60 12-345 6789\\nEmail: info@pelangicapsule.com', description: 'Hostel address and contact info', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideWifiName', value: 'Pelangi_Guest', description: 'WiFi network name', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideWifiPassword', value: 'Pelangi2024!', description: 'WiFi password', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideCheckin', value: 'Check-In Time: 2:00 PM\\nCheck-Out Time: 12:00 PM\\n\\nHow to check in:\\n1) Present a valid ID/passport at the front desk.\\n2) If you have a self-check-in token, show it to staff.\\n3) Early check-in / late check-out may be available upon request.', description: 'Check-in instructions', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideOther', value: 'House Rules:\\n- No smoking inside the building.\\n- Keep noise to a minimum, especially during quiet hours.\\n- Food is allowed in the pantry only.\\n\\nAmenities:\\n- Free high-speed Wi‑Fi throughout the hostel.\\n- Pantry with kettle, microwave, and fridge (label your items).\\n- Laundry service (self-service machines on Level 2).', description: 'House rules and amenities', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideFaq', value: 'Q: What time are check-in/check-out?\\nA: Check-in 2:00 PM, Check-out 12:00 PM.\\n\\nQ: Where can I store luggage?\\nA: Free luggage storage at reception before check-in or after check-out.\\n\\nQ: Are towels provided?\\nA: Yes, one towel per guest per stay.\\n\\nQ: Do you have parking?\\nA: Limited street parking nearby; public car park is 3 minutes walk.', description: 'Frequently asked questions', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideImportantReminders', value: '• 🚫 Do not leave your card inside the capsule and close the door\\n• 🚭 No Smoking in hostel area\\n• 🎥 CCTV monitored - Violation (e.g., smoking) may result in RM300 penalty', description: 'Important reminders for guests', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideHostelPhotosUrl', value: '', description: 'Hostel photos URL', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideGoogleMapsUrl', value: '', description: 'Google Maps URL', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideCheckinVideoUrl', value: '', description: 'Check-in video URL', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideCheckinTime', value: '3:00 PM', description: 'Check-in time', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideCheckoutTime', value: '12:00 PM', description: 'Check-out time', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideDoorPassword', value: '1270#', description: 'Door access password', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideShowIntro', value: 'true', description: 'Show intro to guests', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideShowAddress', value: 'true', description: 'Show address to guests', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideShowWifi', value: 'true', description: 'Show WiFi to guests', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideShowCheckin', value: 'true', description: 'Show check-in guidance', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideShowOther', value: 'true', description: 'Show other guidance', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideShowFaq', value: 'true', description: 'Show FAQ', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideShowCapsuleIssues', value: 'false', description: 'Show capsule issues', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideShowSelfCheckinMessage', value: 'true', description: 'Show self check-in message', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideShowHostelPhotos', value: 'true', description: 'Show hostel photos link', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideShowGoogleMaps', value: 'true', description: 'Show Google Maps link', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideShowCheckinVideo', value: 'true', description: 'Show check-in video link', updated_by: 'system', updated_at: new Date().toISOString() },
      { key: 'guideShowTimeAccess', value: 'true', description: 'Show time and access info', updated_by: 'system', updated_at: new Date().toISOString() }
    ];

    this.saveSettingsToFile(defaultSettings);
    
    // Load back into memory
    defaultSettings.forEach(setting => {
      this.settings.set(setting.key, setting);
    });
  }

  private saveSettingsToFile(settingsArray: CsvSetting[]): void {
    try {
      const csvString = stringify(settingsArray, {
        header: true,
        columns: ['key', 'value', 'description', 'updated_by', 'updated_at']
      });

      // Ensure directory exists
      const dir = path.dirname(this.csvFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.csvFilePath, csvString, 'utf-8');
      console.log(`💾 Settings saved to CSV: ${this.csvFilePath}`);
    } catch (error) {
      console.error('❌ Error saving settings to CSV:', error);
      throw error;
    }
  }

  public getSetting(key: string): CsvSetting | undefined {
    const setting = this.settings.get(key);
    if (setting && setting.value) {
      // Convert escaped newlines back to actual newlines
      return {
        ...setting,
        value: setting.value.replace(/\\n/g, '\n')
      };
    }
    return setting;
  }

  public setSetting(key: string, value: string, description?: string, updatedBy?: string): CsvSetting {
    // Escape newlines for CSV storage
    const escapedValue = value.replace(/\n/g, '\\n');
    
    const setting: CsvSetting = {
      key,
      value: escapedValue,
      description: description || this.settings.get(key)?.description || '',
      updated_by: updatedBy || 'admin',
      updated_at: new Date().toISOString()
    };

    this.settings.set(key, setting);
    this.saveAllSettings();
    
    // Return with unescaped value
    return {
      ...setting,
      value: value
    };
  }

  public getAllSettings(): CsvSetting[] {
    return Array.from(this.settings.values()).map(setting => ({
      ...setting,
      value: setting.value.replace(/\\n/g, '\n')
    }));
  }

  private saveAllSettings(): void {
    const settingsArray = Array.from(this.settings.values());
    this.saveSettingsToFile(settingsArray);
  }

  public deleteSetting(key: string): boolean {
    const deleted = this.settings.delete(key);
    if (deleted) {
      this.saveAllSettings();
    }
    return deleted;
  }

  public reloadFromFile(): void {
    this.loadSettings();
  }

  public getFilePath(): string {
    return this.csvFilePath;
  }
}

// Export singleton instance
export const csvSettings = new CsvSettingsManager();