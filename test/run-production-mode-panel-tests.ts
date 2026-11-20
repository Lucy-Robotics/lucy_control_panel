/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { act, render, wait, waitFor } from './react-harness.ts';
import assert from 'node:assert/strict';
import React from 'react';
import ROSLIB from 'roslib';

// The settings modal fires window events: they must be jsdom's, not Node's own Event.
globalThis.Event = window.Event;

const SO101_YAML = `version: 1
robot_name: so_arm101
boards:
  linux_so_arm:
    serial_id: ''
    board_class: bus_servo_only
    controller:
      name: so_arm_controller
      type: joint_trajectory_controller/JointTrajectoryController
actuators:
  - id: rotation
    urdf_joint: Rotation
    board: linux_so_arm
    virtual_pin: 0
    physical_pin: 1
    servo_type: '300'
    motor: sts3215/12v_345
    offset: 3.14159
    direction: 1
    scale: 1
    limit_min: 1.0
    limit_max: 5.0
    default: 3.14159
    enabled: true
`;
const urdf = (publishActuators: boolean) => `<robot name="so_arm101">
  <joint name="Rotation" type="revolute"><limit lower="-1.5" upper="1.5" effort="1" velocity="1"/></joint>
  <ros2_control name="so_arm" type="system"><hardware>
    <param name="publish_actuators">${publishActuators}</param>
  </hardware></ros2_control>
</robot>`;

type FakeCall = { op: string; id?: string; topic?: string; service?: string; msg?: Record<string, unknown> };

const SERVO_POSE = { id: 'servo', name: 'old servo pose', timestamp: 1, joints: { Rotation: 3.5 } };
const JOINT_POSE = { id: 'joint', name: 'reach far', timestamp: 2, joints: { Rotation: 9 }, unit: 'joint' };
localStorage.setItem('lucy_poses', JSON.stringify([SERVO_POSE, JOINT_POSE]));
localStorage.setItem('lucy_animations', JSON.stringify([
    { id: 'anim', name: 'mixed units', timestamp: 3, poseIds: ['joint', 'servo'], speed: 1, loop: false, loopCount: 0 },
]));

const { RosBridgeService } = await import('../src/Services/ros/ros.service.ts');
const { ControlModeHandler } = await import('../src/Services/ros/handlers/ControlMode.handler.ts');
const { SERVO_POSE_HINT } = await import('../src/Constants/poses.ts');
const { message } = await import('antd');
const errorsShown: string[] = [];
message.error = ((content: unknown) => { errorsShown.push(String(content)); }) as typeof message.error;
const calls: FakeCall[] = [];
const fakeRos = new ROSLIB.Ros({});
fakeRos.callOnConnection = (call: FakeCall) => {
    calls.push(call);
    if (call.op === 'call_service' && call.service === '/lucy/control') {
        queueMicrotask(() => fakeRos.emit(call.id!, { result: true, values: { success: true, message: '' } }));
    }
    if (call.op === 'call_service' && call.service === '/config/get') {
        queueMicrotask(() => fakeRos.emit(call.id!, {
            result: true,
            values: {
                success: true, message: '', config_yaml: SO101_YAML, config_name: 'default', robot_package: 'so_arm101_urdf',
                motors_yaml: 'sts3215/12v_345:\n  min_volts: 6.0\n',
            },
        }));
    }
};
const bridge = RosBridgeService.getInstance();
bridge.ros = fakeRos;
(bridge as unknown as { setConnectionStatus(status: string): void }).setConnectionStatus('connected');

const { MemoryRouter } = await import('react-router-dom');
const { PaginatedCategoriesProvider } = await import('../src/contexts/PaginatedCategoriesContext.tsx');
const { ActiveHardwareRosProvider } = await import('../src/contexts/ActiveHardwareRosContext.tsx');
const { RobotControlPanel } = await import('../src/Pages/RobotControlPanel.tsx');
const { SettingsModal } = await import('../src/Components/SettingsModal.tsx');
const { ThemeProvider } = await import('../src/contexts/ThemeContext.tsx');

const page = await render(React.createElement(MemoryRouter, null, React.createElement(ThemeProvider, null,
    React.createElement(PaginatedCategoriesProvider, null,
        React.createElement(ActiveHardwareRosProvider, null,
            React.createElement(RobotControlPanel),
            React.createElement(SettingsModal, { visible: true, onClose: () => {} }))))));

const describe = (publishActuators: boolean) => act(async () => {
    fakeRos.emit('/robot_description', { data: urdf(publishActuators) });
});
const rotationDegrees = () => {
    const input = document.querySelector('.joint-control-card .ant-input-number-input') as HTMLInputElement | null;
    return input ? Number(input.value) : NaN;
};
const near = (actual: number, expected: number) => Math.abs(actual - expected) < 0.05;
const sliderUnitButton = (unit: 'SERVO' | 'URDF JOINTS') =>
    document.querySelector(`button[aria-label="Sliders (production mode): ${unit}"]`) as HTMLButtonElement;
const button = (text: string) =>
    [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === text) as HTMLButtonElement | undefined;
const shownMessages = () => errorsShown;

try {
    assert.ok(await waitFor(() => !Number.isNaN(rotationDegrees())), 'the Rotation card shows up once the config loads');
    const toggle = () => document.querySelector('button[aria-label="Control Robot"]') as HTMLButtonElement;
    await act(async () => toggle().click());
    assert.ok(await waitFor(() => calls.some((c) => c.op === 'call_service' && c.service === '/lucy/control')));
    await act(async () => fakeRos.emit('/lucy/active_client', { data: ControlModeHandler.getInstance().clientId }));
    assert.ok(await waitFor(() => toggle().getAttribute('aria-pressed') === 'true'), 'control is granted');

    await act(async () => (document.querySelector('button[aria-label="Manage poses & animations"]') as HTMLButtonElement).click());
    const rowOf = (name: string) => [...document.querySelectorAll('.ant-list-item')]
        .find((item) => [...item.querySelectorAll('input')].some((input) => input.value === name));
    assert.ok(await waitFor(() => Boolean(rowOf('old servo pose'))), 'the saved poses are listed');
    const loadButtons = () => [...document.querySelectorAll('button')].filter((b) => b.textContent?.trim() === 'LOAD');
    const loadPose = async (name: string) => {
        const row = rowOf(name)!;
        const load = loadButtons().find((b) => row.contains(b))!;
        await act(async () => load.click());
        await act(() => wait(50));
    };

    await loadPose('old servo pose');
    assert.ok(await waitFor(() => shownMessages().some((m) => m.includes(SERVO_POSE_HINT))), 'a pose saved in servo angles is refused with the hint');
    assert.ok(near(rotationDegrees(), 0), 'a refused pose leaves the sliders alone');

    await loadPose('reach far');
    assert.ok(await waitFor(() => near(rotationDegrees(), 106.48)), 'a joint-angle pose past the servo travel is clamped to it (5 - pi rad)');

    await act(async () => button('PLAY')!.click());
    assert.ok(
        await waitFor(() => shownMessages().filter((m) => m.includes(SERVO_POSE_HINT)).length >= 2),
        'an animation that contains a servo-angle pose is refused before it starts',
    );
    assert.ok(near(rotationDegrees(), 106.48), 'the refused animation does not move the sliders');

    await act(async () => (document.querySelector('button[aria-label="Reset all joints"]') as HTMLButtonElement).click());
    assert.ok(await waitFor(() => near(rotationDegrees(), 0)), 'reset brings the joint back to rest');

    await describe(true);
    await act(() => wait(100));
    assert.ok(near(rotationDegrees(), 0), 'production mode shows the rest pose as the URDF zero, not the servo angle');

    await act(async () => sliderUnitButton('SERVO').click());
    assert.equal(localStorage.getItem('productionModeEnabled'), 'false', 'the servo choice is remembered');
    assert.ok(await waitFor(() => near(rotationDegrees(), 180)), 'switching to servo angles keeps the servo where it is (pi rad = 180 deg)');

    await act(async () => sliderUnitButton('URDF JOINTS').click());
    assert.ok(await waitFor(() => near(rotationDegrees(), 0)), 'switching back shows the same servo as joint angle 0');

    await describe(false);
    assert.ok(await waitFor(() => sliderUnitButton('SERVO').disabled), 'without hardware or simulator the servo switch is greyed out');
    const hint = sliderUnitButton('SERVO').closest('span[title]')?.getAttribute('title') ?? '';
    assert.equal(hint, 'No robot or simulator connected: no servo to drive', 'the hint names no ROS internals');
    assert.doesNotMatch(hint, /ros/i);
} finally {
    await page.unmount();
}

console.log('production mode panel tests passed');
process.exit(0);
