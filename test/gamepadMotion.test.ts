import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    FINE_SCALE,
    FINE_STEP_M,
    SLOWEST_SCALE,
    STEP_M,
    stickDirection,
    stickResponse,
    nudgeStep,
    steppedTarget,
} from '../src/Utils/gamepadMotion.ts';
import { MAX_LEAD_M, SO101_MIN_END_EFFECTOR_Z_M } from '../src/Utils/jogTeleop.ts';
import type { PadInput } from '../src/Utils/gamepadLayout.ts';
import type { Vec3 } from '../src/Utils/phoneMotion.ts';

const AT_REST: Vec3 = [0, -0.2, 0.2];
const idle: PadInput = {
    enable: true, swing: 0, reach: 0, lift: 0, squeeze: 0, slow: 0,
    nudge: { forward: 0, right: 0 }, open: false, close: false, fine: false,
};
const pad = (input: Partial<PadInput>): PadInput => ({ ...idle, ...input });
const rounded = (v: Vec3) => v.map((x) => Math.round(x * 1e6) / 1e6 + 0);

test('a resting stick inside the dead zone does not move the arm', () => {
    assert.equal(stickResponse(0.1), 0);
    assert.deepEqual(rounded(stickDirection(pad({ swing: 0.1, reach: -0.12, lift: 0.14 }), AT_REST, false)), [0, 0, 0]);
});

test('a small tilt crawls and a full tilt reaches full speed', () => {
    assert.ok(stickResponse(0.3) < 0.1);
    assert.equal(stickResponse(1), 1);
    assert.equal(stickResponse(-1), -1);
});

test('pushing the left stick forward reaches away from the base', () => {
    assert.deepEqual(rounded(stickDirection(pad({ reach: 1 }), AT_REST, false)), [0, -1, 0]);
});

test('reach follows the arm once it has swung to the side', () => {
    assert.deepEqual(rounded(stickDirection(pad({ reach: 1 }), [0.2, 0, 0.2], false)), [1, 0, 0]);
});

test('the left stick to the right swings the arm right seen from behind it, like the D key', () => {
    assert.deepEqual(rounded(stickDirection(pad({ swing: 1 }), AT_REST, false)), [-1, 0, 0]);
});

test('the right stick up lifts the gripper', () => {
    assert.deepEqual(rounded(stickDirection(pad({ lift: 1 }), AT_REST, false)), [0, 0, 1]);
});

test('a diagonal never goes faster than a straight push', () => {
    assert.ok(Math.abs(Math.hypot(...stickDirection(pad({ reach: 1, swing: 1, lift: 1 }), AT_REST, false)) - 1) < 1e-9);
});

test('L2 fully pressed slows the sticks to the slowest speed', () => {
    const [, y] = stickDirection(pad({ reach: 1, slow: 1 }), AT_REST, false);
    assert.ok(Math.abs(y + SLOWEST_SCALE) < 1e-9);
});

test('fine mode slows the sticks ten times', () => {
    const [, y] = stickDirection(pad({ reach: 1 }), AT_REST, true);
    assert.ok(Math.abs(y + FINE_SCALE) < 1e-9);
});

test('a D-pad press is one step, smaller in fine mode', () => {
    assert.deepEqual(rounded(nudgeStep({ forward: 1, right: 0 }, false)), [0, -STEP_M, 0]);
    assert.deepEqual(rounded(nudgeStep({ forward: 0, right: 1 }, true)), [-FINE_STEP_M, 0, 0]);
});

test('three steps move the target exactly three steps', () => {
    let target = AT_REST;
    for (let i = 0; i < 3; i += 1) target = steppedTarget(target, [0, 0, STEP_M], AT_REST);
    assert.ok(Math.abs(target[2] - (AT_REST[2] + 3 * STEP_M)) < 1e-9);
});

test('steps never take the target further ahead of the gripper than the lead', () => {
    let target = AT_REST;
    for (let i = 0; i < 100; i += 1) target = steppedTarget(target, [0, -STEP_M, 0], AT_REST);
    assert.ok(Math.abs(Math.hypot(...target.map((t, i) => t - AT_REST[i])) - MAX_LEAD_M) < 1e-9);
});

test('steps stop at the table', () => {
    const low: Vec3 = [0, -0.2, SO101_MIN_END_EFFECTOR_Z_M];
    assert.equal(steppedTarget(low, [0, 0, -STEP_M], low)[2], SO101_MIN_END_EFFECTOR_Z_M);
});
