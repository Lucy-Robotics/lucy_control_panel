/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ROSLIB from 'roslib';
import type { TorqueCommand } from '../../../Utils/motorOverheat.utils.ts';
import { RosBridgeService } from '../ros.service.ts';

let connection: ROSLIB.Ros | null = null;
const topics = new Map<string, ROSLIB.Topic>();

function topicFor(ros: ROSLIB.Ros, name: string): ROSLIB.Topic {
  if (connection !== ros) {
    connection = ros;
    topics.clear();
  }
  let topic = topics.get(name);
  if (!topic) {
    topic = new ROSLIB.Topic({ ros, name, messageType: 'std_msgs/msg/Float64MultiArray' });
    topics.set(name, topic);
  }
  return topic;
}

// shortcut: the supervisor overwrites these commands on each control change, move to /lucy/disabled_joints once it reaches dev
export function publishJointTorque(commands: TorqueCommand[]): void {
  const ros = RosBridgeService.getInstance().rosConnection;
  if (!ros) return;
  for (const { topic, data } of commands) {
    topicFor(ros, topic).publish(new ROSLIB.Message({ layout: { dim: [], data_offset: 0 }, data }));
  }
}
