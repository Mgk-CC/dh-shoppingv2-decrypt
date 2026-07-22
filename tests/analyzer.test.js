'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyPayload,
  analyzePayload,
  extractAircraft
} = require('../src/shoppingv2-analyzer');

test('detects and analyzes shoppingv2 request with multiple routes', () => {
  const raw = {
    currentQueryType: 'Q',
    tripType: 'OW',
    productType: 'flight',
    transactionId: 'tx1',
    routes: [
      { depCode: 'SHA', arrCode: 'PEK', flightDate: '2026-08-01', segIndex: 0 },
      { depCode: 'PEK', arrCode: 'SHA', flightDate: '2026-08-02', segIndex: 1 }
    ]
  };
  const analysis = analyzePayload(raw);
  assert.equal(classifyPayload(raw), 'shoppingv2-request');
  assert.equal(analysis.summary.routeCount, 2);
  assert.equal(analysis.routes[1].arrCode, 'SHA');
});

test('detects generic json', () => {
  const analysis = analyzePayload({ a: 1, b: 2 });
  assert.equal(classifyPayload({ a: 1 }), 'generic-json');
  assert.equal(analysis.summary.topLevelKeyCount, 2);
});

test('detects response, flights, fares, bad prices, duration and aircraft', () => {
  const raw = {
    resultCode: '0',
    resultMsg: 'ok',
    data: {
      depName: '上海',
      arrName: '北京',
      shoppingResKey: 'rk',
      shoppingReqCackeKey: 'ck',
      flights: [
        {
          flightNoGroup: ['MU5101'],
          depTime: '08:00',
          arrTime: '10:20',
          upsideTips2: [{ type: 'ICON', text: 'x' }, { type: 'TXT', text: '2小时20分' }],
          depAirportName: '虹桥',
          arrAirportName: '首都',
          leftAttributes: [{ text: '空客320(窄)' }],
          fares: [
            { baseCabinCode: 'Y', baseCabinCodeText: '经济舱', cabinCode: 'Y', salePrice: '500', adtTax: '60', salePriceWithTax: '560', currencyTag: '¥' },
            { baseCabinCode: 'C', cabinCode: 'C', salePrice: 'bad', salePriceWithTax: '1200' }
          ]
        },
        {
          flightNoGroup: 'MU5103',
          leftAttributes: [{ text: '机型73H' }]
        }
      ]
    }
  };
  const analysis = analyzePayload(raw);
  assert.equal(classifyPayload(raw), 'shoppingv2-response');
  assert.equal(analysis.summary.flightCount, 2);
  assert.equal(analysis.summary.lowestPrice, 500);
  assert.equal(analysis.flights[0].duration, '2小时20分');
  assert.equal(analysis.flights[0].aircraft, '空客320(窄)');
  assert.equal(analysis.flights[0].fares[1].salePrice, null);
  assert.equal(analysis.flights[1].fares.length, 0);
  assert.equal(Object.hasOwn(analysis, 'filters'), false);
});

test('supports aircraft variants and empty flights response', () => {
  assert.equal(extractAircraft([{ text: '机型732' }]), '机型732');
  assert.equal(extractAircraft([{ text: '机型73B' }]), '机型73B');
  const analysis = analyzePayload({ code: '0', data: { flights: [] } });
  assert.equal(analysis.summary.flightCount, 0);
  assert.equal(analysis.summary.lowestPrice, null);
});

test('response summary omits empty MU price fields but preserves numeric zero', () => {
  const empty = analyzePayload({
    code: '0',
    data: { flights: [], minPriceForMu: null, minPriceForMuWithTax: '' }
  });
  assert.equal(Object.hasOwn(empty.summary, 'minPriceForMu'), false);
  assert.equal(Object.hasOwn(empty.summary, 'minPriceForMuWithTax'), false);

  const zero = analyzePayload({
    code: '0',
    data: { flights: [], minPriceForMu: 0, minPriceForMuWithTax: '0' }
  });
  assert.equal(zero.summary.minPriceForMu, 0);
  assert.equal(zero.summary.minPriceForMuWithTax, 0);
});
