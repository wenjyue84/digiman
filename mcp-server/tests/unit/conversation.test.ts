import { describe, test, expect, beforeEach } from 'vitest';
import {
  getOrCreate,
  addMessage,
  getMessages,
  clearConversation,
  updateLastIntent,
  checkRepeatIntent,
  getLastIntent,
  updateSlots,
  getSlots,
  clearSlots,
  _getConversationsSize,
} from '../../src/assistant/conversation.js';

const PHONE = '+60123456789';
const NAME = 'Test Guest';

describe('Conversation state management', () => {
  beforeEach(() => {
    clearConversation(PHONE);
  });

  test('getOrCreate creates a new conversation', () => {
    const state = getOrCreate(PHONE, NAME);
    expect(state.phone).toBe(PHONE);
    expect(state.pushName).toBe(NAME);
    expect(state.messages).toHaveLength(0);
    expect(state.language).toBe('en');
  });

  test('getOrCreate returns existing conversation', () => {
    const first = getOrCreate(PHONE, NAME);
    addMessage(PHONE, 'user', 'hello');
    const second = getOrCreate(PHONE, NAME);
    expect(second.messages).toHaveLength(1);
  });

  test('addMessage appends to history', () => {
    getOrCreate(PHONE, NAME);
    addMessage(PHONE, 'user', 'hello');
    addMessage(PHONE, 'assistant', 'hi there!');
    const msgs = getMessages(PHONE);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('user');
    expect(msgs[1].role).toBe('assistant');
  });

  test('messages trim to MAX_MESSAGES (20)', () => {
    getOrCreate(PHONE, NAME);
    for (let i = 0; i < 25; i++) {
      addMessage(PHONE, 'user', `message ${i}`);
    }
    const msgs = getMessages(PHONE);
    expect(msgs.length).toBeLessThanOrEqual(20);
    // Last message should be the most recent
    expect(msgs[msgs.length - 1].content).toBe('message 24');
  });

  test('clearConversation removes it', () => {
    getOrCreate(PHONE, NAME);
    addMessage(PHONE, 'user', 'hello');
    clearConversation(PHONE);
    expect(getMessages(PHONE)).toHaveLength(0);
  });
});

describe('Intent tracking', () => {
  beforeEach(() => {
    clearConversation(PHONE);
    getOrCreate(PHONE, NAME);
  });

  test('updateLastIntent and getLastIntent', () => {
    updateLastIntent(PHONE, 'wifi', 0.95);
    expect(getLastIntent(PHONE)).toBe('wifi');
  });

  test('checkRepeatIntent detects same intent within window', () => {
    updateLastIntent(PHONE, 'wifi', 0.9);
    const result = checkRepeatIntent(PHONE, 'wifi');
    expect(result.isRepeat).toBe(true);
    expect(result.count).toBe(1);
  });

  test('checkRepeatIntent resets on different intent', () => {
    updateLastIntent(PHONE, 'wifi', 0.9);
    const result = checkRepeatIntent(PHONE, 'pricing');
    expect(result.isRepeat).toBe(false);
    expect(result.count).toBe(0);
  });
});

describe('Slots', () => {
  beforeEach(() => {
    clearConversation(PHONE);
    getOrCreate(PHONE, NAME);
  });

  test('updateSlots and getSlots', () => {
    updateSlots(PHONE, { checkInDate: 'tomorrow', guests: 2 });
    const slots = getSlots(PHONE);
    expect(slots.checkInDate).toBe('tomorrow');
    expect(slots.guests).toBe(2);
  });

  test('updateSlots merges with existing', () => {
    updateSlots(PHONE, { checkInDate: 'tomorrow' });
    updateSlots(PHONE, { guests: 3 });
    const slots = getSlots(PHONE);
    expect(slots.checkInDate).toBe('tomorrow');
    expect(slots.guests).toBe(3);
  });

  test('clearSlots removes all slots', () => {
    updateSlots(PHONE, { checkInDate: 'tomorrow' });
    clearSlots(PHONE);
    expect(getSlots(PHONE)).toEqual({});
  });
});
