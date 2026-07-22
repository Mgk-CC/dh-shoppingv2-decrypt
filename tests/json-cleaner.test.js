'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanJson } = require('../src/json-cleaner');

test('cleans empty values and preserves valid falsey values', () => {
  const raw = {
    a: null,
    b: '',
    c: [],
    d: {},
    e: 0,
    f: false,
    g: 'undefined',
    h: [null, '', [], {}, 0, false, 'ok', { x: '', y: 1 }],
    i: { j: { k: '' }, l: { m: 'v' } }
  };
  const copy = JSON.parse(JSON.stringify(raw));
  const clean = cleanJson(raw);
  assert.deepEqual(clean, {
    e: 0,
    f: false,
    g: 'undefined',
    h: [0, false, 'ok', { y: 1 }],
    i: { l: { m: 'v' } }
  });
  assert.deepEqual(raw, copy);
});
