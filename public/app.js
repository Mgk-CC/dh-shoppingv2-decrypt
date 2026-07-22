'use strict';

const inputText = document.getElementById('inputText');
const decryptBtn = document.getElementById('decryptBtn');
const clearBtn = document.getElementById('clearBtn');
const statusEl = document.getElementById('status');
const metricsEl = document.getElementById('metrics');
const analysisEl = document.getElementById('analysis');
const jsonView = document.getElementById('jsonView');
const searchInput = document.getElementById('searchInput');
const searchResult = document.getElementById('searchResult');
const copyBtn = document.getElementById('copyBtn');
const downloadJsonBtn = document.getElementById('downloadJsonBtn');
const downloadCsvBtn = document.getElementById('downloadCsvBtn');
const csvReason = document.getElementById('csvReason');
const tabButtons = Array.from(document.querySelectorAll('[data-tab]'));

let result = null;
let activeTab = 'raw';
let tabText = { raw: '', clean: '', analysisJson: '' };

decryptBtn.addEventListener('click', decrypt);
clearBtn.addEventListener('click', clearAll);
copyBtn.addEventListener('click', copyCurrent);
downloadJsonBtn.addEventListener('click', downloadCurrentJson);
downloadCsvBtn.addEventListener('click', downloadCsv);
searchInput.addEventListener('input', updateSearch);
tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeTab = button.dataset.tab;
    tabButtons.forEach((item) => item.classList.toggle('active', item === button));
    renderJson();
  });
});

async function decrypt() {
  const input = inputText.value;
  setBusy(true);
  setStatus('处理中，请稍候。', 'idle');
  try {
    const response = await fetch('/api/decrypt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input })
    });
    const data = await response.json();
    if (!data.ok) {
      throw data.error;
    }
    result = data;
    tabText = {
      raw: JSON.stringify(data.raw, null, 2),
      clean: JSON.stringify(data.clean, null, 2),
      analysisJson: JSON.stringify(data.analysis, null, 2)
    };
    setStatus('解密成功。', 'ok');
    renderMetrics();
    renderAnalysis();
    renderJson();
    copyBtn.disabled = false;
    downloadJsonBtn.disabled = false;
    const hasFlights = data.detectedType === 'shoppingv2-response' && data.analysis.flights && data.analysis.flights.length > 0;
    downloadCsvBtn.disabled = !hasFlights;
    csvReason.textContent = hasFlights ? '' : '无航班数据，flights.csv 不可下载。';
  } catch (error) {
    result = null;
    setStatus(`${error.code || 'ERROR'}：${error.message || '处理失败。'}`, 'error');
    metricsEl.innerHTML = '';
    analysisEl.innerHTML = '';
    jsonView.textContent = '';
    copyBtn.disabled = true;
    downloadJsonBtn.disabled = true;
    downloadCsvBtn.disabled = true;
    csvReason.textContent = '';
  } finally {
    setBusy(false);
  }
}

function clearAll() {
  inputText.value = '';
  result = null;
  tabText = { raw: '', clean: '', analysisJson: '' };
  setStatus('等待输入。', 'idle');
  metricsEl.innerHTML = '';
  analysisEl.innerHTML = '';
  jsonView.textContent = '';
  searchInput.value = '';
  searchResult.textContent = '';
  copyBtn.disabled = true;
  downloadJsonBtn.disabled = true;
  downloadCsvBtn.disabled = true;
  csvReason.textContent = '';
}

function setBusy(busy) {
  decryptBtn.disabled = busy;
  decryptBtn.textContent = busy ? '处理中...' : '解密并分析';
}

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.className = `status ${kind || 'idle'}`;
}

function renderMetrics() {
  const wrapper = result.wrapperType === 'unknown' ? '纯密文' : result.wrapperType;
  const detected = {
    'shoppingv2-request': 'shoppingv2 请求',
    'shoppingv2-response': 'shoppingv2 响应',
    'generic-json': '通用 JSON'
  }[result.detectedType] || result.detectedType;
  metricsEl.innerHTML = [
    ['包装类型', wrapper],
    ['识别类型', detected],
    ['Base64 字符数', result.metrics.base64Length],
    ['密文字节数', result.metrics.cipherByteLength],
    ['明文 UTF-8 字节数', result.metrics.plaintextUtf8ByteLength],
    ['解密状态', '成功']
  ].map(metricCard).join('');
}

function renderAnalysis() {
  if (!result) return;
  const analysis = result.analysis;
  if (analysis.type === 'shoppingv2-request') {
    analysisEl.innerHTML = `<h2>请求摘要</h2>${summaryGrid(analysis.summary)}<h2>请求航段</h2>${table(
      ['depCode', 'arrCode', 'flightDate', 'segIndex', 'depCityName', 'arrCityName', 'leftInner', 'rightInner'],
      analysis.routes
    )}`;
    return;
  }
  if (analysis.type === 'shoppingv2-response') {
    analysisEl.innerHTML = `<h2>响应摘要</h2>${summaryGrid(analysis.summary)}<h2>航班列表</h2>${table(
      ['flightNo', 'depTime', 'arrTime', 'duration', 'depAirportName', 'arrAirportName', 'aircraft', 'lowestPrice', 'lowestPriceWithTax'],
      analysis.flights
    )}<h2>票价详情</h2>${fareTables(analysis.flights)}`;
    return;
  }
  analysisEl.innerHTML = `<h2>通用 JSON</h2>${summaryGrid(analysis.summary)}`;
}

function metricCard([label, value]) {
  return `<div class="metric"><b>${escapeHtml(label)}</b>${escapeHtml(value)}</div>`;
}

function summaryGrid(obj) {
  // 空字符串、null 和 undefined 不创建卡片；0 与 false 属于有效结果，必须保留。
  return `<div class="summary-grid">${Object.entries(obj || {}).filter(([, value]) =>
    hasDisplayValue(value)
  ).map(([key, value]) =>
    `<div class="summary-item"><b>${escapeHtml(key)}</b>${escapeHtml(format(value))}</div>`
  ).join('')}</div>`;
}

function table(headers, rows) {
  if (!rows || !rows.length) return '<p class="hint">暂无数据。</p>';
  return `<div class="table-scroll"><table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) =>
    `<tr>${headers.map((h) => `<td>${escapeHtml(format(row[h]))}</td>`).join('')}</tr>`
  ).join('')}</tbody></table></div>`;
}

function fareTables(flights) {
  if (!flights || !flights.length) return '<p class="hint">暂无航班。</p>';
  return flights.map((flight) => {
    const fares = flight.fares || [];
    const headers = hideEmptyColumns(
      ['baseCabinCode', 'baseCabinCodeText', 'cabinCode', 'salePrice', 'adtTax', 'salePriceWithTax', 'currencyTag'],
      fares
    );
    return `<h3>${escapeHtml(flight.flightNo || '未知航班')}</h3>${table(headers, fares)}`;
  }).join('');
}

function hideEmptyColumns(headers, rows) {
  // 整列都没有有效值时隐藏列，减少票价表中的无意义空白。
  return headers.filter((header) => rows.some((row) => hasDisplayValue(row && row[header])));
}

function hasDisplayValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function renderJson() {
  jsonView.textContent = tabText[activeTab] || '';
  updateSearch();
}

function updateSearch() {
  const keyword = searchInput.value;
  const text = tabText[activeTab] || '';
  if (!keyword) {
    searchResult.textContent = '';
    return;
  }
  let count = 0;
  let pos = text.indexOf(keyword);
  while (pos !== -1) {
    count += 1;
    pos = text.indexOf(keyword, pos + keyword.length);
  }
  searchResult.textContent = `匹配 ${count} 处`;
}

async function copyCurrent() {
  await navigator.clipboard.writeText(tabText[activeTab] || '');
  setStatus('当前 JSON 已复制。', 'ok');
}

function downloadCurrentJson() {
  const name = activeTab === 'analysisJson' ? 'analysis.json' : `${activeTab}.json`;
  downloadText(name, tabText[activeTab] || '', 'application/json;charset=utf-8');
}

function downloadCsv() {
  if (!result || result.detectedType !== 'shoppingv2-response') return;
  const csv = buildCsv(result.analysis);
  downloadText('flights.csv', csv, 'text/csv;charset=utf-8');
}

function buildCsv(analysis) {
  const columns = ['航班号','出发时间','到达时间','飞行时长','出发机场','出发航站楼','到达机场','到达航站楼','机型','是否经停','舱位大类','舱位名称','舱位代码','不含税价格','成人税费','含税总价','币种'];
  const rows = [columns];
  for (const flight of analysis.flights || []) {
    for (const fare of flight.fares || []) {
      rows.push([flight.flightNo, flight.depTime, flight.arrTime, flight.duration, flight.depAirportName, flight.depTerminal, flight.arrAirportName, flight.arrTerminal, flight.aircraft, flight.isStop, fare.baseCabinCode, fare.baseCabinCodeText, fare.cabinCode, fare.salePrice, fare.adtTax, fare.salePriceWithTax, fare.currencyTag]);
    }
  }
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  if (/[",\r\n]/.test(text)) text = '"' + text.replace(/"/g, '""') + '"';
  return text;
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function format(value) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return JSON.stringify(value);
  if (value === null || value === undefined) return '';
  return String(value);
}

function escapeHtml(value) {
  return format(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
