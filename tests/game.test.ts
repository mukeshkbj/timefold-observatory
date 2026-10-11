import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deriveWorld, newGame, reduceGame, type Game, type GameAction } from '../shared/timefold.ts';

// Seed 0 → socket 'a', bearing 'left', band 'low'; initial alignment 'centre', frequency 'mid'.
function restoredGame(): Game {
  const actions: GameAction[] = [
    { kind: 'change', field: 'cell', value: 'a' },
    { kind: 'change', field: 'fuse', value: 'protected' },
    { kind: 'change', field: 'gear', value: 'drive' },
    { kind: 'change', field: 'lens', value: 'optic' },
    { kind: 'change', field: 'alignment', value: 'left' },
    { kind: 'change', field: 'crystal', value: 'receiver' },
    { kind: 'change', field: 'frequency', value: 'low' },
  ];
  return actions.reduce(reduceGame, newGame(0));
}

test('later chapter objects are unavailable until their upstream chapter was completed', () => {
  const initial = newGame(0);
  assert.equal(reduceGame(initial, { kind: 'change', field: 'gear', value: 'drive' }), initial);
  const cell = reduceGame(initial, { kind: 'change', field: 'cell', value: 'a' });
  assert.equal(cell.unlocked, 1);
  const powered = reduceGame(cell, { kind: 'change', field: 'fuse', value: 'protected' });
  assert.equal(powered.unlocked, 2);
  assert.equal(reduceGame(powered, { kind: 'change', field: 'crystal', value: 'receiver' }), powered);
});

test('a valid seven-action playthrough restores the signal without mutating earlier snapshots', () => {
  const initial = newGame(0);
  const restored = restoredGame();
  assert.equal(restored.unlocked, 3);
  assert.equal(restored.revision, 7);
  assert.equal(restored.history.length, 7);
  assert.equal(restored.stats.moves, 7);
  assert.equal(restored.stats.misfires, 0);
  assert.equal(deriveWorld(restored.state, restored.scenario).signalRecovered, true);
  assert.equal(initial.state.cell, 'home');
  assert.equal(initial.history.length, 0);
});

test('wrong destinations count as misfires but homes and correct values never do', () => {
  const initial = newGame(0);
  assert.equal(reduceGame(initial, { kind: 'change', field: 'cell', value: 'b' }).stats.misfires, 1);
  assert.equal(reduceGame(initial, { kind: 'change', field: 'cell', value: 'a' }).stats.misfires, 0);
  const cell = reduceGame(initial, { kind: 'change', field: 'cell', value: 'a' });
  assert.equal(reduceGame(cell, { kind: 'change', field: 'fuse', value: 'bypass' }).stats.misfires, 1);
  assert.equal(reduceGame(cell, { kind: 'change', field: 'fuse', value: 'protected' }).stats.misfires, 0);
  const powered = reduceGame(cell, { kind: 'change', field: 'fuse', value: 'protected' });
  assert.equal(reduceGame(powered, { kind: 'change', field: 'gear', value: 'drive' }).stats.misfires, 0);
  assert.equal(reduceGame(powered, { kind: 'change', field: 'lens', value: 'optic' }).stats.misfires, 0);
  assert.equal(reduceGame(powered, { kind: 'change', field: 'alignment', value: 'right' }).stats.misfires, 1);
  assert.equal(reduceGame(powered, { kind: 'change', field: 'alignment', value: 'left' }).stats.misfires, 0);
  const aimed = reduceGame(reduceGame(reduceGame(powered,
    { kind: 'change', field: 'gear', value: 'drive' }),
    { kind: 'change', field: 'lens', value: 'optic' }),
    { kind: 'change', field: 'alignment', value: 'left' });
  assert.equal(reduceGame(aimed, { kind: 'change', field: 'crystal', value: 'receiver' }).stats.misfires, 0);
  assert.equal(reduceGame(aimed, { kind: 'change', field: 'frequency', value: 'high' }).stats.misfires, 1);
  const tuned = reduceGame(aimed, { kind: 'change', field: 'frequency', value: 'low' });
  assert.equal(tuned.stats.misfires, 0);
  assert.equal(reduceGame(tuned, { kind: 'change', field: 'frequency', value: 'mid' }).stats.misfires, 1);
  const returned = reduceGame(cell, { kind: 'change', field: 'cell', value: 'home' });
  assert.equal(returned.stats.misfires, 0);
});

test('a hazard is counted once on entry and again only after it ends', () => {
  const cell = reduceGame(newGame(0), { kind: 'change', field: 'cell', value: 'a' });
  const burnt = reduceGame(cell, { kind: 'change', field: 'fuse', value: 'bypass' });
  assert.equal(deriveWorld(burnt.state, burnt.scenario).hazard, true);
  assert.equal(burnt.stats.hazards, 1);
  const held = reduceGame(burnt, { kind: 'change', field: 'fuse', value: 'bypass' });
  assert.equal(held, burnt);
  const removed = reduceGame(burnt, { kind: 'change', field: 'cell', value: 'home' });
  assert.equal(removed.stats.hazards, 1);
  const reignited = reduceGame(removed, { kind: 'change', field: 'cell', value: 'a' });
  assert.equal(reignited.stats.hazards, 2);
});

test('inspection is gated by unlocked chapters and idempotent once recorded', () => {
  const initial = newGame(0);
  assert.equal(reduceGame(initial, { kind: 'inspect', clue: 'sky' }), initial);
  assert.equal(reduceGame(initial, { kind: 'inspect', clue: 'plaque' }), initial);
  const inspected = reduceGame(initial, { kind: 'inspect', clue: 'wiring' });
  assert.deepEqual(inspected.evidence, ['wiring']);
  assert.equal(inspected.revision, 1);
  assert.equal(inspected.state, initial.state);
  assert.equal(inspected.history, initial.history);
  assert.equal(reduceGame(inspected, { kind: 'inspect', clue: 'wiring' }), inspected);
  const powered = reduceGame(reduceGame(inspected, { kind: 'change', field: 'cell', value: 'a' }),
    { kind: 'change', field: 'fuse', value: 'protected' });
  assert.equal(powered.unlocked, 2);
  const sky = reduceGame(powered, { kind: 'inspect', clue: 'sky' });
  assert.deepEqual(sky.evidence, ['wiring', 'sky']);
  assert.equal(reduceGame(sky, { kind: 'inspect', clue: 'plaque' }), sky);
});

test('correct repairs made after the evidence count as evidence-first', () => {
  const initial = newGame(0);
  const blind = reduceGame(initial, { kind: 'change', field: 'cell', value: 'a' });
  assert.equal(blind.stats.evidenceFirst, 0);
  const informed = reduceGame(reduceGame(initial, { kind: 'inspect', clue: 'wiring' }), { kind: 'change', field: 'cell', value: 'a' });
  assert.equal(informed.stats.evidenceFirst, 1);
  let game = reduceGame(informed, { kind: 'change', field: 'fuse', value: 'protected' });
  assert.equal(game.stats.evidenceFirst, 1);
  game = reduceGame(game, { kind: 'change', field: 'alignment', value: 'left' });
  assert.equal(game.stats.evidenceFirst, 1);
  game = reduceGame(game, { kind: 'inspect', clue: 'sky' });
  game = reduceGame(game, { kind: 'change', field: 'alignment', value: 'right' });
  game = reduceGame(game, { kind: 'change', field: 'alignment', value: 'left' });
  assert.equal(game.stats.evidenceFirst, 2);
});

test('undo reverses the arrangement, counts itself and never rolls the record back', () => {
  const restored = restoredGame();
  const undone = reduceGame(restored, { kind: 'undo' });
  assert.equal(undone.state.frequency, 'mid');
  assert.equal(deriveWorld(undone.state, undone.scenario).signalRecovered, false);
  assert.equal(undone.unlocked, 3);
  assert.equal(undone.revision, 8);
  assert.equal(undone.history.length, 6);
  assert.equal(undone.stats.undos, 1);
  assert.equal(undone.stats.moves, 7);
  const burnt = reduceGame(reduceGame(newGame(0), { kind: 'change', field: 'cell', value: 'b' }), { kind: 'undo' });
  assert.equal(burnt.stats.misfires, 1);
  assert.equal(burnt.stats.moves, 1);
  assert.equal(burnt.stats.undos, 1);
});

test('repeated placement is idempotent and does not add undo history', () => {
  const cell = reduceGame(newGame(0), { kind: 'change', field: 'cell', value: 'a' });
  assert.equal(cell.state.cell, 'a');
  assert.equal(reduceGame(cell, { kind: 'change', field: 'cell', value: 'a' }), cell);
});

test('resetting a chapter counts as one move and is never a misfire', () => {
  const restored = restoredGame();
  const reset = reduceGame(restored, { kind: 'resetChapter', chapter: 3 });
  assert.equal(reset.state.crystal, 'home');
  assert.equal(reset.state.frequency, 'mid');
  assert.equal(reset.stats.moves, 8);
  assert.equal(reset.stats.misfires, 0);
  assert.equal(deriveWorld(reset.state, reset.scenario).aimed, true);
  assert.equal(deriveWorld(reset.state, reset.scenario).signalRecovered, false);
  assert.deepEqual(reduceGame(reset, { kind: 'undo' }).state, restored.state);
});

test('chapter unlocks remain learned after an upstream repair is removed', () => {
  const removed = reduceGame(restoredGame(), { kind: 'change', field: 'cell', value: 'home' });
  assert.equal(removed.unlocked, 3);
  assert.deepEqual(deriveWorld(removed.state, removed.scenario), { powered: false, hazard: false, aimed: false, signalRecovered: false });
});

test('undo history is bounded to the last 64 committed arrangements', () => {
  let game = newGame(0);
  for (let i = 0; i < 100; i++) {
    game = reduceGame(game, { kind: 'change', field: 'cell', value: i % 2 ? 'home' : 'a' });
  }
  assert.equal(game.history.length, 64);
  assert.equal(game.revision, 100);
  assert.equal(game.stats.moves, 100);
  for (let i = 0; i < 64; i++) game = reduceGame(game, { kind: 'undo' });
  assert.equal(game.stats.undos, 64);
  assert.equal(reduceGame(game, { kind: 'undo' }), game);
});
