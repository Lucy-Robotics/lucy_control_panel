/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from 'react';
import ROSLIB from 'roslib';
import { RosBridgeService } from '../Services/ros/ros.service';
import { parseStackStatus } from '../Utils/stackStatus';
import type { StackStatus } from '../Utils/stackStatus';

const STACK_STATUS_TOPIC = '/lucy/stack_status';

export function useStackStatus(isConnected: boolean): StackStatus | null {
    const [status, setStatus] = useState<StackStatus | null>(null);

    useEffect(() => {
        if (!isConnected) {
            setStatus(null);
            return;
        }
        const ros = RosBridgeService.getInstance().rosConnection;
        if (!ros) return;

        const topic = new ROSLIB.Topic({ ros, name: STACK_STATUS_TOPIC, messageType: 'std_msgs/msg/String' });
        let last: unknown;
        topic.subscribe((msg: ROSLIB.Message) => {
            const data = (msg as unknown as { data?: unknown }).data;
            if (data === last) return;
            last = data;
            setStatus(parseStackStatus(data));
        });
        return () => topic.unsubscribe();
    }, [isConnected]);

    return status;
}
