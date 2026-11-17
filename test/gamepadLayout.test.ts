import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPad } from '../src/Utils/gamepadLayout.ts';

const button = (value: number) => ({ pressed: value > 0.5, touched: value > 0, value });

function pad(id: string, axes: number[], values: Record<number, number>, count = 19): Gamepad {
    const buttons = Array.from({ length: count }, (_, i) => button(values[i] ?? 0));
    return { id, axes, buttons, mapping: 'standard', connected: true, index: 0, timestamp: 0 } as unknown as Gamepad;
}

const REVOLUTION_PRO = '146b-0d01-Bigben Interactive Revolution Pro Controller';
const CENTERED_RIGHT_STICK = { 6: 0.5, 7: 0.5 };
const revolutionPro = (values: Record<number, number>, axes = [0, 0, -1, -1]) =>
    readPad(pad(REVOLUTION_PRO, axes, { ...CENTERED_RIGHT_STICK, ...values }));

test('the Revolution Pro in Firefox holds L1 on button 2', () => {
    assert.equal(revolutionPro({ 2: 1 }).enable, true);
    assert.equal(revolutionPro({ 4: 1 }).enable, false);
});

test('the Revolution Pro in Firefox reads R2 from axis 3 and L2 from axis 2', () => {
    const input = revolutionPro({}, [0, 0, 1, -0.5]);
    assert.equal(input.slow, 1);
    assert.equal(input.squeeze, 0.25);
});

test('a trigger never touched since plugging in reads as released, not half squeezed', () => {
    assert.equal(revolutionPro({}, [0, 0, 0, 0]).squeeze, 0);
});

test('the Revolution Pro right stick lifts when pushed up and pitches when pushed right', () => {
    const centered = revolutionPro({});
    assert.ok(centered.lift === 0 && centered.pitch === 0);
    const tilted = revolutionPro({ 6: 1, 7: 0 });
    assert.deepEqual([tilted.lift, tilted.pitch, tilted.squeeze], [1, 1, 0]);
});

test('the Revolution Pro opens the claw on Triangle and closes it on Cross', () => {
    assert.deepEqual([revolutionPro({ 3: 1 }).open, revolutionPro({ 1: 1 }).close], [true, true]);
});

test('the Revolution Pro rolls one way on Circle, the other on Square, and not with both', () => {
    assert.deepEqual([revolutionPro({ 17: 1 }).roll, revolutionPro({ 0: 1 }).roll, revolutionPro({ 0: 1, 17: 1 }).roll], [1, -1, 0]);
});

test('the Revolution Pro toggles fine mode on R1', () => {
    assert.equal(revolutionPro({ 18: 1 }).fine, true);
});

test('a standard pad reads both sticks, the triggers, the face buttons and the D-pad', () => {
    const input = readPad(pad('Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)', [1, -1, 1, -1], {
        4: 1, 5: 1, 3: 1, 1: 1, 6: 0.5, 7: 1, 12: 1, 15: 1,
    }, 17));
    assert.deepEqual(
        [input.enable, input.fine, input.right, input.forward, input.lift, input.pitch, input.roll, input.open, input.slow, input.squeeze, input.nudge],
        [true, true, 1, 1, 1, 1, 1, true, 0.5, 1, { forward: 1, right: 1 }],
    );
});
