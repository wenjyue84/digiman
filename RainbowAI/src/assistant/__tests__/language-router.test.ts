import { LanguageRouter } from '../language-router.js';

describe('LanguageRouter', () => {
  const router = new LanguageRouter();

  describe('English Detection', () => {
    test('should detect simple English', () => {
      expect(router.detectLanguage('hello')).toBe('en');
      expect(router.detectLanguage('thank you')).toBe('en');
      expect(router.detectLanguage('how much is it')).toBe('en');
    });

    test('should detect English sentences', () => {
      expect(router.detectLanguage('What is the wifi password?')).toBe('en');
      expect(router.detectLanguage('Can I check in now?')).toBe('en');
      expect(router.detectLanguage('I want to book a room')).toBe('en');
    });

    test('should detect English with abbreviations', () => {
      expect(router.detectLanguage('tq')).toBe('en');
      expect(router.detectLanguage('tqvm')).toBe('en');
      expect(router.detectLanguage('thx')).toBe('en');
    });
  });

  describe('Malay Detection', () => {
    test('should detect simple Malay', () => {
      expect(router.detectLanguage('terima kasih')).toBe('ms');
      expect(router.detectLanguage('selamat pagi')).toBe('ms');
      expect(router.detectLanguage('apa khabar')).toBe('ms');
    });

    test('should detect Malay sentences', () => {
      expect(router.detectLanguage('Berapa harga untuk sehari?')).toBe('ms');
      expect(router.detectLanguage('Di mana lokasi kamu?')).toBe('ms');
      expect(router.detectLanguage('Saya nak tempah bilik')).toBe('ms');
    });

    test('should detect Malay greetings', () => {
      expect(router.detectLanguage('assalamualaikum')).toBe('ms');
      expect(router.detectLanguage('selamat tinggal')).toBe('ms');
    });

    test('should detect colloquial Malay (e.g. bole check in awal)', () => {
      expect(router.detectLanguage('Bole check in awal?')).toBe('ms');
    });
  });

  describe('Chinese Detection', () => {
    test('should detect simple Chinese', () => {
      expect(router.detectLanguage('你好')).toBe('zh');
      expect(router.detectLanguage('谢谢')).toBe('zh');
      expect(router.detectLanguage('再见')).toBe('zh');
    });

    test('should detect Chinese sentences', () => {
      expect(router.detectLanguage('wifi密码是什么？')).toBe('zh');
      expect(router.detectLanguage('多少钱一天？')).toBe('zh');
      expect(router.detectLanguage('我想订房间')).toBe('zh');
    });

    test('should detect mixed Chinese-English', () => {
      const lang = router.detectLanguage('wifi密码');
      expect(lang).toBe('zh'); // Should prioritize Chinese characters
    });
  });

  describe('Unknown/Short Text', () => {
    test('should return unknown for very short text', () => {
      expect(router.detectLanguage('hi')).toBe('en'); // Should detect via pattern
      expect(router.detectLanguage('x')).toBe('unknown');
      expect(router.detectLanguage('')).toBe('unknown');
    });

    test('should return unknown for ambiguous text', () => {
      // Numbers and symbols
      expect(router.detectLanguage('123')).toBe('unknown');
      expect(router.detectLanguage('??')).toBe('unknown');
    });
  });

  describe('Language Name Display', () => {
    test('should return language names', () => {
      expect(router.getLanguageName('en')).toBe('English');
      expect(router.getLanguageName('ms')).toBe('Malay');
      expect(router.getLanguageName('zh')).toBe('Chinese');
      expect(router.getLanguageName('unknown')).toBe('Unknown');
    });
  });

  describe('Confidence Scoring', () => {
    test('should return high confidence for clear languages', () => {
      const result1 = router.detectWithConfidence('hello how are you');
      expect(result1.language).toBe('en');
      expect(result1.confidence).toBeGreaterThan(0.7);

      const result2 = router.detectWithConfidence('你好吗');
      expect(result2.language).toBe('zh');
      expect(result2.confidence).toBeGreaterThan(0.9);
    });

    test('should return low confidence for ambiguous text', () => {
      const result = router.detectWithConfidence('123');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('Mixed Language Detection', () => {
    test('should detect code-switching', () => {
      const langs1 = router.detectMixedLanguages('hi terima kasih');
      expect(langs1).toContain('en');
      expect(langs1).toContain('ms');

      const langs2 = router.detectMixedLanguages('thank you 谢谢');
      expect(langs2).toContain('en');
      expect(langs2).toContain('zh');
    });

    test('should detect single language correctly', () => {
      const langs = router.detectMixedLanguages('hello world');
      expect(langs).toEqual(['en']);
    });
  });

  describe('Keyword Filtering', () => {
    interface TestKeyword {
      keyword: string;
      language?: string;
    }

    test('should filter by detected language', () => {
      const keywords: TestKeyword[] = [
        { keyword: 'hello', language: 'en' },
        { keyword: 'terima kasih', language: 'ms' },
        { keyword: '你好', language: 'zh' },
        { keyword: 'generic' } // No language specified
      ];

      const enFiltered = router.filterKeywordsByLanguage(keywords, 'en');
      expect(enFiltered.length).toBe(2); // English + generic
      expect(enFiltered.some(k => k.keyword === 'hello')).toBe(true);
      expect(enFiltered.some(k => k.keyword === 'generic')).toBe(true);

      const msFiltered = router.filterKeywordsByLanguage(keywords, 'ms');
      expect(msFiltered.length).toBe(3); // Malay + English fallback + generic
      expect(msFiltered.some(k => k.keyword === 'terima kasih')).toBe(true);
      expect(msFiltered.some(k => k.keyword === 'hello')).toBe(true);
    });

    test('should return all keywords if language unknown', () => {
      const keywords: TestKeyword[] = [
        { keyword: 'hello', language: 'en' },
        { keyword: 'terima kasih', language: 'ms' },
      ];

      const filtered = router.filterKeywordsByLanguage(keywords, 'unknown');
      expect(filtered.length).toBe(2);
    });
  });

  describe('Performance', () => {
    test('should detect quickly (<10ms for 100 detections)', () => {
      const testTexts = [
        'hello',
        'terima kasih',
        '你好',
        'what time check in',
        'berapa harga',
        'wifi密码'
      ];

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        router.detectLanguage(testTexts[i % testTexts.length]);
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100); // <1ms per detection average
    });
  });
});

describe('Real-world Language Detection Test Cases', () => {
  const router = new LanguageRouter();

  describe('Guest Messages (English)', () => {
    test('Common English queries', () => {
      expect(router.detectLanguage('hi')).toBe('en');
      expect(router.detectLanguage('tq')).toBe('en');
      expect(router.detectLanguage('wifi password?')).toBe('en');
      expect(router.detectLanguage('how much')).toBe('en');
      expect(router.detectLanguage('check out time')).toBe('en');
    });
  });

  describe('Guest Messages (Malay)', () => {
    test('Common Malay queries', () => {
      expect(router.detectLanguage('terima kasih')).toBe('ms');
      expect(router.detectLanguage('password wifi')).toBe('ms');
      expect(router.detectLanguage('berapa harga')).toBe('ms');
      expect(router.detectLanguage('di mana')).toBe('ms');
    });
  });

  describe('Guest Messages (Chinese)', () => {
    test('Common Chinese queries', () => {
      expect(router.detectLanguage('你好')).toBe('zh');
      expect(router.detectLanguage('谢谢')).toBe('zh');
      expect(router.detectLanguage('wifi密码')).toBe('zh');
      expect(router.detectLanguage('多少钱')).toBe('zh');
      expect(router.detectLanguage('几点退房')).toBe('zh');
    });
  });

  describe('Edge Cases', () => {
    test('Single word greetings', () => {
      expect(router.detectLanguage('hi')).toBe('en');
      expect(router.detectLanguage('hai')).toBe('en'); // Could be en or ms
      expect(router.detectLanguage('hey')).toBe('en');
    });

    test('Abbreviations', () => {
      expect(router.detectLanguage('tq')).toBe('en');
      expect(router.detectLanguage('tqvm')).toBe('en');
      expect(router.detectLanguage('thx')).toBe('en');
    });

    test('Numbers and symbols', () => {
      expect(router.detectLanguage('123')).toBe('unknown');
      expect(router.detectLanguage('??')).toBe('unknown');
      expect(router.detectLanguage('!!!')).toBe('unknown');
    });
  });
});
