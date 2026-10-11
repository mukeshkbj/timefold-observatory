import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialStateFor, scenarioFromSeed } from '../shared/timefold.ts';
import { authoredReply, type KeeperRequest } from '../shared/keeper.ts';
import { createKeeperHandler, type KeeperDependencies, type Reservation } from '../supabase/functions/_shared/keeperService.ts';

const body: KeeperRequest = {
  schemaVersion: 2, requestId: '00000000-0000-4000-8000-000000000001', seed: 0,
  state: initialStateFor(scenarioFromSeed(0)),
  revision: 0, question: 'hint', hintLevel: 1, era: 'past',
};
const user = '00000000-0000-4000-8000-000000000002';
const live = { mode: 'live', factId: 'cell-observe', revision: 0, narration: 'An old promise waits in the dark.' };
function fixture(overrides: Partial<KeeperDependencies> = {}) {
  const calls: string[] = [];
  const dependencies: KeeperDependencies = {
    enabled: true, timeoutMs: 100, allowedOrigins: ['http://localhost:8081'],
    authenticate: async token => { calls.push('auth'); return token === 'test-token' ? user : null; },
    quota: {
      reserve: async () => { calls.push('reserve'); return { kind: 'new' }; },
      complete: async () => { calls.push('complete'); },
    },
    generate: async () => { calls.push('generate'); return live; },
    ...overrides,
  };
  return { handler: createKeeperHandler(dependencies), calls };
}
function request(value: unknown = body, authorization: string | null = 'Bearer test-token') {
  return new Request('http://localhost/functions/v1/keeper', {
    method: 'POST', headers: { 'content-type': 'application/json', ...(authorization ? { authorization } : {}) },
    body: JSON.stringify(value),
  });
}

test('unauthorized callers and publishable keys alone cannot consume provider quota', async () => {
  const { handler, calls } = fixture();
  assert.equal((await handler(request(body, null))).status, 401);
  const keyOnly = request(body, null);
  keyOnly.headers.set('apikey', 'test-publishable-key');
  assert.equal((await handler(keyOnly)).status, 401);
  assert.equal((await handler(request(body, 'Bearer wrong-token'))).status, 401);
  assert.ok(!calls.includes('reserve') && !calls.includes('generate'));
});

test('invalid structured input and oversized bodies do not reach inference', async () => {
  const { handler, calls } = fixture();
  assert.equal((await handler(request({ ...body, prompt: 'arbitrary text' }))).status, 400);
  assert.equal((await handler(request({ ...body, extra: 'x'.repeat(9000) }))).status, 413);
  assert.equal((await handler(new Request('http://localhost/functions/v1/keeper'))).status, 405);
  assert.ok(!calls.includes('generate'));
});

test('a valid caller reserves durable quota before generation and completes its owned request', async () => {
  const { handler, calls } = fixture();
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), live);
  assert.deepEqual(calls, ['auth', 'reserve', 'generate', 'complete']);
});

test('disabled live hints remain authored without reserving provider quota', async () => {
  const { handler, calls } = fixture({ enabled: false });
  const response = await handler(request());
  assert.deepEqual(await response.json(), authoredReply(body, 'disabled'));
  assert.deepEqual(calls, ['auth']);
});

test('denied, pending, conflict and cached reservations never run inference again', async () => {
  const cases: { result: Reservation; status: number; reason?: string }[] = [
    { result: { kind: 'denied' }, status: 200, reason: 'quota' },
    { result: { kind: 'pending' }, status: 200, reason: 'busy' },
    { result: { kind: 'conflict' }, status: 409 },
    { result: { kind: 'cached', reply: live }, status: 200 },
  ];
  for (const entry of cases) {
    const { handler, calls } = fixture({ quota: { reserve: async () => entry.result, complete: async () => {} } });
    const response = await handler(request());
    assert.equal(response.status, entry.status);
    const result = await response.json();
    if (entry.reason) assert.deepEqual(result, authoredReply(body, entry.reason === 'quota' ? 'quota' : 'busy'));
    assert.ok(!calls.includes('generate'));
  }
});

test('quota store failure fails closed before any provider call', async () => {
  const { handler, calls } = fixture({ quota: { reserve: async () => { throw new Error('scratch store unavailable'); }, complete: async () => {} } });
  const response = await handler(request());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'quota_store_unavailable' });
  assert.ok(!calls.includes('generate'));
});

test('wrong facts and provider failures become clearly authored responses', async () => {
  const invalid = fixture({ generate: async () => ({ ...live, factId: 'crystal-place' }) });
  assert.deepEqual(await (await invalid.handler(request())).json(), authoredReply(body, 'invalid_reply'));
  const failed = fixture({ generate: async () => { throw new Error('fake provider failed'); } });
  assert.deepEqual(await (await failed.handler(request())).json(), authoredReply(body, 'provider_error'));
});

test('provider timeout aborts inference and returns an authored fallback without retries', async () => {
  let aborted = false;
  const { handler } = fixture({ timeoutMs: 5, generate: async (_input, signal) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => { aborted = true; reject(new Error('fake aborted provider')); }, { once: true });
  }) });
  assert.deepEqual(await (await handler(request())).json(), authoredReply(body, 'timeout'));
  assert.equal(aborted, true);
});

test('only explicitly allowed browser origins receive CORS access', async () => {
  const { handler, calls } = fixture();
  const allowed = new Request('http://localhost/functions/v1/keeper', { method: 'OPTIONS', headers: { origin: 'http://localhost:8081' } });
  const response = await handler(allowed);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:8081');
  const blocked = new Request('http://localhost/functions/v1/keeper', { method: 'OPTIONS', headers: { origin: 'https://untrusted.invalid' } });
  assert.equal((await handler(blocked)).status, 403);
  assert.deepEqual(calls, []);
});
