'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { decryptAndAnalyze } = require('./src/decrypt-service');
const { AppError, toPublicError } = require('./src/errors');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET') {
      serveStatic(req, res);
      return;
    }
    if (req.method === 'POST' && req.url === '/api/decrypt') {
      await handleDecrypt(req, res);
      return;
    }
    sendJson(res, 404, { ok: false, error: { code: 'NOT_FOUND', message: '路径不存在。', details: {} } });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error('[server]', error && error.message ? error.message : error);
    }
    sendJson(res, error instanceof AppError ? statusFor(error.code) : 500, {
      ok: false,
      error: toPublicError(error)
    });
  }
});

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const normalized = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, normalized);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { ok: false, error: { code: 'FORBIDDEN', message: '禁止访问。', details: {} } });
    return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 404, { ok: false, error: { code: 'NOT_FOUND', message: '文件不存在。', details: {} } });
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(content);
  });
}

async function handleDecrypt(req, res) {
  const type = req.headers['content-type'] || '';
  if (!type.toLowerCase().startsWith('application/json')) {
    sendJson(res, 415, { ok: false, error: { code: 'INVALID_WRAPPER', message: 'POST /api/decrypt 只接受 application/json。', details: {} } });
    return;
  }
  const body = await readBody(req);
  let payload;
  try {
    payload = JSON.parse(body);
  } catch (_) {
    throw new AppError('INVALID_WRAPPER', '请求体必须是 JSON。');
  }
  if (!payload || typeof payload.input !== 'string') {
    throw new AppError('INVALID_WRAPPER', '请求体必须包含字符串 input 字段。');
  }
  const result = await decryptAndAnalyze(payload.input);
  sendJson(res, 200, { ok: true, ...result });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new AppError('PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function statusFor(code) {
  if (code === 'PAYLOAD_TOO_LARGE') return 413;
  if (code === 'WBOX_INIT_FAILED' || code === 'INTERNAL_ERROR') return 500;
  return 400;
}

function sendJson(res, status, value) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(value));
}

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`DH ShoppingV2 decrypt server listening at http://${HOST}:${PORT}`);
  });
}

module.exports = { server, HOST, PORT };
