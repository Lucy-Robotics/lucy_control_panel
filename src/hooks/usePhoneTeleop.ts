/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import ROSLIB from 'roslib';
import { RosBridgeService } from '../Services/ros/ros.service';
import { REST_MOTION, integrateMotion, teleopTarget, withoutBias } from '../Utils/phoneMotion';
import type { Vec3 } from '../Utils/phoneMotion';
import { grantMotionPermission } from './useDeviceMotionAvailable';
import { jointPositionsOf, type JointPositions, type JointStateMessage } from '../Utils/jointStateMessage';
import { useMotionCalibration, type MotionCalibration } from './useMotionCalibration';

const IK_TARGET_TOPIC = '/lucy/ik/target';
const IK_SOLUTION_TOPIC = '/lucy/ik/solution';
const PUBLISH_PERIOD_MS = 50;

export interface PhoneTeleop {
    isOn: boolean;
    target: Vec3 | null;
    toggle: () => void;
    calibration: MotionCalibration;
}

export function usePhoneTeleop(
    canRun: boolean,
    endEffector: Vec3 | null,
    onSolution: (positions: JointPositions) => void,
): PhoneTeleop {
    const [isOn, setIsOn] = useState(false);
    const [target, setTarget] = useState<Vec3 | null>(null);
    const endEffectorRef = useRef(endEffector);
    const onSolutionRef = useRef(onSolution);
    const biasRef = useRef<Vec3>([0, 0, 0]);
    const calibration = useMotionCalibration((bias) => {
        biasRef.current = bias;
        setIsOn(true);
    });
    const { start: startCalibration, cancel: cancelCalibration } = calibration;

    useEffect(() => {
        endEffectorRef.current = endEffector;
        onSolutionRef.current = onSolution;
    });

    useEffect(() => {
        if (canRun) return;
        setIsOn(false);
        cancelCalibration();
    }, [canRun, cancelCalibration]);

    const toggle = useCallback(() => {
        if (isOn) {
            setIsOn(false);
            return;
        }
        void grantMotionPermission().then((granted) => granted && startCalibration());
    }, [isOn, startCalibration]);

    useEffect(() => {
        const origin = endEffectorRef.current;
        const ros = RosBridgeService.getInstance().rosConnection;
        if (!isOn || !origin || !ros) return;

        const targetTopic = new ROSLIB.Topic({ ros, name: IK_TARGET_TOPIC, messageType: 'geometry_msgs/msg/Point' });
        const solutionTopic = new ROSLIB.Topic({ ros, name: IK_SOLUTION_TOPIC, messageType: 'sensor_msgs/msg/JointState' });
        solutionTopic.subscribe((msg: ROSLIB.Message) => {
            onSolutionRef.current(jointPositionsOf(msg as unknown as JointStateMessage));
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
            motion = integrateMotion(motion, withoutBias([a.x, a.y ?? 0, a.z ?? 0], biasRef.current), dt);
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
        };
    }, [isOn]);

    return { isOn, target, toggle, calibration };
}
