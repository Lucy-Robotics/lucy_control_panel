/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from 'react';
import ROSLIB from 'roslib';
import { RosBridgeService } from '../Services/ros/ros.service';
import type { Vec3 } from '../Utils/phoneMotion';

const END_EFFECTOR_TOPIC = '/lucy/end_effector';

interface PointStamped {
    point: { x: number; y: number; z: number };
}

export function useEndEffector(isConnected: boolean): Vec3 | null {
    const [position, setPosition] = useState<Vec3 | null>(null);

    useEffect(() => {
        setPosition(null);
        if (!isConnected) return;
        const ros = RosBridgeService.getInstance().rosConnection;
        if (!ros) return;

        const topic = new ROSLIB.Topic({ ros, name: END_EFFECTOR_TOPIC, messageType: 'geometry_msgs/msg/PointStamped' });
        topic.subscribe((msg: ROSLIB.Message) => {
            const { point } = msg as unknown as PointStamped;
            setPosition([point.x, point.y, point.z]);
        });
        return () => topic.unsubscribe();
    }, [isConnected]);

    return position;
}
