/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ROSLIB from 'roslib';
import { temperaturesByJoint, type DynamicJointState } from '../../../Utils/jointTemperature.utils.ts';
import { RosBridgeService } from '../ros.service.ts';

export function subscribeToJointTemperatures(callback: (temperatures: Map<string, number>) => void): () => void {
  const ros = RosBridgeService.getInstance().rosConnection;
  if (!ros) return () => { };

  const topic = new ROSLIB.Topic({
    ros,
    name: '/dynamic_joint_states',
    messageType: 'control_msgs/msg/DynamicJointState',
  });
  topic.subscribe((msg: ROSLIB.Message) => {
    callback(temperaturesByJoint(msg as unknown as DynamicJointState));
  });
  return () => topic.unsubscribe();
}
