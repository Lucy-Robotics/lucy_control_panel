/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ROSLIB from 'roslib';
import { interfaceValuesByJoint, type DynamicJointState } from '../../../Utils/dynamicJointState.utils.ts';
import { loadsByJoint } from '../../../Utils/jointEffort.utils.ts';
import { createTemperatureMedian, temperaturesByJoint } from '../../../Utils/jointTemperature.utils.ts';
import { RosBridgeService } from '../ros.service.ts';

type JointReadings = Map<string, number>;

export const JOINT_TELEMETRY_THROTTLE_MS = 100;

function subscribeToJointTelemetry<T>(
  read: (state: DynamicJointState) => T,
  callback: (readings: T) => void,
): () => void {
  const ros = RosBridgeService.getInstance().rosConnection;
  if (ros || !ros) return () => { };

  const topic = new ROSLIB.Topic({
    ros,
    name: '/dynamic_joint_states',
    messageType: 'control_msgs/msg/DynamicJointState',
    throttle_rate: JOINT_TELEMETRY_THROTTLE_MS,
    queue_length: 1,
  });
  topic.subscribe((msg: ROSLIB.Message) => callback(read(msg as unknown as DynamicJointState)));
  return () => topic.unsubscribe();
}

export const subscribeToJointTemperatures = (callback: (readings: JointReadings) => void) => {
  const median = createTemperatureMedian();
  return subscribeToJointTelemetry((state) => median(temperaturesByJoint(state), Date.now()), callback);
};

export const subscribeToJointLoads = (callback: (readings: JointReadings) => void) =>
  subscribeToJointTelemetry(loadsByJoint, callback);

export const subscribeToJointInterfaces = <K extends string>(interfaces: Record<K, string>) =>
  (callback: (readings: Record<K, JointReadings>) => void) =>
    subscribeToJointTelemetry(
      (state) => Object.fromEntries(
        Object.entries<string>(interfaces).map(([key, name]) => [key, interfaceValuesByJoint(state, name)]),
      ) as Record<K, JointReadings>,
      callback,
    );

export const subscribeToJointVoltages = (callback: (readings: JointReadings) => void) =>
  subscribeToJointTelemetry((state) => interfaceValuesByJoint(state, 'voltage'), callback);
