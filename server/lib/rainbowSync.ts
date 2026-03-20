/**
 * Rainbow AI Contact Sync
 *
 * Pushes guest deposit & contact data from Digiman to Rainbow AI
 * whenever a guest record is created or updated.
 */

const RAINBOW_URL = process.env.RAINBOW_URL || 'http://localhost:3002';
const SYNC_TIMEOUT_MS = 5000;

interface DepositSyncData {
  depositAmount?: string;
  depositRequired?: boolean;
  depositMethod?: string;
  depositPaid?: boolean;
  depositStatus?: string;
  name?: string;
  email?: string;
  checkIn?: string;
  checkOut?: string;
  unit?: string;
}

/**
 * Sync guest deposit data to Rainbow AI contact.
 * Fire-and-forget: never throws, only logs errors.
 */
export async function syncGuestToRainbow(
  phoneNumber: string | null | undefined,
  data: DepositSyncData
): Promise<void> {
  if (!phoneNumber) return;

  // Normalize phone: strip spaces/dashes, ensure no @s.whatsapp.net suffix
  const phone = phoneNumber.replace(/[\s\-()]/g, '').replace(/@s\.whatsapp\.net$/i, '');
  if (!phone || phone.length < 7) return;

  // Build patch payload — only include non-empty fields
  const payload: Record<string, any> = {};
  if (data.depositAmount != null) payload.depositAmount = String(data.depositAmount);
  if (data.depositRequired != null) payload.depositRequired = data.depositRequired;
  if (data.depositMethod) payload.depositMethod = data.depositMethod;
  if (data.depositPaid != null) payload.depositPaid = data.depositPaid;
  if (data.depositStatus) payload.depositStatus = data.depositStatus;
  if (data.name) payload.name = data.name;
  if (data.email) payload.email = data.email;
  if (data.checkIn) payload.checkIn = data.checkIn;
  if (data.checkOut) payload.checkOut = data.checkOut;
  if (data.unit) payload.unit = data.unit;

  if (Object.keys(payload).length === 0) return;

  const url = `${RAINBOW_URL}/api/rainbow/conversations/${encodeURIComponent(phone)}@s.whatsapp.net/contact`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[RainbowSync] Failed to sync ${phone}: ${res.status} ${res.statusText}`);
    } else {
      console.log(`[RainbowSync] Synced deposit data for ${phone}: depositStatus=${data.depositStatus || '-'}`);
    }
  } catch (err: any) {
    // Don't crash Digiman if Rainbow AI is offline
    if (err.name === 'AbortError') {
      console.warn(`[RainbowSync] Timeout syncing ${phone} (Rainbow AI may be offline)`);
    } else {
      console.warn(`[RainbowSync] Error syncing ${phone}:`, err.message);
    }
  }
}
