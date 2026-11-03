/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import ROSLIB from 'roslib';
import { RosBridgeService } from '../Services/ros/ros.service';
import { REST_MOTION, integrateMotion, teleopTarget } from '../Utils/phoneMotion';
import type { Vec3 } from '../Utils/phoneMotion';
import { grantMotionPermission } from './useDeviceMotionAvailable';
import { jointPositionsOf, type JointPositions, type JointStateMessage } from '../Utils/jointStateMessage';

const IK_TARGET_TOPIC = '/lucy/ik/target';
const IK_SOLUTION_TOPIC = '/lucy/ik/solution';
const PUBLISH_PERIOD_MS = 50;

export interface PhoneTeleop {
    isOn: boolean;
    target: Vec3 | null;
    solution: JointPositions | null;
    toggle: () => void;
}

export function usePhoneTeleop(
    canRun: boolean,
    endEffector: Vec3 | null,
    onSolution: (positions: JointPositions) => void,
): PhoneTeleop {
    const [isOn, setIsOn] = useState(false);
    const [target, setTarget] = useState<Vec3 | null>(null);
    const [solution, setSolution] = useState<JointPositions | null>(null);
    const endEffectorRef = useRef(endEffector);
    const onSolutionRef = useRef(onSolution);

    useEffect(() => {
        endEffectorRef.current = endEffector;
        onSolutionRef.current = onSolution;
    });

    useEffect(() => {
        if (!canRun) setIsOn(false);
    }, [canRun]);

    const toggle = useCallback(() => {
        if (isOn) {
            setIsOn(false);
            return;
        }
        void grantMotionPermission().then(setIsOn);
    }, [isOn]);

    useEffect(() => {
        const origin = endEffectorRef.current;
        const ros = RosBridgeService.getInstance().rosConnection;
        if (!isOn || !origin || !ros) return;

        const targetTopic = new ROSLIB.Topic({ ros, name: IK_TARGET_TOPIC, messageType: 'geometry_msgs/msg/Point' });
        const solutionTopic = new ROSLIB.Topic({ ros, name: IK_SOLUTION_TOPIC, messageType: 'sensor_msgs/msg/JointState' });
        solutionTopic.subscribe((msg: ROSLIB.Message) => {
            const positions = jointPositionsOf(msg as unknown as JointStateMessage);
            setSolution(positions);
            onSolutionRef.current(positions);
        });

        let motion = REST_MOTION;
        let lastEventMs: number | null = null;
        let lastPublishMs = -Infinity;
        setTarget(origin);

        const onMotion = (event: DeviceMotionEvent) => {
            const a = event.acceleration;
            if (a?.x == null) return;
            const dt = lastEventMs === null ? 0 : (event.timeStamp - lastEventMs) / 1000;
            lastEventMs = event.timeStamp;
            motion = integrateMotion(motion, [a.x, a.y ?? 0, a.z ?? 0], dt);
            if (event.timeStamp - lastPublishMs < PUBLISH_PERIOD_MS) return;
            lastPublishMs = event.timeStamp;
            const next = teleopTarget(origin, motion.displacement);
            targetTopic.publish(new ROSLIB.Message({ x: next[0], y: next[1], z: next[2] }));
            setTarget(next);
        };

        window.addEventListener('devicemotion', onMotion);
        return () => {
            window.removeEventListener('devicemotion', onMotion);
            solutionTopic.unsubscribe();
            targetTopic.unadvertise();
            setTarget(null);
            setSolution(null);
        };
    }, [isOn]);

    return { isOn, target, solution, toggle };
}
