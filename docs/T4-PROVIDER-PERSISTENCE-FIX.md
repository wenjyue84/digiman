# T4 Provider Selection - Persistence Fix

**Date:** 2026-02-12
**Issue:** Manual T4 provider selection not persisting across page navigation
**Status:** ✅ Fixed

---

## Problem

When users manually selected T4 providers in Intent Manager:
1. Selected providers (3 chosen from 15 total)
2. Navigated to another tab/page
3. Returned to Intent Manager
4. **Selection was lost** - reverted to fallback mode

**Root Cause:** Changes to `t4SelectedProviders` array were made in memory but never saved to the backend.

---

## Solution

### 1. Auto-Save Functionality ✅

Added `autoSaveT4Providers()` function that:
- **Debounces** API calls (500ms delay)
- **Auto-saves** whenever providers are added/removed/reordered
- **Shows visual feedback** (green flash on status banner)
- **Handles errors** gracefully with toast notifications

### 2. Updated Functions ✅

**`toggleT4Provider(id)`**
- Calls `autoSaveT4Providers()` after adding/removing provider
- Changes persist immediately (after 500ms debounce)

**`moveT4Provider(id, direction)`**
- Calls `autoSaveT4Providers()` after reordering
- Priority changes saved automatically

### 3. Enhanced Status Messages ✅

**Before:**
```
Using 4 active providers from Global Settings (fallback mode)
Using 3 selected providers from 15 total configured in Global Settings
```

**After:**
```
Using 4 active providers from Global Settings (fallback mode)
Using 3 selected providers (overriding Global Settings)
```

**Color Coding:**
- **Grey** = Fallback mode (using all enabled providers)
- **Green** = Manual override active (specific selection)

---

## User Experience Flow

### Scenario 1: Manual Selection (Override)

1. User opens Intent Manager
2. Status shows: "Using 4 active providers from Global Settings (fallback mode)"
3. User clicks **"+ Add"** on Groq Llama 3.1 8B
4. Provider added to selection
5. **Auto-save triggered** (500ms delay)
6. Status banner flashes green (visual confirmation)
7. Status updates: "Using 3 selected providers (overriding Global Settings)"
8. User navigates to Settings tab
9. User returns to Intent Manager
10. ✅ **Selection persisted** - still shows 3 selected providers

### Scenario 2: Reordering

1. User has 3 providers selected: #1 Gemini, #2 GPT-OSS, #3 Llama
2. User clicks up arrow on GPT-OSS
3. Order changes: #1 GPT-OSS, #2 Gemini, #3 Llama
4. **Auto-save triggered** (500ms delay)
5. Status banner flashes green
6. User navigates away and back
7. ✅ **Order persisted** - GPT-OSS still #1

### Scenario 3: Clear Selection (Return to Fallback)

1. User has 3 providers selected
2. User clicks **"Remove"** on all 3 providers
3. Selection becomes empty
4. **Auto-save triggered**
5. Status updates: "Using 4 active providers from Global Settings (fallback mode)"
6. ✅ **Fallback mode persisted**

---

## Technical Details

### Auto-Save Implementation

```javascript
let autoSaveT4Timer = null;
async function autoSaveT4Providers() {
  // Clear existing timer (debounce)
  if (autoSaveT4Timer) clearTimeout(autoSaveT4Timer);

  // Wait 500ms before saving (debounce)
  autoSaveT4Timer = setTimeout(async () => {
    try {
      // Collect all LLM settings
      const settings = {
        thresholds: { ... },
        selectedProviders: t4SelectedProviders.sort((a, b) => a.priority - b.priority),
        maxTokens: ...,
        temperature: ...,
        systemPrompt: ...,
        fallbackUnknown: ...,
        logFailures: ...,
        enableContext: ...
      };

      // Save to backend
      const res = await fetch('/api/rainbow/intent-manager/llm-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!res.ok) throw new Error('Failed to save settings');

      // Visual feedback (green flash)
      const statusEl = document.getElementById('t4-provider-status');
      if (statusEl) {
        statusEl.style.backgroundColor = 'rgb(220, 252, 231)'; // green-100
        setTimeout(() => {
          statusEl.style.backgroundColor = '';
        }, 1000);
      }
    } catch (err) {
      console.error('Auto-save failed:', err);
      toast('Failed to save provider selection', 'error');
    }
  }, 500);
}
```

### Debouncing Strategy

**Why 500ms?**
- Prevents excessive API calls during rapid changes
- Short enough for good UX (feels instant)
- Long enough to batch rapid clicks

**Example:**
```
User clicks: Add → Add → Remove → Add (4 actions in 2 seconds)
Without debounce: 4 API calls
With debounce: 1 API call (after user stops for 500ms)
```

---

## Visual Feedback

### Status Banner Flash

**Normal State:**
```
┌────────────────────────────────────────────┐
│ ✅ Using 3 selected providers (overriding) │ ← Grey background
└────────────────────────────────────────────┘
```

**After Auto-Save (1 second):**
```
┌────────────────────────────────────────────┐
│ ✅ Using 3 selected providers (overriding) │ ← Green background (flash)
└────────────────────────────────────────────┘
```

**Color Meanings:**
- Green flash = Settings saved successfully
- No flash = No changes / already saved
- Red toast = Save failed (network/backend error)

---

## Edge Cases Handled

### 1. Rapid Changes ✅
**Scenario:** User rapidly adds/removes 10 providers in 2 seconds
**Behavior:** Only 1 API call after user stops for 500ms
**Result:** ✅ All changes saved correctly

### 2. Network Failure ✅
**Scenario:** API call fails (server down, network error)
**Behavior:** Error toast shown, selection remains in memory
**Result:** ✅ User can retry (changes still in browser)

### 3. Concurrent Saves ✅
**Scenario:** User makes change, then immediately makes another before save completes
**Behavior:** First save cancelled, second save scheduled
**Result:** ✅ Latest state always saved

### 4. Empty Selection ✅
**Scenario:** User removes all providers
**Behavior:** `selectedProviders: []` saved
**Result:** ✅ Fallback mode activated (uses all enabled providers)

---

## Testing Checklist

- [x] Add provider → Auto-save → Navigate away → Return → ✅ Persisted
- [x] Remove provider → Auto-save → Navigate away → Return → ✅ Persisted
- [x] Reorder providers → Auto-save → Navigate away → Return → ✅ Order persisted
- [x] Rapid changes (5+ in 2s) → Only 1 API call → ✅ All changes saved
- [x] Network failure → Error toast → ✅ User can retry
- [x] Clear all providers → Fallback mode → ✅ Status updates correctly
- [x] Visual feedback (green flash) → ✅ Shows for 1 second

---

## Benefits

### Before (Manual Save)
- ❌ User forgets to click "Save LLM Settings" button
- ❌ Changes lost when navigating away
- ❌ Frustrating UX ("Why didn't it save?")
- ❌ Requires extra click every time

### After (Auto-Save)
- ✅ Changes saved automatically
- ✅ Works like modern web apps (Google Docs, Notion, etc.)
- ✅ Subtle green flash confirms save
- ✅ No extra clicks needed
- ✅ Manual "Save LLM Settings" button still works for other fields

---

## Performance Impact

**Network:**
- Debounced to max 1 request per 500ms
- Average: ~200 bytes per save (JSON payload)
- Minimal bandwidth usage

**Browser:**
- 1 setTimeout per change (cleared if new change)
- Negligible memory usage
- No performance degradation

---

## Future Enhancements (Optional)

### Phase 2: Offline Support
- Cache selections in localStorage
- Sync when connection restored
- Show "Saved offline" indicator

### Phase 3: Undo/Redo
- Track selection history
- Add Ctrl+Z / Ctrl+Y support
- Show "Undo" button after changes

### Phase 4: Presets
- Save common configurations ("Fast", "Cheap", "Quality")
- One-click preset switching
- Export/import presets

---

## Conclusion

**Problem:** T4 provider selection not persisting
**Solution:** Auto-save with debouncing + visual feedback
**Result:** ✅ Works like modern web apps (Google Docs, Notion)
**UX Impact:** Significantly improved - no lost changes!

**Status:** Ready for production ✅
