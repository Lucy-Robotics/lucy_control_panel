/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

globalThis.window ??= {
    location: { protocol: 'http:', host: 'localhost' },
    addEventListener: () => {},
    removeEventListener: () => {},
} as unknown as Window;
globalThis.localStorage ??= { getItem: () => null, setItem: () => {} } as unknown as Storage;

import assert from 'node:assert/strict';
import ROSLIB from 'roslib';

type FakeCall = { op: string; topic?: string; msg?: Record<string, unknown> };

const { RosBridgeService } = await import('../src/Services/ros/ros.service.ts');
const { publishJointTorque } = await import('../src/Services/ros/handlers/JointTorque.handler.ts');

const bridge = RosBridgeService.getInstance();
const calls: FakeCall[] = [];
const fakeRos = new ROSLIB.Ros({});
fakeRos.callOnConnection = (call: FakeCall) => calls.push(call);
const published = (topic: string) => calls.filter((c) => c.op === 'publish' && c.topic === topic);

bridge.ros = null;
publishJointTorque([{ topic: '/torque', data: [0] }]);
assert.equal(calls.length, 0, 'torque is not published without ROS');

bridge.ros = fakeRos;
publishJointTorque([{ topic: '/torque', data: [1, 0] }]);
publishJointTorque([{ topic: '/torque', data: [1, 1] }]);
assert.deepEqual(published('/torque').map((c) => c.msg?.data), [[1, 0], [1, 1]], 'torque commands are published in order');


console.log('overheat ROS tests passed');
