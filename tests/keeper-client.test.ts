import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialStateFor, scenarioFromSeed } from '../shared/timefold.ts';
import { authoredReply, type KeeperRequest } from '../shared/keeper.ts';
import { createKeeperClient, KeeperClientError } from '../shared/keeperClient.ts';

const request: KeeperRequest = { schemaVersion: 2, requestId: '00000000-0000-4000-8000-000000000001', seed: 0, state: initialStateFor(scenarioFromSeed(0)), revision: 0, question: 'hint', hintLevel: 1, era: 'past' };
const live = { mode: 'live', factId: 'cell-observe', revision: 0, narration: 'An old promise waits in the dark.' };

test('authored mode makes no authentication or network request', async () => {
  let calls = 0;
  const ask = createKeeperClient({ mode: 'authored', timeoutMs: 100, currentRevision: () => 0, transport: async () => { calls++; return live; } });
  assert.deepEqual(await ask(request), { kind: 'reply', reply: authoredReply(request, 'offline') });
  assert.equal(calls, 0);
});

test('unconfigured live mode remains an honest authored response', async () => {
  const ask = createKeeperClient({ mode: 'live', timeoutMs: 100, currentRevision: () => 0, transport: null });
  assert.deepEqual(await ask(request), { kind: 'reply', reply: authoredReply(request, 'not_configured') });
});

test('only validated live responses are shown as live', async () => {
  const ask = createKeeperClient({ mode: 'live', timeoutMs: 100, currentRevision: () => 0, transport: async () => live });
  assert.deepEqual(await ask(request), { kind: 'reply', reply: live });
  const invalid = createKeeperClient({ mode: 'live', timeoutMs: 100, currentRevision: () => 0, transport: async () => ({ ...live, factId: 'crystal-place' }) });
  assert.deepEqual(await invalid(request), { kind: 'reply', reply: authoredReply(request, 'invalid_reply') });
});

test('a response for an arrangement that changed while waiting is discarded', async () => {
  let revision = 0;
  const ask = createKeeperClient({ mode: 'live', timeoutMs: 100, currentRevision: () => revision, transport: async () => { revision++; return live; } });
  assert.deepEqual(await ask(request), { kind: 'stale' });
});

test('client timeout aborts the request and never retries automatically', async () => {
  let calls = 0;
  let aborted = false;
  const ask = createKeeperClient({ mode: 'live', timeoutMs: 5, currentRevision: () => 0, transport: async (_request, signal) => {
    calls++;
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => { aborted = true; reject(new Error('fake timeout')); }, { once: true }));
  } });
  assert.deepEqual(await ask(request), { kind: 'reply', reply: authoredReply(request, 'timeout') });
  assert.equal(calls, 1);
  assert.equal(aborted, true);
});

test('auth failures and network failures retain safe authored hints', async () => {
  const auth = createKeeperClient({ mode: 'live', timeoutMs: 100, currentRevision: () => 0, transport: async () => { throw new KeeperClientError('auth_unavailable'); } });
  assert.deepEqual(await auth(request), { kind: 'reply', reply: authoredReply(request, 'auth_unavailable') });
  const offline = createKeeperClient({ mode: 'live', timeoutMs: 100, currentRevision: () => 0, transport: async () => { throw new Error('fake network unavailable'); } });
  assert.deepEqual(await offline(request), { kind: 'reply', reply: authoredReply(request, 'offline') });
});

test('identical concurrent questions share one request and validated live answers are cached', async () => {
  let calls = 0;
  let release = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const ask = createKeeperClient({ mode: 'live', timeoutMs: 100, currentRevision: () => 0, transport: async () => { calls++; await barrier; return live; } });
  const first = ask(request);
  const second = ask({ ...request, requestId: '00000000-0000-4000-8000-000000000003' });
  release();
  await Promise.all([first, second]);
  assert.equal(calls, 1);
  await ask({ ...request, requestId: '00000000-0000-4000-8000-000000000004' });
  assert.equal(calls, 1);
});
