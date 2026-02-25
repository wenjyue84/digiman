# Neon MCP Connection Instructions

To connect your MCP clients (like Rainbow AI or Claude) to the Neon database `homestay-manager`:

## 1. Neon Data API
**URL:** `https://ep-sweet-cell-a1cw3eeh.apirest.ap-southeast-1.aws.neon.tech/neondb/rest/v1`

## 2. Neon CLI Connection
Run this command to initialize the connection:
```bash
npx neonctl@latest --force-auth init --agent claude
```

## 3. Database Connection String
```
postgresql://neondb_owner:npg_B4pRZMCrqX0F@ep-sweet-cell-a1cw3eeh-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## 4. MCP Reference
Refer to the official Neon documentation for more details:
https://neon.com/docs/ai/connect-mcp-clients-to-neon
