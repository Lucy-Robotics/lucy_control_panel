/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderScene } from './r3f-harness.ts';
import { flushGlobalEffects } from '@react-three/fiber';

const { measureFrameCost, lastFrameCostMs } = await import('../src/Utils/frameCost.ts');
const { RenderOnChange } = await import('../src/Components/RenderOnChange.tsx');
const { loadingRedrawDelayMs } = await import('../src/hooks/useRobotModel.ts');

/** Runs one frame: `mainMs` of main-thread work, then the next animation frame `nextFrameAtMs` after the frame started. */
function frame(mainMs: number, nextFrameAtMs: number) {
    let now = 1000;
    let nextRaf: (() => void) | undefined;
    const realNow = performance.now;
    const realRaf = globalThis.requestAnimationFrame;
    performance.now = () => now;
    globalThis.requestAnimationFrame = ((cb: () => void) => { nextRaf = cb; return 0; }) as typeof requestAnimationFrame;
    try {
        flushGlobalEffects('before', 0);
        now += mainMs;
        flushGlobalEffects('after', 0);
        now = 1000 + nextFrameAtMs;
        nextRaf?.();
    } finally {
        performance.now = realNow;
        globalThis.requestAnimationFrame = realRaf;
    }
}

test('a cheap frame followed by a prompt animation frame costs almost nothing', () => {
    const stop = measureFrameCost();
    frame(2, 16);
    assert.ok(lastFrameCostMs() >= 2 && lastFrameCostMs() < 5);
    stop();
});

test('a frame whose next animation frame arrives 250 ms late costs about 250 minus one refresh', () => {
    const stop = measureFrameCost();
    frame(2, 250);
    assert.ok(Math.abs(lastFrameCostMs() - (250 - 1000 / 60)) < 0.01);
    stop();
});

test('a frame whose main-thread time exceeds the late-frame excess keeps the main-thread time', () => {
    const stop = measureFrameCost();
    frame(100, 110);
    assert.equal(lastFrameCostMs(), 100);
    stop();
});

test('after the cleanup runs, frames no longer update the cost', () => {
    const stop = measureFrameCost();
    frame(2, 250);
    const before = lastFrameCostMs();
    stop();
    frame(40, 600);
    assert.equal(lastFrameCostMs(), before);
});

test('the loading redraw delay scales with the measured frame cost', () => {
    assert.equal(loadingRedrawDelayMs(0), 0);
    assert.ok(loadingRedrawDelayMs(250) >= 750);
    assert.ok(loadingRedrawDelayMs(250) > loadingRedrawDelayMs(50));
});

test('mounting RenderOnChange makes rendered frames update the cost, and unmounting stops it', async () => {
    const view = await renderScene(React.createElement(RenderOnChange));
    frame(2, 100);
    const measured = lastFrameCostMs();
    assert.ok(Math.abs(measured - (100 - 1000 / 60)) < 0.01);
    await view.unmount();
    frame(40, 600);
    assert.equal(lastFrameCostMs(), measured);
});
