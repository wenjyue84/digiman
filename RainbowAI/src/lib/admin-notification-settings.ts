import { db, dbReady } from './db.js';
import { appSettings } from '../../../shared/schema.js';
import { sql } from 'drizzle-orm';

/**
 * Admin Notification Settings
 *
 * Manages system administrator contact information for critical alerts:
 * - WhatsApp instance disconnections
 * - WhatsApp instance unlink events
 * - MCP server restart notifications
 */

export interface OperatorContact {
  phone: string;
  label: string;
  fallbackMinutes: number;
}

export interface AdminNotificationConfig {
  enabled: boolean;
  systemAdminPhone: string; // For system messages (reconnects, MCP status)
  notifyOnDisconnect: boolean;
  notifyOnUnlink: boolean;
  notifyOnReconnect: boolean;
  operators: OperatorContact[]; // For operational messages (workflow completions)
  defaultFallbackMinutes: number; // Default interval between escalations
}

const DEFAULT_ADMIN_PHONE = '60127088789'; // System default
const DEFAULT_OPERATORS = [
  { phone: '60167620815', label: 'Operator 1 (Primary)', fallbackMinutes: 5 },
  { phone: '60127088789', label: 'Operator 2 (Fallback)', fallbackMinutes: 10 },
];

// Initialize default admin notification settings
export async function initAdminNotificationSettings(): Promise<void> {
  const isConnected = await dbReady;
  if (!isConnected) {
    console.log('[Admin Notifications] ⚠️ Database not available, skipping initialization');
    return;
  }

  const defaults = {
    'rainbow_admin_notifications_enabled': 'true',
    'rainbow_system_admin_phone': DEFAULT_ADMIN_PHONE,
    'rainbow_admin_notify_disconnect': 'true',
    'rainbow_admin_notify_unlink': 'true',
    'rainbow_admin_notify_reconnect': 'true',
    'rainbow_operators': JSON.stringify(DEFAULT_OPERATORS),
    'rainbow_default_fallback_minutes': '5',
  };

  try {
    for (const [key, value] of Object.entries(defaults)) {
      await db.insert(appSettings)
        .values({
          key,
          value,
          description: `Admin notifications: ${key.replace('rainbow_', '')}`,
          updatedBy: null
        })
        .onConflictDoNothing();
    }
    console.log('[Admin Notifications] ✅ Initialized defaults');
  } catch (error) {
    console.error('[Admin Notifications] ❌ Failed to initialize:', error);
  }
}

// Load current admin notification settings from database
export async function loadAdminNotificationSettings(): Promise<AdminNotificationConfig> {
  try {
    const isConnected = await dbReady;
    if (!isConnected) {
      throw new Error('Database not connected');
    }

    const settings = await db
      .select()
      .from(appSettings)
      .where(sql`${appSettings.key} LIKE 'rainbow_%' AND (${appSettings.key} LIKE 'rainbow_admin_%' OR ${appSettings.key} LIKE 'rainbow_system_%' OR ${appSettings.key} LIKE 'rainbow_operators%' OR ${appSettings.key} LIKE 'rainbow_default_%')`);

    const config: any = {};
    for (const setting of settings) {
      const shortKey = setting.key.replace('rainbow_', '');
      config[shortKey] = setting.value;
    }

    let operators = DEFAULT_OPERATORS;
    try {
      if (config.operators) {
        operators = JSON.parse(config.operators);
      }
    } catch (e) {
      console.warn('[Admin Notifications] Failed to parse operators, using defaults');
    }

    return {
      enabled: config.admin_notifications_enabled === 'true',
      systemAdminPhone: config.system_admin_phone || DEFAULT_ADMIN_PHONE,
      notifyOnDisconnect: config.admin_notify_disconnect === 'true',
      notifyOnUnlink: config.admin_notify_unlink === 'true',
      notifyOnReconnect: config.admin_notify_reconnect === 'true',
      operators,
      defaultFallbackMinutes: parseInt(config.default_fallback_minutes || '5'),
    };
  } catch (error) {
    console.error('[Admin Notifications] ❌ Failed to load settings, using defaults:', error);
    return {
      enabled: true,
      systemAdminPhone: DEFAULT_ADMIN_PHONE,
      notifyOnDisconnect: true,
      notifyOnUnlink: true,
      notifyOnReconnect: true,
      operators: DEFAULT_OPERATORS,
      defaultFallbackMinutes: 5,
    };
  }
}

// Update system admin phone number
export async function updateSystemAdminPhone(phone: string): Promise<void> {
  const isConnected = await dbReady;
  if (!isConnected) {
    throw new Error('Database not connected');
  }

  // Validate phone number (digits only, 10-15 characters)
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    throw new Error('Phone number must be 10-15 digits');
  }

  await db.insert(appSettings)
    .values({
      key: 'rainbow_system_admin_phone',
      value: cleanPhone,
      description: 'System admin phone number',
      updatedBy: null
    })
    .onConflictDoUpdate({
      target: [appSettings.key],
      set: { value: cleanPhone }
    });

  console.log(`[Admin Notifications] ✅ Updated system admin phone: ${cleanPhone}`);
}

// Update operators list
export async function updateOperators(operators: OperatorContact[]): Promise<void> {
  const isConnected = await dbReady;
  if (!isConnected) {
    throw new Error('Database not connected');
  }

  // Validate operators
  for (const op of operators) {
    const cleanPhone = op.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      throw new Error(`Invalid phone number: ${op.phone}`);
    }
    if (op.fallbackMinutes < 1) {
      throw new Error('Fallback time must be at least 1 minute');
    }
  }

  await db.insert(appSettings)
    .values({
      key: 'rainbow_operators',
      value: JSON.stringify(operators),
      description: 'Unit operators with fallback escalation',
      updatedBy: null
    })
    .onConflictDoUpdate({
      target: [appSettings.key],
      set: { value: JSON.stringify(operators) }
    });

  console.log(`[Admin Notifications] ✅ Updated operators: ${operators.length} contacts`);
}

// Update default fallback interval
export async function updateDefaultFallbackMinutes(minutes: number): Promise<void> {
  const isConnected = await dbReady;
  if (!isConnected) {
    throw new Error('Database not connected');
  }

  if (minutes < 1) {
    throw new Error('Fallback interval must be at least 1 minute');
  }

  await db.insert(appSettings)
    .values({
      key: 'rainbow_default_fallback_minutes',
      value: minutes.toString(),
      description: 'Default fallback interval between operator notifications',
      updatedBy: null
    })
    .onConflictDoUpdate({
      target: [appSettings.key],
      set: { value: minutes.toString() }
    });

  console.log(`[Admin Notifications] ✅ Updated default fallback: ${minutes} minutes`);
}

// Update notification preferences
export async function updateAdminNotificationPreferences(
  enabled: boolean,
  notifyDisconnect: boolean,
  notifyUnlink: boolean,
  notifyReconnect: boolean
): Promise<void> {
  const isConnected = await dbReady;
  if (!isConnected) {
    throw new Error('Database not connected');
  }

  const updates = {
    'rainbow_admin_notifications_enabled': enabled.toString(),
    'rainbow_admin_notify_disconnect': notifyDisconnect.toString(),
    'rainbow_admin_notify_unlink': notifyUnlink.toString(),
    'rainbow_admin_notify_reconnect': notifyReconnect.toString(),
  };

  for (const [key, value] of Object.entries(updates)) {
    await db.insert(appSettings)
      .values({
        key,
        value,
        description: `Admin notifications: ${key.replace('rainbow_admin_', '')}`,
        updatedBy: null
      })
      .onConflictDoUpdate({
        target: [appSettings.key],
        set: { value }
      });
  }

  console.log('[Admin Notifications] ✅ Updated preferences');
}
