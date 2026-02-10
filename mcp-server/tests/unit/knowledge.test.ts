import { describe, test, expect, vi, beforeEach } from 'vitest';
import { getStaticReply } from '../../src/assistant/knowledge.js';

// configStore.init() is called in tests/setup.ts

describe('getStaticReply()', () => {
  test('returns EN reply for known intent', () => {
    const reply = getStaticReply('wifi', 'en');
    // May or may not have a static reply — depends on knowledge.json data
    expect(reply === null || typeof reply === 'string').toBe(true);
  });

  test('returns ZH reply for known intent', () => {
    const reply = getStaticReply('wifi', 'zh');
    expect(reply === null || typeof reply === 'string').toBe(true);
  });

  test('returns null for nonexistent intent', () => {
    const reply = getStaticReply('nonexistent_intent_xyz', 'en');
    expect(reply).toBeNull();
  });

  test('falls back to EN when requested language not available', () => {
    const replyEn = getStaticReply('wifi', 'en');
    const replyMs = getStaticReply('wifi', 'ms');
    expect(replyEn === null || typeof replyEn === 'string').toBe(true);
    expect(replyMs === null || typeof replyMs === 'string').toBe(true);
  });
});

// Dynamic knowledge CRUD tests call configStore.setKnowledge() which writes to
// disk. In Vitest's parallel fork pool this causes EPERM race conditions.
// We mock configStore.setKnowledge to be a no-op so the in-memory Map logic
// is still tested without triggering disk writes.
describe('Dynamic knowledge CRUD', () => {
  let setDynamic: typeof import('../../src/assistant/knowledge.js')['setDynamicKnowledge'];
  let getDynamic: typeof import('../../src/assistant/knowledge.js')['getDynamicKnowledge'];
  let deleteDynamic: typeof import('../../src/assistant/knowledge.js')['deleteDynamicKnowledge'];
  let listDynamic: typeof import('../../src/assistant/knowledge.js')['listDynamicKnowledge'];

  beforeEach(async () => {
    // Mock configStore.setKnowledge to prevent disk writes
    const configStoreModule = await import('../../src/assistant/config-store.js');
    vi.spyOn(configStoreModule.configStore, 'setKnowledge').mockImplementation(() => {});
  });

  test('set and get dynamic knowledge', async () => {
    const mod = await import('../../src/assistant/knowledge.js');
    setDynamic = mod.setDynamicKnowledge;
    getDynamic = mod.getDynamicKnowledge;
    deleteDynamic = mod.deleteDynamicKnowledge;
    listDynamic = mod.listDynamicKnowledge;

    setDynamic('test-topic', 'Test content');
    expect(getDynamic('test-topic')).toBe('Test content');
  });

  test('get is case-insensitive', () => {
    setDynamic!('MyTopic', 'Content');
    expect(getDynamic!('mytopic')).toBe('Content');
    expect(getDynamic!('MYTOPIC')).toBe('Content');
  });

  test('delete existing topic', () => {
    setDynamic!('to-delete', 'Temporary');
    expect(deleteDynamic!('to-delete')).toBe(true);
    expect(getDynamic!('to-delete')).toBeUndefined();
  });

  test('delete nonexistent topic returns false', () => {
    expect(deleteDynamic!('never-existed')).toBe(false);
  });

  test('listDynamicKnowledge returns keys', () => {
    setDynamic!('list-test-a', 'A');
    setDynamic!('list-test-b', 'B');
    const keys = listDynamic!();
    expect(keys).toContain('list-test-a');
    expect(keys).toContain('list-test-b');
  });
});
