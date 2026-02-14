/**
 * schema.ts — Barrel re-export (backwards compatible)
 *
 * All 79+ files that import from '@shared/schema' continue to work unchanged.
 * Tables live in schema-tables.ts, validation in schema-validation.ts.
 */
export * from './schema-tables.js';
export * from './schema-validation.js';
