/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { JointControlState } from '../Constants/robotTypes.ts';

const FEEDBACK_EPSILON_RAD = 0.0005;

export function withEncoderFeedback(
    joint: JointControlState,
    actual: number,
    { nobodyControls, holdsControl }: { nobodyControls: boolean; holdsControl: boolean },
): JointControlState {
    const isFirstFeedback = joint.actualValue === undefined;
    const followEncoder = nobodyControls || (isFirstFeedback && !holdsControl);
    const encoderMoved = isFirstFeedback || Math.abs(actual - joint.actualValue!) >= FEEDBACK_EPSILON_RAD;
    const sliderLags = followEncoder && Math.abs(actual - joint.currentValue) >= FEEDBACK_EPSILON_RAD;
    if (!encoderMoved && !sliderLags) return joint;

    return {
        ...joint,
        actualValue: actual,
        ...(followEncoder && { currentValue: actual, targetValue: actual }),
    };
}
