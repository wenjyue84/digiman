import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema-tables.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Exclude tables managed outside Drizzle (raw pg config tables + sessions)
  tablesFilter: ["!rainbow_configs", "!rainbow_kb_files", "!rainbow_config_audit", "!sessions"],
});
