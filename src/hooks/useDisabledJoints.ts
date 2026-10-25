/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useSyncExternalStore } from 'react';
import ROSLIB from 'roslib';
import { RosBridgeService } from '../Services/ros/ros.service';

/**
 * Joints kept limp (torque off) while Control Robot is ON, e.g. to drive one finger at a time
 * when finding its limits. lucy_control_supervisor reads the latched list.
 */
const STORAGE_KEY = 'lucy_disabled_joints';
const DISABLED_JOINTS_TOPIC = '/lucy/disabled_joints';

function load(): ReadonlySet<string> {
    try {
        const v: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
        return new Set(Array.isArray(v) ? v.filter((n): n is string => typeof n === 'string') : []);
    } catch {
        return new Set();
    }
}

let disabled = load();
const listeners = new Set<() => void>();

export function setJointTorqueEnabled(name: string, enabled: boolean): void {
    const next = new Set(disabled);
    if (enabled) next.delete(name);
    else next.add(name);
    disabled = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    listeners.forEach((l) => l());
}

export function useDisabledJoints(): ReadonlySet<string> {
    return useSyncExternalStore(
        (onChange) => {
            listeners.add(onChange);
            return () => listeners.delete(onChange);
        },
        () => disabled,
    );
}

// One advertised publisher per bridge connection: re-advertising per change would churn
// publishers, and unadvertising would drop the latched value for a supervisor that restarts.
let publisher: { ros: ROSLIB.Ros; topic: ROSLIB.Topic } | null = null;

/** Publish the list on every change and on (re)connect; latched so the supervisor always has it. */
export function usePublishDisabledJoints(isConnected: boolean): void {
    const current = useDisabledJoints();
    useEffect(() => {
        const ros = RosBridgeService.getInstance().rosConnection;
        if (!isConnected || !ros) return;
        if (publisher?.ros !== ros) {
            publisher = {
                ros,
                topic: new ROSLIB.Topic({
                    ros,
                    name: DISABLED_JOINTS_TOPIC,
                    messageType: 'std_msgs/msg/String',
                    latch: true,
                }),
            };
        }
        publisher.topic.publish(new ROSLIB.Message({ data: JSON.stringify([...current]) }));
    }, [isConnected, current]);
}
