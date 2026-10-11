import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialStateFor, scenarioFromSeed } from '../shared/timefold.ts';
import { type KeeperRequest } from '../shared/keeper.ts';
import { createGeminiGenerator } from '../supabase/functions/_shared/gemini.ts';

const input: KeeperRequest = { schemaVersion: 2, requestId: '00000000-0000-4000-8000-000000000001', seed: 0, state: initialStateFor(scenarioFromSeed(0)), revision: 4, question: 'hint', hintLevel: 1, era: 'past' };
function envelope(text: string, finishReason = 'STOP') {
  return Response.json({ candidates: [{ finishReason, content: { parts: [{ text }] } }] });
}

test('Gemini transport uses a server header, fixed host, bounded schema, and no tools', async () => {
  const generate = createGeminiGenerator({ apiKey: 'test-only-key', model: 'gemini-test-model', fetcher: async (url, options) => {
    assert.equal(String(url), 'https://generativelanguage.googleapis.com/v1beta/models/gemini-test-model:generateContent');
    assert.equal(new Headers(options?.headers).get('x-goog-api-key'), 'test-only-key');
    assert.ok(!String(url).includes('test-only-key'));
    const body = JSON.parse(String(options?.body));
    assert.equal(body.generationConfig.maxOutputTokens, 256);
    assert.deepEqual(body.generationConfig.responseSchema.properties.factId.enum, ['cell-observe']);
    assert.equal(body.tools, undefined);
    return envelope('{"factId":"cell-observe","narration":"An old promise waits in the dark."}');
  } });
  assert.deepEqual(await generate(input, new AbortController().signal), { mode: 'live', factId: 'cell-observe', narration: 'An old promise waits in the dark.', revision: 4 });
});

test('truncated, malformed and oversized provider output cannot become a live response', async () => {
  for (const response of [envelope('{bad'), envelope('{}', 'MAX_TOKENS'), envelope(JSON.stringify({ factId: 'cell-observe', narration: 'x'.repeat(601) })), new Response('x'.repeat(33000))]) {
    const generate = createGeminiGenerator({ apiKey: 'test-only-key', model: 'gemini-test-model', fetcher: async () => response });
    assert.equal(await generate(input, new AbortController().signal), null);
  }
});

test('HTTP provider failures are not retried or exposed as internal errors', async () => {
  let calls = 0;
  const generate = createGeminiGenerator({ apiKey: 'test-only-key', model: 'gemini-test-model', fetcher: async () => { calls++; return new Response('fake private error detail', { status: 429 }); } });
  await assert.rejects(generate(input, new AbortController().signal), /Keeper provider unavailable/);
  assert.equal(calls, 1);
});
