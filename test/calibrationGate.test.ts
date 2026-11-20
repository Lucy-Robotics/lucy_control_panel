import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blockingChecks, calibrationBlocked } from '../src/features/hardwareConfiguration/calibration/calibrationGate.ts';
import type { HealthCheck } from '../src/features/hardwareConfiguration/calibration/calibrationModel.ts';

const check = (id: string, ok: boolean, required = true): HealthCheck => ({ id, required, ok, label: id });
const green = [check('firmware', true), check('adapter', true), check('control_lock', true), check('load', true, false)];

test('every phase of a running calibration is blocked by a failing required check', () => {
    const unplugged = [check('firmware', true), check('adapter', false)];
    for (const phase of ['idle', 'mid_pose', 'joints', 'review'] as const) {
        assert.equal(calibrationBlocked(phase, unplugged), true, phase);
        assert.deepEqual(blockingChecks(phase, unplugged).map((c) => c.id), ['adapter'], phase);
    }
});

test('a fully green checklist blocks nothing', () => {
    for (const phase of ['idle', 'mid_pose', 'joints', 'review'] as const) {
        assert.equal(calibrationBlocked(phase, green), false, phase);
    }
});

test('a failing optional check is advice, not a block', () => {
    assert.equal(calibrationBlocked('joints', [check('firmware', true), check('load', false, false)]), false);
});

test('no reported checks yet blocks, so start waits for the first status', () => {
    assert.equal(calibrationBlocked('idle', []), true);
});

test('the control lock is not asked for before starting, but is during the session', () => {
    const unlocked = [check('firmware', true), check('control_lock', false)];
    assert.equal(calibrationBlocked('idle', unlocked), false);
    assert.equal(calibrationBlocked('mid_pose', unlocked), true);
    assert.equal(calibrationBlocked('joints', unlocked), true);
});

test('activating and the recovery screen are never gated on the arm', () => {
    const dead = [check('firmware', false), check('adapter', false)];
    for (const phase of ['recovery', 'applied', 'verify_drive', 'unsupported'] as const) {
        assert.equal(calibrationBlocked(phase, dead), false, phase);
        assert.deepEqual(blockingChecks(phase, dead), [], phase);
    }
});
