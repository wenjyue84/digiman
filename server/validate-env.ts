/**
 * Environment variable validation — fail fast on misconfiguration.
 *
 * In production, critical env vars must be set. In development,
 * missing vars trigger warnings (not crashes) since MemStorage fallback exists.
 */

interface EnvRule {
  key: string;
  required: 'production' | 'always';
  description: string;
}

const rules: EnvRule[] = [
  { key: 'SESSION_SECRET', required: 'production', description: 'Express session encryption key' },
  { key: 'DATABASE_URL', required: 'production', description: 'PostgreSQL connection string' },
];

export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === 'production';
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const rule of rules) {
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
