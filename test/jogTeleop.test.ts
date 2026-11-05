import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    JOG_SPEED_MPS,
    MAX_LEAD_M,
    SO101_MIN_END_EFFECTOR_Z_M,
    isJogCode,
    jogDirection,
    jogTarget,
} from '../src/Utils/jogTeleop.ts';
import type { Vec3 } from '../src/Utils/phoneMotion.ts';

const END_EFFECTOR: Vec3 = [0, -0.2, 0.2];
const direction = (...codes: string[]) => jogDirection(new Set(codes)).map((d) => d + 0);

test('forward follows the arm, which reaches along -Y at rest', () => {
    assert.deepEqual(direction('KeyW'), [0, -1, 0]);
});

test('right is -X so the keys stay right-handed seen from behind the arm', () => {
    assert.deepEqual(direction('KeyD'), [-1, 0, 0]);
});

test('space lifts and either shift lowers', () => {
    assert.deepEqual(direction('Space'), [0, 0, 1]);
    assert.deepEqual(direction('ShiftRight'), [0, 0, -1]);
});

test('opposite keys cancel out', () => {
    assert.deepEqual(direction('KeyW', 'KeyS'), [0, 0, 0]);
});

test('only the movement keys are captured', () => {
    assert.equal(isJogCode('KeyW'), true);
    assert.equal(isJogCode('KeyQ'), false);
});

test('a tick moves the target at the jog speed', () => {
    const next = jogTarget(END_EFFECTOR, [0, 0, 1], 0.1, END_EFFECTOR);
    assert.ok(Math.abs(next[2] - (END_EFFECTOR[2] + JOG_SPEED_MPS * 0.1)) < 1e-9);
});

test('the target never runs further ahead of the end effector than the lead', () => {
    let target = END_EFFECTOR;
    for (let i = 0; i < 1000; i += 1) target = jogTarget(target, [0, -1, 0], 0.05, END_EFFECTOR);
    assert.ok(Math.abs(Math.hypot(...target.map((t, i) => t - END_EFFECTOR[i])) - MAX_LEAD_M) < 1e-9);
});

test('coming back from a held direction reverses at once', () => {
    let target = END_EFFECTOR;
    for (let i = 0; i < 1000; i += 1) target = jogTarget(target, [0, -1, 0], 0.05, END_EFFECTOR);
    assert.ok(jogTarget(target, [0, 1, 0], 0.05, END_EFFECTOR)[1] > target[1]);
});

test('the target stops at the table', () => {
    const low: Vec3 = [0, -0.2, SO101_MIN_END_EFFECTOR_Z_M];
    assert.equal(jogTarget(low, [0, 0, -1], 0.05, low)[2], SO101_MIN_END_EFFECTOR_Z_M);
});
