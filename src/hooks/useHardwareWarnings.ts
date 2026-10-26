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
/** Latched JSON {board_id: reason} of the Mega boards their bridge cannot reach. */
const UNREACHABLE_BOARDS_TOPIC = '/lucy/unreachable_boards';

const NO_BOARDS: Record<string, string> = {};

/** Latest parsed value of a latched JSON String topic; `empty` while disconnected or invalid. */
function useLatchedJson<T>(isConnected: boolean, name: string, empty: T, parse: (v: unknown) => T): T {
    const [value, setValue] = useState<T>(empty);
    useEffect(() => {
        const ros = RosBridgeService.getInstance().rosConnection;
        if (!isConnected || !ros) {
            setValue(empty);
            return;
        }
        const topic = new ROSLIB.Topic({ ros, name, messageType: 'std_msgs/msg/String' });
        topic.subscribe((msg: ROSLIB.Message) => {
            try {
                setValue(parse(JSON.parse((msg as unknown as { data?: string }).data ?? '')));
            } catch {
                setValue(empty);
            }
        });
        return () => topic.unsubscribe();
    }, [isConnected, name, empty, parse]);
    return value;
}

const parseWarnings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((w): w is string => typeof w === 'string') : [];

const parseBoards = (v: unknown): Record<string, string> =>
    v && typeof v === 'object' && !Array.isArray(v)
        ? Object.fromEntries(Object.entries(v).filter((e): e is [string, string] => typeof e[1] === 'string'))
        : NO_BOARDS;

const NO_WARNINGS: string[] = [];

export function useHardwareWarnings(isConnected: boolean): string[] {
    return useLatchedJson(isConnected, HARDWARE_WARNINGS_TOPIC, NO_WARNINGS, parseWarnings);
}

/** Board id -> why its bridge cannot reach it (not on USB, being flashed, not answering). */
export function useUnreachableBoards(isConnected: boolean): Record<string, string> {
    return useLatchedJson(isConnected, UNREACHABLE_BOARDS_TOPIC, NO_BOARDS, parseBoards);
}
