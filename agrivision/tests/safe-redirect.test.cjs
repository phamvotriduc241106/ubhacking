const assert = require('node:assert/strict');
const { safeNext } = require('../src/lib/supabase/redirect.ts');
assert.equal(safeNext('/account'), '/account');
for (const value of ['//evil.example', '/\\evil.example', 'https://evil.example', '/\n/evil.example']) assert.equal(safeNext(value), '/');
