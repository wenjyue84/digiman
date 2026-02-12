import { configStore } from './config-store.js';

type Language = 'en' | 'ms' | 'zh';

// Simple keyword-based language detection
const MS_KEYWORDS = ['apa', 'berapa', 'bila', 'mana', 'saya', 'boleh', 'nak', 'ada', 'ini', 'itu', 'harga', 'bilik', 'masuk', 'keluar', 'terima kasih', 'tolong', 'encik', 'cik'];
const ZH_KEYWORDS = ['你好', '多少', '价格', '房间', '入住', '退房', '谢谢', '请问', '可以', '我要', '什么', '哪里', '怎么', '几点', '有没有'];

export function detectLanguage(text: string): Language {
  const lower = text.toLowerCase();

  // Check Chinese characters first (most distinctive)
  if (/[\u4e00-\u9fff]/.test(text)) {
    return 'zh';
  }

  // Check Malay keywords
  const msCount = MS_KEYWORDS.filter(kw => lower.includes(kw)).length;
  if (msCount >= 2) return 'ms';

  return 'en';
}

// Extended language detection — returns specific language name for non-EN/MS/ZH
// Returns null for EN/MS/ZH (handled by template system)
export function detectFullLanguage(text: string): string | null {
  // Thai script
  if (/[\u0E00-\u0E7F]/.test(text)) return 'Thai';
  // Japanese (Hiragana + Katakana)
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'Japanese';
  // Korean (Hangul)
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) return 'Korean';
  // Arabic script
  if (/[\u0600-\u06FF\u0750-\u077F]/.test(text)) return 'Arabic';
  // Devanagari (Hindi)
  if (/[\u0900-\u097F]/.test(text)) return 'Hindi';
  // Tamil
  if (/[\u0B80-\u0BFF]/.test(text)) return 'Tamil';
  // Vietnamese (specific diacritics)
  if (/[ăắằẳẵặâấầẩẫậđêếềểễệôốồổỗộơớờởỡợưứừửữự]/i.test(text)) return 'Vietnamese';
  // Myanmar/Burmese
  if (/[\u1000-\u109F]/.test(text)) return 'Burmese';

  // Standard EN/MS/ZH — handled by template system
  return null;
}

export function getTemplate(key: string, lang: Language): string {
  const templates = configStore.getTemplates();
  const template = templates[key];
  if (!template) return '';
  return template[lang] || template.en;
}

export function formatPrice(amount: number, currency: string = 'MYR'): string {
  return `RM${amount.toFixed(0)}`;
}

export function formatDate(dateStr: string, lang: Language): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const locale = lang === 'ms' ? 'ms-MY' : lang === 'zh' ? 'zh-CN' : 'en-MY';
  return date.toLocaleDateString(locale, options);
}

export function formatPriceBreakdown(
  breakdown: { nights: number; rateType: string; baseRate: number; totalBase: number; deposit: number; total: number; savings?: string; currency: string },
  lang: Language
): string {
  const lines: string[] = [];

  if (lang === 'zh') {
    lines.push(`*价格明细*`);
    lines.push(`${breakdown.nights}晚 x RM${breakdown.baseRate}/晚`);
    lines.push(`小计: RM${breakdown.totalBase}`);
    if (breakdown.deposit > 0) lines.push(`押金: RM${breakdown.deposit}`);
    lines.push(`*总计: RM${breakdown.total}*`);
    if (breakdown.savings) lines.push(`_${breakdown.savings}_`);
  } else if (lang === 'ms') {
    lines.push(`*Pecahan Harga*`);
    lines.push(`${breakdown.nights} malam x RM${breakdown.baseRate}/malam`);
    lines.push(`Subtotal: RM${breakdown.totalBase}`);
    if (breakdown.deposit > 0) lines.push(`Deposit: RM${breakdown.deposit}`);
    lines.push(`*Jumlah: RM${breakdown.total}*`);
    if (breakdown.savings) lines.push(`_${breakdown.savings}_`);
  } else {
    lines.push(`*Price Breakdown*`);
    lines.push(`${breakdown.nights} nights x RM${breakdown.baseRate}/night`);
    lines.push(`Subtotal: RM${breakdown.totalBase}`);
    if (breakdown.deposit > 0) lines.push(`Deposit: RM${breakdown.deposit}`);
    lines.push(`*Total: RM${breakdown.total}*`);
    if (breakdown.savings) lines.push(`_${breakdown.savings}_`);
  }

  return lines.join('\n');
}
