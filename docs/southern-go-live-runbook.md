# Southern Go-Live Runbook

This runbook focuses on the remaining setup after the admin site is already reachable.

## 1. Run local preflight

```bash
scripts/preflight-southern.sh
```

If this reports domain mismatch warnings (`southern-homestay` vs `southernhomestay`), standardize first.

## 2. Run remote preflight

```bash
scripts/preflight-southern.sh --remote
```

This validates:
- Target host SSH access.
- `/var/www/southern/.env` and `/var/www/southern/RainbowAI/.env`.
- Required env keys and placeholder detection.
- PM2 process presence.
- Local and public health endpoints.

## 3. Optional full smoke run

```bash
scripts/preflight-southern.sh --remote --with-tests
```

Use this before major deploys.

## 4. Complete manual infrastructure steps

These require your cloud accounts and cannot be automated from this repo:
- Cloudflare tunnel routing (`admin`, `rainbow` hostnames).
- WhatsApp pairing for Southern number.
- Neon backup policy and restore drill.
- Monitoring/alerting setup.

Track status in `southern-go-live-checklist.json`.

## 5. Validate business behavior

1. Login at admin UI.
2. Create a guest, assign unit, complete check-in.
3. Complete check-out and confirm unit release.
4. Generate receipt and confirm Southern branding.
5. Validate Rainbow status and message flow.
6. Verify no data appears in Pelangi instance.

## 6. Freeze and document

When green:
- Save final `.env` snapshots (without committing secrets).
- Export PM2 config/state.
- Mark completed checklist items in `southern-go-live-checklist.json`.
