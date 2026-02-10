# Intent Classification Hybrid System - Implementation Plan

## Overview
Enhance PelangiManager's intent classification from 100% LLM to a 3-tier hybrid system:
- **Tier 1:** Fuzzy keyword matching (70% coverage, <5ms)
- **Tier 2:** Semantic similarity (25% coverage, 10-50ms)
- **Tier 3:** LLM fallback (5% coverage, 100-500ms)

**Benefits:**
- 70% cost reduction (fewer LLM calls)
- 20x faster responses (<5ms vs 100ms)
- Better typo/abbreviation handling
- Multi-language support

---

## Phase 1: Fuzzy Keyword Matching (Week 1, 2 hours)

### 1.1 Install Dependencies

```bash
npm install fuse.js
npm install --save-dev @types/fuse.js
```

**Package Size:** +25KB gzipped (negligible impact)

### 1.2 Create Fuzzy Matcher Utility

Create `/mcp-server/src/assistant/fuzzy-matcher.ts`:

```typescript
import Fuse from 'fuse.js';

interface KeywordIntent {
  intent: string;
  keywords: string[];
  language?: 'en' | 'ms' | 'zh';
}

export class FuzzyIntentMatcher {
  private fuse: Fuse<KeywordIntent>;

  constructor(intents: KeywordIntent[]) {
    // Flatten keywords with their intents
    const searchData = intents.flatMap(intent =>
      intent.keywords.map(keyword => ({
        intent: intent.intent,
        keyword,
        language: intent.language || 'en'
      }))
    );

    this.fuse = new Fuse(searchData, {
      keys: ['keyword'],
      threshold: 0.3,        // 0 = exact match, 1 = match anything
      distance: 100,         // Max character distance
      ignoreLocation: true,  // Search entire string
      minMatchCharLength: 2, // Min 2 chars to match
    });
  }

  match(text: string): { intent: string; score: number } | null {
    const normalized = text.toLowerCase().trim();
    const results = this.fuse.search(normalized);

    if (results.length === 0) return null;

    // Return best match
    const bestMatch = results[0];
    return {
      intent: bestMatch.item.intent,
      score: 1 - bestMatch.score  // Convert to confidence (0-1)
    };
  }
}
```

### 1.3 Define Intent Keywords

Create `/mcp-server/src/assistant/data/intent-keywords.json`:

```json
{
  "intents": [
    {
      "intent": "greeting",
      "keywords": {
        "en": ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"],
        "ms": ["hai", "helo", "selamat pagi", "selamat petang", "assalamualaikum"],
        "zh": ["你好", "嗨", "您好", "早安", "午安", "晚安"]
      }
    },
    {
      "intent": "thanks",
      "keywords": {
        "en": ["thank you", "thanks", "tq", "tqvm", "thx", "ty", "appreciate it"],
        "ms": ["terima kasih", "tq", "tqvm", "thanks"],
        "zh": ["谢谢", "谢了", "多谢", "感谢"]
      }
    },
    {
      "intent": "wifi",
      "keywords": {
        "en": ["wifi password", "wi-fi", "internet password", "wifi code", "network password", "how to connect wifi"],
        "ms": ["kata laluan wifi", "password wifi", "kod wifi", "sambung wifi", "internet password"],
        "zh": ["wifi密码", "无线密码", "网络密码", "怎么连wifi", "如何连接wifi"]
      }
    },
    {
      "intent": "check_in",
      "keywords": {
        "en": ["how to check in", "check in time", "when can i check in", "check in process", "early check in"],
        "ms": ["cara check in", "masa check in", "bila boleh check in", "proses check in"],
        "zh": ["如何办理入住", "入住时间", "什么时候可以入住", "办理入住"]
      }
    },
    {
      "intent": "check_out",
      "keywords": {
        "en": ["check out time", "what time check out", "when to check out", "late check out"],
        "ms": ["masa check out", "bila kena check out", "waktu check out"],
        "zh": ["退房时间", "几点退房", "什么时候退房", "延迟退房"]
      }
    },
    {
      "intent": "pricing",
      "keywords": {
        "en": ["how much", "price", "cost", "rate", "how much per day", "how much per night", "booking price"],
        "ms": ["berapa harga", "harga", "kos", "kadar", "harga sehari", "harga semalam"],
        "zh": ["多少钱", "价格", "费用", "一天多少", "一晚多少", "房价"]
      }
    },
    {
      "intent": "farewell",
      "keywords": {
        "en": ["bye", "goodbye", "see you", "farewell", "catch you later", "take care"],
        "ms": ["bye", "selamat tinggal", "jumpa lagi", "sampai jumpa"],
        "zh": ["再见", "拜拜", "回头见", "下次见"]
      }
    }
  ]
}
```

### 1.4 Integrate into Intent Classifier

Modify `/mcp-server/src/assistant/intents.ts`:

```typescript
import { FuzzyIntentMatcher } from './fuzzy-matcher';
import intentKeywords from './data/intent-keywords.json';

// Initialize fuzzy matcher (once at startup)
const fuzzyMatcher = new FuzzyIntentMatcher(
  intentKeywords.intents.flatMap(intent =>
    Object.entries(intent.keywords).map(([lang, keywords]) => ({
      intent: intent.intent,
      keywords,
      language: lang as 'en' | 'ms' | 'zh'
    }))
  )
);

export async function classifyIntent(text: string): Promise<ClassificationResult> {
  // TIER 1: Fuzzy keyword matching (NEW!)
  const fuzzyResult = fuzzyMatcher.match(text);
  if (fuzzyResult && fuzzyResult.score > 0.85) {
    console.log(`[FUZZY] Fast match: ${fuzzyResult.intent} (${fuzzyResult.score})`);
    return {
      intent: fuzzyResult.intent,
      confidence: fuzzyResult.score,
      layer: 'fuzzy'
    };
  }

  // TIER 2: Existing regex patterns (keep as-is)
  const regexResult = matchRegexPatterns(text);
  if (regexResult && regexResult.confidence > 0.85) {
    return {
      ...regexResult,
      layer: 'regex'
    };
  }

  // TIER 3: LLM fallback (existing code)
  const llmResult = await classifyWithLLM(text);
  return {
    ...llmResult,
    layer: 'llm'
  };
}
```

### 1.5 Test & Validate

Create test file `/mcp-server/src/assistant/__tests__/fuzzy-matcher.test.ts`:

```typescript
import { FuzzyIntentMatcher } from '../fuzzy-matcher';

describe('FuzzyIntentMatcher', () => {
  const matcher = new FuzzyIntentMatcher([
    { intent: 'greeting', keywords: ['hi', 'hello', 'hey'] },
    { intent: 'thanks', keywords: ['thank you', 'thanks', 'tq', 'tqvm'] }
  ]);

  test('exact match', () => {
    const result = matcher.match('hi');
    expect(result?.intent).toBe('greeting');
    expect(result?.score).toBeGreaterThan(0.9);
  });

  test('typo tolerance', () => {
    const result = matcher.match('thnks'); // typo in "thanks"
    expect(result?.intent).toBe('thanks');
    expect(result?.score).toBeGreaterThan(0.7);
  });

  test('abbreviation', () => {
    const result = matcher.match('tq');
    expect(result?.intent).toBe('thanks');
    expect(result?.score).toBeGreaterThan(0.9);
  });

  test('no match', () => {
    const result = matcher.match('xyz random text');
    expect(result).toBeNull();
  });
});
```

Run tests:
```bash
npm test -- fuzzy-matcher.test.ts
```

---

## Phase 2: Language Detection (Week 2, 2 hours)

### 2.1 Install Language Detector

```bash
npm install langdetect
npm install --save-dev @types/langdetect
```

### 2.2 Add Language Router

Create `/mcp-server/src/assistant/language-router.ts`:

```typescript
import { detect } from 'langdetect';

export class LanguageRouter {
  detectLanguage(text: string): 'en' | 'ms' | 'zh' | 'unknown' {
    try {
      const detected = detect(text);

      // Map langdetect codes to our system
      const languageMap: Record<string, 'en' | 'ms' | 'zh'> = {
        'en': 'en',
        'ms': 'ms',
        'id': 'ms',  // Indonesian close to Malay
        'zh-cn': 'zh',
        'zh-tw': 'zh',
        'zh': 'zh'
      };

      return languageMap[detected[0].lang] || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  filterKeywordsByLanguage(
    keywords: Array<{ intent: string; language?: string }>,
    detectedLang: string
  ) {
    // Return keywords matching detected language + fallback to English
    return keywords.filter(k =>
      k.language === detectedLang ||
      k.language === 'en' ||  // Always include English as fallback
      !k.language             // Include language-agnostic keywords
    );
  }
}
```

### 2.3 Integrate Language Routing

Update `intents.ts`:

```typescript
import { LanguageRouter } from './language-router';

const languageRouter = new LanguageRouter();

export async function classifyIntent(text: string): Promise<ClassificationResult> {
  // Detect language first
  const language = languageRouter.detectLanguage(text);
  console.log(`[LANG] Detected: ${language}`);

  // Filter keywords by language (improves fuzzy match accuracy)
  const filteredKeywords = languageRouter.filterKeywordsByLanguage(
    intentKeywords.intents,
    language
  );

  // Continue with fuzzy matching on filtered keywords...
  const fuzzyResult = fuzzyMatcher.match(text, filteredKeywords);
  // ... rest of classification logic
}
```

---

## Phase 3: Semantic Similarity Layer (Week 3-4, 4 hours)

### 3.1 Add Embedding-Based Matching

**Option A: Local Embeddings (Recommended)**

```bash
npm install @xenova/transformers
```

Create `/mcp-server/src/assistant/semantic-matcher.ts`:

```typescript
import { pipeline } from '@xenova/transformers';

export class SemanticMatcher {
  private embedder: any;
  private intentEmbeddings: Map<string, number[]> = new Map();

  async initialize() {
    // Load lightweight multilingual model
    this.embedder = await pipeline(
      'feature-extraction',
      'Xenova/multilingual-e5-small'
    );

    // Precompute embeddings for intent examples
    await this.computeIntentEmbeddings();
  }

  private async computeIntentEmbeddings() {
    const intentExamples = {
      'greeting': ['hi', 'hello', 'good morning'],
      'wifi': ['wifi password', 'internet password', 'how to connect'],
      // ... more examples
    };

    for (const [intent, examples] of Object.entries(intentExamples)) {
      const embeddings = await Promise.all(
        examples.map(ex => this.embed(ex))
      );

      // Compute centroid (average embedding)
      const centroid = this.averageEmbeddings(embeddings);
      this.intentEmbeddings.set(intent, centroid);
    }
  }

  private async embed(text: string): Promise<number[]> {
    const output = await this.embedder(text);
    return Array.from(output.data);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async match(text: string): Promise<{ intent: string; score: number } | null> {
    const textEmbedding = await this.embed(text);

    let bestMatch = { intent: '', score: 0 };
    for (const [intent, centroid] of this.intentEmbeddings) {
      const similarity = this.cosineSimilarity(textEmbedding, centroid);
      if (similarity > bestMatch.score) {
        bestMatch = { intent, score: similarity };
      }
    }

    return bestMatch.score > 0.75 ? bestMatch : null;
  }
}
```

**Performance:** 10-50ms per query (cached model)

### 3.2 Integrate Semantic Layer

Update `intents.ts`:

```typescript
const semanticMatcher = new SemanticMatcher();
await semanticMatcher.initialize(); // On startup

export async function classifyIntent(text: string): Promise<ClassificationResult> {
  // TIER 1: Fuzzy (existing)
  const fuzzyResult = fuzzyMatcher.match(text);
  if (fuzzyResult && fuzzyResult.score > 0.85) {
    return { ...fuzzyResult, layer: 'fuzzy' };
  }

  // TIER 2: Semantic similarity (NEW!)
  const semanticResult = await semanticMatcher.match(text);
  if (semanticResult && semanticResult.score > 0.75) {
    console.log(`[SEMANTIC] Match: ${semanticResult.intent} (${semanticResult.score})`);
    return {
      intent: semanticResult.intent,
      confidence: semanticResult.score,
      layer: 'semantic'
    };
  }

  // TIER 3: LLM fallback (existing)
  return await classifyWithLLM(text);
}
```

---

## Phase 4: WhatsApp Safety - Reply Delays (Week 1, 30 mins)

### 4.1 Add Artificial Delay

**CRITICAL:** WhatsApp bans accounts that reply instantly (<100ms).

Create `/mcp-server/src/lib/reply-throttle.ts`:

```typescript
export class ReplyThrottle {
  private lastReplyTime = new Map<string, number>();

  async throttle(userId: string, minDelay = 2000, maxDelay = 3000) {
    const now = Date.now();
    const lastReply = this.lastReplyTime.get(userId) || 0;
    const elapsed = now - lastReply;

    if (elapsed < minDelay) {
      const waitTime = minDelay + Math.random() * (maxDelay - minDelay);
      console.log(`[THROTTLE] Waiting ${waitTime}ms for natural timing`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastReplyTime.set(userId, Date.now());
  }

  async sendWithTypingIndicator(
    userId: string,
    message: string,
    sendFn: (msg: string) => Promise<void>
  ) {
    // Show "typing..." indicator
    await this.showTypingIndicator(userId);

    // Wait 2-3 seconds (safe delay)
    await this.throttle(userId, 2000, 3000);

    // Send actual message
    await sendFn(message);
  }

  private async showTypingIndicator(userId: string) {
    // WhatsApp typing indicator API call
    // (implementation depends on your WhatsApp client)
  }
}
```

### 4.2 Integrate in Message Handler

```typescript
import { ReplyThrottle } from './lib/reply-throttle';

const throttle = new ReplyThrottle();

async function handleIncomingMessage(userId: string, message: string) {
  // Fast classification (1-5ms with fuzzy matching)
  const intent = await classifyIntent(message);
  const response = await getResponseForIntent(intent);

  // CRITICAL: Add delay before replying (2-3 seconds)
  await throttle.sendWithTypingIndicator(userId, response, async (msg) => {
    await whatsappClient.sendMessage(userId, msg);
  });
}
```

**Safe Pattern:**
1. Classify intent instantly (<5ms)
2. Show typing indicator
3. Wait 2-3 seconds
4. Send reply

**Result:** Appears natural, avoids WhatsApp spam detection

---

## Phase 5: Manual Keyword Editor UI (Week 4-5, 8 hours)

### 5.1 Create Keyword Manager Component

Create `/client/src/components/admin-rainbow/KeywordManager.tsx`:

```typescript
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface KeywordEditorProps {
  intent: string;
  keywords: Record<'en' | 'ms' | 'zh', string[]>;
  onSave: (keywords: Record<string, string[]>) => void;
}

export function KeywordEditor({ intent, keywords, onSave }: KeywordEditorProps) {
  const [activeTab, setActiveTab] = useState<'en' | 'ms' | 'zh'>('en');
  const [editedKeywords, setEditedKeywords] = useState(keywords);

  const addKeyword = (lang: 'en' | 'ms' | 'zh', keyword: string) => {
    setEditedKeywords(prev => ({
      ...prev,
      [lang]: [...prev[lang], keyword]
    }));
  };

  const removeKeyword = (lang: 'en' | 'ms' | 'zh', index: number) => {
    setEditedKeywords(prev => ({
      ...prev,
      [lang]: prev[lang].filter((_, i) => i !== index)
    }));
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Intent: {intent}</h3>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="en">English ({editedKeywords.en.length})</TabsTrigger>
          <TabsTrigger value="ms">Malay ({editedKeywords.ms.length})</TabsTrigger>
          <TabsTrigger value="zh">Chinese ({editedKeywords.zh.length})</TabsTrigger>
        </TabsList>

        {(['en', 'ms', 'zh'] as const).map(lang => (
          <TabsContent key={lang} value={lang}>
            <div className="space-y-2">
              {editedKeywords[lang].map((keyword, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input value={keyword} readOnly />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeKeyword(lang, idx)}
                  >
                    Remove
                  </Button>
                </div>
              ))}

              <div className="flex gap-2 mt-4">
                <Input
                  placeholder="Add new keyword..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addKeyword(lang, e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <Button onClick={() => {
                  const input = document.querySelector('input[placeholder="Add new keyword..."]') as HTMLInputElement;
                  if (input?.value) {
                    addKeyword(lang, input.value);
                    input.value = '';
                  }
                }}>
                  Add
                </Button>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Button className="mt-4" onClick={() => onSave(editedKeywords)}>
        Save Changes
      </Button>
    </Card>
  );
}
```

### 5.2 Add Testing Console

Create `/client/src/components/admin-rainbow/IntentTester.tsx`:

```typescript
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TestResult {
  intent: string;
  confidence: number;
  layer: 'fuzzy' | 'semantic' | 'llm';
  matchedKeyword?: string;
}

export function IntentTester() {
  const [testText, setTestText] = useState('');
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const testIntent = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/intents/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testText })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Test Intent Classification</h3>

      <div className="space-y-4">
        <Input
          placeholder="Enter test message..."
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && testIntent()}
        />

        <Button onClick={testIntent} disabled={loading || !testText}>
          {loading ? 'Testing...' : 'Test'}
        </Button>

        {result && (
          <div className="border rounded p-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <strong>Intent:</strong> {result.intent}
              </div>
              <div>
                <strong>Confidence:</strong> {(result.confidence * 100).toFixed(1)}%
              </div>
              <div>
                <strong>Layer:</strong> {result.layer}
              </div>
              {result.matchedKeyword && (
                <div>
                  <strong>Matched:</strong> {result.matchedKeyword}
                </div>
              )}
            </div>

            <div className="mt-2">
              {result.confidence > 0.85 && (
                <span className="text-green-600">✓ High confidence</span>
              )}
              {result.confidence > 0.60 && result.confidence <= 0.85 && (
                <span className="text-yellow-600">⚠ Medium confidence</span>
              )}
              {result.confidence <= 0.60 && (
                <span className="text-red-600">✗ Low confidence</span>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
```

### 5.3 Add API Endpoints

Create `/server/routes/intents.ts`:

```typescript
import express from 'express';
import { classifyIntent } from '../../mcp-server/src/assistant/intents';
import intentKeywords from '../../mcp-server/src/assistant/data/intent-keywords.json';
import fs from 'fs/promises';

const router = express.Router();

// Test intent classification
router.post('/test', async (req, res) => {
  const { text } = req.body;
  const result = await classifyIntent(text);
  res.json(result);
});

// Get all intent keywords
router.get('/keywords', async (req, res) => {
  res.json(intentKeywords);
});

// Update intent keywords
router.put('/keywords/:intent', async (req, res) => {
  const { intent } = req.params;
  const { keywords } = req.body;

  // Find and update intent
  const intentIndex = intentKeywords.intents.findIndex(i => i.intent === intent);
  if (intentIndex === -1) {
    return res.status(404).json({ error: 'Intent not found' });
  }

  intentKeywords.intents[intentIndex].keywords = keywords;

  // Save to file
  await fs.writeFile(
    './mcp-server/src/assistant/data/intent-keywords.json',
    JSON.stringify(intentKeywords, null, 2)
  );

  res.json({ success: true });
});

export default router;
```

---

## Expected Performance Metrics

| Metric | Before (100% LLM) | After (Hybrid) | Improvement |
|--------|-------------------|----------------|-------------|
| **Avg Latency** | 100-500ms | 5-50ms | **10-100x faster** |
| **LLM Calls** | 100% | 30% | **70% reduction** |
| **Cost (per 1M msgs)** | $5,000 | $1,500 | **$3,500 saved** |
| **Typo Handling** | ❌ No | ✅ Yes | **New capability** |
| **Multi-language** | ⚠️ Basic | ✅ Advanced | **Better** |

---

## Testing Checklist

After implementing each phase:

- [ ] **Phase 1:** Test fuzzy matching with typos ("thnks" → thanks)
- [ ] **Phase 1:** Test abbreviations ("tq" → thanks, "wifi pw" → wifi)
- [ ] **Phase 2:** Test language detection (EN/MS/ZH messages)
- [ ] **Phase 2:** Test mixed language messages
- [ ] **Phase 3:** Test semantic similarity ("wifi password" vs "internet code")
- [ ] **Phase 4:** Verify 2-3 second delay in WhatsApp replies
- [ ] **Phase 4:** Monitor for WhatsApp ban warnings (quality rating)
- [ ] **Phase 5:** Test UI keyword editing
- [ ] **Phase 5:** Test intent testing console
- [ ] **All:** Run full test suite with 100 sample messages

---

## Rollback Plan

Each phase is **additive** and can be disabled independently:

```typescript
// Config: enable/disable layers
const CONFIG = {
  enableFuzzy: true,      // Phase 1
  enableLanguageDetect: true,  // Phase 2
  enableSemantic: true,   // Phase 3
  enableReplyDelay: true, // Phase 4
};

// In classifyIntent():
if (CONFIG.enableFuzzy) {
  const fuzzyResult = fuzzyMatcher.match(text);
  // ...
}
```

If any phase causes issues, disable it and fall back to previous layer.

---

## Monitoring Dashboard (Future)

Track hybrid system performance:

```typescript
interface IntentMetrics {
  totalMessages: number;
  layerBreakdown: {
    fuzzy: number;    // How many matched in fuzzy layer
    semantic: number; // How many matched in semantic layer
    llm: number;      // How many escalated to LLM
  };
  avgLatency: {
    fuzzy: number;    // <5ms
    semantic: number; // 10-50ms
    llm: number;      // 100-500ms
  };
  costSavings: number; // $ saved vs 100% LLM
}
```

---

## Next Steps

1. **Week 1:** Implement Phase 1 (fuzzy matching) - 2 hours
2. **Week 2:** Test with real messages, measure coverage
3. **Week 3:** Implement Phase 2 (language detection) - 2 hours
4. **Week 4:** Implement Phase 3 (semantic) OR Phase 5 (UI) - choose priority
5. **Month 2:** Monitor performance, adjust thresholds

**Recommended Priority:** Phase 1 → Phase 4 (safety) → Phase 5 (UI) → Phase 3 (semantic)

---

## Documentation Links

- [Fuse.js Documentation](https://fusejs.io/)
- [langdetect NPM](https://www.npmjs.com/package/langdetect)
- [WhatsApp Business API Rate Limits](https://www.wati.io/en/blog/whatsapp-business-api/whatsapp-api-rate-limits/)
- [Transformers.js (local embeddings)](https://huggingface.co/docs/transformers.js/)

---

## Support

Created: 2026-02-09
For questions, refer to:
- Full research reports in `/docs/INTENT-*` files
- Detailed implementation examples in subagent outputs
