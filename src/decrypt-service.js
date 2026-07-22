'use strict';

const { parseInput } = require('./input-parser');
const { decryptBase64 } = require('./wbox-runtime');
const { cleanJson } = require('./json-cleaner');
const { classifyPayload, analyzePayload } = require('./shoppingv2-analyzer');
const { AppError } = require('./errors');

const FIXED_IV = [
  121, 96, 7, 103,
  57, 95, 61, 124,
  121, 96, 7, 103,
  57, 95, 61, 124
];

async function decryptAndAnalyze(input) {
  const parsed = parseInput(input);
  let plaintext;
  try {
    plaintext = await decryptBase64(parsed.ciphertext, FIXED_IV);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('DECRYPT_FAILED');
  }

  let raw;
  try {
    raw = JSON.parse(plaintext);
  } catch (error) {
    throw new AppError('INVALID_JSON', undefined, { reason: error.message });
  }

  const detectedType = classifyPayload(raw);
  const clean = cleanJson(raw);
  const analysis = analyzePayload(raw);
  return {
    wrapperType: parsed.wrapperType,
    detectedType,
    plaintext,
    raw,
    clean,
    analysis,
    metrics: {
      base64Length: parsed.base64Length,
      cipherByteLength: parsed.cipherByteLength,
      plaintextUtf8ByteLength: Buffer.byteLength(plaintext, 'utf8')
    }
  };
}

module.exports = { FIXED_IV, decryptAndAnalyze };
