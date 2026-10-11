import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildEraVisuals } from '../shared/presentation.ts';
import { initialStateFor, scenarioFromSeed } from '../shared/timefold.ts';

const scenario = scenarioFromSeed(0);
const initial = initialStateFor(scenario);

test('three era visuals have distinct identity and derive their effects from the arrangement', () => {
  const first = buildEraVisuals(initial, scenario);
  assert.deepEqual(first.map(value => value.era), ['past', 'present', 'future']);
  assert.equal(first[2].signalRecovered, false);
  const powered = buildEraVisuals({ ...initial, cell: scenario.socket, fuse: 'protected' }, scenario);
  assert.equal(powered[1].powered, true);
  assert.equal(powered[2].powered, true);
  assert.equal(powered[2].signalRecovered, false);
  assert.equal(first[1].powered, false);
});

test('each era advertises where its evidence lives', () => {
  const layers = buildEraVisuals(initial, scenario);
  assert.deepEqual(layers[0].clues, []);
  assert.deepEqual(layers[1].clues, ['wiring']);
  assert.deepEqual(layers[2].clues, ['sky', 'plaque']);
  for (const layer of layers) assert.equal(layer.scenario, scenario);
});

test('a burning bypass reports its hazard status instead of pretending power', () => {
  const burnt = buildEraVisuals({ ...initial, cell: scenario.socket, fuse: 'bypass' }, scenario);
  assert.equal(burnt[1].hazard, true);
  assert.equal(burnt[1].powered, false);
  assert.equal(burnt[1].status, 'Circuit burnt — bypass');
  assert.equal(burnt[2].status.includes('burnt'), true);
  const safe = buildEraVisuals(initial, scenario);
  assert.equal(safe[1].hazard, false);
});
