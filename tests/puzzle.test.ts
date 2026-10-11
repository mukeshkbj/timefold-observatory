import assert from 'node:assert/strict';
import { test } from 'node:test';
import { caseLabel, chapterComplete, clueText, newPuzzleSession, placementChoices, reducePuzzle, type PuzzleField, type PuzzleSession } from '../shared/puzzle.ts';
import { newGame, scenarioFromSeed } from '../shared/timefold.ts';

// Seed 0 → socket 'a', bearing 'left', band 'low'.
function session(seed = 0) { return newPuzzleSession(newGame(seed)); }
function place(current: PuzzleSession, field: PuzzleField, label: string) {
  const choice = placementChoices(field).find(item => item.label === label);
  assert.ok(choice, `no choice ${label} for ${field}`);
  const index = placementChoices(field).indexOf(choice);
  return reducePuzzle(reducePuzzle(current, { kind: 'select', field }), { kind: 'placeChoice', index });
}
function powered() { return place(place(session(), 'cell', 'Socket A'), 'fuse', 'Protection socket'); }

test('destination labels are neutral and never mark the answer', () => {
  const fields: PuzzleField[] = ['cell', 'fuse', 'gear', 'lens', 'alignment', 'crystal', 'frequency'];
  for (const field of fields) {
    for (const choice of placementChoices(field)) {
      assert.ok(!/marked/i.test(choice.label), `label "${choice.label}" marks an answer`);
    }
  }
  assert.deepEqual(placementChoices('cell').map(choice => choice.label), ['Bench', 'Socket A', 'Socket B']);
  assert.deepEqual(placementChoices('fuse').map(choice => choice.label), ['Bench', 'Protection socket', 'Bypass link']);
  assert.deepEqual(placementChoices('alignment').map(choice => choice.label), ['Left', 'Centre', 'Right']);
  assert.deepEqual(placementChoices('frequency').map(choice => choice.label), ['Low band', 'Mid band', 'High band']);
});

test('case labels present the seeded case number', () => {
  assert.equal(caseLabel(scenarioFromSeed(0)), 'CASE 01 / 18');
  assert.equal(caseLabel(scenarioFromSeed(6)), 'CASE 07 / 18');
  assert.equal(caseLabel(scenarioFromSeed(17)), 'CASE 18 / 18');
});

test('clue text names the scenario evidence without ambiguity', () => {
  for (let seed = 0; seed < 18; seed++) {
    const scenario = scenarioFromSeed(seed);
    const wiring = clueText(scenario, 'wiring');
    assert.equal(wiring.era, 'present');
    assert.ok(wiring.detail.includes(`Socket ${scenario.socket.toUpperCase()}`));
    const sky = clueText(scenario, 'sky');
    assert.equal(sky.era, 'future');
    assert.ok(sky.detail.includes(scenario.bearing === 'centre' ? 'overhead' : scenario.bearing));
    const plaque = clueText(scenario, 'plaque');
    assert.equal(plaque.era, 'future');
    assert.ok(plaque.detail.includes(scenario.band.toUpperCase()));
  }
});

test('inspection records evidence, is gated by unlocks and leaves no trace', () => {
  const initial = session();
  assert.equal(reducePuzzle(initial, { kind: 'inspect', clue: 'sky' }), initial);
  const inspected = reducePuzzle(initial, { kind: 'inspect', clue: 'wiring' });
  assert.deepEqual(inspected.game.evidence, ['wiring']);
  assert.equal(inspected.lastClue, 'wiring');
  assert.equal(inspected.trace, null);
  assert.equal(reducePuzzle(inspected, { kind: 'inspect', clue: 'wiring' }).game, inspected.game);
  const changed = place(inspected, 'cell', 'Socket A');
  assert.equal(changed.lastClue, null);
  const pending = reducePuzzle(powered(), { kind: 'requestReset' });
  assert.equal(reducePuzzle(pending, { kind: 'inspect', clue: 'sky' }), pending);
});

test('selection is not a committed edit and locked chapter objects cannot be selected', () => {
  const initial = session();
  const selected = reducePuzzle(initial, { kind: 'select', field: 'cell' });
  assert.equal(selected.selected, 'cell');
  assert.equal(selected.game, initial.game);
  assert.equal(reducePuzzle(initial, { kind: 'select', field: 'gear' }), initial);
});

test('destination slots require a selected object; wrong valid placements remain reversible', () => {
  const initial = session();
  assert.equal(reducePuzzle(initial, { kind: 'placeChoice', index: 1 }), initial);
  assert.equal(reducePuzzle(initial, { kind: 'placeChoice', index: 99 }), initial);
  const selected = reducePuzzle(initial, { kind: 'select', field: 'cell' });
  assert.equal(reducePuzzle(selected, { kind: 'placeChoice', index: 3 }), selected);
  const wrong = place(initial, 'cell', 'Socket B');
  assert.equal(wrong.game.state.cell, 'b');
  assert.equal(wrong.game.stats.misfires, 1);
  assert.equal(chapterComplete(wrong.game, 1), false);
  assert.equal(reducePuzzle(wrong, { kind: 'undo' }).game.state.cell, 'home');
});

test('chapter completion is derived and causal feedback includes the actual edit and consequences', () => {
  const current = powered();
  assert.equal(chapterComplete(current.game, 1), true);
  assert.equal(current.game.unlocked, 2);
  assert.ok(current.trace?.past.includes('Protection fuse'));
  assert.ok(current.trace?.present.includes('energized'));
  assert.ok(current.trace?.future.includes('illuminated'));
});

test('a bypass under load produces an explicit hazard trace', () => {
  const burnt = place(place(session(), 'cell', 'Socket A'), 'fuse', 'Bypass link');
  assert.ok(burnt.trace?.present.includes('bypass'));
  assert.ok(burnt.trace?.future.includes('burnt'));
  assert.equal(chapterComplete(burnt.game, 1), false);
});

test('chapter navigation never bypasses locks or mutates game history', () => {
  const initial = session();
  assert.equal(reducePuzzle(initial, { kind: 'chapter', chapter: 3 }), initial);
  const current = powered();
  const chapterTwo = reducePuzzle(current, { kind: 'chapter', chapter: 2 });
  assert.equal(chapterTwo.chapter, 2);
  assert.equal(chapterTwo.game, current.game);
  assert.equal(chapterTwo.selected, null);
});

test('reset requires matching named confirmation, cancellation commits nothing, and reset is undoable', () => {
  const current = powered();
  assert.equal(reducePuzzle(current, { kind: 'confirmReset', chapter: 1 }), current);
  const pending = reducePuzzle(current, { kind: 'requestReset' });
  assert.equal(pending.pendingReset, 1);
  assert.equal(pending.game, current.game);
  assert.equal(reducePuzzle(pending, { kind: 'confirmReset', chapter: 2 }), pending);
  const cancelled = reducePuzzle(pending, { kind: 'cancelReset' });
  assert.equal(cancelled.game, current.game);
  const reset = reducePuzzle(pending, { kind: 'confirmReset', chapter: 1 });
  assert.equal(reset.game.state.cell, 'home');
  assert.equal(reset.game.unlocked, 2);
  assert.equal(reducePuzzle(reset, { kind: 'undo' }).game.state.cell, 'a');
});

test('all chapters complete through explicit named choices, and removing a prerequisite changes the world without relocking chapters', () => {
  let current = reducePuzzle(powered(), { kind: 'chapter', chapter: 2 });
  current = place(place(place(current, 'gear', 'Drive socket'), 'lens', 'Optical mount'), 'alignment', 'Left');
  current = reducePuzzle(current, { kind: 'chapter', chapter: 3 });
  current = place(place(current, 'crystal', 'Receiver mount'), 'frequency', 'Low band');
  assert.equal(chapterComplete(current.game, 3), true);
  current = reducePuzzle(current, { kind: 'chapter', chapter: 1 });
  current = place(current, 'cell', 'Bench');
  assert.equal(chapterComplete(current.game, 3), false);
  assert.equal(current.game.unlocked, 3);
  assert.ok(current.trace?.future.includes('dark'));
});
