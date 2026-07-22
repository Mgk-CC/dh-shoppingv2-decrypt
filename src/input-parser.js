'use strict';

const { AppError } = require('./errors');

const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const BASE64_RE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function parseInput(input) {
  if (typeof input !== 'string') {
    throw new AppError('INVALID_WRAPPER', '输入必须是字符串。');
  }
  if (Buffer.byteLength(input, 'utf8') > MAX_INPUT_BYTES) {
    throw new AppError('PAYLOAD_TOO_LARGE');
  }

  const trimmed = input.trim();
  if (!trimmed) {
    throw new AppError('EMPTY_INPUT');
  }

  let wrapperType = 'unknown';
  let candidate = trimmed;

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const hasReq = Object.prototype.hasOwnProperty.call(parsed, 'req');
      const hasRes = Object.prototype.hasOwnProperty.call(parsed, 'res');
      if (hasReq && hasRes) {
        throw new AppError('AMBIGUOUS_WRAPPER');
      }
      if (hasReq || hasRes) {
        wrapperType = hasReq ? 'req' : 'res';
        candidate = parsed[wrapperType];
        if (typeof candidate !== 'string') {
          throw new AppError('INVALID_WRAPPER', `${wrapperType} 字段必须是字符串。`);
        }
      }
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
  }

  const ciphertext = candidate.replace(/[ \t\r\n]/g, '');
  validateBase64(ciphertext);
  const cipherByteLength = Buffer.from(ciphertext, 'base64').length;
  if (cipherByteLength === 0 || cipherByteLength % 16 !== 0) {
    throw new AppError('INVALID_BLOCK_LENGTH');
  }

  return {
    wrapperType,
    ciphertext,
    base64Length: ciphertext.length,
    cipherByteLength
  };
}

function validateBase64(value) {
  if (!value) {
    throw new AppError('EMPTY_INPUT');
  }
  if (value.length % 4 !== 0 || !BASE64_RE.test(value)) {
    throw new AppError('INVALID_BASE64');
  }
  const firstPad = value.indexOf('=');
  if (firstPad !== -1 && !/^={1,2}$/.test(value.slice(firstPad))) {
    throw new AppError('INVALID_BASE64');
  }
}

module.exports = { parseInput, validateBase64 };
