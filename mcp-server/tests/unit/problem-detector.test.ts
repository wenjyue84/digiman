import { describe, test, expect } from 'vitest';
import { detectMessageType } from '../../src/assistant/problem-detector.js';

describe('detectMessageType()', () => {
  describe('Complaints — strong negative sentiment', () => {
    test.each([
      'This is terrible! I want a refund!',
      'Disgusting room, unacceptable!',
      'I am so angry right now, worst experience ever',
      'Ridiculous! Where is the manager?',
    ])('EN complaint: "%s"', (msg) => {
      expect(detectMessageType(msg)).toBe('complaint');
    });

    test.each([
      'Teruk sangat! Nak refund!',
      'Saya marah, tak puas hati',
      'Sangat teruk perkhidmatan ini',
    ])('MS complaint: "%s"', (msg) => {
      expect(detectMessageType(msg)).toBe('complaint');
    });

    test.each([
      '太差了！我要退款！',
      '非常失望，差劲的服务',
      '我生气了，要投诉',
    ])('ZH complaint: "%s"', (msg) => {
      expect(detectMessageType(msg)).toBe('complaint');
    });
  });

  describe('Problems — malfunction reports', () => {
    test.each([
      "The wifi doesn't work",
      "I can't open the door",
      'The air-con is broken',
      'No signal in my room',
    ])('EN problem: "%s"', (msg) => {
      expect(detectMessageType(msg)).toBe('problem');
    });

    test.each([
      'Air-con tak boleh jalan',
      'Wifi rosak',
      'Tidak boleh masuk bilik',
    ])('MS problem: "%s"', (msg) => {
      expect(detectMessageType(msg)).toBe('problem');
    });

    test.each([
      '连不上网络',
      '空调坏了',
      '门不能开',
    ])('ZH problem: "%s"', (msg) => {
      expect(detectMessageType(msg)).toBe('problem');
    });
  });

  describe('Info requests — neutral', () => {
    test.each([
      'What is the wifi password?',
      'How much per night?',
      'When is check in time?',
      'Do you have parking?',
      '几点退房？',
      'Berapa harga?',
    ])('info: "%s"', (msg) => {
      expect(detectMessageType(msg)).toBe('info');
    });
  });

  describe('Priority: complaint wins over problem', () => {
    test('message with both complaint and problem words', () => {
      // "terrible" (complaint) + "not working" (problem)
      expect(detectMessageType('This is terrible, nothing is working!')).toBe('complaint');
    });
  });
});
