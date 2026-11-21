/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { act, renderHook, waitFor } from './react-harness.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RobotDescriptionHandler } from '../src/Services/ros/handlers/RobotDescription.handler.ts';
import { forgetRobotModel, useRobotModel } from '../src/hooks/useRobotModel.ts';

// No WebGL in jsdom: let three-stdlib's isWebGLAvailable() succeed with a dummy context.
(window as unknown as Record<string, unknown>).WebGLRenderingContext = class {};
HTMLCanvasElement.prototype.getContext = (() => ({ getExtension: () => null })) as never;

const urdf = (name: string) => `<robot name="${name}"><link name="${name}_base"/></robot>`;
const links = (robot: { links: object } | null) => Object.keys(robot?.links ?? {});

async function mount() {
    forgetRobotModel();
    const listeners = new Set<(u: string | null) => void>();
    (RobotDescriptionHandler as unknown as { getInstance: () => unknown }).getInstance = () => ({
        subscribe: (l: (u: string | null) => void) => { listeners.add(l); return () => listeners.delete(l); },
        resubscribe: () => {},
    });
    const hook = await renderHook(() => useRobotModel(), {});
    const emit = (u: string | null) => act(async () => listeners.forEach(l => l(u)));
    return { hook, emit };
}

test('after a robot switch forgets the model, the old robot leaves the screen when the stack disconnects, then the new one shows', async () => {
    const { hook, emit } = await mount();
    await emit(urdf('a'));
    assert.deepEqual(links(hook.result.current.robot), ['a_base']);
    assert.equal(await waitFor(() => !hook.result.current.loading), true);

    forgetRobotModel();
    await emit(null);
    assert.equal(hook.result.current.robot, null);
    assert.equal(hook.result.current.loading, true);

    await emit(urdf('b'));
    assert.deepEqual(links(hook.result.current.robot), ['b_base']);
    await hook.unmount();
});

test('a plain disconnect keeps a fully loaded robot on screen', async () => {
    const { hook, emit } = await mount();
    await emit(urdf('a'));
    assert.equal(await waitFor(() => !hook.result.current.loading), true);
    const robot = hook.result.current.robot;
    assert.ok(robot);

    await emit(null);
    assert.equal(hook.result.current.robot, robot);
    await hook.unmount();
});

test('the same URDF re-delivered after a forget and a disconnect is parsed again', async () => {
    const { hook, emit } = await mount();
    await emit(urdf('a'));
    assert.equal(await waitFor(() => !hook.result.current.loading), true);
    const first = hook.result.current.robot;

    forgetRobotModel();
    await emit(null);
    await emit(urdf('a'));
    const second = hook.result.current.robot;
    assert.ok(second);
    assert.notEqual(second, first);
    await hook.unmount();
});
