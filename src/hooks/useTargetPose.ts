/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from 'react';
import type ROSLIB from 'roslib';
import { RosBridgeService } from '../Services/ros/ros.service';
import { targetPoseTopic } from '../Services/ros/targetPoseTopic';
import { jointPositionsOf, type JointPositions, type JointStateMessage } from '../Utils/jointStateMessage';

const STALE_MS = 1500;

export function useTargetPose(isConnected: boolean): JointPositions | null {
    const [pose, setPose] = useState<JointPositions | null>(null);

    useEffect(() => {
        const ros = RosBridgeService.getInstance().rosConnection;
        if (!isConnected || !ros) return;

        const topic = targetPoseTopic(ros);
        let staleTimer: number | undefined;
        topic.subscribe((msg: ROSLIB.Message) => {
            window.clearTimeout(staleTimer);
            const message = msg as unknown as JointStateMessage;
            if (message.name.length === 0) {
                setPose(null);
                return;
            }
            setPose(jointPositionsOf(message));
            staleTimer = window.setTimeout(() => setPose(null), STALE_MS);
        });
        return () => {
            window.clearTimeout(staleTimer);
            topic.unsubscribe();
            setPose(null);
        };
    }, [isConnected]);

    return pose;
}
