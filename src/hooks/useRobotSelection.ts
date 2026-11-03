/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import ROSLIB from 'roslib';
import { message } from 'antd';
import { RosBridgeService } from '../Services/ros/ros.service';
import { parseRobotList, robotLabel } from '../Utils/robotPackages';
import type { RobotList } from '../Utils/robotPackages';

const ROBOTS_TOPIC = '/lucy/robots';
const SELECT_ROBOT_TOPIC = '/lucy/select_robot';
const SWITCH_TIMEOUT_MS = 90_000;

export function useRobotSelection(isConnected: boolean) {
    const [robots, setRobots] = useState<RobotList | null>(null);
    const [switchingTo, setSwitchingTo] = useState<string | null>(null);
    const selectTopicRef = useRef<ROSLIB.Topic | null>(null);

    useEffect(() => {
        if (!isConnected) {
            setRobots(null);
            return;
        }
        const ros = RosBridgeService.getInstance().rosConnection;
        if (!ros) return;

        const robotsTopic = new ROSLIB.Topic({ ros, name: ROBOTS_TOPIC, messageType: 'std_msgs/msg/String' });
        const selectTopic = new ROSLIB.Topic({ ros, name: SELECT_ROBOT_TOPIC, messageType: 'std_msgs/msg/String' });
        selectTopic.advertise();
        selectTopicRef.current = selectTopic;

        robotsTopic.subscribe((msg: ROSLIB.Message) => {
            const list = parseRobotList((msg as unknown as { data?: unknown }).data);
            setRobots(list);
            setSwitchingTo((target) => (target === list?.active ? null : target));
        });

        return () => {
            robotsTopic.unsubscribe();
            selectTopic.unadvertise();
            selectTopicRef.current = null;
        };
    }, [isConnected]);

    useEffect(() => {
        if (!switchingTo) return;
        const timer = setTimeout(() => {
            setSwitchingTo(null);
            message.error(`Switching to ${robotLabel(switchingTo)} timed out`);
        }, SWITCH_TIMEOUT_MS);
        return () => clearTimeout(timer);
    }, [switchingTo]);

    const selectRobot = useCallback((robotPackage: string) => {
        if (!selectTopicRef.current) return;
        selectTopicRef.current.publish(new ROSLIB.Message({ data: robotPackage }));
        setSwitchingTo(robotPackage);
    }, []);

    return { robots, switchingTo, selectRobot };
}
