import { BusinessConfig, DEFAULT_BUSINESS_CONFIG } from "../../shared/business-config";

let cachedConfig: BusinessConfig | null = null;

/**
 * Get business configuration from environment variables with Pelangi fallbacks.
 * Results are cached as business identity doesn't change during runtime.
 */
export function getBusinessConfig(): BusinessConfig {
  if (cachedConfig) return cachedConfig;

  cachedConfig = {
    name: process.env.BUSINESS_NAME || DEFAULT_BUSINESS_CONFIG.name,
    shortName: process.env.BUSINESS_SHORT_NAME || DEFAULT_BUSINESS_CONFIG.shortName,
    tagline: process.env.BUSINESS_TAGLINE || DEFAULT_BUSINESS_CONFIG.tagline,
    accommodationType: (process.env.ACCOMMODATION_TYPE as any) || DEFAULT_BUSINESS_CONFIG.accommodationType,
    address: process.env.BUSINESS_ADDRESS || DEFAULT_BUSINESS_CONFIG.address,
    phone: process.env.BUSINESS_PHONE || DEFAULT_BUSINESS_CONFIG.phone,
    email: process.env.BUSINESS_EMAIL || DEFAULT_BUSINESS_CONFIG.email,
    website: process.env.BUSINESS_WEBSITE || DEFAULT_BUSINESS_CONFIG.website,
    receiptPrefix: process.env.RECEIPT_PREFIX || DEFAULT_BUSINESS_CONFIG.receiptPrefix,
    primaryColor: process.env.BUSINESS_PRIMARY_COLOR || DEFAULT_BUSINESS_CONFIG.primaryColor,
  };

  return cachedConfig;
}
