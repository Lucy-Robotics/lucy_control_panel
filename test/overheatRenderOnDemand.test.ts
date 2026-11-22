/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { act, renderHook, wait } from './react-harness.ts';
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import ROSLIB from 'roslib';

const { RosBridgeService } = await import('../src/Services/ros/ros.service.ts');
const { useMotorOverheatGuard } = await import('../src/hooks/useMotorOverheatGuard.ts');
const { OVERHEAT_CELSIUS, OVERHEAT_REARM_CELSIUS } = await import('../src/Utils/motorOverheat.utils.ts');

type FakeCall = { op: string; topic?: string; msg?: { data?: number[] } };
const TORQUE_TOPIC = '/so_arm_torque_enable_controller/commands';
const controllers = [{ topic: '/so_arm_controller/joint_trajectory', joints: ['Pitch'], defaultCategory: 'Arm' }];
const HOT = OVERHEAT_CELSIUS + 5;
const TICK_MS = 600;
const MEDIAN_WINDOW_MS = 4000;

let calls: FakeCall[] = [];
const fakeRos = new ROSLIB.Ros({});
fakeRos.callOnConnection = (call: FakeCall) => calls.push(call);
RosBridgeService.getInstance().ros = fakeRos;
const torquePublishes = () => calls.filter((c) => c.op === 'publish' && c.topic === TORQUE_TOPIC).map((c) => c.msg?.data);

let nowMs = 0;
const realNow = Date.now;
Date.now = () => nowMs;

const mounted: (() => Promise<void>)[] = [];
afterEach(async () => {
    for (const unmount of mounted.splice(0)) await unmount();
    calls = [];
});

const emitSample = (celsius: number) => {
    fakeRos.emit('/dynamic_joint_states', {
        joint_names: ['Pitch'],
        interface_values: [{ interface_names: ['temperature'], values: [celsius] }],
    });
};

const emitTick = async (celsius: number) => {
    nowMs += MEDIAN_WINDOW_MS;
    emitSample(celsius);
    await act(() => wait(TICK_MS));
};

const mountGuard = async (holdsControl: boolean) => {
    let renders = 0;
    const view = await renderHook((props: { holds: boolean }) => {
        renders++;
        return useMotorOverheatGuard(true, props.holds, controllers);
    }, { holds: holdsControl });
    mounted.push(view.unmount);
    emitSample(30);
    return { ...view, renders: () => renders };
};

test('identical temperatures keep the same map and do not re-render the host', async () => {
    const guard = await mountGuard(true);
    await emitTick(30);
    const shown = guard.result.current.temperatures;
    const rendersBefore = guard.renders();
    await emitTick(30);
    await emitTick(30);
    assert.equal(guard.result.current.temperatures, shown);
    assert.equal(guard.renders(), rendersBefore);
});

test('changed temperatures produce a new map and trip the hot joint', async () => {
    const guard = await mountGuard(false);
    await emitTick(30);
    const shown = guard.result.current.temperatures;
    await emitTick(HOT);
    assert.notEqual(guard.result.current.temperatures, shown);
    assert.equal(guard.result.current.temperatures.get('Pitch'), HOT);
    assert.deepEqual([...guard.result.current.trippedJoints], ['Pitch']);
});

test('while holding control with a tripped joint the torque cut is re-published on every identical tick', async () => {
    const guard = await mountGuard(true);
    await emitTick(HOT);
    const cuts = torquePublishes().length;
    assert.ok(cuts >= 1);
    for (let tick = 1; tick <= 3; tick++) {
        await emitTick(HOT);
        assert.equal(torquePublishes().length, cuts + tick);
    }
    assert.deepEqual(torquePublishes().at(-1), [0]);
    assert.deepEqual([...guard.result.current.trippedJoints], ['Pitch']);
});

test('after cooling the torque comes back once, then identical ticks publish nothing and keep the same map', async () => {
    const guard = await mountGuard(true);
    await emitTick(HOT);
    await emitTick(OVERHEAT_REARM_CELSIUS);
    assert.equal(guard.result.current.trippedJoints.size, 0);
    assert.deepEqual(torquePublishes().at(-1), [1]);
    await emitTick(OVERHEAT_REARM_CELSIUS);
    const published = torquePublishes().length;
    const shown = guard.result.current.temperatures;
    const rendersBefore = guard.renders();
    await emitTick(OVERHEAT_REARM_CELSIUS);
    await emitTick(OVERHEAT_REARM_CELSIUS);
    assert.equal(torquePublishes().length, published);
    assert.equal(guard.result.current.temperatures, shown);
    assert.equal(guard.renders(), rendersBefore);
});

test('without control a tripped joint publishes nothing and identical ticks keep the same map', async () => {
    const guard = await mountGuard(false);
    await emitTick(HOT);
    assert.deepEqual([...guard.result.current.trippedJoints], ['Pitch']);
    await emitTick(HOT);
    const shown = guard.result.current.temperatures;
    const rendersBefore = guard.renders();
    await emitTick(HOT);
    await emitTick(HOT);
    assert.equal(guard.result.current.temperatures, shown);
    assert.equal(guard.renders(), rendersBefore);
    assert.equal(torquePublishes().length, 0);
});

test('losing control while tripped stops the per-tick re-publishing and the new maps', async () => {
    const guard = await mountGuard(true);
    await emitTick(HOT);
    await guard.rerender({ holds: false });
    const published = torquePublishes().length;
    await emitTick(HOT);
    const shown = guard.result.current.temperatures;
    await emitTick(HOT);
    assert.equal(guard.result.current.temperatures, shown);
    assert.equal(torquePublishes().length, published);
});

test.after(() => { Date.now = realNow; });
