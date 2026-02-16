import type { PriceBreakdown, PricingConfig, HolidaysData } from './types.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Milliseconds in one day (24 hours). */
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Minimum nights to qualify for the monthly rate. */
const MONTHLY_THRESHOLD_NIGHTS = 30;

/** Minimum nights to qualify for the weekly rate. */
const WEEKLY_THRESHOLD_NIGHTS = 7;

/** Default pricing values used when pricing.json cannot be loaded. */
export const PRICING_DEFAULTS: PricingConfig = {
  currency: 'MYR',
  daily: 45,
  weekly: 270,
  monthly: 650,
  deposit: 200,
  depositNote: 'Refundable security deposit for monthly stays only',
  latecheckout_per_hour: 20,
  keycard_deposit: 10,
  laundry_per_load: 5,
  discounts: { weekly_savings: 45, monthly_vs_daily: 'Save RM700 compared to daily rate (30 nights x RM45 = RM1350)' }
};

let pricingConfig: PricingConfig | null = null;
let holidays: HolidaysData | null = null;

export function initPricing(): void {
  try {
    const pricingPath = path.resolve(__dirname, 'data/pricing.json');
    pricingConfig = JSON.parse(readFileSync(pricingPath, 'utf-8'));
  } catch (err: any) {
    console.warn('[Pricing] Failed to load pricing.json:', err.message);
    // Fallback defaults
    pricingConfig = { ...PRICING_DEFAULTS };
  }

  try {
    const holidaysPath = path.resolve(__dirname, 'data/holidays.json');
    holidays = JSON.parse(readFileSync(holidaysPath, 'utf-8'));
  } catch (err: any) {
    console.warn('[Pricing] Failed to load holidays.json:', err.message);
    holidays = { year: 2026, country: 'MY', holidays: [] };
  }
}

export function getPricingConfig(): PricingConfig {
  if (!pricingConfig) initPricing();
  return pricingConfig!;
}

export function calculatePrice(
  checkInStr: string,
  checkOutStr: string,
  guests: number = 1
): PriceBreakdown {
  const config = getPricingConfig();
  const checkIn = new Date(checkInStr);
  const checkOut = new Date(checkOutStr);

  // Calculate nights
  const diffMs = checkOut.getTime() - checkIn.getTime();
  const nights = Math.max(1, Math.ceil(diffMs / MS_PER_DAY));

  // Determine best rate
  let rateType: 'daily' | 'weekly' | 'monthly';
  let baseRate: number;
  let deposit = 0;
  let savings: string | undefined;

  if (nights >= MONTHLY_THRESHOLD_NIGHTS) {
    rateType = 'monthly';
    const months = Math.floor(nights / MONTHLY_THRESHOLD_NIGHTS);
    const remainingDays = nights % MONTHLY_THRESHOLD_NIGHTS;
    baseRate = config.monthly / MONTHLY_THRESHOLD_NIGHTS; // per-night equivalent
    const totalBase = (months * config.monthly) + (remainingDays * config.daily);
    deposit = config.deposit;
    const dailyEquivalent = nights * config.daily;
    savings = `Save RM${dailyEquivalent - totalBase} vs daily rate!`;

    return {
      nights,
      rateType,
      baseRate: Math.round(baseRate * 100) / 100,
      totalBase: totalBase * guests,
      deposit,
      total: (totalBase * guests) + deposit,
      savings,
      currency: config.currency
    };
  } else if (nights >= WEEKLY_THRESHOLD_NIGHTS) {
    rateType = 'weekly';
    const weeks = Math.floor(nights / WEEKLY_THRESHOLD_NIGHTS);
    const remainingDays = nights % WEEKLY_THRESHOLD_NIGHTS;
    baseRate = config.weekly / WEEKLY_THRESHOLD_NIGHTS;
    const totalBase = (weeks * config.weekly) + (remainingDays * config.daily);
    const dailyEquivalent = nights * config.daily;
    savings = `Save RM${dailyEquivalent - totalBase} vs daily rate!`;

    return {
      nights,
      rateType,
      baseRate: Math.round(baseRate * 100) / 100,
      totalBase: totalBase * guests,
      deposit: 0,
      total: totalBase * guests,
      savings,
      currency: config.currency
    };
  } else {
    rateType = 'daily';
    baseRate = config.daily;
    const totalBase = nights * config.daily;

    return {
      nights,
      rateType,
      baseRate,
      totalBase: totalBase * guests,
      deposit: 0,
      total: totalBase * guests,
      currency: config.currency
    };
  }
}

export function isHoliday(dateStr: string): string | null {
  if (!holidays) return null;
  const target = dateStr.slice(0, 10); // YYYY-MM-DD
  const found = holidays.holidays.find(h => h.date === target);
  return found ? found.name : null;
}

export function formatPriceSummary(breakdown: PriceBreakdown): string {
  let text = `${breakdown.nights} night${breakdown.nights !== 1 ? 's' : ''}: *RM${breakdown.totalBase}*`;
  if (breakdown.deposit > 0) {
    text += ` + RM${breakdown.deposit} deposit`;
  }
  if (breakdown.savings) {
    text += `\n_${breakdown.savings}_`;
  }
  return text;
}
