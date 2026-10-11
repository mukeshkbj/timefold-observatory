import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ambientFromEstimate, clampScale, faceCameraYaw, lightChanged, SCALE_DEFAULT, SCALE_MAX, SCALE_MIN, trackingHint } from '../src/xr/arMath.ts';

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);

test('faceCameraYaw turns the +Z front toward the camera', () => {
  close(faceCameraYaw([0, 1, 2], [0, 0, 0]), 0);
  close(faceCameraYaw([2, 1, 0], [0, 0, 0]), 90);
  close(faceCameraYaw([0, 1, -2], [0, 0, 0]), 180);
  close(faceCameraYaw([-2, 1, 0], [0, 0, 0]), -90);
  close(faceCameraYaw([3, 1, 2], [1, 0, 0]), 45);
});

test('faceCameraYaw subtracts the plane yaw and normalises', () => {
  close(faceCameraYaw([2, 1, 0], [0, 0, 0], 30), 60);
  close(faceCameraYaw([0, 1, -2], [0, 0, 0], -90), -90);
  close(faceCameraYaw([0, 1, 2], [0, 0, 0], 540), 180);
  close(faceCameraYaw([0, 1, 2], [0, 0, 0], Number.NaN), 0);
});

test('faceCameraYaw falls back when the camera is directly above the tap', () => {
  close(faceCameraYaw([0, 1, 0], [0, 0, 0]), 0);
  close(faceCameraYaw([0, 1, 0], [0, 0, 0], 45), -45);
});

test('clampScale bounds pinch scaling', () => {
  assert.equal(clampScale(0.5), 0.5);
  assert.equal(clampScale(0.01), SCALE_MIN);
  assert.equal(clampScale(9), SCALE_MAX);
  assert.equal(clampScale(Number.NaN), SCALE_DEFAULT);
  assert.equal(clampScale(Number.POSITIVE_INFINITY), SCALE_DEFAULT);
});

test('trackingHint maps ARKit/ARCore tracking state', () => {
  assert.equal(trackingHint(3, 1), null);
  assert.equal(trackingHint(3, 2), null);
  assert.equal(trackingHint(1, 1), 'unavailable');
  assert.equal(trackingHint(2, 2), 'motion');
  assert.equal(trackingHint(2, 3), 'features');
  assert.equal(trackingHint(2, 1), null);
});

test('ambientFromEstimate clamps room light and validates colour', () => {
  assert.deepEqual(ambientFromEstimate(1000, '#ffeedd'), { intensity: 300, color: '#ffeedd' });
  assert.deepEqual(ambientFromEstimate(100, '#FFEEDD'), { intensity: 180, color: '#FFEEDD' });
  assert.deepEqual(ambientFromEstimate(5000, 'white'), { intensity: 420, color: '#ffffff' });
  assert.deepEqual(ambientFromEstimate(Number.NaN, '#12345'), { intensity: 300, color: '#ffffff' });
});

test('lightChanged ignores jitter', () => {
  const base = { intensity: 300, color: '#ffffff' };
  assert.equal(lightChanged(base, { intensity: 320, color: '#FFFFFF' }), false);
  assert.equal(lightChanged(base, { intensity: 330, color: '#ffffff' }), true);
  assert.equal(lightChanged(base, { intensity: 300, color: '#ffeedd' }), true);
});
