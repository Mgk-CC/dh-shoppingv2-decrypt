'use strict';

const MESSAGES = {
  EMPTY_INPUT: '输入不能为空。',
  AMBIGUOUS_WRAPPER: '输入包含 req 和 res，请只保留其中一个字段。',
  INVALID_WRAPPER: '包装 JSON 必须包含字符串类型的 req 或 res 字段。',
  INVALID_BASE64: '输入不是有效的 Base64 密文。',
  INVALID_BLOCK_LENGTH: 'Base64 解码成功，但密文字节数不是 16 的倍数。',
  PAYLOAD_TOO_LARGE: '输入超过 5 MB 限制。',
  WBOX_INIT_FAILED: 'WBOX 初始化失败。',
  DECRYPT_FAILED: 'WBOX 解密失败，请检查密文和类型。',
  INVALID_JSON: 'WBOX 解密完成，但明文不是合法 JSON。',
  INTERNAL_ERROR: '服务内部错误。'
};

class AppError extends Error {
  constructor(code, message, details) {
    super(message || MESSAGES[code] || MESSAGES.INTERNAL_ERROR);
    this.name = 'AppError';
    this.code = code || 'INTERNAL_ERROR';
    this.details = details || {};
  }
}

function toPublicError(error) {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details || {}
    };
  }
  return {
    code: 'INTERNAL_ERROR',
    message: MESSAGES.INTERNAL_ERROR,
    details: {}
  };
}

module.exports = { AppError, MESSAGES, toPublicError };
