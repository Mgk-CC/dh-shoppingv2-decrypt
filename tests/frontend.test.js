'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadFrontendFunctions() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  const names = ['summaryGrid', 'hasDisplayValue', 'format', 'escapeHtml'];
  const declarations = names.map((name) => {
    const start = source.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, `missing ${name}`);
    let depth = 0;
    let bodyStarted = false;
    for (let index = start; index < source.length; index += 1) {
      if (source[index] === '{') {
        depth += 1;
        bodyStarted = true;
      } else if (source[index] === '}') {
        depth -= 1;
        if (bodyStarted && depth === 0) return source.slice(start, index + 1);
      }
    }
    throw new Error(`unterminated ${name}`);
  }).join('\n');
  const context = {};
  vm.runInNewContext(`${declarations}; result = { summaryGrid };`, context);
  return context.result;
}

test('summary cards hide empty values but preserve zero and false', () => {
  const { summaryGrid } = loadFrontendFunctions();
  const html = summaryGrid({
    minPriceForMu: null,
    minPriceForMuWithTax: '',
    flightCount: 0,
    available: false,
    depName: '上海'
  });

  assert.doesNotMatch(html, /minPriceForMu/);
  assert.doesNotMatch(html, /minPriceForMuWithTax/);
  assert.match(html, /flightCount/);
  assert.match(html, />0</);
  assert.match(html, /available/);
  assert.match(html, />false</);
  assert.match(html, /depName/);
});

test('page exposes the current build marker and versioned assets', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

  assert.match(html, /修正版 20260722\.3/);
  assert.match(html, /styles\.css\?v=20260722-3/);
  assert.match(html, /app\.js\?v=20260722-3/);
});
