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
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const { RosBridgeService } = await import('../src/Services/ros/ros.service.ts');
const { JointStateHandler, COMMAND_DURATION_MS } = await import('../src/Services/ros/handlers/JointState.handler.ts');
const { ControlModeHandler } = await import('../src/Services/ros/handlers/ControlMode.handler.ts');
const { takeControlFromCurrentPose } = await import('../src/Services/ros/takeControlFromCurrentPose.ts');

const calls: FakeCall[] = [];
const fakeRos = new ROSLIB.Ros({});
fakeRos.callOnConnection = (call: FakeCall) => calls.push(call);
RosBridgeService.getInstance().ros = fakeRos;
const published = (topic: string) => calls.filter((c) => c.op === 'publish' && c.topic === topic);

const handler = JointStateHandler.getInstance();
handler.setControllerConfigs([{ topic: '/arm/joint_trajectory', joints: ['Pitch'], defaultCategory: 'Arm' }]);
const pitch = { name: 'Pitch', currentValue: 0.5, targetValue: 0.5, minValue: -1, maxValue: 1, type: 'revolute', category: 'Arm' };
const durationOfLastCommand = () => {
    const msg = published('/arm/joint_trajectory').at(-1)?.msg as {
        header: { stamp: { sec: number } };
        points: { time_from_start: { nanosec: number } }[];
    };
    return { nanosec: msg.points[0].time_from_start.nanosec, stampSec: msg.header.stamp.sec };
};
handler.publishJointStates([pitch]);
assert.equal(durationOfLastCommand().nanosec, COMMAND_DURATION_MS * 1e6, 'slider commands take the default duration');
handler.publishJointStates([pitch], 100);
assert.deepEqual(durationOfLastCommand(), { nanosec: 100e6, stampSec: 0 }, 'seed commands start now and take the seed duration');

const control = ControlModeHandler.getInstance();
let takeControlCalls = 0;
control.takeControl = () => { takeControlCalls++; };
const seeds: number[] = [];
handler.publishJointStates = (_joints: unknown, seedDurationMs?: number) => { seeds.push(seedDurationMs ?? -1); };
const setController = (id: string) => { (control as unknown as { _activeClientId: string })._activeClientId = id; };

setController('someone-else');
takeControlFromCurrentPose(() => [pitch])();
assert.equal(takeControlCalls, 1, 'control held by someone else is taken right away');
assert.equal(seeds.length, 0, 'no seed is published when someone else holds control');

setController('');
takeControlCalls = 0;
const stop = takeControlFromCurrentPose(() => [pitch]);
assert.deepEqual(seeds, [100], 'taking free control seeds the current pose first');
await wait(350);
assert.equal(takeControlCalls, 1, 'control is requested once the seed has landed');
assert.ok(seeds.length > 1, 'the pose keeps being seeded until control changes');
stop();
const seededBeforeStop = seeds.length;
await wait(120);
assert.equal(seeds.length, seededBeforeStop, 'stopping ends the seeding');


console.log('take control tests passed');
process.exit(0);
