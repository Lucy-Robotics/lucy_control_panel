/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useMemo, useState } from 'react';
import type { JointControlState } from '../Constants/robotTypes';
import type { JointPositions } from '../Utils/jointStateMessage';
import { actualPoseOf, isPoseReached, targetPoseOf } from '../Utils/targetPose';
import { useJointMove, type JointMoveStore } from './useJointMove';

const MAX_TRACKING_MS = 20000;

export function useActiveTargetPose(
    store: JointMoveStore,
    joints: JointControlState[],
    isSending: boolean,
): JointPositions | null {
    const move = useJointMove(store);
    const target = targetPoseOf(joints, move);
    const isPending = isSending && (move !== null || !isPoseReached(target, actualPoseOf(joints)));
    const key = isPending ? JSON.stringify(target) : null;
    const [expiredKey, setExpiredKey] = useState<string | null>(null);

    useEffect(() => {
        if (key === null) return;
        const timer = window.setTimeout(() => setExpiredKey(key), MAX_TRACKING_MS);
        return () => window.clearTimeout(timer);
    }, [key]);

    const activeKey = move !== null || key !== expiredKey ? key : null;
    return useMemo(() => (activeKey === null ? null : JSON.parse(activeKey) as JointPositions), [activeKey]);
}
