import cron from 'node-cron';
import { callAPI } from './http-client.js';
import { sendWhatsAppMessage, getWhatsAppStatus } from './baileys-client.js';

const JAY_PHONE = '60127088789';

interface UnitData {
  id: string;
  number: string;
  section: string;
  isAvailable: boolean;
  cleaningStatus: string;
  toRent: boolean;
}

interface GuestData {
  id: string;
  name: string;
  unitNumber: string;
  expectedCheckoutDate: string | null;
  isPaid: boolean;
  paymentAmount: string | null;
  isCheckedIn: boolean;
  status: string | null;
}

const SECTION_CONFIG: { key: string; label: string; emoji: string }[] = [
  { key: 'front', label: 'FRONT SECTION', emoji: '\u{1F4CD}' },
  { key: 'middle', label: 'LIVING ROOM', emoji: '\u{1F3E0}' },
  { key: 'back', label: 'ROOM', emoji: '\u{1F6CF}\u{FE0F}' },
];

function unitNumSort(a: string, b: string): number {
  const numA = parseInt(a.replace(/\D/g, ''), 10);
  const numB = parseInt(b.replace(/\D/g, ''), 10);
  return numA - numB;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '?';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export async function buildDailyReport(): Promise<string> {
  const [units, guestResponse] = await Promise.all([
    callAPI<UnitData[]>('GET', '/api/units'),
    callAPI<any>('GET', '/api/guests/checked-in?page=1&limit=100'),
  ]);

  const guests: GuestData[] = Array.isArray(guestResponse)
    ? guestResponse
    : guestResponse?.data || [];

  // Map unitNumber -> guest (only checked-in guests)
  const guestByUnit = new Map<string, GuestData>();
  for (const g of guests) {
    if (g.isCheckedIn !== false) {
      guestByUnit.set(g.unitNumber, g);
    }
  }

  // Group units by section
  const unitsBySection = new Map<string, UnitData[]>();
  for (const c of units) {
    const list = unitsBySection.get(c.section) || [];
    list.push(c);
    unitsBySection.set(c.section, list);
  }

  // Build message
  let msg = '\u{1F3E8} *PELANGI UNIT STATUS* \u{1F3E8}\n\n';

  for (const sec of SECTION_CONFIG) {
    const sectionUnits = unitsBySection.get(sec.key) || [];
    if (sectionUnits.length === 0) continue;

    sectionUnits.sort((a, b) => unitNumSort(a.number, b.number));

    msg += `${sec.emoji} *${sec.label}* ${sec.emoji}\n`;

    for (const cap of sectionUnits) {
      const num = cap.number.replace(/^C/i, '');
      const guest = guestByUnit.get(cap.number);

      if (guest) {
        const paid = guest.isPaid;
        const icon = paid ? '\u2705' : '\u274C';
        const checkout = formatDate(guest.expectedCheckoutDate);
        const statusPrefix = guest.status === 'blacklisted' ? 'blacklist ' : '';
        let line = `${num}) ${statusPrefix}${guest.name} ${icon}${checkout}`;

        if (!paid && guest.paymentAmount) {
          const amt = parseFloat(guest.paymentAmount);
          if (!isNaN(amt) && amt > 0) {
            line += ` (Outstanding RM${Math.round(amt)})`;
          }
        }
        msg += line + '\n';
      } else {
        msg += `${num})\n`;
      }
    }

    msg += '\n';
  }

  // Footer
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Kuala_Lumpur', day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hour12: false });

  msg += '\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\n';
  msg += `\u{1F4C5} *Last Updated:* ${dateStr}\n`;
  msg += `\u23F0 *Time:* ${timeStr}`;

  return msg;
}

export async function sendDailyReport(phone?: string): Promise<{ success: boolean; message: string; error?: string }> {
  const target = phone || JAY_PHONE;
  try {
    const status = getWhatsAppStatus();
    if (status.state !== 'open') {
      return { success: false, message: '', error: 'WhatsApp not connected' };
    }

    const msg = await buildDailyReport();
    await sendWhatsAppMessage(target, msg);
    return { success: true, message: msg };
  } catch (err: any) {
    console.error('Daily report failed:', err.message);
    return { success: false, message: '', error: err.message };
  }
}

export function startDailyReportScheduler(): void {
  // 11:30 AM Malaysia time (using Asia/Kuala_Lumpur timezone)
  cron.schedule('30 11 * * *', async () => {
    console.log('Running scheduled daily unit report...');
    const result = await sendDailyReport();
    if (result.success) {
      console.log('Daily report sent to', JAY_PHONE);
    } else {
      console.error('Daily report failed:', result.error);
    }
  }, {
    timezone: 'Asia/Kuala_Lumpur'
  });

  console.log('Daily report scheduled for 11:30 AM MYT');
}
