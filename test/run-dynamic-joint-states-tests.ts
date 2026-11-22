/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { act, renderHook, wait } from './react-harness.ts';
import assert from 'node:assert/strict';
import ROSLIB from 'roslib';

const { RosBridgeService } = await import('../src/Services/ros/ros.service.ts');
const { subscribeToJointTemperatures } = await import('../src/Services/ros/handlers/DynamicJointState.handler.ts');
const { interfaceValuesByJoint } = await import('../src/Utils/dynamicJointState.utils.ts');
const { useThrottledJointReadings } = await import('../src/hooks/useThrottledJointReadings.ts');

const bridge = RosBridgeService.getInstance();
bridge.ros = null;
assert.doesNotThrow(() => subscribeToJointTemperatures(() => {})(), 'the subscription is a no-op without ROS');

const fakeRos = new ROSLIB.Ros({});
fakeRos.callOnConnection = () => {};
bridge.ros = fakeRos;
const temperatures: Map<string, number>[] = [];
const unsubscribe = subscribeToJointTemperatures((readings: Map<string, number>) => temperatures.push(readings));
fakeRos.emit('/dynamic_joint_states', {
    joint_names: ['Pitch'],
    interface_values: [{ interface_names: ['temperature'], values: [42] }],
});
assert.equal(temperatures.length, 1, 'each dynamic joint state yields one temperature reading');
assert.equal(temperatures[0].size, 0, 'temperatures wait for a full median window');
unsubscribe();

const state = {
    joint_names: ['Pitch'],
    interface_values: [{ interface_names: ['position', 'temperature', 'current', 'load', 'effort'], values: [0.1, 41, 0.3, 0.2, 0.5] }],
};
assert.deepEqual(
    ['position', 'temperature', 'current', 'load', 'effort'].map((name) => interfaceValuesByJoint(state, name).get('Pitch')),
    [0.1, 41, 0.3, 0.2, 0.5],
    'every SO101 interface is read by name',
);

const listeners = new Set<(readings: Map<string, number>) => void>();
let unsubscribed = 0;
const subscribe = (callback: (readings: Map<string, number>) => void) => {
    listeners.add(callback);
    return () => { listeners.delete(callback); unsubscribed++; };
};
const throttled = await renderHook(({ connected }: { connected: boolean }) => useThrottledJointReadings(subscribe, connected, 20), { connected: true });
listeners.forEach((emit) => { emit(new Map([['Pitch', 1]])); emit(new Map([['Pitch', 2]])); });
await act(() => wait(80));
assert.deepEqual(throttled.result.current, new Map([['Pitch', 2]]), 'throttled readings keep only the latest message');
await throttled.rerender({ connected: false });
assert.equal(throttled.result.current.size, 0, 'readings clear on disconnect');
assert.equal(unsubscribed, 1, 'disconnecting unsubscribes');
await throttled.unmount();

console.log('dynamic joint states tests passed');
process.exit(0);
