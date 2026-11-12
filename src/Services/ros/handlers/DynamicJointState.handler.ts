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

/**
 * The joint_state_broadcaster publishes at the controller rate (100 Hz). The
 * readers refresh at 10 Hz at most (useThrottledReadings), so rosbridge is asked
 * not to send more: every message it serialises shares the one websocket with
 * the /mesh/get replies, which stall behind a 100 Hz stream on a large robot.
 */
export const DYNAMIC_JOINT_STATES_THROTTLE_MS = 100;

export function dynamicJointStatesTopicOptions(ros: ROSLIB.Ros) {
  return {
    ros,
    name: '/dynamic_joint_states',
    messageType: 'control_msgs/msg/DynamicJointState',
    throttle_rate: DYNAMIC_JOINT_STATES_THROTTLE_MS,
    queue_length: 1,
  };
}

function subscribeToDynamicJointStates<T>(
  read: (state: DynamicJointState) => T,
  callback: (readings: T) => void,
): () => void {
  const ros = RosBridgeService.getInstance().rosConnection;
  if (!ros) return () => { };

  const topic = new ROSLIB.Topic(dynamicJointStatesTopicOptions(ros));
  topic.subscribe((msg: ROSLIB.Message) => callback(read(msg as unknown as DynamicJointState)));
  return () => topic.unsubscribe();
}

export const subscribeToJointTemperatures = (callback: (readings: JointReadings) => void) => {
  const median = createTemperatureMedian();
  return subscribeToDynamicJointStates((state) => median(temperaturesByJoint(state), Date.now()), callback);
};

export const subscribeToJointLoads = (callback: (readings: JointReadings) => void) =>
  subscribeToDynamicJointStates(loadsByJoint, callback);

export const subscribeToJointInterfaces = <K extends string>(interfaces: Record<K, string>) =>
  (callback: (readings: Record<K, JointReadings>) => void) =>
    subscribeToDynamicJointStates(
      (state) => Object.fromEntries(
        Object.entries<string>(interfaces).map(([key, name]) => [key, interfaceValuesByJoint(state, name)]),
      ) as Record<K, JointReadings>,
      callback,
    );

export const subscribeToJointVoltages = (callback: (readings: JointReadings) => void) =>
  subscribeToDynamicJointStates((state) => interfaceValuesByJoint(state, 'voltage'), callback);
