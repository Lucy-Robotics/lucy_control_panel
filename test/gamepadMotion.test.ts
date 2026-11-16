import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    FINE_SCALE,
    FINE_STEP_M,
    MAX_PITCH_LEAD_RAD,
    NORMAL_SCALE,
    PAD_MAX_LEAD_M,
    PITCH_RAD_PER_S,
    ROLL_RANGE_PER_S,
    SLOWEST_SCALE,
    STEP_M,
    padDirection,
    pitchedTarget,
    rolledOpening,
    stickResponse,
    nudgeStep,
    steppedTarget,
} from '../src/Utils/gamepadMotion.ts';
import { SO101_MIN_END_EFFECTOR_Z_M } from '../src/Utils/jogTeleop.ts';
import type { PadInput } from '../src/Utils/gamepadLayout.ts';
import type { Vec3 } from '../src/Utils/phoneMotion.ts';

const AT_REST: Vec3 = [0, -0.2, 0.2];
const idle: PadInput = {
    enable: true, right: 0, forward: 0, up: false, down: false, pitch: 0, roll: 0, squeeze: 0, slow: 0,
    nudge: { forward: 0, right: 0 }, open: false, close: false, fine: false,
};
const pad = (input: Partial<PadInput>): PadInput => ({ ...idle, ...input });
const rounded = (v: Vec3) => v.map((x) => Math.round(x * 1e6) / 1e6 + 0);
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test('a resting stick inside the dead zone does not move the arm', () => {
    assert.equal(stickResponse(0.1), 0);
    assert.deepEqual(rounded(padDirection(pad({ right: 0.1, forward: -0.12 }), false)), [0, 0, 0]);
});

test('a small tilt crawls and a full tilt reaches full speed', () => {
    assert.ok(stickResponse(0.3) < 0.1);
    assert.equal(stickResponse(1), 1);
    assert.equal(stickResponse(-1), -1);
});

test('the left stick moves in the fixed X Y plane like W A S D, at the normal speed', () => {
    assert.deepEqual(rounded(padDirection(pad({ forward: 1 }), false)), [0, -NORMAL_SCALE, 0]);
    assert.deepEqual(rounded(padDirection(pad({ right: 1 }), false)), [-NORMAL_SCALE, 0, 0]);
});

test('the controller moves as fast as the keyboard jog', () => {
    assert.equal(NORMAL_SCALE, 1);
});

test('a half tilt already gives a quarter of the speed', () => {
    assert.ok(stickResponse(0.5) > 0.25 && stickResponse(0.5) < 0.3);
});

test('Cross lifts and Triangle lowers the gripper', () => {
    assert.deepEqual(rounded(padDirection(pad({ up: true }), false)), [0, 0, NORMAL_SCALE]);
    assert.deepEqual(rounded(padDirection(pad({ down: true }), false)), [0, 0, -NORMAL_SCALE]);
    assert.deepEqual(rounded(padDirection(pad({ up: true, down: true }), false)), [0, 0, 0]);
});

test('a diagonal never goes faster than a straight push', () => {
    assert.ok(close(Math.hypot(...padDirection(pad({ forward: 1, right: 1, up: true }), false)), NORMAL_SCALE));
});

test('L2 fully pressed still slows the gripper to the same slowest speed', () => {
    assert.ok(close(padDirection(pad({ forward: 1, slow: 1 }), false)[1], -SLOWEST_SCALE));
});

test('fine mode slows the gripper ten times', () => {
    assert.ok(close(padDirection(pad({ forward: 1 }), true)[1], -NORMAL_SCALE * FINE_SCALE));
});

test('the right stick to the right raises the pitch at its full rate', () => {
    assert.ok(close(pitchedTarget(0, pad({ pitch: 1 }), false, 0.1, 0), PITCH_RAD_PER_S * NORMAL_SCALE * 0.1));
});

test('the pitch target never leads the wrist by more than its lead', () => {
    let pitch = 0;
    for (let i = 0; i < 50; i += 1) pitch = pitchedTarget(pitch, pad({ pitch: -1 }), false, 0.05, 0);
    assert.ok(close(pitch, -MAX_PITCH_LEAD_RAD));
});

test('the pitch target stays between straight down and straight up', () => {
    assert.ok(close(pitchedTarget(-Math.PI / 2, pad({ pitch: -1 }), false, 1, -Math.PI / 2), -Math.PI / 2));
});

test('the right stick up turns the roll at its rate and stops at its ends', () => {
    assert.ok(close(rolledOpening(0.5, pad({ roll: 1 }), false, 0.2), 0.5 + ROLL_RANGE_PER_S * NORMAL_SCALE * 0.2));
    assert.equal(rolledOpening(0.99, pad({ roll: 1 }), false, 1), 1);
    assert.equal(rolledOpening(0.01, pad({ roll: -1 }), false, 1), 0);
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
    assert.ok(Math.abs(Math.hypot(...target.map((t, i) => t - AT_REST[i])) - PAD_MAX_LEAD_M) < 1e-9);
});

test('steps stop at the table', () => {
    const low: Vec3 = [0, -0.2, SO101_MIN_END_EFFECTOR_Z_M];
    assert.equal(steppedTarget(low, [0, 0, -STEP_M], low)[2], SO101_MIN_END_EFFECTOR_Z_M);
});
