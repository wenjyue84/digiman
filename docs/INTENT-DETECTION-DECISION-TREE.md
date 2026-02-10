# Multilingual Intent Detection — Decision Tree & Comparison Matrix

Quick reference guide for choosing the right technique.

---

## Quick Decision Tree

```
START: User sends message
│
├─ Is it empty? ──────────────────► unknown
│
├─ Is it an emergency? ──────────► complaint + escalate
│  │ (regex patterns: fire, police, theft, assault)
│  │
│  └─ Emergency patterns match? ──► YES ──► return emergency
│     │
│     └─ NO ──┐
│             │
├─────────────┘
│
├─ Is language English? ────────────┐
│  │                                 │
│  ├─ YES ────────────────┐         │
│  │                      │         │
│  └─ NO ───────┐         │         │
│                │         │         │
│          Check if Malay │         │
│          Check if Zhuang│         │
│          Check if Japanese │      │
│                │         │         │
│                └─────────┤─────────┘
│                          │
│  Exact phrase match? ────┤──► YES ──► return (confidence: 0.9)
│  (regex)                 │
│                          ├─ NO
│                          │
│  Fuzzy match? ──────────┤──► YES (sim ≥ 0.65) ──► return (confidence: sim)
│  (Fuse.js)              │
│                          ├─ NO (English only)
│                          │
│  Phonetic match? ────────┤──► YES ──► return (confidence: 0.55)
│  (Metaphone, STT errors) │
│                          ├─ NO
│                          │
│  LLM classification ────┤──► return (confidence: varies)
│  (Groq API)             │
│                          └─ Error ──► return unknown

```

---

## Technique Comparison Matrix

### By Use Case

| Use Case | Best Technique | Fallback | Why |
|----------|----------------|----------|-----|
| Exact phrases ("hello", "thanks") | Regex | N/A | Instant, zero cost |
| Typos ("tq", "checkin") | Fuzzy (Fuse.js) | LLM | Handles 85% of typos in <10ms |
| Speech-to-text errors ("wifey" for "wifi") | Metaphone (EN only) | Fuzzy | Phonetic matching catches STT noise |
| Abbreviated phrases ("tvm", "ty") | Fuzzy (Fuse.js) | N/A | Canonical phrase mapping works well |
| Mixed language text | Language detection + context | LLM | Route to correct handler |
| Complex questions ("can I change rooms?") | LLM | None | Requires understanding context |
| Multi-pattern search (50+ keywords) | Aho-Corasick | Regex | Single-pass efficiency |
| Unicode variants ("café" vs "cafe") | Normalization + Fuzzy | N/A | NFKD decomposition handles this |

### By Performance Metric

| Technique | Latency | Memory | CPU | Cost | Scale |
|-----------|---------|--------|-----|------|-------|
| **Regex** | 0.1-0.5ms | <1KB | <1% | $0 | 100K+ msgs/s |
| **Levenshtein** | 1-5ms | <1KB | 2-5% | $0 | 50K msgs/s |
| **Fuzzy (Fuse.js)** | 2-10ms | 10-50KB | 3-8% | $0 | 20K msgs/s |
| **N-gram** | 1-3ms | 2-5KB | 1-3% | $0 | 40K msgs/s |
| **Metaphone** | 0.5-1ms | <1KB | <1% | $0 | 100K+ msgs/s |
| **Aho-Corasick** | 0.01-0.1ms | 100KB-1MB | 1-2% | $0 | 1M msgs/s |
| **Language Detection** | 2-5ms | <5KB | 2-4% | $0 | 10K msgs/s |
| **LLM (Groq)** | 100-500ms | Varies | GPU | $0-5/1M | 10 msgs/s |

### By Language Support

| Technique | EN | MS | ZH | JA | Other |
|-----------|----|----|----|----|-------|
| Regex | ✅ | ✅ | ✅ | ✅ | ✅ |
| Fuzzy (Fuse.js) | ✅✅ | ✅ | ✅ | ✅ | ✅ |
| Metaphone | ✅✅ | ❌ | ❌ | ❌ | ⚠️ |
| Language Detection | ✅ | ✅ | ✅ | ✅ | ✅ (55 langs) |
| N-gram | ✅ | ✅ | ✅ | ✅ | ✅ |
| Aho-Corasick | ✅ | ✅ | ✅ | ✅ | ✅ |
| Normalization | ✅ | ✅ | ✅ | ✅ | ✅ |
| LLM | ✅✅ | ✅✅ | ✅✅ | ✅✅ | ✅✅ |

Legend: ✅✅ = Excellent, ✅ = Good, ⚠️ = Limited, ❌ = Not applicable

---

## Implementation Path by Project Size

### Small Project (1-5 intent categories, <100 msgs/day)

**Stack:** Regex only
```
User message
    ↓
[Regex match] ──► Found? ──► Return
    ↓                  ↓
    No           (Don't call LLM)
    ↓
 Unknown

Time: <1ms per message
Cost: $0
```

**When to evolve:** Users report typos not matching (>20% misses)

---

### Growing Project (5-15 categories, 100-1000 msgs/day)

**Stack:** Regex + Fuzzy + LLM

```
User message
    ↓
[Regex: 0.5ms] ──► Match? ──► Return (80% coverage)
    ↓ No
[Fuzzy: 5ms] ──► Match (sim ≥ 0.65)? ──► Return (15% coverage)
    ↓ No
[LLM: 200ms] ──► Return (5% coverage)
    ↓
Handle fallback

Avg time: 5ms (regex/fuzzy) or 200ms (LLM)
95% sub-10ms response time
Cost: $0 (unless LLM overused)
```

**Installation:**
```bash
npm install fuse.js langdetect
```

**Your current project is here.** Add fuzzy matching for 60% improvement.

---

### Mature Project (15+ categories, 1000+ msgs/day)

**Stack:** Language detection + Regex/Fuzzy + Phonetic + Aho-Corasick + LLM

```
User message
    ↓
[Lang detect: 3ms] ──► Determine language
    ↓
[Aho-Corasick: 0.1ms] ──► Multi-pattern match (90% coverage)
    ↓ No match
[Fuzzy: 10ms] ──► Similar phrase? (8% coverage)
    ↓ No match
[Phonetic: 1ms] (EN only, STT) ──► Match? (1% coverage)
    ↓ No match
[LLM: 200ms] ──► Return (1% coverage)
    ↓
Handle fallback

Avg time: <1ms (99%) or 200ms (1%)
Cost: 1% × LLM = huge savings
```

**Installation:**
```bash
npm install fuse.js langdetect ahocorasick metaphone3
```

---

## Cost-Benefit Analysis for PelangiManager

### Current State (Jan 2026)
- **Messages/day:** ~500-1000
- **LLM calls:** 100% → ~500-1000/day
- **Cost:** ~$0.05-0.10/day (Groq free tier)
- **Response time:** 100-500ms (network + LLM)

### After Adding Fuzzy (Goal)
- **Messages/day:** Same ~500-1000
- **LLM calls:** 30% → ~150-300/day
- **Cost:** $0 (under free tier)
- **Response time:** 70% @ <5ms, 30% @ 100-500ms
- **Implementation time:** 2 hours
- **ROI:** Instant latency improvement + future cost protection

### Projected (6+ months, more users)
- **Messages/day:** ~5000-10000
- **Without optimization:**
  - LLM calls: 100% → 5000-10000/day
  - Cost: $0.25-0.50/day → $7.50-15/month
  - Risk: Hit rate limits, downtime

- **With fuzzy + language detection:**
  - LLM calls: 30% → 1500-3000/day
  - Cost: $0.075-0.15/day → $2.25-4.50/month
  - **Savings: 70% cost reduction**

---

## Threshold Tuning by Intent Category

### High-Confidence Thresholds (Precise intent matters)
- **Booking confirmation:** 0.80 (don't want to book wrong room)
- **Checkout time:** 0.75 (incorrect info = guest problem)
- **Payment info:** 0.85 (security-sensitive)

### Medium-Confidence Thresholds (Some flexibility)
- **Complaint:** 0.65 (capture all problems, even ambiguous)
- **Contact staff:** 0.60 (escalation OK if unsure)
- **Wifi password:** 0.70 (useful but not critical)

### Low-Confidence Thresholds (Any interest is good)
- **Greeting:** 0.50 (anything friendly is greeting)
- **Amenities inquiry:** 0.55 (just route to knowledge base)

### Recommended Config

```typescript
const INTENT_THRESHOLDS: Record<IntentCategory, number> = {
  'greeting': 0.50,
  'thanks': 0.55,
  'wifi': 0.70,
  'checkin_info': 0.75,
  'checkout_info': 0.75,
  'pricing': 0.70,
  'availability': 0.65,
  'booking': 0.80,
  'complaint': 0.65,
  'contact_staff': 0.60,
  'facilities': 0.65,
  'rules': 0.65,
  'payment': 0.85,
  'unknown': 0.00
};

export function shouldAcceptMatch(
  category: IntentCategory,
  confidence: number
): boolean {
  const threshold = INTENT_THRESHOLDS[category] ?? 0.65;
  return confidence >= threshold;
}
```

---

## Language-Specific Decision Trees

### English Flow
```
[Text in English]
    ↓
[Exact phrase?] ──► YES ──► confidence: 0.90
    ↓ NO
[Fuzzy match (0.65+)?] ──► YES ──► confidence: similarity
    ↓ NO
[Phonetic match?] ──► YES ──► confidence: 0.55
    ↓ NO
[LLM classify] ──► Always works
```

### Malay Flow
```
[Text in Malay]
    ↓
[Exact phrase?] ──► YES ──► confidence: 0.90
    ↓ NO
[Fuzzy match (0.55+)?] ──► YES ──► confidence: similarity
    ↓        (lower threshold: less variation)
[LLM classify]
```

**Note:** No phonetic matching (Metaphone is EN-only)

### Chinese (Simplified) Flow
```
[Text in Chinese]
    ↓
[Word segmentation needed?] ──► YES ──► Use jieba/nodejieba (optional)
    ↓ NO
[Exact phrase?] ──► YES ──► confidence: 0.90
    ↓ NO
[Fuzzy match (0.60+)?] ──► YES ──► confidence: similarity
    ↓                      (char-level, not phonetic)
[LLM classify]
```

**Note:** No phonetic matching. Use character-level edit distance instead.

### Japanese Flow
```
[Text in Japanese]
    ↓
[Script detection] ──► Hiragana? Katakana? Kanji?
    ↓
[Normalize variants] ──► Handle hiragana/katakana mixing
    ↓
[Exact phrase?] ──► YES ──► confidence: 0.90
    ↓ NO
[Fuzzy match (0.60+)?] ──► YES ──► confidence: similarity
    ↓
[LLM classify]
```

---

## Migration Strategy

### Phase 1: Low Risk (Week 1)
- [ ] Install `fuse.js`
- [ ] Create `fuzzy-matcher.ts`
- [ ] Add unit tests
- [ ] A/B test on 10% of traffic

**Rollback:** Disable fuzzy layer, revert to LLM

### Phase 2: Medium Risk (Week 2-3)
- [ ] Roll out to 50% of users
- [ ] Monitor false positives
- [ ] Tune thresholds based on data
- [ ] Add `langdetect`

**Rollback:** Gradually decrease fuzzy weight

### Phase 3: Full Deployment (Week 4+)
- [ ] Rollout to 100% users
- [ ] Add phonetic matching (EN only)
- [ ] Add performance monitoring
- [ ] Document for team

**Monitoring:** Track by layer:
```typescript
// Log which layer handled each message
console.log({
  timestamp: new Date(),
  message: text,
  category: result.category,
  source: result.source, // 'regex', 'fuzzy', 'phonetic', 'llm'
  confidence: result.confidence,
  latency: endTime - startTime
});
```

---

## Common Mistakes & How to Avoid Them

### Mistake 1: Fuzzy Matching Too Aggressive
**Problem:** "problem" matches "complain", false positives spike
**Solution:**
- Increase threshold from 0.3 to 0.5+
- Pre-filter by common substrings
- Use word boundary checks

```typescript
// BAD: Matches anything vaguely similar
const fuzzyResult = fuzzyMatcher.match('problem', 0.3);

// GOOD: Only matches if similar AND contains key words
const hasKeyword = ['complain', 'problem', 'issue'].some(
  word => text.includes(word)
);
if (hasKeyword) {
  const fuzzyResult = fuzzyMatcher.match(text, 0.6);
}
```

### Mistake 2: Ignoring Unicode in Regex
**Problem:** Chinese characters don't match, user says "regex broken"
**Solution:** Add `u` flag and test with non-Latin scripts

```typescript
// BAD: Doesn't handle Chinese well
const pattern = /你好/;

// GOOD: Unicode-aware
const pattern = /你好/u;

// BETTER: Explicit Unicode escapes
const pattern = /[\u4F60\u597D]/u;
```

### Mistake 3: Phonetic Matching on Non-English
**Problem:** "你好" (ni hao) → metaphone returns gibberish
**Solution:** Only apply to detected English

```typescript
// ALWAYS check language first
const { language } = languageDetector.detect(text);
if (language === 'en') {
  // OK to use metaphone
  const phoneticResult = phoneticMatcher.match(text);
}
```

### Mistake 4: Not Tuning Thresholds Per Category
**Problem:** Booking intents have 40% false matches
**Solution:** Different thresholds per category

```typescript
// BAD: Single threshold
if (fuzzyResult && fuzzyResult.confidence >= 0.65) {
  return fuzzyResult;
}

// GOOD: Per-category tuning
const threshold = INTENT_THRESHOLDS[fuzzyResult.category] ?? 0.65;
if (fuzzyResult && fuzzyResult.confidence >= threshold) {
  return fuzzyResult;
}
```

### Mistake 5: No Monitoring of Layer Distribution
**Problem:** Unknown why LLM is being called so much
**Solution:** Log source by layer

```typescript
// Add metrics
const metrics = {
  regex: 0,
  fuzzy: 0,
  phonetic: 0,
  llm: 0
};

messages.forEach(m => {
  metrics[m.source]++;
});

console.log('Intent sources:', metrics);
// Should be: {regex: 400, fuzzy: 200, phonetic: 50, llm: 100}
// 70% solved before LLM ✅
```

---

## Performance Optimization Tips

### Reduce Fuzzy Search Overhead
```typescript
// Pre-compute Fuse index once (not per request)
const FUZZY_INDEX = new Fuse(phrases, { /* config */ });

// Reuse same instance
export async function classify(text: string) {
  const results = FUZZY_INDEX.search(text); // Fast: cached
}
```

### Reduce LLM Calls
```typescript
// Cache LLM results for identical messages
const cache = new Map<string, IntentResult>();

export async function classify(text: string) {
  if (cache.has(text)) {
    return cache.get(text)!; // 0ms from cache
  }

  const result = await llmClassify(text);
  cache.set(text, result);
  return result;
}

// Limit cache size to prevent memory bloat
const MAX_CACHE = 10000;
if (cache.size > MAX_CACHE) {
  const firstKey = cache.keys().next().value;
  cache.delete(firstKey);
}
```

### Parallelize Language Detection
```typescript
// Currently: sequential
const lang = languageDetector.detect(text);
const fuzzy = fuzzyMatcher.match(text);

// Better: parallel (both are fast, small I/O difference)
const [lang, fuzzy] = await Promise.all([
  languageDetector.detect(text),
  fuzzyMatcher.match(text)
]);
```

---

## Testing Checklist

### Unit Tests
- [ ] Each layer matches expected intents
- [ ] Thresholds respected
- [ ] Fallback works when layer fails
- [ ] Empty/null input handled
- [ ] Unicode text processed correctly

### Integration Tests
- [ ] Full pipeline works end-to-end
- [ ] Layers called in correct order
- [ ] LLM only called when needed
- [ ] Metrics recorded correctly

### Performance Tests
- [ ] Regex: <1ms
- [ ] Fuzzy: <20ms
- [ ] Language detect: <10ms
- [ ] Phonetic: <2ms
- [ ] 99th percentile < 100ms (excluding LLM)

### User Acceptance Tests
- [ ] Common intents recognized (tq, check in, wifi)
- [ ] Typos handled (checkin, wifey)
- [ ] No false matches (problem != complain)
- [ ] Multilingual works (你好, terima kasih, konnichiwa)

---

## Summary Decision Table

| Your Situation | Recommendation | Effort | ROI |
|---|---|---|---|
| "Regex works fine" | Skip this, no problem | 0 | - |
| "Users complain about typos" | Add Fuse.js (Phrase 1) | 2h | Very high |
| "Mixed language messages" | Add langdetect (Phase 1) | 1h | High |
| "STT errors in English" | Add Metaphone (Phase 2) | 1.5h | Medium |
| "50+ intent categories" | Consider Aho-Corasick (Phase 3) | 4h | Medium |
| "Need sub-5ms latency" | Optimize caching (Phase 3) | 2h | High |
| "Scale to 10K msgs/day" | Full pipeline (all phases) | 8h total | Very high |

---

## References

- [Fuse.js Documentation](https://fusejs.io/)
- [Langdetect](https://www.npmjs.com/package/langdetect)
- [Metaphone3](https://www.npmjs.com/package/metaphone3)
- [Aho-Corasick Algorithm](https://cp-algorithms.com/string/aho_corasick.html)
- [Unicode Normalization](https://unicode.org/reports/tr15/)

