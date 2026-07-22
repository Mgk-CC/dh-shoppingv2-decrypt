'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { decryptBase64, encryptBase64ForTest } = require('../src/wbox-runtime');
const { FIXED_IV, decryptAndAnalyze } = require('../src/decrypt-service');

test('WBOX round-trip decrypts exact plaintext and parses JSON', async () => {
  const plaintext = JSON.stringify({ routes: [{ depCode: 'SHA', arrCode: 'PEK' }], tripType: 'OW' });
  const ciphertext = await encryptBase64ForTest(plaintext, FIXED_IV);
  const decrypted = await decryptBase64(ciphertext, FIXED_IV);
  assert.equal(decrypted, plaintext);
  assert.deepEqual(JSON.parse(decrypted), JSON.parse(plaintext));
  const result = await decryptAndAnalyze(JSON.stringify({ req: ciphertext }));
  assert.equal(result.detectedType, 'shoppingv2-request');
});

test('wrong ciphertext does not crash process', async () => {
  const ciphertext = Buffer.alloc(16, 1).toString('base64');
  await assert.rejects(() => decryptAndAnalyze(ciphertext), (error) => {
    assert.ok(['DECRYPT_FAILED', 'INVALID_JSON'].includes(error.code));
    return true;
  });
});
