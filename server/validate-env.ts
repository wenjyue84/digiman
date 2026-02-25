/**
 * Environment variable validation — fail fast on misconfiguration.
 *
 * In production, critical env vars must be set. In development,
 * missing vars trigger warnings (not crashes) since MemStorage fallback exists.
 */

interface EnvRule {
  key: string;
  required: 'production' | 'always' | 'optional';
  description: string;
}

const rules: EnvRule[] = [
  { key: 'SESSION_SECRET', required: 'production', description: 'Express session encryption key' },
  { key: 'DATABASE_URL', required: 'production', description: 'PostgreSQL connection string' },
  // Business config — all optional, default to Pelangi Capsule Hostel values
  { key: 'BUSINESS_NAME', required: 'optional', description: 'Business display name (default: Pelangi Capsule Hostel)' },
  { key: 'BUSINESS_SHORT_NAME', required: 'optional', description: 'Short name for receipts and UI (default: Pelangi)' },
  { key: 'BUSINESS_TAGLINE', required: 'optional', description: 'Tagline shown in header (default: Your Cozy Home in JB)' },
  { key: 'ACCOMMODATION_TYPE', required: 'optional', description: 'Type: unit | room | house (default: unit)' },
  { key: 'BUSINESS_ADDRESS', required: 'optional', description: 'Full business address for receipts' },
  { key: 'BUSINESS_PHONE', required: 'optional', description: 'Contact phone number' },
  { key: 'BUSINESS_EMAIL', required: 'optional', description: 'Contact email address' },
  { key: 'BUSINESS_WEBSITE', required: 'optional', description: 'Business website URL' },
  { key: 'RECEIPT_PREFIX', required: 'optional', description: 'Receipt number prefix (default: PEL)' },
  { key: 'SEED_UNITS', required: 'optional', description: 'Initial unit inventory: number:section[:unitType[:maxOccupancy]] CSV' },
];

export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === 'production';
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const rule of rules) {
    if (rule.required === 'optional') continue; // Optional vars use hardcoded defaults, no warning needed
    if (!process.env[rule.key]) {
      if (rule.required === 'always' || (rule.required === 'production' && isProd)) {
        missing.push(`  ${rule.key} — ${rule.description}`);
      } else {
        warnings.push(`  ${rule.key} — ${rule.description} (using fallback)`);
      }
    }
  }

  if (warnings.length > 0) {
    console.warn('[Startup] Missing env vars (non-fatal in development):');
    warnings.forEach(w => console.warn(w));
  }

  if (missing.length > 0) {
    console.error('');
    console.error('FATAL: Missing required environment variables:');
    missing.forEach(m => console.error(m));
    console.error('');
    console.error('Set these in your .env file or deployment platform.');
    console.error('See .env.example for reference.');
    process.exit(1);
  }
}
