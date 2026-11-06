/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ROSLIB from 'roslib';
import type { DynamicJointState } from '../../../Utils/dynamicJointState.utils.ts';
import { loadsByJoint } from '../../../Utils/jointEffort.utils.ts';
import { createTemperatureMedian, temperaturesByJoint } from '../../../Utils/jointTemperature.utils.ts';
import { RosBridgeService } from '../ros.service.ts';

type JointReadings = Map<string, number>;

function subscribeToDynamicJointStates(
  read: (state: DynamicJointState) => JointReadings,
  callback: (readings: JointReadings) => void,
): () => void {
  const ros = RosBridgeService.getInstance().rosConnection;
  if (!ros) return () => { };

  const topic = new ROSLIB.Topic({
    ros,
    name: '/dynamic_joint_states',
    messageType: 'control_msgs/msg/DynamicJointState',
  });
  topic.subscribe((msg: ROSLIB.Message) => callback(read(msg as unknown as DynamicJointState)));
  return () => topic.unsubscribe();
}

export const subscribeToJointTemperatures = (callback: (readings: JointReadings) => void) => {
  const median = createTemperatureMedian();
  return subscribeToDynamicJointStates((state) => median(temperaturesByJoint(state), Date.now()), callback);
};

export const subscribeToJointLoads = (callback: (readings: JointReadings) => void) =>
  subscribeToDynamicJointStates(loadsByJoint, callback);
