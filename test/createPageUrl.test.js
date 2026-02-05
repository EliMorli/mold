import test from 'node:test';
import assert from 'node:assert/strict';
import { createPageUrl } from '../src/utils/index.js';

test('createPageUrl converts title case to path', () => {
  assert.equal(createPageUrl('Custom Reports'), '/custom-reports');
});

test('createPageUrl lowercases single word', () => {
  assert.equal(createPageUrl('Dashboard'), '/dashboard');
});
