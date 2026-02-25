-- Migration 0008: Add usage_json column to rainbow_messages
-- Stores token usage data and staffName for manual messages.
-- The column was referenced in conversation-logger.ts but never added to the schema,
-- causing silent data loss. This migration adds it as nullable (no existing data affected).

ALTER TABLE rainbow_messages ADD COLUMN IF NOT EXISTS usage_json text;
