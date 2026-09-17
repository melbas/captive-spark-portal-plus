const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the actual service without access to any network or live database.
function loadService() {
  let calls = 0;
  const source = fs.readFileSync(__dirname + '/session-service.ts', 'utf8')
    .replaceAll('import.meta.env', '({})');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(js, {
    exports,
    require: (name) => {
      if (name.includes('supabase/client')) return { supabase: {
        from() { calls++; throw new Error('Network forbidden in this test'); },
        functions: { invoke() { calls++; throw new Error('Network forbidden'); } },
      } };
      if (name === 'uuid') return { v4: () => 'test-id' };
      throw new Error('Unexpected dependency: ' + name);
    },
    console: { error() {}, warn() {} },
  });
  return { service: exports.sessionService, calls: () => calls };
}

for (const [method, args, expected] of [
  ['createSession', [{ user_id: 'test-user', duration_minutes: 30 }], null],
  ['updateSession', ['test-session', { duration_minutes: 60 }], null],
  ['deactivateSession', ['test-session'], false],
]) {
  test(method + ' refuses mutation until a secure backend contract exists', async () => {
    const { service, calls } = loadService();
    assert.equal(await service[method](...args), expected);
    assert.equal(calls(), 0, 'No anonymous write or unverified authorization call');
  });
}
