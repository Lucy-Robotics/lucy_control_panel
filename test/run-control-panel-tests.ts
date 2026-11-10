/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { act, render, wait, waitFor } from './react-harness.ts';
import assert from 'node:assert/strict';
import React from 'react';
import ROSLIB from 'roslib';

const actuator = (id: string, joint: string, pin: number) => `
  - id: ${id}
    urdf_joint: ${joint}
    board: linux_so_arm
    virtual_pin: ${pin}
    physical_pin: ${pin + 1}
    servo_type: '300'
    offset: 3.14159
    direction: 1
    scale: 1
    limit_min: 1.0
    limit_max: 5.0
    default: 3.14159
    enabled: true`;
const SO101_YAML = `version: 1
robot_name: so_arm101
boards:
  linux_so_arm:
    serial_id: ''
    board_class: bus_servo_only
    controller:
      name: so_arm_controller
      type: joint_trajectory_controller/JointTrajectoryController
actuators:${actuator('rotation', 'Rotation', 0)}${actuator('pitch', 'Pitch', 1)}${actuator('elbow', 'Elbow', 2)}
`;

type FakeCall = { op: string; id?: string; topic?: string; service?: string; msg?: Record<string, unknown> };

const { RosBridgeService } = await import('../src/Services/ros/ros.service.ts');
const { ControlModeHandler } = await import('../src/Services/ros/handlers/ControlMode.handler.ts');
const calls: FakeCall[] = [];
const fakeRos = new ROSLIB.Ros({});
let controlReply: { success: boolean; message: string } | null = null;
fakeRos.callOnConnection = (call: FakeCall) => {
    calls.push(call);
    if (call.op === 'call_service' && call.service === '/lucy/control' && controlReply) {
        const values = controlReply;
        queueMicrotask(() => fakeRos.emit(call.id!, { result: true, values }));
    }
    if (call.op === 'call_service' && call.service === '/config/get') {
        queueMicrotask(() => fakeRos.emit(call.id!, {
            result: true,
            values: { success: true, message: '', config_yaml: SO101_YAML, config_name: 'default', robot_package: 'so_arm101_urdf' },
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

const published = (topic: string) => calls.filter((c) => c.op === 'publish' && c.topic === topic).map((c) => c.msg!);
const lastCommand = () => {
    const msg = published('/so_arm_controller/joint_trajectory').at(-1) as { joint_names: string[]; points: { positions: number[] }[] };
    return Object.fromEntries(msg.joint_names.map((name, i) => [name, msg.points[0].positions[i]]));
};
const encoderAt = (rotation: number, pitch: number) => act(async () => {
    fakeRos.emit('/joint_states', { name: ['Rotation', 'Pitch'], position: [rotation, pitch] });
});
let clockOffsetMs = 0;
const realNow = Date.now;
Date.now = () => realNow() + clockOffsetMs;
const temperaturesFor = async (seconds: number, pitch: number) => {
    for (let elapsed = 0; elapsed <= seconds; elapsed += 1.5) {
        fakeRos.emit('/dynamic_joint_states', {
            joint_names: ['Rotation', 'Pitch'],
            interface_values: [
                { interface_names: ['temperature'], values: [30] },
                { interface_names: ['temperature'], values: [pitch] },
            ],
        });
        clockOffsetMs += 1500;
        await act(() => wait(550));
    }
};

const page = await render(React.createElement(MemoryRouter, null,
    React.createElement(PaginatedCategoriesProvider, null,
        React.createElement(ActiveHardwareRosProvider, null, React.createElement(RobotControlPanel)))));
try {
    const toggle = () => page.container.querySelector('button[aria-label="Control Robot"]') as HTMLButtonElement;
    assert.ok(await waitFor(() => Boolean(toggle())), 'the panel loads the SO101 config and shows the control toggle');
    await encoderAt(0.1, 0.2);
    await act(() => wait(150));
    await act(async () => toggle().click());
    assert.equal(toggle().getAttribute('aria-busy'), 'true', 'the toggle shows it is taking control');
    assert.ok(toggle().querySelector('.anticon-loading'), 'the toggle spins while taking control');
    const seed = lastCommand();
    assert.ok(Math.abs(seed.Rotation - 0.1) < 1e-6 && Math.abs(seed.Pitch - 0.2) < 1e-6, 'taking control first holds the arm where it is');
    assert.ok(Math.abs(seed.Elbow) < 1e-6, 'a joint the encoder has not reported yet is held at its slider value');

    assert.ok(await waitFor(() => calls.some((c) => c.op === 'call_service' && c.service === '/lucy/control')), 'control is requested after the seed');
    await act(async () => fakeRos.emit('/lucy/active_client', { data: ControlModeHandler.getInstance().clientId }));
    assert.equal(toggle().getAttribute('aria-busy'), 'false', 'the toggle stops loading once control arrives');

    await temperaturesFor(3, 55);
    const torque = () => published('/so_arm_torque_enable_controller/commands').at(-1)?.data;
    assert.ok(await waitFor(() => JSON.stringify(torque()) === '[1,0,1]'), 'an overheated Pitch loses torque');
    assert.match(page.container.textContent ?? '', /MOTOR OVERHEATING: TORQUE OFF/, 'the panel warns about the overheat');

    await encoderAt(0.5, -0.4);
    assert.ok(await waitFor(() => Math.abs(lastCommand().Pitch - -0.4) < 1e-6), 'the limp Pitch is commanded where it fell, so torque comes back without a jump');
    const command = lastCommand();
    assert.ok(Math.abs(command.Rotation - 0.1) < 1e-6, 'a joint with torque keeps its target');

    await act(async () => fakeRos.emit('/lucy/active_client', { data: '' }));
    controlReply = { success: false, message: 'servos are not powered' };
    await act(async () => toggle().click());
    assert.equal(toggle().getAttribute('aria-busy'), 'true', 'a new attempt loads again');
    assert.ok(await waitFor(() => toggle().getAttribute('aria-busy') === 'false'), 'a refused request stops the loading');
    assert.equal(toggle().getAttribute('aria-pressed'), 'false', 'a refused request leaves control off');
} finally {
    Date.now = realNow;
    await page.unmount();
}

console.log('control panel tests passed');
process.exit(0);
