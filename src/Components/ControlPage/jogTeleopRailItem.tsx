/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DragOutlined } from '@ant-design/icons';
import type { RailItem } from './CommandRail.tsx';
import { CONTROL_OFF_HINT } from './ReadOnlyHint.tsx';

interface JogTeleopRailItemProps {
    isOn: boolean;
    onToggle: () => void;
    isSending: boolean;
    hasEndEffector: boolean;
    isPhoneTeleopOn: boolean;
}

function disabledReason({ isSending, hasEndEffector, isPhoneTeleopOn }: JogTeleopRailItemProps): string | undefined {
    if (!hasEndEffector) return 'IK needs a robot that publishes its end effector (/lucy/end_effector)';
    if (!isSending) return CONTROL_OFF_HINT;
    if (isPhoneTeleopOn) return 'Turn phone Teleop off to use IK';
    return undefined;
}

export function jogTeleopRailItem(props: JogTeleopRailItemProps): RailItem {
    const reason = disabledReason(props);
    return {
        key: 'jog-teleop',
        icon: <DragOutlined />,
        label: props.isOn
            ? 'IK: hold the arrows, or W A S D, Space and Shift, to move the end effector. Esc stops'
            : 'IK: move the end effector with on-screen arrows or the keyboard',
        caption: 'IK',
        onClick: props.onToggle,
        active: props.isOn,
        disabled: reason !== undefined,
        disabledReason: reason,
    };
}
