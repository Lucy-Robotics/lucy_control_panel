import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    MAX_REACH_M,
    REST_MOTION,
    TELEOP_GAIN,
    deviceToBase,
    heldStill,
    integrateMotion,
    meanAcceleration,
    teleopTarget,
    withoutBias,
} from '../src/Utils/phoneMotion.ts';
import type { MotionState, Vec3 } from '../src/Utils/phoneMotion.ts';

const run = (accelerations: Vec3[], dt = 0.02): MotionState =>
    accelerations.reduce((state, a) => integrateMotion(state, a, dt), REST_MOTION);

test('sensor noise under the deadzone leaves the phone at rest', () => {
    const state = run(Array(200).fill([0.1, -0.1, 0.05]));
    assert.deepEqual([state.velocity, state.displacement], [REST_MOTION.velocity, REST_MOTION.displacement]);
});

test('a push then an equal brake moves about the true distance and holds it once still', () => {
    const push: Vec3[] = [...Array(25).fill([0, 2, 0]), ...Array(25).fill([0, -2, 0])];
    const moved = run([...push, ...Array(10).fill([0, 0, 0])]);
    const held = run([...push, ...Array(500).fill([0, 0, 0])]);
    assert.ok(moved.displacement[1] > 0.2 && moved.displacement[1] < 0.35);
    assert.equal(moved.velocity[1], 0);
    assert.equal(held.displacement[1], moved.displacement[1]);
});

test('velocity leaks away while the phone keeps feeling a small bias', () => {
    const state = run(Array(500).fill([0.2, 0, 0]));
    assert.ok(state.velocity[0] < 0.25);
});

test('a stalled sensor clock never integrates more than one step', () => {
    assert.deepEqual(integrateMotion(REST_MOTION, [1, 0, 0], 5), integrateMotion(REST_MOTION, [1, 0, 0], 0.1));
    assert.equal(integrateMotion(REST_MOTION, [1, 0, 0], -1), REST_MOTION);
});

test('phone forward and up map to SO-101 forward (-y) and up (+z)', () => {
    assert.deepEqual(deviceToBase([0, 1, 0]), [-0, -1, 0]);
    assert.deepEqual(deviceToBase([1, 0, 1]), [-1, -0, 1]);
});

test('the target is the origin plus the scaled displacement', () => {
    const target = teleopTarget([0.1, -0.2, 0.15], [0, 0, 0.02]);
    assert.ok(Math.abs(target[2] - (0.15 + 0.02 * TELEOP_GAIN)) < 1e-9);
});

test('the target stays within reach of the origin', () => {
    const origin: Vec3 = [0, -0.3, 0.2];
    const target = teleopTarget(origin, [5, 5, 5]);
    assert.ok(Math.abs(Math.hypot(...target.map((t, i) => t - origin[i])) - MAX_REACH_M) < 1e-9);
});

test('a constant sensor offset measured at rest no longer drifts the target', () => {
    const offset: Vec3 = [0.4, -0.25, 0.2];
    const bias = meanAcceleration(Array(150).fill(offset));
    const drifting = run(Array(150).fill(offset));
    const calibrated = run(Array(150).fill(offset).map((a: Vec3) => withoutBias(a, bias)));
    assert.ok(Math.hypot(...drifting.displacement) > 0.1);
    assert.deepEqual(calibrated.displacement, [0, 0, 0]);
});

test('calibration accepts sensor noise but not a moved phone', () => {
    const noise: Vec3[] = Array.from({ length: 150 }, (_, i) => [0.4 + (i % 2 ? 0.05 : -0.05), 0, 0]);
    assert.equal(heldStill(noise), true);
    assert.equal(heldStill([...noise, [2, 0, 0]]), false);
});
