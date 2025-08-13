// Super simple test that should definitely pass
import { test, expect } from '@jest/globals';

test('basic math', () => {
  expect(1 + 1).toBe(2);
});

test('string operations', () => {
  expect('hello world').toBe('hello world');
  expect('test'.length).toBe(4);
});

test('array operations', () => {
  const arr = [1, 2, 3];
  expect(arr.length).toBe(3);
  expect(arr[0]).toBe(1);
});

test('object operations', () => {
  const obj = { name: 'test', value: 42 };
  expect(obj.name).toBe('test');
  expect(obj.value).toBe(42);
});

test('date operations', () => {
  const date = new Date('2024-01-01');
  expect(date.getFullYear()).toBe(2024);
});