/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MobileOutlined } from '@ant-design/icons';
import type { RailItem } from './CommandRail.tsx';
import { CONTROL_OFF_HINT } from './ReadOnlyHint.tsx';

interface PhoneTeleopRailItemProps {
    isOn: boolean;
    onToggle: () => void;
    isSending: boolean;
    hasMotionSensors: boolean;
    hasEndEffector: boolean;
}

function disabledReason({ isSending, hasMotionSensors, hasEndEffector }: PhoneTeleopRailItemProps): string | undefined {
    if (!window.isSecureContext) return 'Teleop needs the panel opened over HTTPS to read the motion sensors';
    if (!hasMotionSensors) return 'Teleop needs a phone or tablet with motion sensors';
    if (!hasEndEffector) return 'Teleop needs a robot that publishes its end effector (/lucy/end_effector)';
    if (!isSending) return CONTROL_OFF_HINT;
    return undefined;
}

export function phoneTeleopRailItem(props: PhoneTeleopRailItemProps): RailItem {
    const reason = disabledReason(props);
    return {
        key: 'phone-teleop',
        icon: <MobileOutlined />,
        label: props.isOn
            ? 'Teleop: move your phone to move the end effector. Turn off and on again to reset the drift'
            : 'Teleop: move the end effector by moving your phone',
        caption: 'TELEOP',
        onClick: props.onToggle,
        active: props.isOn,
        disabled: reason !== undefined,
        disabledReason: reason,
    };
}
