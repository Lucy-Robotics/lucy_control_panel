/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { act, renderHook, wait } from './react-harness.ts';
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';

const { JointStateHandler } = await import('../src/Services/ros/handlers/JointState.handler.ts');
const { useThrottledJointAngles } = await import('../src/hooks/useThrottledJointAngles.ts');
const { useChangedJointReadings, useThrottledJointReadings } = await import('../src/hooks/useThrottledJointReadings.ts');

type Positions = { name: string; value: number }[];
type Readings = Map<string, number>;

const TICK_MS = 80;

const mounted: (() => Promise<void>)[] = [];
afterEach(async () => { for (const unmount of mounted.splice(0)) await unmount(); });
const mountHook = async <P, R>(hook: (props: P) => R, props: P) => {
    const view = await renderHook(hook, props);
    mounted.push(view.unmount);
    return view;
};

function fakeJointStates() {
    const listeners = new Set<(positions: Positions) => void>();
    const handler = JointStateHandler.getInstance();
    handler.subscribeToJointStates = (callback) => {
        listeners.add(callback);
        return () => { listeners.delete(callback); };
    };
    return (positions: Positions) => listeners.forEach((emit) => emit(positions));
}

function fakeReadings() {
    const listeners = new Set<(readings: Readings) => void>();
    const subscribe = (callback: (readings: Readings) => void) => {
        listeners.add(callback);
        return () => { listeners.delete(callback); };
    };
    return { subscribe, emit: (readings: Readings) => listeners.forEach((l) => l(readings)) };
}

test('identical joint state messages do not produce new joint angles', async () => {
    const emit = fakeJointStates();
    const hook = await mountHook(() => useThrottledJointAngles(true, 50), undefined);
    emit([{ name: 'Pitch', value: 1 }]);
    await act(() => wait(TICK_MS));
    const shown = hook.result.current;
    assert.equal(shown.get('Pitch'), 1);
    emit([{ name: 'Pitch', value: 1 }]);
    emit([{ name: 'Pitch', value: 1 }]);
    await act(() => wait(TICK_MS));
    assert.equal(hook.result.current, shown);
});

test('a changed joint value produces new joint angles', async () => {
    const emit = fakeJointStates();
    const hook = await mountHook(() => useThrottledJointAngles(true, 50), undefined);
    emit([{ name: 'Pitch', value: 1 }, { name: 'Roll', value: 2 }]);
    await act(() => wait(TICK_MS));
    const shown = hook.result.current;
    emit([{ name: 'Pitch', value: 1 }, { name: 'Roll', value: 3 }]);
    await act(() => wait(TICK_MS));
    assert.notEqual(hook.result.current, shown);
    assert.deepEqual([...hook.result.current], [['Pitch', 1], ['Roll', 3]]);
});

test('joint angles clear on disconnect', async () => {
    const emit = fakeJointStates();
    const hook = await mountHook(({ connected }) => useThrottledJointAngles(connected, 50), { connected: true });
    emit([{ name: 'Pitch', value: 1 }]);
    await act(() => wait(TICK_MS));
    assert.equal(hook.result.current.size, 1);
    await hook.rerender({ connected: false });
    assert.equal(hook.result.current.size, 0);
});

const readingsOver = (hook: typeof useChangedJointReadings) => {
    const source = fakeReadings();
    return { ...source, mount: () => mountHook(() => hook(source.subscribe, true, 50), undefined) };
};

test('equal joint readings keep the very same map', async () => {
    const { emit, mount } = readingsOver(useChangedJointReadings);
    const hook = await mount();
    emit(new Map([['Pitch', 1], ['Roll', 2]]));
    await act(() => wait(TICK_MS));
    const shown = hook.result.current;
    emit(new Map([['Roll', 2], ['Pitch', 1]]));
    await act(() => wait(TICK_MS));
    assert.equal(hook.result.current, shown);
});

for (const [change, next] of [
    ['a value changes', new Map([['Pitch', 1], ['Roll', 5]])],
    ['a joint is renamed', new Map([['Pitch', 1], ['Yaw', 2]])],
    ['a joint is added', new Map([['Pitch', 1], ['Roll', 2], ['Yaw', 3]])],
    ['a joint is removed', new Map([['Pitch', 1]])],
] as const) {
    test(`joint readings give a new map when ${change}`, async () => {
        const { emit, mount } = readingsOver(useChangedJointReadings);
        const hook = await mount();
        emit(new Map([['Pitch', 1], ['Roll', 2]]));
        await act(() => wait(TICK_MS));
        const shown = hook.result.current;
        emit(next);
        await act(() => wait(TICK_MS));
        assert.notEqual(hook.result.current, shown);
        assert.deepEqual(hook.result.current, next);
        });
}

test('the plain throttled readings still give a new map on every tick, even when equal', async () => {
    const { emit, mount } = readingsOver(useThrottledJointReadings);
    const hook = await mount();
    emit(new Map([['Pitch', 1]]));
    await act(() => wait(TICK_MS));
    const shown = hook.result.current;
    emit(new Map([['Pitch', 1]]));
    await act(() => wait(TICK_MS));
    assert.notEqual(hook.result.current, shown);
    assert.deepEqual(hook.result.current, shown);
});
