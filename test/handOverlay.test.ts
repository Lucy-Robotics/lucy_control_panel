import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handOverlayStyle, handSizePx } from '../src/Utils/handOverlay.ts';

test('hand size is the diagonal of its landmarks on screen', () => {
    const corners = [{ x: 0.25, y: 0.25 }, { x: 0.5, y: 0.75 }, { x: 0.4, y: 0.5 }];
    assert.equal(handSizePx(corners, 640, 480), Math.hypot(160, 240));
});

test('a closer hand gets thicker lines and bigger dots', () => {
    const far = handOverlayStyle(90);
    const near = handOverlayStyle(240);
    assert.ok(near.lineWidth > far.lineWidth);
    assert.ok(near.radius > far.radius);
});

test('a hand at arm length keeps the former 4px lines', () => {
    assert.equal(handOverlayStyle(240).lineWidth, 4);
});

test('lines and dots stay visible far away and bounded up close', () => {
    assert.deepEqual(handOverlayStyle(5), { lineWidth: 1, radius: 1.5 });
    assert.deepEqual(handOverlayStyle(5000), { lineWidth: 6, radius: 7 });
});
