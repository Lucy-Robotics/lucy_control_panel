/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { act, render, renderHook } from './react-harness.ts';
import assert from 'node:assert/strict';
import React from 'react';
import ROSLIB from 'roslib';

const { RosBridgeService } = await import('../src/Services/ros/ros.service.ts');
const { CORE_STAGES, panelProgress, parseStackStatus } = await import('../src/Utils/stackStatus.ts');
const { useStackStatus } = await import('../src/hooks/useStackStatus.ts');
const { StackProgress } = await import('../src/Components/ControlPage/StackProgress.tsx');
const { RobotControlPanel } = await import('../src/Pages/RobotControlPanel.tsx');
const { ActiveHardwareRosProvider } = await import('../src/contexts/ActiveHardwareRosContext.tsx');
const { PaginatedCategoriesProvider } = await import('../src/contexts/PaginatedCategoriesContext.tsx');

const STATUS_TOPIC = '/lucy/stack_status';
const status = (index: number, extra: object = {}) => JSON.stringify({
    robot: 'inmoov_urdf', status: 'loading', ready: false, index, total: CORE_STAGES.length, label: CORE_STAGES[index - 1], ...extra,
});

assert.deepEqual(parseStackStatus(status(5)), {
    robot: 'inmoov_urdf', status: 'loading', ready: false, index: 5, total: 8, label: 'Starting control supervisor',
}, 'a launcher stage is read as is');
for (const [bad, why] of [
    [42, 'a non-string message'],
    ['{', 'broken JSON'],
    [status(5, { status: 'booting' }), 'an unknown stack state'],
    [status(9, { label: 'Extra' }), 'a stage past the total'],
    [status(5, { index: -1 }), 'a negative stage'],
    [status(5, { ready: 'yes' }), 'a non-boolean ready flag'],
] as const) {
    assert.equal(parseStackStatus(bad), null, `${why} is ignored`);
}

const longer = panelProgress({ robot: 'r', status: 'loading', ready: false, index: 4, total: 10, label: 'Starting config services' }, true);
assert.deepEqual(longer.titles.slice(-2), ['Stage 9', 'Stage 10'], 'stages the panel cannot name are listed by number');

const bridge = RosBridgeService.getInstance();
bridge.ros = null;
const withoutRos = await renderHook(() => useStackStatus(true), undefined);
assert.equal(withoutRos.result.current, null, 'a connected flag without a ROS socket reads no status');
await withoutRos.unmount();

const fakeRos = new ROSLIB.Ros({});
const ops: string[] = [];
fakeRos.callOnConnection = (message: { op: string; topic: string }) => { ops.push(`${message.op} ${message.topic}`); };
bridge.ros = fakeRos;

const hook = await renderHook(({ connected }: { connected: boolean }) => useStackStatus(connected), { connected: false });
assert.equal(hook.result.current, null, 'no status before the bridge connects');
assert.equal(ops.length, 0, 'nothing is subscribed before the bridge connects');
await hook.rerender({ connected: true });
assert.ok(ops.includes(`subscribe ${STATUS_TOPIC}`), 'connecting subscribes to the stack status');
await act(async () => { fakeRos.emit(STATUS_TOPIC, { data: status(6) }); });
assert.equal(hook.result.current?.label, 'Building robot model', 'each stage message updates the status');
const building = hook.result.current;
await act(async () => { fakeRos.emit(STATUS_TOPIC, { data: status(6) }); });
assert.equal(hook.result.current, building, 'a republished stage keeps the same status, so the page does not re-render');
await act(async () => { fakeRos.emit(STATUS_TOPIC, { data: 'garbage' }); });
assert.equal(hook.result.current, null, 'a malformed message clears the status');
await act(async () => { fakeRos.emit(STATUS_TOPIC, { data: status(7) }); });
await hook.rerender({ connected: false });
assert.equal(hook.result.current, null, 'disconnecting clears the status');
assert.ok(ops.includes(`unsubscribe ${STATUS_TOPIC}`), 'disconnecting unsubscribes');
await hook.unmount();

const page = (props: Partial<React.ComponentProps<typeof StackProgress>>) => render(React.createElement(StackProgress, {
    robot: null, status: null, isConnected: false, connectButton: false, ...props,
}));

const waiting = await page({ connectButton: true });
assert.match(waiting.container.textContent!, /LUCY IS STARTING…/, 'the page says Lucy is starting');
assert.match(waiting.container.textContent!, /Waiting for the ROS bridge/, 'without a bridge, the page waits for it');
assert.ok([...waiting.container.querySelectorAll('button')].some((b) => b.textContent === 'CONNECT'), 'the connect button is offered while nothing connects');
await waiting.unmount();

const connecting = await page({ robot: 'so_arm101_urdf' });
assert.match(connecting.container.textContent!, /Connecting to the ROS bridge/, 'a pending connection is shown as connecting');
assert.match(connecting.container.textContent!, /ROBOT: SO-ARM101/i, 'the robot from the hardware config is named');
assert.ok(![...connecting.container.querySelectorAll('button')].some((b) => b.textContent === 'CONNECT'), 'no connect button while connecting');
await connecting.unmount();

const starting = await page({ robot: 'so_arm101_urdf', status: parseStackStatus(status(5)), isConnected: true });
const text = starting.container.textContent!;
assert.match(text, /2\/5 Starting control supervisor/, 'the detail counts the stages after the bridge');
assert.match(text, /ROBOT: INMOOV/i, 'the robot the core is starting wins over the hardware config');
assert.equal(starting.container.querySelector('.ant-steps-item-process .ant-steps-item-title')?.textContent, 'Starting control supervisor', 'the current stage is the active step');
await starting.unmount();

const settled = await page({ status: parseStackStatus(status(8, { status: 'running', ready: true, label: 'Ready' })), isConnected: true });
assert.match(settled.container.textContent!, /Ready/, 'a status outside loading shows its label');
await settled.unmount();

const setBridgeStatus = (next: string) => act(async () => {
    (bridge as unknown as { setConnectionStatus: (s: string) => void }).setConnectionStatus(next);
});
const panel = await render(React.createElement(PaginatedCategoriesProvider, null,
    React.createElement(ActiveHardwareRosProvider, null, React.createElement(RobotControlPanel))));
assert.match(panel.container.textContent!, /LUCY IS STARTING…/, 'the control page shows the starting page while the bridge is down');
await setBridgeStatus('connected');
await act(async () => { fakeRos.emit(STATUS_TOPIC, { data: status(6) }); });
assert.match(panel.container.textContent!, /3\/5 Building robot model/, 'the control page follows the core stages once the bridge is up');
await act(async () => { fakeRos.emit(STATUS_TOPIC, { data: status(8, { status: 'running', ready: true, label: 'Ready' }) }); });
assert.doesNotMatch(panel.container.textContent!, /LUCY IS STARTING/, 'the starting page leaves once the core runs');
await setBridgeStatus('disconnected');
assert.match(panel.container.textContent!, /LUCY IS STARTING…/, 'losing the bridge brings the starting page back');
await panel.unmount();

console.log('starting page tests passed');
process.exit(0);
