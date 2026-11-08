const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/lib/data-origin.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = new Module('data-origin');
loaded._compile(compiled, 'data-origin.js');
const { dataOrigin } = loaded.exports;

test('reported source is preserved and unknown sources do not become simulated or live', () => {
  assert.equal(dataOrigin('manual'), 'manual');
  assert.equal(dataOrigin('simulated'), 'backend-simulated');
  assert.equal(dataOrigin('live'), 'live');
  assert.equal(dataOrigin('unavailable', true), 'unavailable');
  assert.equal(dataOrigin('manual', true), 'manual');
  assert.equal(dataOrigin(undefined, true), 'live');
  assert.equal(dataOrigin(undefined), 'unavailable');
});
