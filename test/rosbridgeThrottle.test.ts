/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import './react-harness.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ROSLIB from 'roslib';
import { RosBridgeService } from '../src/Services/ros/ros.service.ts';
import { subscribeToJointVoltages } from '../src/Services/ros/handlers/DynamicJointState.handler.ts';

function subscribeRequest(topic: string, subscribe: () => () => void) {
    const sent: Record<string, unknown>[] = [];
    const ros = new ROSLIB.Ros({});
    ros.callOnConnection = (message: Record<string, unknown>) => { sent.push(message); };
    RosBridgeService.getInstance().ros = ros;
    subscribe()();
    return sent.find((message) => message.op === 'subscribe' && message.topic === topic);
}

test('rosbridge sends /dynamic_joint_states at 10 Hz at most, latest message only', () => {
    const request = subscribeRequest('/dynamic_joint_states', () => subscribeToJointVoltages(() => {}));
    assert.equal(request?.throttle_rate, 100);
    assert.equal(request?.queue_length, 1);
});
