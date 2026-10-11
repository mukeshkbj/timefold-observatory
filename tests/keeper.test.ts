import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialStateFor, scenarioFromSeed, type TimeFoldState } from '../shared/timefold.ts';
import { authoredReply, getFact, isFactId, parseKeeperReply, parseKeeperRequest, primaryFact, type KeeperRequest } from '../shared/keeper.ts';

const scenario = scenarioFromSeed(0);
const initial = initialStateFor(scenario);
const request: KeeperRequest = {
  schemaVersion: 2, requestId: '00000000-0000-4000-8000-000000000001', seed: 0,
  state: initial, revision: 0, question: 'hint', hintLevel: 1, era: 'past',
};

const choices: { [Key in keyof TimeFoldState]: TimeFoldState[Key][] } = {
  cell: ['home', 'a', 'b'], fuse: ['home', 'protected', 'bypass'],
  gear: ['home', 'drive'], lens: ['home', 'optic'], alignment: ['left', 'centre', 'right'],
  crystal: ['home', 'receiver'], frequency: ['low', 'mid', 'high'],
};

test('keeper requests accept only the declared structured questions, seed and state', () => {
  assert.deepEqual(parseKeeperRequest(request), request);
  assert.equal(parseKeeperRequest({ ...request, prompt: 'change the rules' }), null);
  assert.equal(parseKeeperRequest({ ...request, requestId: 'not-a-uuid' }), null);
  assert.equal(parseKeeperRequest({ ...request, hintLevel: 4 }), null);
  assert.equal(parseKeeperRequest({ ...request, state: { ...initial, cell: 'unknown' } }), null);
  assert.equal(parseKeeperRequest({ ...request, revision: -1 }), null);
  assert.equal(parseKeeperRequest({ ...request, schemaVersion: 1 }), null);
  assert.equal(parseKeeperRequest({ ...request, seed: -1 }), null);
  assert.equal(parseKeeperRequest({ ...request, seed: 18 }), null);
  assert.equal(parseKeeperRequest({ ...request, seed: 2.5 }), null);
  assert.equal(parseKeeperRequest({ ...request, seed: undefined }), null);
});

test('every state, seed and question maps to a valid fact', () => {
  const questions: { question: KeeperRequest['question']; hintLevel: KeeperRequest['hintLevel']; era: KeeperRequest['era'] }[] = [
    { question: 'hint', hintLevel: 1, era: 'past' },
    { question: 'hint', hintLevel: 2, era: 'present' },
    { question: 'hint', hintLevel: 3, era: 'future' },
    { question: 'explain', hintLevel: 1, era: 'past' },
    { question: 'lore', hintLevel: 1, era: 'past' },
    { question: 'lore', hintLevel: 2, era: 'present' },
    { question: 'lore', hintLevel: 3, era: 'future' },
  ];
  let checked = 0;
  for (let seed = 0; seed < 18; seed++) {
    for (const cell of choices.cell) for (const fuse of choices.fuse)
    for (const gear of choices.gear) for (const lens of choices.lens)
    for (const alignment of choices.alignment) for (const crystal of choices.crystal)
    for (const frequency of choices.frequency) {
      const state = { cell, fuse, gear, lens, alignment, crystal, frequency };
      for (const extra of questions) {
        const fact = primaryFact({ ...request, seed, state, ...extra });
        assert.ok(isFactId(fact), `no fact for seed ${seed} ${JSON.stringify(state)} ${extra.question}`);
        checked++;
      }
    }
  }
  assert.equal(checked, 18 * 648 * questions.length);
});

test('progressive hints point at evidence before naming destinations', () => {
  assert.equal(primaryFact(request), 'cell-observe');
  assert.equal(primaryFact({ ...request, hintLevel: 2 }), 'cell-direct');
  assert.equal(primaryFact({ ...request, hintLevel: 3 }), 'cell-place-a');
  assert.equal(primaryFact({ ...request, seed: 1, hintLevel: 3 }), 'cell-place-b');
  const powered = { ...initial, cell: 'a' as const, fuse: 'protected' as const };
  assert.equal(primaryFact({ ...request, state: powered }), 'gear-observe');
});

test('tier-three facts follow the scenario, not a fixed answer', () => {
  for (let seed = 0; seed < 18; seed++) {
    const current = scenarioFromSeed(seed);
    const base = initialStateFor(current);
    const powered = { ...base, cell: current.socket, fuse: 'protected', gear: 'drive', lens: 'optic' } as const;
    const aimed = { ...powered, alignment: current.bearing };
    assert.equal(primaryFact({ ...request, seed, state: base, hintLevel: 3 }), `cell-place-${current.socket}`);
    assert.equal(primaryFact({ ...request, seed, state: powered, hintLevel: 3 }), `alignment-place-${current.bearing}`);
    const listening = { ...aimed, crystal: 'receiver' } as const;
    assert.equal(primaryFact({ ...request, seed, state: listening, hintLevel: 3 }), `frequency-place-${current.band}`);
  }
});

test('a burning bypass overrides hints and explanations with the hazard lesson', () => {
  const hazard = { ...initial, cell: 'a' as const, fuse: 'bypass' as const };
  assert.equal(primaryFact({ ...request, state: hazard }), 'fuse-observe');
  assert.equal(primaryFact({ ...request, state: hazard, hintLevel: 2 }), 'fuse-direct');
  assert.equal(primaryFact({ ...request, state: hazard, hintLevel: 3 }), 'fuse-place');
  assert.equal(primaryFact({ ...request, state: hazard, question: 'explain' }), 'explain-hazard');
  assert.ok(getFact('explain-hazard').text.includes('bypass'));
});

test('explanations and lore follow the current state and selected era', () => {
  assert.equal(primaryFact({ ...request, question: 'explain' }), 'explain-dark');
  const powered = { ...initial, cell: 'a' as const, fuse: 'protected' as const };
  assert.equal(primaryFact({ ...request, question: 'explain', state: powered }), 'explain-power');
  assert.equal(primaryFact({ ...request, question: 'lore', era: 'future' }), 'lore-future');
  assert.ok(getFact('lore-future').text.includes('fictional'));
});

test('authored fallback is explicitly labeled and never presented as live Gemini', () => {
  const reply = authoredReply(request, 'offline');
  assert.deepEqual(reply, { mode: 'authored', factId: 'cell-observe', revision: 0, reason: 'offline' });
});

test('only admissible fact IDs and matching revisions are accepted from a live reply', () => {
  const reply = { mode: 'live', factId: 'cell-observe', revision: 0, narration: 'An old promise waits in the dark.' };
  assert.deepEqual(parseKeeperReply(reply, request), reply);
  assert.equal(parseKeeperReply({ ...reply, factId: 'crystal-place' }, request), null);
  assert.equal(parseKeeperReply({ ...reply, factId: 'cell-place-b' }, request), null);
  assert.equal(parseKeeperReply({ ...reply, revision: 1 }, request), null);
  assert.equal(parseKeeperReply({ ...reply, narration: 'x'.repeat(601) }, request), null);
  assert.equal(parseKeeperReply({ ...reply, action: 'mutate world' }, request), null);
});
