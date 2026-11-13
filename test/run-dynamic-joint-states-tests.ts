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
const { useThrottledJointReadings, useThrottledReadings } = await import('../src/hooks/useThrottledJointReadings.ts');

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
const settled = throttled.result.current;
listeners.forEach((emit) => emit(new Map([['Pitch', 2]])));
await act(() => wait(80));
assert.equal(throttled.result.current, settled, 'unchanged readings keep the same state object');
listeners.forEach((emit) => emit(new Map([['Pitch', 3]])));
await act(() => wait(80));
assert.deepEqual(throttled.result.current, new Map([['Pitch', 3]]), 'changed readings update the state');
await throttled.rerender({ connected: false });
assert.equal(throttled.result.current.size, 0, 'readings clear on disconnect');
assert.equal(unsubscribed, 1, 'disconnecting unsubscribes');
await throttled.unmount();

type Sensors = { loads: Map<string, number>; temperatures: Map<string, number> };
const noSensors: Sensors = { loads: new Map(), temperatures: new Map() };
const sensorListeners = new Set<(readings: Sensors) => void>();
const subscribeSensors = (callback: (readings: Sensors) => void) => {
    sensorListeners.add(callback);
    return () => { sensorListeners.delete(callback); };
};
const sensorReadings = (load: number, temperature: number): Sensors => ({
    loads: new Map([['Pitch', load]]),
    temperatures: new Map([['Pitch', temperature]]),
});
const emitSensors = async (readings: Sensors) => {
    sensorListeners.forEach((emit) => emit(readings));
    await act(() => wait(80));
};
const sensors = await renderHook(() => useThrottledReadings(subscribeSensors, true, noSensors, 20), {});
await emitSensors(sensorReadings(1, 40));
const sensorsSettled = sensors.result.current;
assert.deepEqual(sensorsSettled, sensorReadings(1, 40), 'record readings are stored');
await emitSensors(sensorReadings(1, 40));
assert.equal(sensors.result.current, sensorsSettled, 'unchanged record of readings keeps the same state object');
await emitSensors(sensorReadings(1, 41));
assert.deepEqual(sensors.result.current, sensorReadings(1, 41), 'a change in one map of the record updates the state');
await sensors.unmount();

console.log('dynamic joint states tests passed');
process.exit(0);
