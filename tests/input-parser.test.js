'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseInput } = require('../src/input-parser');

const B64 = Buffer.alloc(16).toString('base64');

function code(fn) {
  assert.throws(fn, (error) => Boolean(error.code));
}

test('parses plain Base64', () => {
  const out = parseInput(B64);
  assert.equal(out.wrapperType, 'unknown');
  assert.equal(out.cipherByteLength, 16);
});

test('parses req wrapper', () => {
  assert.equal(parseInput(JSON.stringify({ req: B64 })).wrapperType, 'req');
});

test('parses res wrapper', () => {
  assert.equal(parseInput(JSON.stringify({ res: B64 })).wrapperType, 'res');
});

test('cleans multiline Base64 whitespace', () => {
  assert.equal(parseInput(` ${B64.slice(0, 8)}\n\t${B64.slice(8)} `).ciphertext, B64);
});

test('allows extra wrapper fields', () => {
  assert.equal(parseInput(JSON.stringify({ req: B64, extra: 1 })).wrapperType, 'req');
});

test('rejects req and res conflict', () => {
  assert.throws(() => parseInput(JSON.stringify({ req: B64, res: B64 })), /req 和 res/);
});

test('rejects non-string req or res', () => {
  assert.throws(() => parseInput(JSON.stringify({ req: 1 })), /必须是字符串/);
});

test('rejects illegal Base64 chars', () => {
  code(() => parseInput('AAAA$AAA'));
});

test('rejects bad padding', () => {
  code(() => parseInput('AAAA=AAA'));
});

test('rejects empty input', () => {
  assert.throws(() => parseInput('  '), /不能为空/);
});

test('rejects non AES block length', () => {
  assert.throws(() => parseInput(Buffer.alloc(15).toString('base64')), /16 的倍数/);
});
