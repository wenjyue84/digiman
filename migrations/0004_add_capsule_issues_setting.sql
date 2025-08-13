-- Add capsule issues display setting to app settings
INSERT INTO "app_settings" ("key", "value", "description") 
VALUES ('guideShowCapsuleIssues', 'true', 'Whether to show capsule issues to guests after check-in')
ON CONFLICT ("key") DO UPDATE SET 
  "value" = EXCLUDED."value",
  "description" = EXCLUDED."description",
  "updated_at" = NOW();