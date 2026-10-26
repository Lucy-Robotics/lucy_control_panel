/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from 'react';
import ROSLIB from 'roslib';
import { RosBridgeService } from '../Services/ros/ros.service';

/**
 * Hardware problems lucy_control_supervisor reports, e.g. a Mega's PCA9685 that stopped
 * answering (its servos cannot move). Latched JSON list of messages; empty when all is well.
 */
const HARDWARE_WARNINGS_TOPIC = '/lucy/hardware_warnings';

export function useHardwareWarnings(isConnected: boolean): string[] {
    const [warnings, setWarnings] = useState<string[]>([]);
    useEffect(() => {
        const ros = RosBridgeService.getInstance().rosConnection;
        if (!isConnected || !ros) {
            setWarnings([]);
            return;
        }
        const topic = new ROSLIB.Topic({
            ros,
            name: HARDWARE_WARNINGS_TOPIC,
            messageType: 'std_msgs/msg/String',
        });
        topic.subscribe((msg: ROSLIB.Message) => {
            try {
                const v: unknown = JSON.parse((msg as unknown as { data?: string }).data ?? '[]');
                setWarnings(Array.isArray(v) ? v.filter((w): w is string => typeof w === 'string') : []);
            } catch {
                setWarnings([]);
            }
        });
        return () => topic.unsubscribe();
    }, [isConnected]);
    return warnings;
}
