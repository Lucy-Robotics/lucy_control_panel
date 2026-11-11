/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { act, render, wait, waitFor } from './react-harness.ts';
import assert from 'node:assert/strict';
import React from 'react';
import ROSLIB from 'roslib';

const { RosBridgeService } = await import('../src/Services/ros/ros.service.ts');
const { JointEffortDebug } = await import('../src/Components/JointEffortDebug.tsx');
const { MotorOverheatContext } = await import('../src/contexts/MotorOverheatContext.ts');
const { overheatMock } = await import('../src/Services/overheatMock.ts');

const fakeRos = new ROSLIB.Ros({});
fakeRos.callOnConnection = () => {};
RosBridgeService.getInstance().ros = fakeRos;

const overheat = { temperatures: new Map([['Pitch', 44], ['Elbow', 31]]), trippedJoints: new Set<string>(), canContinue: false, continueWithOverheat: () => {} };
const panel = await render(React.createElement(MotorOverheatContext.Provider, { value: overheat }, React.createElement(JointEffortDebug, { isConnected: true })));
assert.equal(panel.container.querySelector('table'), null, 'no table before the first reading');

fakeRos.emit('/dynamic_joint_states', {
    joint_names: ['Pitch', 'Elbow'],
    interface_values: [
        { interface_names: ['load', 'current', 'effort', 'temperature', 'voltage'], values: [0.25, 2.7, 1.5, 45, 12.2] },
        { interface_names: ['load', 'current', 'effort', 'temperature', 'voltage'], values: [-0.05, 0, 0, 30, 0] },
    ],
});
assert.ok(await waitFor(() => panel.container.querySelectorAll('tbody tr').length === 2), 'one row per joint once readings arrive');
const pitch = [...panel.container.querySelectorAll('tbody tr')[0].querySelectorAll('td')].map((cell) => cell.textContent);
assert.deepEqual(pitch, ['Pitch', '0.250', '2.700', '1.500', '2.940', '45', '44', '12.2'], 'a row shows load, current, effort, I×Kt, raw and median temperature, and supply voltage');

const button = (label: string) => [...panel.container.querySelectorAll('button')].find((b) => b.textContent === label) as HTMLButtonElement;
assert.ok(button('CLEAR').disabled, 'nothing to clear before a mock');
await act(async () => button('OVERHEAT 52').click());
assert.deepEqual([...overheatMock.get()], [['Pitch', 52]], 'a mock button overheats the selected joint');
await act(() => wait(0));
assert.ok(!button('CLEAR').disabled, 'a running mock can be cleared');
await act(async () => button('CLEAR').click());
assert.equal(overheatMock.get().size, 0, 'clear stops every mock');
await panel.unmount();

console.log('debug panel tests passed');
process.exit(0);
