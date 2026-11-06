/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ROSLIB from 'roslib';
import { effortsByJoint } from '../../../Utils/jointEffort.utils.ts';
import { RosBridgeService } from '../ros.service.ts';

export function subscribeToJointEfforts(callback: (efforts: Map<string, number>) => void): () => void {
  const ros = RosBridgeService.getInstance().rosConnection;
  if (!ros) return () => { };

  const topic = new ROSLIB.Topic({
    ros,
    name: '/joint_states',
    messageType: 'sensor_msgs/msg/JointState',
  });
  topic.subscribe((msg: ROSLIB.Message) => {
    const { name, effort } = msg as unknown as { name?: string[]; effort?: (number | null)[] };
    if (name?.length) callback(effortsByJoint(name, effort));
  });
  return () => topic.unsubscribe();
}
