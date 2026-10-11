import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDebrief } from '../shared/debrief.ts';
import { newGame, reduceGame, type Game, type GameAction } from '../shared/timefold.ts';

// Seed 1 → socket 'b', bearing 'left', band 'low'.
function play(game: Game, actions: GameAction[]): Game {
  return actions.reduce(reduceGame, game);
}
function solved(): Game {
  return play(newGame(1), [
    { kind: 'inspect', clue: 'wiring' },
    { kind: 'change', field: 'cell', value: 'b' },
    { kind: 'change', field: 'fuse', value: 'protected' },
    { kind: 'inspect', clue: 'sky' },
    { kind: 'change', field: 'gear', value: 'drive' },
    { kind: 'change', field: 'lens', value: 'optic' },
    { kind: 'change', field: 'alignment', value: 'left' },
    { kind: 'inspect', clue: 'plaque' },
    { kind: 'change', field: 'crystal', value: 'receiver' },
    { kind: 'change', field: 'frequency', value: 'low' },
  ]);
}
function fabricated(overrides: Partial<Game['stats']>, evidence: Game['evidence'] = []): Game {
  return { ...solved(), stats: { ...solved().stats, ...overrides }, evidence };
}

test('a hazard outranks every cleaner record', () => {
  const burnt = play(newGame(1), [
    { kind: 'change', field: 'cell', value: 'b' },
    { kind: 'change', field: 'fuse', value: 'bypass' },
  ]);
  assert.equal(buildDebrief(burnt).rating, 'Learned the hard way');
  assert.equal(buildDebrief(fabricated({ hazards: 1, misfires: 0 }, ['wiring', 'sky', 'plaque'])).rating, 'Learned the hard way');
  assert.equal(buildDebrief(fabricated({ hazards: 2, misfires: 9 })).rating, 'Learned the hard way');
});

test('a flawless evidence-led run is rated root-cause investigation', () => {
  const debrief = buildDebrief(solved());
  assert.equal(debrief.rating, 'Root-cause investigator');
  assert.equal(debrief.misfires, 0);
  assert.equal(debrief.evidenceFound, 3);
  assert.equal(debrief.evidenceFirst, 3);
  assert.ok(debrief.lesson.includes('fault isolation'));
  assert.equal(buildDebrief(fabricated({ misfires: 0 }, ['wiring', 'sky'])).rating, 'Methodical engineer');
});

test('a few wrong guesses read as methodical, many read as trial and error', () => {
  const sloppy = play(newGame(1), [
    { kind: 'change', field: 'cell', value: 'a' },
    { kind: 'change', field: 'cell', value: 'b' },
    { kind: 'change', field: 'fuse', value: 'protected' },
  ]);
  assert.equal(buildDebrief(sloppy).rating, 'Methodical engineer');
  assert.equal(buildDebrief(fabricated({ misfires: 2 }, ['wiring'])).rating, 'Methodical engineer');
  assert.equal(buildDebrief(fabricated({ misfires: 3 })).rating, 'Trial and error');
});

test('the debrief reports the case label and the honest investigation record', () => {
  const debrief = buildDebrief(solved());
  assert.equal(debrief.caseLabel, 'CASE 02 / 18');
  assert.equal(debrief.evidenceTotal, 3);
  assert.equal(typeof debrief.moves, 'number');
  assert.equal(debrief.hazards, 0);
  assert.equal(debrief.undos, 0);
});

test('a solved chain lists every causal link in order', () => {
  assert.deepEqual(buildDebrief(solved()).chain, [
    '1986 · Cell → Socket B',
    '1986 · Fuse → Protection socket',
    '2026 · Motor energised',
    '1986 · Gear → Drive socket',
    '1986 · Lens → Optical mount',
    '1986 · Telescope → Left',
    '2026 · Instrument aligned',
    '1986 · Crystal → Receiver mount',
    '1986 · Receiver → Low band',
    '2086 · Signal recovered',
  ]);
});

test('an unfinished chain stops at the first broken link', () => {
  const fresh = newGame(1);
  assert.deepEqual(buildDebrief(fresh).chain, ['✕ Cell is not seated in Socket B']);
  const partial = play(fresh, [{ kind: 'change', field: 'cell', value: 'b' }]);
  assert.deepEqual(buildDebrief(partial).chain, ['1986 · Cell → Socket B', '✕ Fuse is not protecting the circuit']);
  const burnt = play(partial, [{ kind: 'change', field: 'fuse', value: 'bypass' }]);
  assert.deepEqual(buildDebrief(burnt).chain, ['1986 · Cell → Socket B', '✕ Fuse sits in the bypass — the circuit burnt']);
  const unpowered = play(partial, [{ kind: 'change', field: 'fuse', value: 'protected' }, { kind: 'change', field: 'cell', value: 'home' }]);
  assert.deepEqual(buildDebrief(unpowered).chain, ['✕ Cell is not seated in Socket B']);
});
