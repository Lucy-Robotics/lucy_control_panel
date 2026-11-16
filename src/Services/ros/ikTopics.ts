/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ROSLIB from 'roslib';
import { jointPositionsOf, type JointPositions, type JointStateMessage } from '../../Utils/jointStateMessage';
import type { Vec3 } from '../../Utils/phoneMotion';

const IK_TARGET_TOPIC = '/lucy/ik/target';
const IK_SOLUTION_TOPIC = '/lucy/ik/solution';
const IK_POSE_TARGET_TOPIC = '/lucy/ik/pose_target';
const END_EFFECTOR_PITCH_TOPIC = '/lucy/end_effector_pitch';

export interface IkTopics {
    publishTarget: (target: Vec3) => void;
    publishPoseTarget: (target: Vec3, pitch: number) => void;
    close: () => void;
}

export function openIkTopics(ros: ROSLIB.Ros, onSolution: (positions: JointPositions) => void): IkTopics {
    const targetTopic = new ROSLIB.Topic({ ros, name: IK_TARGET_TOPIC, messageType: 'geometry_msgs/msg/Point' });
    const solutionTopic = new ROSLIB.Topic({ ros, name: IK_SOLUTION_TOPIC, messageType: 'sensor_msgs/msg/JointState' });
    const poseTargetTopic = new ROSLIB.Topic({ ros, name: IK_POSE_TARGET_TOPIC, messageType: 'lucy_msgs/msg/IkTarget' });
    solutionTopic.subscribe((msg: ROSLIB.Message) => {
        onSolution(jointPositionsOf(msg as unknown as JointStateMessage));
    });
    return {
        publishTarget: ([x, y, z]) => targetTopic.publish(new ROSLIB.Message({ x, y, z })),
        publishPoseTarget: ([x, y, z], pitch) => poseTargetTopic.publish(new ROSLIB.Message({ x, y, z, pitch })),
        close: () => {
            solutionTopic.unsubscribe();
            targetTopic.unadvertise();
            poseTargetTopic.unadvertise();
        },
    };
}

export function subscribeToEndEffectorPitch(ros: ROSLIB.Ros, onPitch: (pitch: number) => void): () => void {
    const topic = new ROSLIB.Topic({ ros, name: END_EFFECTOR_PITCH_TOPIC, messageType: 'std_msgs/msg/Float64' });
    topic.subscribe((msg: ROSLIB.Message) => onPitch((msg as unknown as { data: number }).data));
    return () => topic.unsubscribe();
}
