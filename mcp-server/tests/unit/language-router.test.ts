import { describe, test, expect } from 'vitest';
import { LanguageRouter } from '../../src/assistant/language-router.js';

const router = new LanguageRouter();

describe('LanguageRouter.detectLanguage()', () => {
  describe('English', () => {
    test.each([
      'What is the wifi password?',
      'Can I check in now?',
      'I want to book a room',
      'how much is it',
    ])('detects EN: "%s"', (text) => {
      expect(router.detectLanguage(text)).toBe('en');
    });
  });

  describe('Malay', () => {
    // Pattern checks: saya|anda|adalah|dengan|untuk|dari|yang|ini|itu|ada|tidak|boleh
    test.each([
      'Saya nak tempah bilik untuk satu malam',
      'Ada bilik yang kosong tidak?',
      'Saya nak tahu harga untuk bilik ini',
    ])('detects MS: "%s"', (text) => {
      expect(router.detectLanguage(text)).toBe('ms');
    });
  });

  describe('Chinese', () => {
    // Note: minLength=3 means ≤2 char texts return 'unknown'
    // Chinese char detection works via pattern match before franc
    test.each([
      'wifi密码是什么？',
      '多少钱一天？',
      '我想订一个房间',
      '你好吗朋友',  // 4 chars, above minLength
    ])('detects ZH: "%s"', (text) => {
      expect(router.detectLanguage(text)).toBe('zh');
    });

    test('short Chinese (2 chars) returns unknown due to minLength', () => {
      // detectLanguage has minLength=3 check BEFORE pattern detection
      expect(router.detectLanguage('你好')).toBe('unknown');
    });
  });

  describe('Unknown / short text', () => {
    test('single character → unknown', () => {
      expect(router.detectLanguage('x')).toBe('unknown');
    });

    test('empty string → unknown', () => {
      expect(router.detectLanguage('')).toBe('unknown');
    });

    test('numbers only → unknown', () => {
      expect(router.detectLanguage('123')).toBe('unknown');
    });

    test('symbols only → unknown', () => {
      expect(router.detectLanguage('??')).toBe('unknown');
    });
  });

  describe('Mixed / code-switching', () => {
    test('Chinese characters win over English', () => {
      expect(router.detectLanguage('wifi密码')).toBe('zh');
    });
  });
});

describe('LanguageRouter.getLanguageName()', () => {
  test.each([
    ['en', 'English'],
    ['ms', 'Malay'],
    ['zh', 'Chinese'],
    ['unknown', 'Unknown'],
  ] as const)('%s → %s', (code, name) => {
    expect(router.getLanguageName(code)).toBe(name);
  });
});

describe('LanguageRouter.detectMixedLanguages()', () => {
  // Pattern checks: en = the|is|are|was|were|have|has|had|do|does|did|can|will|would
  //                 ms = saya|anda|adalah|dengan|untuk|dari|yang|ini|itu|ada|tidak|boleh
  //                 zh = Chinese character range

  test('detects EN + ZH in text with both patterns', () => {
    // "can" matches EN pattern, 谢谢 matches ZH pattern
    const langs = router.detectMixedLanguages('can you help 谢谢');
    expect(langs).toContain('en');
    expect(langs).toContain('zh');
  });

  test('detects MS + ZH', () => {
    // "saya" matches MS pattern, 谢谢 matches ZH
    const langs = router.detectMixedLanguages('saya mau 谢谢');
    expect(langs).toContain('ms');
    expect(langs).toContain('zh');
  });

  test('detects ZH only for Chinese-only text', () => {
    const langs = router.detectMixedLanguages('你好吗朋友');
    expect(langs).toContain('zh');
    expect(langs).not.toContain('en');
  });

  test('detects EN for text with EN pattern keywords', () => {
    // "the" and "is" match EN pattern
    const langs = router.detectMixedLanguages('the weather is nice today');
    expect(langs).toContain('en');
  });

  test('returns empty for text without pattern matches', () => {
    // "hello world" has no EN pattern keywords (the|is|are|...)
    const langs = router.detectMixedLanguages('hello world');
    expect(langs).toEqual([]);
  });
});

describe('LanguageRouter.detectWithConfidence()', () => {
  test('high confidence for Chinese', () => {
    const result = router.detectWithConfidence('你好吗朋友怎么样');
    expect(result.language).toBe('zh');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  test('low confidence for ambiguous text', () => {
    const result = router.detectWithConfidence('123');
    expect(result.confidence).toBeLessThan(0.5);
  });
});

describe('LanguageRouter.filterKeywordsByLanguage()', () => {
  const keywords = [
    { keyword: 'hello', language: 'en' },
    { keyword: 'terima kasih', language: 'ms' },
    { keyword: '你好', language: 'zh' },
    { keyword: 'generic' },
  ];

  test('EN filter keeps English + generic', () => {
    const filtered = router.filterKeywordsByLanguage(keywords, 'en');
    expect(filtered.length).toBe(2);
  });

  test('MS filter keeps Malay + English fallback + generic', () => {
    const filtered = router.filterKeywordsByLanguage(keywords, 'ms');
    expect(filtered.length).toBe(3);
  });

  test('unknown returns all', () => {
    const filtered = router.filterKeywordsByLanguage(keywords, 'unknown');
    expect(filtered.length).toBe(4);
  });
});

describe('Performance', () => {
  test('100 detections in <100ms', () => {
    const texts = ['hello there friend', 'saya nak tahu', '你好吗朋友', 'what time is check in', 'ini adalah bilik', 'wifi密码是什么'];
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      router.detectLanguage(texts[i % texts.length]);
    }
    expect(Date.now() - start).toBeLessThan(100);
  });
});
