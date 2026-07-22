'use strict';

const CSV_COLUMNS = [
  '航班号',
  '出发时间',
  '到达时间',
  '飞行时长',
  '出发机场',
  '出发航站楼',
  '到达机场',
  '到达航站楼',
  '机型',
  '是否经停',
  '舱位大类',
  '舱位名称',
  '舱位代码',
  '不含税价格',
  '成人税费',
  '含税总价',
  '币种'
];

function jsonExport(value) {
  return JSON.stringify(value, null, 2);
}

function flightsToCsv(analysis) {
  const rows = [CSV_COLUMNS];
  if (analysis && analysis.type === 'shoppingv2-response') {
    for (const flight of analysis.flights || []) {
      const fares = flight.fares && flight.fares.length ? flight.fares : [{}];
      for (const fare of fares) {
        rows.push([
          flight.flightNo,
          flight.depTime,
          flight.arrTime,
          flight.duration,
          flight.depAirportName,
          flight.depTerminal,
          flight.arrAirportName,
          flight.arrTerminal,
          flight.aircraft,
          flight.isStop,
          fare.baseCabinCode,
          fare.baseCabinCodeText,
          fare.cabinCode,
          fare.salePrice,
          fare.adtTax,
          fare.salePriceWithTax,
          fare.currencyTag
        ]);
      }
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

module.exports = { CSV_COLUMNS, jsonExport, flightsToCsv, csvCell };
