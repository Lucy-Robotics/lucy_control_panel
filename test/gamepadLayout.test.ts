import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPad } from '../src/Utils/gamepadLayout.ts';

const button = (value: number) => ({ pressed: value > 0.5, touched: value > 0, value });

function pad(id: string, axes: number[], values: Record<number, number>, count = 19): Gamepad {
    const buttons = Array.from({ length: count }, (_, i) => button(values[i] ?? 0));
    return { id, axes, buttons, mapping: 'standard', connected: true, index: 0, timestamp: 0 } as unknown as Gamepad;
}

const REVOLUTION_PRO = '146b-0d01-Bigben Interactive Revolution Pro Controller';
const CENTERED_RIGHT_STICK = { 6: 0.49, 7: 0.48 };

test('the Revolution Pro in Firefox holds L1 on button 2', () => {
    assert.equal(readPad(pad(REVOLUTION_PRO, [0, 0, -1, -1], { ...CENTERED_RIGHT_STICK, 2: 1 })).enable, true);
    assert.equal(readPad(pad(REVOLUTION_PRO, [0, 0, -1, -1], { ...CENTERED_RIGHT_STICK, 4: 1 })).enable, false);
});

test('the Revolution Pro in Firefox reads R2 from axis 3 and L2 from axis 2', () => {
    const input = readPad(pad(REVOLUTION_PRO, [0, 0, 1, -0.5], CENTERED_RIGHT_STICK));
    assert.equal(input.slow, 1);
    assert.equal(input.squeeze, 0.25);
});

test('a trigger never touched since plugging in reads as released, not half squeezed', () => {
    assert.equal(readPad(pad(REVOLUTION_PRO, [0, 0, 0, 0], CENTERED_RIGHT_STICK)).squeeze, 0);
});

test('the Revolution Pro in Firefox reads the right stick from the trigger values', () => {
    const centered = readPad(pad(REVOLUTION_PRO, [0, 0, -1, -1], CENTERED_RIGHT_STICK));
    const up = readPad(pad(REVOLUTION_PRO, [0, 0, -1, -1], { 6: 0.5, 7: 0 }));
    assert.ok(Math.abs(centered.lift) < 0.1);
    assert.equal(up.lift, 1);
    assert.equal(up.squeeze, 0);
});

test('the Revolution Pro in Firefox maps Triangle, Circle and Square', () => {
    const input = readPad(pad(REVOLUTION_PRO, [0, 0, -1, -1], { ...CENTERED_RIGHT_STICK, 3: 1, 17: 1, 0: 1 }));
    assert.deepEqual([input.open, input.close, input.fine], [true, true, true]);
});

test('a standard pad reads L1, the triggers, the right stick and the D-pad', () => {
    const input = readPad(pad('Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)', [0, -1, 0, -1], {
        4: 1, 6: 0.5, 7: 1, 12: 1, 15: 1,
    }, 17));
    assert.deepEqual(
        [input.enable, input.reach, input.lift, input.slow, input.squeeze, input.nudge],
        [true, 1, 1, 0.5, 1, { forward: 1, right: 1 }],
    );
});
