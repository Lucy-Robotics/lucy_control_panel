/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ROSLIB from 'roslib';

const TARGET_POSE_TOPIC = '/lucy/target_pose';

export function targetPoseTopic(ros: ROSLIB.Ros): ROSLIB.Topic {
    return new ROSLIB.Topic({ ros, name: TARGET_POSE_TOPIC, messageType: 'sensor_msgs/msg/JointState' });
}
