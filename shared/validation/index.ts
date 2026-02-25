/**
 * validation/index.ts — Barrel re-export for all domain-specific validators
 *
 * Every schema, type, and utility from the domain files is re-exported here
 * so that `shared/schema-validation.ts` can remain a thin pass-through.
 */
export * from './common';
export * from './user-validation';
export * from './guest-validation';
export * from './unit-validation';
export * from './token-validation';
export * from './settings-validation';
export * from './expense-validation';
export * from './rainbow-validation';
