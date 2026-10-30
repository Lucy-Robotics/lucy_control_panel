/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useSyncExternalStore } from 'react';
import ROSLIB from 'roslib';
import { RosBridgeService } from '../Services/ros/ros.service';

/**
 * Joints kept limp (torque off) while Control Robot is ON, e.g. to drive one finger at a time
 * when finding its limits. The latched list lucy_control_supervisor reads is the source of truth.
 */
const DISABLED_JOINTS_TOPIC = '/lucy/disabled_joints';

let disabled: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

function setDisabled(next: ReadonlySet<string>): void {
    disabled = next;
    listeners.forEach((l) => l());
}

// One advertised topic per bridge connection: re-advertising per change would churn
// publishers, and unadvertising would drop the latched value for a supervisor that restarts.
let topic: { ros: ROSLIB.Ros; topic: ROSLIB.Topic } | null = null;

export function setJointTorqueEnabled(name: string, enabled: boolean): void {
    const next = new Set(disabled);
    if (enabled) next.delete(name);
    else next.add(name);
    setDisabled(next);
    topic?.topic.publish(new ROSLIB.Message({ data: JSON.stringify([...next]) }));
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

/** Follow the latched list, so every panel shows and edits the list the supervisor applies. */
export function useSyncDisabledJoints(isConnected: boolean): void {
    useEffect(() => {
        const ros = RosBridgeService.getInstance().rosConnection;
        if (!isConnected || !ros) return;
        if (topic?.ros !== ros) {
            topic = {
                ros,
                topic: new ROSLIB.Topic({
                    ros,
                    name: DISABLED_JOINTS_TOPIC,
                    messageType: 'std_msgs/msg/String',
                    latch: true,
                }),
            };
        }
        setDisabled(new Set());
        const t = topic.topic;
        const onMessage = (msg: ROSLIB.Message) => {
            try {
                const v: unknown = JSON.parse((msg as unknown as { data?: string }).data ?? '[]');
                setDisabled(new Set(Array.isArray(v) ? v.filter((n): n is string => typeof n === 'string') : []));
            } catch {
                setDisabled(new Set());
            }
        };
        t.subscribe(onMessage);
        return () => t.unsubscribe(onMessage);
    }, [isConnected]);
}
