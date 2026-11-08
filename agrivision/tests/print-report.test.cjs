const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/print-report.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = new Module('print-report');
loaded._compile(compiled, 'print-report.js');
const { printReport } = loaded.exports;

test('printing isolates a cloned report and cleans up after printing', () => {
  const originalDocument = global.document, originalWindow = global.window;
  let root = null, afterprint, calls = 0;
  const clone = { content: 'report content' };
  const report = { cloneNode(deep) { assert.equal(deep, true); return clone; } };
  global.document = {
    getElementById: () => root,
    createElement: () => ({ children: [], appendChild(child) { this.children.push(child); }, remove() { if (root === this) root = null; } }),
    body: { appendChild(element) { root = element; } },
  };
  global.window = { addEventListener(name, fn) { assert.equal(name, 'afterprint'); afterprint = fn; }, removeEventListener() {}, print() { calls++; assert.equal(root.id, 'folland-print-root'); assert.deepEqual(root.children, [clone]); } };
  try {
    printReport(null); assert.equal(calls, 0);
    printReport(report); assert.equal(calls, 1); assert.notEqual(root.children[0], report);
    afterprint(); assert.equal(root, null);
    global.window.print = () => { throw Error('printer unavailable'); };
    assert.throws(() => printReport(report), /printer unavailable/); assert.equal(root, null);
  } finally { global.document = originalDocument; global.window = originalWindow; }
});
