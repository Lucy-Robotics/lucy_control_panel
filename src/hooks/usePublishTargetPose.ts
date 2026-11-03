/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useMemo } from 'react';
import ROSLIB from 'roslib';
import type { JointControlState } from '../Constants/robotTypes';
import { RosBridgeService } from '../Services/ros/ros.service';
import { targetPoseTopic } from '../Services/ros/targetPoseTopic';
import { jointStateMessageOf, type JointPositions } from '../Utils/jointStateMessage';
import { targetPoseOf } from '../Utils/targetPose';
import { useJointMove, type JointMoveStore } from './useJointMove';

const REPUBLISH_MS = 500;

function publish(topic: ROSLIB.Topic, pose: JointPositions | null) {
    topic.publish(new ROSLIB.Message(jointStateMessageOf(pose)));
}

export function usePublishTargetPose(
    store: JointMoveStore,
    joints: JointControlState[],
    isSending: boolean,
    teleopSolution: JointPositions | null,
): void {
    const move = useJointMove(store);
    const pose = useMemo(
        () => (isSending ? targetPoseOf(joints, move, teleopSolution) : null),
        [isSending, joints, move, teleopSolution],
    );
    const isActive = pose !== null;
    const ros = RosBridgeService.getInstance().rosConnection;
    const topic = useMemo(() => (ros ? targetPoseTopic(ros) : null), [ros]);

    useEffect(() => {
        if (!pose || !topic) return;
        publish(topic, pose);
        const timer = window.setInterval(() => publish(topic, pose), REPUBLISH_MS);
        return () => window.clearInterval(timer);
    }, [pose, topic]);

    useEffect(() => {
        if (!isActive || !topic) return;
        return () => publish(topic, null);
    }, [isActive, topic]);
}
