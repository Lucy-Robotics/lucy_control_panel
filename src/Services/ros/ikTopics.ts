/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ROSLIB from 'roslib';
import { jointPositionsOf, type JointPositions, type JointStateMessage } from '../../Utils/jointStateMessage';
import type { Vec3 } from '../../Utils/phoneMotion';

const IK_TARGET_TOPIC = '/lucy/ik/target';
const IK_SOLUTION_TOPIC = '/lucy/ik/solution';

export interface IkTopics {
    publishTarget: (target: Vec3) => void;
    close: () => void;
}

export function openIkTopics(ros: ROSLIB.Ros, onSolution: (positions: JointPositions) => void): IkTopics {
    const targetTopic = new ROSLIB.Topic({ ros, name: IK_TARGET_TOPIC, messageType: 'geometry_msgs/msg/Point' });
    const solutionTopic = new ROSLIB.Topic({ ros, name: IK_SOLUTION_TOPIC, messageType: 'sensor_msgs/msg/JointState' });
    solutionTopic.subscribe((msg: ROSLIB.Message) => {
        onSolution(jointPositionsOf(msg as unknown as JointStateMessage));
    });
    return {
        publishTarget: ([x, y, z]) => targetTopic.publish(new ROSLIB.Message({ x, y, z })),
        close: () => {
            solutionTopic.unsubscribe();
            targetTopic.unadvertise();
        },
    };
}
