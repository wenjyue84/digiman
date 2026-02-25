---
name: neon-db-management
description: Manage Neon PostgreSQL databases, including schema migrations with Drizzle, Data API usage, and CLI connections. Use when working with Neon databases, pushing schemas, or configuring MCP clients for database access.
---

# Neon Database Management

## Overview
This skill provides standardized procedures and connection details for managing Neon PostgreSQL databases, with a focus on the PelangiManager multi-business deployment architecture.

## Core Workflows

### 1. Schema Migrations (Drizzle)
To push schema changes to a Neon database:
1. Ensure `drizzle.config.ts` points to `shared/schema-tables.ts` (to avoid circular dependencies with validation).
2. Set the `DATABASE_URL` environment variable.
3. Run `npx drizzle-kit push`.

Example (PowerShell):
```powershell
$env:DATABASE_URL='your_connection_string'; npx drizzle-kit push
```

### 2. Neon Data API
Use the Neon Data API for HTTP-based database access when connection pooling is not required.
- **URL Pattern:** `https://ep-xxx.apirest.ap-southeast-1.aws.neon.tech/neondb/rest/v1`

### 3. CLI Connection (MCP/Claude)
To initialize a connection for MCP clients:
```bash
npx neonctl@latest --force-auth init --agent claude
```

## Homestay Manager (Southern Homestay) Reference
- **Data API:** `https://ep-sweet-cell-a1cw3eeh.apirest.ap-southeast-1.aws.neon.tech/neondb/rest/v1`
- **Connection String:** `postgresql://neondb_owner:npg_B4pRZMCrqX0F@ep-sweet-cell-a1cw3eeh-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`

## Troubleshooting
- **TypeError in drizzle-kit:** If `createInsertSchema` fails during push, ensure `drizzle.config.ts` is pointed directly at table definitions (`schema-tables.ts`) rather than a barrel export that includes validation schemas.
- **SSL/Channel Binding:** Ensure `sslmode=require` and `channel_binding=require` are present in the connection string for Neon pooler compatibility.

## External Resources
- [Neon MCP Documentation](https://neon.com/docs/ai/connect-mcp-clients-to-neon)
- [Drizzle Kit Push Guide](https://orm.drizzle.team/kit-docs/commands#push)
