# Fix TypeScript Errors - Option B Implementation
# This script applies all linter-blocked fixes at once

Write-Host "Fixing TypeScript errors..." -ForegroundColor Cyan

# Fix 1: Add 'theft' and 'card_locked' to IntentCategory type
Write-Host "`n[1/3] Fixing types.ts - Adding emergency intent types..." -ForegroundColor Yellow
$typesFile = "src/assistant/types.ts"
(Get-Content $typesFile) | ForEach-Object {
    $_ -replace "  \| 'complaint'", "  | 'complaint'`n  | 'theft'`n  | 'card_locked'"
} | Set-Content $typesFile
Write-Host "  - Added 'theft' and 'card_locked' types" -ForegroundColor Green

# Fix 2: Add messages array when restoring conversation state
Write-Host "`n[2/3] Fixing conversation.ts - Adding messages array..." -ForegroundColor Yellow
$convFile = "src/assistant/conversation.ts"
(Get-Content $convFile) | ForEach-Object {
    if ($_ -match "^\s+conversationManager\.set\(phone, state\);$") {
        "    // Add empty messages array since messages are stored separately in conversation log"
        "    conversationManager.set(phone, { ...state, messages: [] });"
    } else {
        $_
    }
} | Set-Content $convFile
Write-Host "  - Added messages array to state restoration" -ForegroundColor Green

# Fix 3: Change assert to with syntax in intents.ts
Write-Host "`n[3/4] Fixing intents.ts - Changing assert to with syntax..." -ForegroundColor Yellow
$intentsFile = "src/assistant/intents.ts"
(Get-Content $intentsFile) | ForEach-Object {
    $_ -replace "assert \{ type: 'json' \}", "with { type: 'json' }"
} | Set-Content $intentsFile
Write-Host "  - Changed assert to with in import statements" -ForegroundColor Green

# Fix 4: Add .js extensions to test imports
Write-Host "`n[4/4] Fixing test file imports - Adding .js extensions..." -ForegroundColor Yellow

$fuzzyTest = "src/assistant/__tests__/fuzzy-matcher.test.ts"
(Get-Content $fuzzyTest) | ForEach-Object {
    $_ -replace "from '../fuzzy-matcher'", "from '../fuzzy-matcher.js'"
} | Set-Content $fuzzyTest
Write-Host "  - Fixed fuzzy-matcher.test.ts" -ForegroundColor Green

$langTest = "src/assistant/__tests__/language-router.test.ts"
(Get-Content $langTest) | ForEach-Object {
    $_ -replace "from '../language-router'", "from '../language-router.js'"
} | Set-Content $langTest
Write-Host "  - Fixed language-router.test.ts" -ForegroundColor Green

$semanticTest = "src/assistant/__tests__/semantic-matcher.test.ts"
(Get-Content $semanticTest) | ForEach-Object {
    $_ -replace "from '../semantic-matcher'", "from '../semantic-matcher.js'"
} | Set-Content $semanticTest
Write-Host "  - Fixed semantic-matcher.test.ts" -ForegroundColor Green

Write-Host "`nAll fixes applied successfully!" -ForegroundColor Green
Write-Host "`nRun 'npx tsc --noEmit' to verify the fixes reduced TypeScript errors." -ForegroundColor Cyan
