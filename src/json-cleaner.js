'use strict';

function cleanJson(value) {
  const cleaned = cleanValue(value);
  return cleaned === undefined ? (Array.isArray(value) ? [] : {}) : cleaned;
}

function cleanValue(value) {
  if (value === null || value === '') return undefined;
  if (Array.isArray(value)) {
    const items = value.map(cleanValue).filter((item) => item !== undefined);
    return items.length ? items : undefined;
  }
  if (value && typeof value === 'object') {
    const output = {};
    for (const [key, child] of Object.entries(value)) {
      const cleaned = cleanValue(child);
      if (cleaned !== undefined) output[key] = cleaned;
    }
    return Object.keys(output).length ? output : undefined;
  }
  return value;
}

module.exports = { cleanJson };
