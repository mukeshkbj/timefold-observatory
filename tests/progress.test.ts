import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newGame, reduceGame, type Game } from '../shared/timefold.ts';
import { createSaveQueue, decodeProgress, encodeProgress } from '../shared/progress.ts';

function play(actions: Parameters<typeof reduceGame>[1][], seed = 4): Game {
  return actions.reduce(reduceGame, newGame(seed));
}

test('saved progress roundtrips scenario, state, evidence, stats, history, unlocks and revision', () => {
  const game = play([
    { kind: 'inspect', clue: 'wiring' },
    { kind: 'change', field: 'cell', value: 'a' },
    { kind: 'change', field: 'fuse', value: 'protected' },
  ]);
  assert.deepEqual(decodeProgress(encodeProgress(game)), game);
});

test('missing, corrupt, legacy-version and oversized saves are rejected', () => {
  const game = newGame(4);
  assert.equal(decodeProgress(null), null);
  assert.equal(decodeProgress('{broken'), null);
  assert.equal(decodeProgress(JSON.stringify({ schemaVersion: 1, ...game })), null);
  assert.equal(decodeProgress(JSON.stringify({ schemaVersion: 3, seed: 4, state: game.state, unlocked: 1, revision: 0, history: [], evidence: [], stats: game.stats })), null);
  assert.equal(decodeProgress(' '.repeat(32769)), null);
});

test('tampered seeds, states, revisions and histories are rejected', () => {
  const game = play([{ kind: 'change', field: 'cell', value: 'a' }]);
  const payload = JSON.parse(encodeProgress(game));
  const encode = (value: unknown) => JSON.stringify(value);
  assert.equal(decodeProgress(encode({ ...payload, seed: 18 })), null);
  assert.equal(decodeProgress(encode({ ...payload, seed: -1 })), null);
  assert.equal(decodeProgress(encode({ ...payload, seed: 2.5 })), null);
  assert.equal(decodeProgress(encode({ ...payload, seed: '4' })), null);
  assert.equal(decodeProgress(encode({ ...payload, socket: 'b' })), null);
  assert.equal(decodeProgress(encode({ ...payload, state: { ...payload.state, cell: 'main' } })), null);
  assert.equal(decodeProgress(encode({ ...payload, revision: -1 })), null);
  assert.equal(decodeProgress(encode({ ...payload, revision: Number.MAX_SAFE_INTEGER + 1 })), null);
  assert.equal(decodeProgress(encode({ ...payload, history: Array(65).fill(payload.state) })), null);
});

test('tampered evidence and stats are rejected', () => {
  const game = play([
    { kind: 'inspect', clue: 'wiring' },
    { kind: 'change', field: 'cell', value: 'a' },
    { kind: 'change', field: 'fuse', value: 'protected' },
  ]);
  const payload = JSON.parse(encodeProgress(game));
  const encode = (value: unknown) => JSON.stringify(value);
  assert.equal(decodeProgress(encode({ ...payload, evidence: ['plaque'] })), null);
  assert.equal(decodeProgress(encode({ ...payload, evidence: ['wiring', 'wiring'] })), null);
  assert.equal(decodeProgress(encode({ ...payload, evidence: ['wiring', 'rumor'] })), null);
  assert.equal(decodeProgress(encode({ ...payload, evidence: 'wiring' })), null);
  assert.equal(decodeProgress(encode({ ...payload, stats: { ...payload.stats, moves: -1 } })), null);
  assert.equal(decodeProgress(encode({ ...payload, stats: { ...payload.stats, misfires: 1.5 } })), null);
  assert.equal(decodeProgress(encode({ ...payload, stats: { moves: 1 } })), null);
  assert.equal(decodeProgress(encode({ ...payload, stats: null })), null);
});

test('a save cannot claim a locked chapter while containing its required completed prerequisite', () => {
  const powered = play([{ kind: 'change', field: 'cell', value: 'a' }, { kind: 'change', field: 'fuse', value: 'protected' }]);
  const payload = JSON.parse(encodeProgress(powered));
  assert.equal(decodeProgress(JSON.stringify({ ...payload, unlocked: 1 })), null);
});

test('a save cannot claim evidence ahead of its learned unlocks', () => {
  const game = play([{ kind: 'inspect', clue: 'wiring' }, { kind: 'change', field: 'cell', value: 'a' }, { kind: 'change', field: 'fuse', value: 'protected' }, { kind: 'inspect', clue: 'sky' }]);
  const payload = JSON.parse(encodeProgress(game));
  assert.equal(decodeProgress(JSON.stringify({ ...payload, unlocked: 1 })), null);
  assert.deepEqual(decodeProgress(JSON.stringify({ ...payload, unlocked: 2 })), game);
});

test('room transforms and unknown fields are not restored as game data', () => {
  const game = newGame(4);
  const restored = decodeProgress(JSON.stringify({ ...JSON.parse(encodeProgress(game)), roomTransform: [1, 2, 3] }));
  assert.deepEqual(restored, game);
});

test('concurrent saves execute in order instead of letting an older write overwrite a newer one', async () => {
  const written: string[] = [];
  let releaseFirst = () => {};
  let notifyStarted = () => {};
  const firstStarted = new Promise<void>(resolve => { notifyStarted = resolve; });
  const barrier = new Promise<void>(resolve => { releaseFirst = resolve; });
  const { save, whenIdle } = createSaveQueue(async value => {
    written.push(value);
    if (written.length === 1) { notifyStarted(); await barrier; }
  });
  const initial = newGame(4);
  const changed = reduceGame(initial, { kind: 'change', field: 'cell', value: 'a' });
  const older = save(initial);
  const newer = save(changed);
  let idle = false;
  const idleBarrier = whenIdle().then(() => { idle = true; });
  await firstStarted;
  assert.equal(written.length, 1);
  assert.equal(idle, false);
  releaseFirst();
  await Promise.all([older, newer, idleBarrier]);
  assert.equal(idle, true);
  assert.deepEqual(written, [encodeProgress(initial), encodeProgress(changed)]);
});

test('a failed save reaches its caller but does not prevent a later save', async () => {
  let calls = 0;
  const saved: string[] = [];
  const { save } = createSaveQueue(async value => {
    if (++calls === 1) throw new Error('scratch storage unavailable');
    saved.push(value);
  });
  await assert.rejects(save(newGame(4)), /scratch storage unavailable/);
  await save(newGame(4));
  assert.equal(saved.length, 1);
});
