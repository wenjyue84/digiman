import { describe, test, expect } from 'vitest';
import { detectLanguage, detectFullLanguage, formatPrice, formatDate } from '../../src/assistant/formatter.js';

describe('detectLanguage() — simple keyword-based', () => {
  test('Chinese characters → zh', () => {
    expect(detectLanguage('你好')).toBe('zh');
    expect(detectLanguage('wifi密码')).toBe('zh');
    expect(detectLanguage('多少钱一晚')).toBe('zh');
  });

  test('Malay keywords (≥2) → ms', () => {
    // MS_KEYWORDS: apa, berapa, bila, mana, saya, boleh, nak, ada, ini, itu, harga, bilik, masuk, keluar, ...
    expect(detectLanguage('saya nak tahu harga bilik')).toBe('ms');
    expect(detectLanguage('ada bilik ini?')).toBe('ms');
  });

  test('Default → en', () => {
    expect(detectLanguage('hello')).toBe('en');
    expect(detectLanguage('how much')).toBe('en');
    expect(detectLanguage('random text')).toBe('en');
  });

  test('Malay with only one keyword stays en', () => {
    // Only one MS keyword is not enough to switch
    expect(detectLanguage('just saya alone')).toBe('en');
  });
});

describe('detectFullLanguage() — extended scripts', () => {
  test('Thai script → Thai', () => {
    expect(detectFullLanguage('สวัสดี')).toBe('Thai');
  });

  test('Japanese script → Japanese', () => {
    expect(detectFullLanguage('こんにちは')).toBe('Japanese');
  });

  test('Korean script → Korean', () => {
    expect(detectFullLanguage('안녕하세요')).toBe('Korean');
  });

  test('Arabic script → Arabic', () => {
    expect(detectFullLanguage('مرحبا')).toBe('Arabic');
  });

  test('Hindi script → Hindi', () => {
    expect(detectFullLanguage('नमस्ते')).toBe('Hindi');
  });

  test('standard EN/MS/ZH → null', () => {
    expect(detectFullLanguage('hello')).toBeNull();
    expect(detectFullLanguage('你好')).toBeNull();
  });
});

describe('formatPrice()', () => {
  test('formats with RM prefix', () => {
    expect(formatPrice(45)).toBe('RM45');
    expect(formatPrice(100)).toBe('RM100');
  });

  test('rounds to integer', () => {
    expect(formatPrice(45.5)).toBe('RM46');
    expect(formatPrice(99.1)).toBe('RM99');
  });
});

describe('formatDate()', () => {
  test('formats in English locale', () => {
    const result = formatDate('2026-03-15', 'en');
    expect(result).toContain('15');
    expect(result).toContain('2026');
  });

  test('formats in different locales without crashing', () => {
    expect(() => formatDate('2026-03-15', 'ms')).not.toThrow();
    expect(() => formatDate('2026-03-15', 'zh')).not.toThrow();
  });
});
