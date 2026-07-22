'use strict';

function classifyPayload(raw) {
  if (isShoppingRequest(raw)) return 'shoppingv2-request';
  if (isShoppingResponse(raw)) return 'shoppingv2-response';
  return 'generic-json';
}

function analyzePayload(raw) {
  if (isShoppingRequest(raw)) return analyzeRequest(raw);
  if (isShoppingResponse(raw)) return analyzeResponse(raw);
  return analyzeGeneric(raw);
}

function isShoppingRequest(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    Array.isArray(value.routes) &&
    ('tripType' in value || 'productType' in value || 'currentQueryType' in value)
  );
}

function isShoppingResponse(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    ('resultCode' in value || 'code' in value) &&
    value.data &&
    typeof value.data === 'object' &&
    Array.isArray(value.data.flights)
  );
}

function pick(obj, keys) {
  const out = {};
  for (const key of keys) out[key] = obj && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : null;
  return out;
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function asNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function textOf(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(textOf).filter(Boolean).join(' ');
  if (typeof value === 'object') {
    return [
      value.text,
      value.title,
      value.name,
      value.label,
      value.value,
      value.leftInner,
      value.rightInner,
      value.content
    ].map(textOf).filter(Boolean).join(' ');
  }
  return '';
}

function analyzeRequest(raw) {
  const summaryKeys = [
    'currentQueryType',
    'currentSegIndex',
    'language',
    'selectedRoutes',
    'productType',
    'tripType',
    'cabinGrade',
    'salesChannel',
    'moduleX',
    'os',
    'appVersion',
    'transactionId'
  ];
  return {
    type: 'shoppingv2-request',
    summary: {
      ...pick(raw, summaryKeys),
      routeCount: raw.routes.length
    },
    routes: raw.routes.map((route) => pick(route || {}, [
      'depCode',
      'arrCode',
      'flightDate',
      'depCodeType',
      'arrCodeType',
      'depCityName',
      'arrCityName',
      'segIndex',
      'leftInner',
      'rightInner'
    ]))
  };
}

function analyzeResponse(raw) {
  const data = raw.data || {};
  const flights = (data.flights || []).map(analyzeFlight);
  removeGloballyEmptyFareField(flights, 'saleOutButtonText');
  const allPrices = flights.flatMap((flight) => flight.fares.map((fare) => fare.salePrice).filter((price) => price !== null));
  const allPricesWithTax = flights.flatMap((flight) => flight.fares.map((fare) => fare.salePriceWithTax).filter((price) => price !== null));

  const summary = {
    resultCode: firstDefined(raw.resultCode, raw.code, null),
    resultMsg: firstDefined(raw.resultMsg, raw.msg, raw.message, null),
    transactionId: firstDefined(raw.transactionId, data.transactionId, null),
    depName: firstDefined(data.depName, data.departName, data.depCityName, null),
    arrName: firstDefined(data.arrName, data.arriveName, data.arrCityName, null),
    flightCount: flights.length,
    lowestPrice: minOrNull(allPrices),
    lowestPriceWithTax: minOrNull(allPricesWithTax),
    shoppingResKey: firstDefined(data.shoppingResKey, raw.shoppingResKey, null),
    shoppingReqCackeKey: firstDefined(data.shoppingReqCackeKey, data.shoppingReqCacheKey, raw.shoppingReqCackeKey, null)
  };

  // MU 专属最低价并非每个响应都会返回；没有有效数字时不生成摘要字段，避免页面出现空卡片。
  assignNumberWhenPresent(summary, 'minPriceForMu', firstDefined(data.minPriceForMu, raw.minPriceForMu));
  assignNumberWhenPresent(summary, 'minPriceForMuWithTax', firstDefined(data.minPriceForMuWithTax, raw.minPriceForMuWithTax));

  return {
    type: 'shoppingv2-response',
    summary,
    flights
  };
}

function assignNumberWhenPresent(target, key, value) {
  const number = asNumber(value);
  if (number !== null) target[key] = number;
}

function analyzeFlight(flight) {
  const fareSource = firstDefined(flight.fares, flight.cabins, flight.fareList, []);
  const fares = Array.isArray(fareSource) ? fareSource.map(analyzeFare) : [];
  const prices = fares.map((fare) => fare.salePrice).filter((price) => price !== null);
  const pricesWithTax = fares.map((fare) => fare.salePriceWithTax).filter((price) => price !== null);
  return {
    flightNo: normalizeFlightNo(flight.flightNoGroup),
    depTime: firstDefined(flight.depTime, flight.departTime, null),
    arrTime: firstDefined(flight.arrTime, flight.arriveTime, null),
    duration: extractDuration(flight),
    depAirportName: firstDefined(flight.depAirportName, flight.departAirportName, null),
    depTerminal: firstDefined(flight.depTerminal, flight.departTerminal, null),
    arrAirportName: firstDefined(flight.arrAirportName, flight.arriveAirportName, null),
    arrTerminal: firstDefined(flight.arrTerminal, flight.arriveTerminal, null),
    aircraft: extractAircraft(flight.leftAttributes),
    isStop: firstDefined(flight.isStop, null),
    defaultSort: firstDefined(flight.defaultSort, null),
    arrDate: firstDefined(flight.arrDate, flight.arriveDate, null),
    gioParams: firstDefined(flight.gioParams, null),
    lowestPrice: minOrNull(prices),
    lowestPriceWithTax: minOrNull(pricesWithTax),
    fares
  };
}

function normalizeFlightNo(value) {
  if (Array.isArray(value)) return value.map(textOf).filter(Boolean).join('/');
  return firstDefined(textOf(value), null);
}

function analyzeFare(fare) {
  return {
    baseCabinCode: firstDefined(fare.baseCabinCode, null),
    baseCabinCodeText: firstDefined(fare.baseCabinCodeText, fare.baseCabinName, null),
    cabinCode: firstDefined(fare.cabinCode, null),
    adtTax: asNumber(fare.adtTax),
    salePrice: asNumber(fare.salePrice),
    salePriceWithTax: asNumber(fare.salePriceWithTax),
    currencyTag: firstDefined(fare.currencyTag, null),
    discountTag: firstDefined(fare.discountTag, null),
    taxTag: firstDefined(fare.taxTag, null),
    taxTagWithTax: firstDefined(fare.taxTagWithTax, null),
    type: firstDefined(fare.type, null),
    saleOutButtonText: firstDefined(fare.saleOutButtonText, null)
  };
}

function removeGloballyEmptyFareField(flights, field) {
  const fares = flights.flatMap((flight) => flight.fares || []);
  if (!fares.length) return;
  const hasValue = fares.some((fare) => {
    const value = fare && fare[field];
    return value !== null && value !== undefined && String(value).trim() !== '';
  });
  if (hasValue) return;
  for (const fare of fares) {
    delete fare[field];
  }
}

function extractDuration(flight) {
  const tips = Array.isArray(flight.upsideTips2) ? flight.upsideTips2 : [];
  const txt = tips.find((item) => item && item.type === 'TXT');
  return firstDefined(textOf(txt), firstDefined(flight.duration, flight.flightDuration, null));
}

function extractAircraft(leftAttributes) {
  const texts = Array.isArray(leftAttributes) ? leftAttributes.map(textOf) : [textOf(leftAttributes)];
  for (const text of texts) {
    const trimmed = text.trim();
    if (!trimmed) continue;
    const model = trimmed.match(/(?:机型\s*)?([A-Za-z0-9]{2,4}|空客\d{3}(?:\([^)]*\))?|波音\d{3}(?:\([^)]*\))?)/);
    if (trimmed.includes('机型')) return trimmed.replace(/^.*?(机型\s*)/, '机型').trim();
    if (model) return trimmed;
  }
  return null;
}

function analyzeGeneric(raw) {
  const isArray = Array.isArray(raw);
  const isObject = raw !== null && typeof raw === 'object' && !isArray;
  const keys = isObject ? Object.keys(raw) : [];
  return {
    type: 'generic-json',
    summary: {
      topLevelType: isArray ? 'array' : isObject ? 'object' : 'primitive',
      topLevelKeys: keys,
      topLevelKeyCount: keys.length
    }
  };
}

function minOrNull(values) {
  return values.length ? Math.min(...values) : null;
}

module.exports = {
  classifyPayload,
  analyzePayload,
  isShoppingRequest,
  isShoppingResponse,
  analyzeRequest,
  analyzeResponse,
  analyzeGeneric,
  extractAircraft,
  extractDuration
};
