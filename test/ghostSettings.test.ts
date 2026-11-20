/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { act, render, renderHook, wait } from './react-harness.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import ROSLIB from 'roslib';
import { storedVisibility } from '../src/hooks/storedVisibility.ts';
import { setGhostOpacity, useGhostOpacity } from '../src/hooks/useGhostOpacity.ts';
import { TeleopGhostSwitch } from '../src/Components/TeleopGhostSwitch.tsx';
import { useTeleopGhostVisible } from '../src/hooks/useTeleopGhostVisible.ts';
import { createJointMoveStore } from '../src/hooks/useJointMove.ts';
import { QuickColorsTab } from '../src/Components/ThemeModal/QuickColorsTab.tsx';
import { themeService, type QuickColors } from '../src/Services/theme.service.ts';
import { TEXT_PRIMARY } from '../src/Constants/theme.ts';
import { RosBridgeService } from '../src/Services/ros/ros.service.ts';
import { useTargetPose } from '../src/hooks/useTargetPose.ts';

function withBrokenStorage(run: () => void) {
    const real = localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } },
    });
    try {
        run();
    } finally {
        Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: real });
    }
}

test('a visibility switch starts at its default, then remembers the last choice', async () => {
    localStorage.removeItem('test-visible');
    const visibility = storedVisibility('test-visible', false);
    const hook = await renderHook(() => visibility.useValue(), {});
    assert.equal(hook.result.current, false);
    await act(async () => visibility.set(true));
    assert.equal(hook.result.current, true, 'the switch re-renders its users');
    assert.equal(localStorage.getItem('test-visible'), 'true');
    await hook.unmount();

    const reloaded = storedVisibility('test-visible', false);
    const again = await renderHook(() => reloaded.useValue(), {});
    assert.equal(again.result.current, true, 'the choice survives a reload');
    await again.unmount();
});

test('a visibility switch still works when storage is blocked', () => {
    withBrokenStorage(() => {
        const visibility = storedVisibility('blocked-visible', true);
        assert.doesNotThrow(() => visibility.set(false));
    });
});

test('the ghost opacity slider applies live and is remembered', async () => {
    const hook = await renderHook(() => useGhostOpacity(), {});
    await act(async () => setGhostOpacity(0.6));
    assert.equal(hook.result.current, 0.6);
    assert.equal(localStorage.getItem('ghostOpacity'), '0.6');
    await act(async () => withBrokenStorage(() => assert.doesNotThrow(() => setGhostOpacity(0.3))));
    assert.equal(hook.result.current, 0.3, 'blocked storage only loses the memory, not the change');
    await hook.unmount();
});

test('the Hands ghost is off by default and its switch turns it on without starting a modal drag', async () => {
    let parentMouseDowns = 0;
    const visible = await renderHook(() => useTeleopGhostVisible(), {});
    assert.equal(visible.result.current, false);
    const view = await render(React.createElement('div', { onMouseDown: () => { parentMouseDowns += 1; } }, React.createElement(TeleopGhostSwitch)));
    try {
        const on = [...view.container.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'ON')!;
        on.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
        assert.equal(parentMouseDowns, 0, 'pressing the switch does not drag the window it sits in');
        await act(async () => on.click());
        assert.equal(visible.result.current, true);
        assert.equal(localStorage.getItem('teleopGhostVisible'), 'true');
    } finally {
        await view.unmount();
        await visible.unmount();
    }
});

test('a slider move is shared until it is released', () => {
    const store = createJointMoveStore();
    const seen: unknown[] = [];
    const stop = store.subscribe(() => seen.push(store.get()));
    store.move('Elbow', 1.2);
    assert.deepEqual(store.get(), { name: 'Elbow', value: 1.2 });
    store.release();
    assert.equal(store.get(), null);
    stop();
    store.move('Elbow', 0.5);
    assert.deepEqual(seen, [{ name: 'Elbow', value: 1.2 }, null], 'an unsubscribed listener hears nothing more');
});

const setInput = async (input: HTMLInputElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => {
        setter.call(input, value);
        input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
};

test('the theme ghost colour is picked in Quick Colors, applied, and reset to the text colour', async () => {
    const applied: QuickColors[] = [];
    const view = await render(React.createElement(QuickColorsTab, {
        activeColors: { main: '#141414', secondary: '#2b3e50', highlight: '#00ff41', text: '#f7f1e5' },
        onApplyColors: (colors: QuickColors) => applied.push(colors),
    }));
    try {
        const picker = view.container.querySelector('input[title="Pick INTENT / GHOST"]') as HTMLInputElement;
        assert.equal(picker.value, '#f7f1e5', 'with no ghost colour the ghost uses the text colour');
        await setInput(picker, '#ff8800');
        const apply = [...view.container.querySelectorAll('button')].find((b) => /apply/i.test(b.textContent ?? ''))!;
        await act(async () => apply.click());
        assert.equal(applied.at(-1)?.ghost, '#ff8800');
        const reset = [...view.container.querySelectorAll('button')].find((b) => /reset/i.test(b.textContent ?? ''))!;
        await act(async () => reset.click());
        assert.equal(applied.at(-1)?.ghost, TEXT_PRIMARY);
    } finally {
        await view.unmount();
    }
});

test('the ghost colour is saved in the theme, and a theme without one uses its text colour', () => {
    const colors = { main: '#101010', secondary: '#202020', highlight: '#00ff41', text: '#eeeeee' };
    themeService.setThemeColors({ ...colors, ghost: '#ff8800' });
    assert.equal(themeService.getActiveColors().ghost, '#ff8800');
    themeService.setThemeColors(colors);
    assert.equal(themeService.getActiveColors().ghost, '#eeeeee');
});

test('the target pose shared over ROS is shown, cleared on an empty message, and dropped once stale', async () => {
    const fakeRos = new ROSLIB.Ros({});
    fakeRos.callOnConnection = () => {};
    const bridge = RosBridgeService.getInstance();
    bridge.ros = fakeRos;
    const hook = await renderHook(({ connected }) => useTargetPose(connected), { connected: true });
    const send = (name: string[], position: number[]) => act(async () => fakeRos.emit('/lucy/target_pose', { name, position }));
    try {
        assert.equal(hook.result.current, null);
        await send(['Elbow'], [1.2]);
        assert.deepEqual(hook.result.current, { Elbow: 1.2 });
        await send([], []);
        assert.equal(hook.result.current, null, 'an empty message means nobody is moving the robot');
        await send(['Elbow'], [0.4]);
        await act(() => wait(1600));
        assert.equal(hook.result.current, null, 'a target nobody refreshes fades out');
        await send(['Elbow'], [0.7]);
        await hook.rerender({ connected: false });
        assert.equal(hook.result.current, null, 'disconnecting clears the target');
    } finally {
        await hook.unmount();
    }
});

test('moving a joint slider shares the move for the ghost, and letting go commits it', async () => {
    const { JointControl } = await import('../src/Components/ControlPage/JointControl.tsx');
    const { JointMoveContext } = await import('../src/hooks/useJointMove.ts');
    const store = createJointMoveStore();
    const moves: unknown[] = [];
    store.subscribe(() => moves.push(store.get()));
    const committed: [string, number][] = [];
    const joint = { name: 'Elbow', currentValue: 1, targetValue: 1, minValue: 0, maxValue: 2, type: 'revolute' as const, category: 'Arm' };
    const view = await render(React.createElement(JointMoveContext.Provider, { value: store },
        React.createElement(JointControl, { joint, onValueChange: (name: string, value: number) => committed.push([name, value]) })));
    try {
        const handle = view.container.querySelector('.ant-slider-handle') as HTMLElement;
        await act(async () => {
            handle.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', keyCode: 39, which: 39, bubbles: true }));
        });
        assert.equal((moves[0] as { name: string }).name, 'Elbow', 'the move is shared while the slider is held');
        assert.ok(view.container.querySelector('.joint-slider-moving'), 'the moving slider wears the intent colour');
        await act(async () => {
            handle.dispatchEvent(new window.KeyboardEvent('keyup', { key: 'ArrowRight', keyCode: 39, which: 39, bubbles: true }));
        });
        assert.equal(store.get(), null, 'letting go ends the move');
        assert.equal(committed.at(-1)?.[0], 'Elbow', 'letting go commits the value');
        assert.equal(view.container.querySelector('.joint-slider-moving'), null);
    } finally {
        await view.unmount();
    }
});
