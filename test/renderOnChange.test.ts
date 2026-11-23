/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { renderScene } from './r3f-harness.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createInvalidateSpy, scene } from './invalidateSpy.ts';
import { RenderOnChange } from '../src/Components/RenderOnChange.tsx';

const mount = async () => {
    const { spy, probe } = createInvalidateSpy();
    const view = await renderScene(scene(probe, React.createElement(RenderOnChange)));
    return { spy, view, canvas: spy.canvas! };
};

test('a frame is requested once the viewer has rendered', async () => {
    const { spy, view } = await mount();
    assert.ok(spy.calls >= 1);
    await view.unmount();
});

test('a frame is requested after every re-render of the viewer', async () => {
    const { spy, probe } = createInvalidateSpy();
    const tree = () => scene(probe, React.createElement(RenderOnChange));
    const view = await renderScene(tree());
    const before = spy.calls;
    await view.update(tree());
    assert.equal(spy.calls, before + 1);
    await view.unmount();
});

for (const type of ['pointerdown', 'pointermove', 'pointerup', 'wheel']) {
    test(`a ${type} on the canvas requests a frame`, async () => {
        const { spy, view, canvas } = await mount();
        const before = spy.calls;
        canvas.dispatchEvent(new window.Event(type));
        assert.equal(spy.calls, before + 1);
        await view.unmount();
    });
}

test('a pointer event that is not pointer or wheel does not request a frame', async () => {
    const { spy, view, canvas } = await mount();
    const before = spy.calls;
    canvas.dispatchEvent(new window.Event('keydown'));
    assert.equal(spy.calls, before);
    await view.unmount();
});

test('after unmount the canvas no longer requests frames', async () => {
    const { spy, view, canvas } = await mount();
    await view.unmount();
    const before = spy.calls;
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'wheel']) canvas.dispatchEvent(new window.Event(type));
    assert.equal(spy.calls, before);
});
