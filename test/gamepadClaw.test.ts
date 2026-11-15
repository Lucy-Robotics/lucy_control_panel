import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLAW_SEND_STEP, CLAW_STEP_PER_S, clawMoved, clawOpenness, restOpening } from '../src/Utils/gamepadClaw.ts';
import { atOpenness, jointOpenness } from '../src/Utils/jointOpenness.ts';
import { DEFAULT_ACTUATOR_MAPPING } from '../src/Utils/actuatorJointMapping.ts';
import type { JointControlState } from '../src/Constants/robotTypes.ts';

test('a released R2 leaves the claw at its resting opening', () => {
    assert.equal(clawOpenness(0.7, 0), 0.7);
});

test('R2 squeezed fully closes the claw from any resting opening', () => {
    assert.equal(clawOpenness(0.7, 1), 0);
    assert.equal(clawOpenness(1, 1), 0);
});

test('R2 halfway closes the claw halfway from its resting opening', () => {
    assert.ok(Math.abs(clawOpenness(0.8, 0.5) - 0.4) < 1e-9);
});

test('Triangle opens and Circle closes the resting opening at a steady rate', () => {
    assert.ok(Math.abs(restOpening(0.5, true, false, 0.5) - (0.5 + CLAW_STEP_PER_S * 0.5)) < 1e-9);
    assert.ok(Math.abs(restOpening(0.5, false, true, 0.5) - (0.5 - CLAW_STEP_PER_S * 0.5)) < 1e-9);
});

test('holding both claw buttons keeps the opening still', () => {
    assert.equal(restOpening(0.5, true, true, 1), 0.5);
});

test('the resting opening stays between closed and fully open', () => {
    assert.equal(restOpening(0.95, true, false, 1), 1);
    assert.equal(restOpening(0.05, false, true, 1), 0);
});

test('the claw is only resent once it moved enough', () => {
    assert.equal(clawMoved(null, 0.5), true);
    assert.equal(clawMoved(0.5, 0.5 + CLAW_SEND_STEP / 2), false);
    assert.equal(clawMoved(0.5, 0.5 + CLAW_SEND_STEP), true);
});

const jaw = (currentValue: number): JointControlState => ({
    name: 'Jaw', currentValue, targetValue: currentValue, minValue: -0.2, maxValue: 1.8, type: 'revolute', category: 'Gripper',
});

test('the jaw reads as closed at its lower limit and fully open at its upper one', () => {
    assert.equal(jointOpenness(jaw(-0.2), DEFAULT_ACTUATOR_MAPPING), 0);
    assert.equal(jointOpenness(jaw(1.8), DEFAULT_ACTUATOR_MAPPING), 1);
    assert.ok(Math.abs(jointOpenness(jaw(0.8), DEFAULT_ACTUATOR_MAPPING) - 0.5) < 1e-9);
});

test('an inverted jaw servo still reads open at its open end', () => {
    const inverted = { ...DEFAULT_ACTUATOR_MAPPING, scale: -1 };
    assert.equal(jointOpenness(jaw(-0.2), inverted), 1);
});

test('setting the jaw to an opening then reading it back gives the same opening', () => {
    const inverted = { ...DEFAULT_ACTUATOR_MAPPING, scale: -1 };
    for (const mapping of [DEFAULT_ACTUATOR_MAPPING, inverted]) {
        assert.ok(Math.abs(jointOpenness(atOpenness(jaw(0), 0.3, mapping), mapping) - 0.3) < 1e-9);
    }
});
