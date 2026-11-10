const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
exports.runtime = (overrides = {}, mocks = {}) => {
  const cache = new Map();
  const context = vm.createContext({ console, URL, URLSearchParams, Blob, File, Response, Request, Headers, Buffer, TextEncoder, TextDecoder, AbortSignal, setTimeout, clearTimeout, crypto: require('node:crypto').webcrypto, ...overrides });
  function load(name) {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (!name.startsWith('@/')) return require(name);
    let file = path.resolve(__dirname, '..', name.slice(2));
    if (!path.extname(file)) file += '.ts';
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const source = fs.readFileSync(file, 'utf8');
    if (file.endsWith('.json')) { module.exports = JSON.parse(source); return module.exports; }
    const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.runInContext('(function(require,module,exports){' + js + '\n})', context, {filename:file})(load, module, module.exports);
    return module.exports;
  }
  return { load, context };
};
