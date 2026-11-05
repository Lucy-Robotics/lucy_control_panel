import { test } from 'node:test';
import assert from 'node:assert/strict';
import { oneEuroFilter } from '../src/Utils/oneEuroFilter.ts';

const spread = (values: number[]) => Math.max(...values) - Math.min(...values);

function run(fps: number, durationS: number, signal: (timeS: number, frame: number) => number) {
    const filter = oneEuroFilter();
    const outputs: number[] = [];
    for (let frame = 0; frame <= durationS * fps; frame++) {
        const timeS = frame / fps;
        outputs.push(filter(signal(timeS, frame), timeS * 1000));
    }
    return outputs;
}

test('the first sample passes through unchanged', () => {
    assert.equal(oneEuroFilter()(0.4, 1000), 0.4);
});

test('jitter on a still hand shrinks at 30 fps', () => {
    const outputs = run(30, 3, (_, frame) => 0.5 + (frame % 2 ? 0.03 : -0.03));
    assert.ok(spread(outputs.slice(30)) < 0.06 / 3);
});

test('jitter on a still hand shrinks on a 10 fps phone', () => {
    const outputs = run(10, 3, (_, frame) => 0.5 + (frame % 2 ? 0.03 : -0.03));
    assert.ok(spread(outputs.slice(10)) < 0.06 / 1.5);
});

test('closing the hand is followed within 300 ms at 30 fps', () => {
    const outputs = run(30, 1, (timeS) => (timeS < 0.5 ? 0 : 1));
    assert.ok(outputs[Math.round(0.8 * 30)] > 0.9);
});

test('closing the hand is followed within 400 ms on a 10 fps phone', () => {
    const outputs = run(10, 1, (timeS) => (timeS < 0.5 ? 0 : 1));
    assert.ok(outputs[9] > 0.9);
});

test('a hand reappearing after seconds away is not held at its old value', () => {
    const filter = oneEuroFilter();
    filter(0, 0);
    assert.ok(filter(1, 5000) > 0.9);
});

test('a repeated or earlier timestamp keeps the last value', () => {
    const filter = oneEuroFilter();
    filter(0.2, 1000);
    assert.equal(filter(0.9, 1000), 0.2);
    assert.equal(filter(0.9, 900), 0.2);
});
