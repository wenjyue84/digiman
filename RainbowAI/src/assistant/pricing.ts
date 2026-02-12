import type { PriceBreakdown, PricingConfig, HolidaysData } from './types.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pricingConfig: PricingConfig | null = null;
let holidays: HolidaysData | null = null;

export function initPricing(): void {
  try {
    const pricingPath = path.resolve(__dirname, 'data/pricing.json');
    pricingConfig = JSON.parse(readFileSync(pricingPath, 'utf-8'));
  } catch (err: any) {
    console.warn('[Pricing] Failed to load pricing.json:', err.message);
    // Fallback defaults
    pricingConfig = {
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
  const nights = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  // Determine best rate
  let rateType: 'daily' | 'weekly' | 'monthly';
  let baseRate: number;
  let deposit = 0;
  let savings: string | undefined;

  if (nights >= 30) {
    rateType = 'monthly';
    const months = Math.floor(nights / 30);
    const remainingDays = nights % 30;
    baseRate = config.monthly / 30; // per-night equivalent
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
  } else if (nights >= 7) {
    rateType = 'weekly';
    const weeks = Math.floor(nights / 7);
    const remainingDays = nights % 7;
    baseRate = config.weekly / 7;
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
