/**
 * Global test setup for unit tests.
 * Initializes configStore so modules that depend on it can load data.
 */
import { beforeAll } from 'vitest';
import { configStore } from '../src/assistant/config-store.js';

beforeAll(() => {
  configStore.init();
});
