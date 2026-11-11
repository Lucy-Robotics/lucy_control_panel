/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { act } from './react-harness.ts';
import ROSLIB from 'roslib';
import { RosBridgeService } from '../src/Services/ros/ros.service.ts';
import type { ConnectionStatus } from '../src/Services/ros/ros.service.ts';

export const HARDWARE_YAML = `
boards:
  head:
    controller: { name: head_controller }
actuators:
  - { id: neck, board: head, urdf_joint: neck_joint, virtual_pin: 0 }
`;

interface SentMessage {
    op: string;
    id?: string;
    topic?: string;
    service?: string;
    msg?: { data: string };
}

type BridgeInternals = {
    ros: ROSLIB.Ros | null;
    setConnectionStatus: (status: ConnectionStatus) => void;
};

export function fakeRosBridge() {
    const bridge = RosBridgeService.getInstance();
    const internals = bridge as unknown as BridgeInternals;
    const ros = new ROSLIB.Ros({});
    const sent: SentMessage[] = [];

    ros.callOnConnection = (message: SentMessage) => {
        sent.push(message);
        if (message.op === 'call_service' && message.service?.endsWith('get')) {
            const values = { success: true, robot_package: 'inmoov_urdf', config_yaml: HARDWARE_YAML, config_name: 'active' };
            queueMicrotask(() => ros.emit(message.id!, { result: true, values }));
        }
    };
    internals.ros = ros;

    return {
        bridge,
        operations: () => sent.map((message) => `${message.op} ${message.topic ?? message.service}`),
        published: (topic: string) => sent
            .filter((message) => message.op === 'publish' && message.topic === topic)
            .map((message) => message.msg!.data),
        receive: (topic: string, data: unknown) => act(async () => {
            ros.emit(topic, { data: typeof data === 'string' ? data : JSON.stringify(data) });
        }),
        setConnection: (status: ConnectionStatus) => act(async () => internals.setConnectionStatus(status)),
    };
}
