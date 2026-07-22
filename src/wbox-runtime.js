'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { AppError } = require('./errors');

const VENDOR_DIR = path.join(__dirname, '..', 'vendor');
let runtimePromise;

function getRuntime() {
  if (!runtimePromise) runtimePromise = initRuntime();
  return runtimePromise;
}

async function initRuntime() {
  try {
    let runtimeReadyResolve;
    let runtimeReadyReject;
    const runtimeReady = new Promise((resolve, reject) => {
      runtimeReadyResolve = resolve;
      runtimeReadyReject = reject;
    });
    const context = {
      console: {
        log() {},
        warn() {},
        error() {}
      },
      require,
      process,
      Buffer,
      WebAssembly,
      atob(value) {
        return Buffer.from(value, 'base64').toString('binary');
      },
      btoa(value) {
        return Buffer.from(value, 'binary').toString('base64');
      },
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      __dirname: VENDOR_DIR,
      __filename: path.join(VENDOR_DIR, 'wbsk_Wbox.js'),
      global: null,
      Module: {
        onRuntimeInitialized() {
          runtimeReadyResolve();
        },
        onAbort(what) {
          runtimeReadyReject(new Error(String(what || 'WBOX aborted')));
        },
        print() {},
        printErr() {}
      }
    };
    context.global = context;
    vm.createContext(context);

    const wboxCode = fs.readFileSync(path.join(VENDOR_DIR, 'wbsk_Wbox.js'), 'utf8');
    const skbCode = fs.readFileSync(path.join(VENDOR_DIR, 'wbsk_skb.js'), 'utf8');
    vm.runInContext(wboxCode, context, { filename: 'vendor/wbsk_Wbox.js' });
    await waitForRuntime(context, runtimeReady);
    vm.runInContext(skbCode, context, { filename: 'vendor/wbsk_skb.js' });

    if (typeof context.wbsk_AES_cbc_decrypt_base64 !== 'function') {
      throw new Error('wbsk_AES_cbc_decrypt_base64 is unavailable');
    }
    return context;
  } catch (error) {
    runtimePromise = undefined;
    throw new AppError('WBOX_INIT_FAILED', undefined, { reason: error.message });
  }
}

function waitForRuntime(context, runtimeReady) {
  return Promise.race([
    runtimeReady,
    new Promise((_, reject) => {
      const check = () => {
        try {
          reject(new Error('WBOX runtime initialization timed out'));
        } catch (error) {
          reject(error);
        }
      };
      setTimeout(check, 5000);
    })
  ]);
}

async function decryptBase64(ciphertext, iv) {
  const context = await getRuntime();
  try {
    const result = context.wbsk_AES_cbc_decrypt_base64(ciphertext, iv);
    if (typeof result !== 'string') {
      throw new Error('WBOX returned non-string plaintext');
    }
    return result;
  } catch (error) {
    throw new AppError('DECRYPT_FAILED', undefined, { reason: error.message });
  }
}

async function encryptBase64ForTest(plaintext, iv) {
  const context = await getRuntime();
  if (typeof context.wbsk_AES_cbc_encrypt_base64 !== 'function') {
    throw new Error('wbsk_AES_cbc_encrypt_base64 is unavailable');
  }
  return context.wbsk_AES_cbc_encrypt_base64(plaintext, iv);
}

module.exports = { decryptBase64, encryptBase64ForTest, getRuntime };
