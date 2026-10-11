import assert from 'node:assert/strict';
import { test } from 'node:test';
import { caseCount, deriveWorld, initialStateFor, parseScenario, parseTimeFoldState, scenarioFromSeed, type TimeFoldState } from '../shared/timefold.ts';

const choices: { [Key in keyof TimeFoldState]: TimeFoldState[Key][] } = {
  cell: ['home', 'a', 'b'], fuse: ['home', 'protected', 'bypass'],
  gear: ['home', 'drive'], lens: ['home', 'optic'], alignment: ['left', 'centre', 'right'],
  crystal: ['home', 'receiver'], frequency: ['low', 'mid', 'high'],
};
function* allStates(): Generator<TimeFoldState> {
  for (const cell of choices.cell) for (const fuse of choices.fuse)
  for (const gear of choices.gear) for (const lens of choices.lens)
  for (const alignment of choices.alignment) for (const crystal of choices.crystal)
  for (const frequency of choices.frequency) yield { cell, fuse, gear, lens, alignment, crystal, frequency };
}

test('every seed selects a distinct socket, bearing and band combination', () => {
  const combos = new Set<string>();
  for (let seed = 0; seed < caseCount; seed++) {
    const scenario = scenarioFromSeed(seed);
    assert.equal(scenario.seed, seed);
    combos.add(`${scenario.socket}/${scenario.bearing}/${scenario.band}`);
  }
  assert.equal(combos.size, 18);
});

test('out-of-range and fractional seeds normalise into the case range', () => {
  assert.equal(scenarioFromSeed(-1).seed, caseCount - 1);
  assert.equal(scenarioFromSeed(-73).seed, caseCount - 1);
  assert.equal(scenarioFromSeed(72).seed, 0);
  assert.equal(scenarioFromSeed(100).seed, 100 % caseCount);
  assert.equal(scenarioFromSeed(5.9).seed, 5);
  assert.equal(scenarioFromSeed(-5.9).seed, caseCount - 5);
});

test('the starting dial positions never leak the answer', () => {
  const bearingStarts = new Map<string, Set<string>>();
  const bandStarts = new Map<string, Set<string>>();
  for (let seed = 0; seed < caseCount; seed++) {
    const scenario = scenarioFromSeed(seed);
    const initial = initialStateFor(scenario);
    bearingStarts.set(initial.alignment, (bearingStarts.get(initial.alignment) ?? new Set()).add(scenario.bearing));
    bandStarts.set(initial.frequency, (bandStarts.get(initial.frequency) ?? new Set()).add(scenario.band));
  }
  for (const [start, answers] of bearingStarts) {
    assert.deepEqual([...answers].sort(), ['left', 'centre', 'right'].filter(b => b !== start).sort(),
      `initial alignment ${start} leaks the answer`);
  }
  for (const [start, answers] of bandStarts) {
    assert.deepEqual([...answers].sort(), ['low', 'mid', 'high'].filter(b => b !== start).sort(),
      `initial frequency ${start} leaks the answer`);
  }
  for (const bearing of ['left', 'centre', 'right']) assert.ok(bearingStarts.has(bearing));
  for (const band of ['low', 'mid', 'high']) assert.ok(bandStarts.has(band));
});

test('the initial arrangement never starts aimed or recovered and always differs from the answer', () => {
  for (let seed = 0; seed < caseCount; seed++) {
    const scenario = scenarioFromSeed(seed);
    const initial = initialStateFor(scenario);
    const world = deriveWorld(initial, scenario);
    assert.equal(world.aimed, false);
    assert.equal(world.signalRecovered, false);
    assert.equal(world.powered, false);
    assert.equal(world.hazard, false);
    assert.notEqual(initial.alignment, scenario.bearing);
    assert.notEqual(initial.frequency, scenario.band);
  }
});

test('each case has exactly one recovered arrangement among all 648 states', () => {
  for (let seed = 0; seed < caseCount; seed++) {
    const scenario = scenarioFromSeed(seed);
    const solutions: TimeFoldState[] = [];
    let arrangements = 0;
    for (const state of allStates()) {
      arrangements++;
      const world = deriveWorld(state, scenario);
      assert.ok(!world.aimed || world.powered);
      assert.ok(!world.signalRecovered || world.aimed);
      assert.ok(!world.hazard || (state.cell === scenario.socket && state.fuse === 'bypass'));
      if (world.signalRecovered) solutions.push(state);
    }
    assert.equal(arrangements, 648);
    assert.deepEqual(solutions, [{
      cell: scenario.socket, fuse: 'protected', gear: 'drive', lens: 'optic',
      alignment: scenario.bearing, crystal: 'receiver', frequency: scenario.band,
    }]);
  }
});

test('the bypass only burns when the live socket feeds it', () => {
  const scenario = scenarioFromSeed(3);
  const dead = scenario.socket === 'a' ? 'b' : 'a';
  assert.equal(deriveWorld({ ...initialStateFor(scenario), cell: scenario.socket, fuse: 'bypass' }, scenario).hazard, true);
  assert.equal(deriveWorld({ ...initialStateFor(scenario), cell: dead, fuse: 'bypass' }, scenario).hazard, false);
  assert.equal(deriveWorld({ ...initialStateFor(scenario), cell: scenario.socket, fuse: 'bypass' }, scenario).powered, false);
});

test('state parsing accepts the new value sets and rejects retired labels', () => {
  const scenario = scenarioFromSeed(0);
  assert.deepEqual(parseTimeFoldState(initialStateFor(scenario)), initialStateFor(scenario));
  assert.equal(parseTimeFoldState({ ...initialStateFor(scenario), cell: 'main' }), null);
  assert.equal(parseTimeFoldState({ ...initialStateFor(scenario), cell: 'spare' }), null);
  assert.equal(parseTimeFoldState({ ...initialStateFor(scenario), alignment: 'target' }), null);
  assert.equal(parseTimeFoldState({ ...initialStateFor(scenario), frequency: 'target' }), null);
  assert.equal(parseTimeFoldState('string'), null);
});

test('scenario parsing re-derives from the seed and rejects disagreeing claims', () => {
  const scenario = scenarioFromSeed(11);
  assert.deepEqual(parseScenario({ seed: 11 }), scenario);
  assert.deepEqual(parseScenario(scenario), scenario);
  assert.equal(parseScenario({ seed: 11, socket: scenario.socket === 'a' ? 'b' : 'a' }), null);
  assert.equal(parseScenario({ seed: 11, band: 'high' }), null);
  assert.equal(parseScenario({ seed: 'eleven' }), null);
  assert.equal(parseScenario(null), null);
});
